import type Database from 'better-sqlite3'

export interface MigrateBulletOverridesResult {
  migrated: number
  skippedNullVariant: number
}

export interface AssertOverrideRowCountsResult {
  ok: boolean
  srcCount: number
  dstCount: number
  skippedNullVariant: number
}

/**
 * Migrates every analysis_bullet_overrides row (with a resolvable variant_id via
 * analysis_results) into entity_overrides as entity_type='job_bullet' / field='text'.
 *
 * Design decisions in effect:
 *   - D-05: all-or-nothing sqlite.transaction(); partial failure rolls back.
 *   - D-07: analysis_bullet_overrides is never modified or dropped (read-only source).
 *   - PITFALL 1: abo.bullet_id → entity_overrides.bullet_id (NOT analysis_id).
 *   - NULL variant skip: rows where ar.variant_id IS NULL are skipped with a warn log.
 *   - Idempotent: COUNT(*) guard + INSERT OR IGNORE prevent duplicates on re-run.
 *
 * @param sqlite - raw better-sqlite3 Database instance
 * @returns { migrated, skippedNullVariant }
 */
export function migrateBulletOverrides(sqlite: Database.Database): MigrateBulletOverridesResult {
  try {
    // Count rows not yet present in entity_overrides for the same analysis_id+bullet_id
    const unmigrated = sqlite.prepare(`
      SELECT COUNT(*) as cnt
      FROM analysis_bullet_overrides abo
      WHERE NOT EXISTS (
        SELECT 1 FROM entity_overrides eo
        WHERE eo.analysis_id = abo.analysis_id
          AND eo.bullet_id   = abo.bullet_id
          AND eo.entity_type = 'job_bullet'
      )
    `).get() as { cnt: number }

    // Count rows that will be skipped because variant_id is NULL
    const skippedCount = sqlite.prepare(`
      SELECT COUNT(*) as cnt
      FROM analysis_bullet_overrides abo
      JOIN analysis_results ar ON ar.id = abo.analysis_id
      WHERE ar.variant_id IS NULL
    `).get() as { cnt: number }

    const skippedNullVariant = skippedCount.cnt

    if (skippedNullVariant > 0) {
      console.warn(
        `[migrateOverrides] Skipping ${skippedNullVariant} analysis_bullet_overrides row(s) ` +
        `where analysis_results.variant_id IS NULL — inserting them would create an invalid state ` +
        `(analysis_id set, variant_id NULL). These rows are preserved in analysis_bullet_overrides.`
      )
    }

    if (unmigrated.cnt === 0) {
      return { migrated: 0, skippedNullVariant }
    }

    // Per-row NOT EXISTS guard is the real idempotency mechanism. INSERT OR IGNORE
    // cannot dedupe here: migrated job_bullet rows leave project_id/job_id/project_bullet_id
    // NULL, and SQLite treats NULLs as distinct in the partial unique index, so the index
    // never fires. Under a partial-migration state (unmigrated.cnt > 0 but some rows already
    // present) a bare INSERT-SELECT would re-insert the already-migrated rows as duplicates.
    const migrateTx = sqlite.transaction(() => {
      return sqlite.prepare(`
        INSERT OR IGNORE INTO entity_overrides
          (variant_id, analysis_id, entity_type, bullet_id, field, override_text, source, created_at)
        SELECT
          ar.variant_id,
          abo.analysis_id,
          'job_bullet',
          abo.bullet_id,
          'text',
          abo.override_text,
          abo.source,
          abo.created_at
        FROM analysis_bullet_overrides abo
        JOIN analysis_results ar ON ar.id = abo.analysis_id
        WHERE ar.variant_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM entity_overrides eo
            WHERE eo.analysis_id = abo.analysis_id
              AND eo.bullet_id   = abo.bullet_id
              AND eo.entity_type = 'job_bullet'
          )
      `).run()
    })

    // Report rows actually inserted this run (not the total table count) — WR-01.
    const insertResult = migrateTx()

    return { migrated: insertResult.changes, skippedNullVariant }
  } catch (err) {
    console.error('[migrateOverrides] Migration failed — entity_overrides may be empty:', err)
    return { migrated: 0, skippedNullVariant: 0 }
  }
}

/**
 * Startup row-count assertion: verifies that entity_overrides contains the expected
 * number of job_bullet rows relative to analysis_bullet_overrides (accounting for
 * skipped NULL-variant rows).
 *
 * Contract: dstCount + skippedNullVariant === srcCount → ok: true
 *
 * Per D-05: NEVER throws. Always returns a result object. On mismatch, logs a
 * console.error and returns { ok: false, ... } — the app launch continues.
 *
 * @param sqlite - raw better-sqlite3 Database instance
 * @returns AssertOverrideRowCountsResult
 */
export function assertOverrideRowCounts(sqlite: Database.Database): AssertOverrideRowCountsResult {
  const srcRow = sqlite.prepare(
    `SELECT COUNT(*) as cnt FROM analysis_bullet_overrides`
  ).get() as { cnt: number }

  // dstCount counts only MIGRATED source rows that are actually present in
  // entity_overrides, matched by the migration's idempotency key (analysis_id +
  // bullet_id). It deliberately does NOT count every entity_overrides job_bullet
  // row: that table also accumulates variant-tier rewords (analysis_id NULL),
  // excluded-bullet re-inclusions (field='inclusion'), and post-migration accepted
  // suggestions (the Phase 35 cutover writes new rewrites here, not to the
  // read-only source table). A raw COUNT(*) over job_bullet rows produced a false
  // "data loss" alarm whenever those legitimate writes pushed the destination
  // count above the frozen source count.
  const dstRow = sqlite.prepare(`
    SELECT COUNT(*) as cnt
    FROM analysis_bullet_overrides abo
    JOIN analysis_results ar ON ar.id = abo.analysis_id
    WHERE ar.variant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM entity_overrides eo
        WHERE eo.analysis_id = abo.analysis_id
          AND eo.bullet_id   = abo.bullet_id
          AND eo.entity_type = 'job_bullet'
      )
  `).get() as { cnt: number }

  // Count rows skipped because variant_id is NULL (no matching AR or AR.variant_id IS NULL)
  const skippedRow = sqlite.prepare(`
    SELECT COUNT(*) as cnt
    FROM analysis_bullet_overrides abo
    LEFT JOIN analysis_results ar ON ar.id = abo.analysis_id
    WHERE ar.variant_id IS NULL OR ar.id IS NULL
  `).get() as { cnt: number }

  const srcCount = srcRow.cnt
  const dstCount = dstRow.cnt
  const skippedNullVariant = skippedRow.cnt

  // Integrity contract: every source row is either migrated-and-present (dstCount)
  // or skipped for a NULL variant (skippedNullVariant). The two partition the source
  // table, so dstCount + skippedNullVariant === srcCount holds iff zero migratable
  // rows are missing from entity_overrides — a genuine data-loss signal. Extra
  // (non-migrated) entity_overrides rows can no longer trip it.
  const ok = dstCount + skippedNullVariant === srcCount

  if (!ok) {
    console.error(
      `[migrateOverrides] Row-count assertion FAILED — migrated rows missing from entity_overrides. ` +
      `source (analysis_bullet_overrides): ${srcCount}, ` +
      `migrated rows present (entity_overrides job_bullet): ${dstCount}, ` +
      `skipped (NULL variant): ${skippedNullVariant}. ` +
      `Expected dstCount + skipped === srcCount (${dstCount} + ${skippedNullVariant} !== ${srcCount}). ` +
      `App launch will continue — investigate migration state.`
    )
  }

  return { ok, srcCount, dstCount, skippedNullVariant }
}
