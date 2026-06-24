import { ipcMain } from 'electron'
import { db, sqlite } from '../db'
import { templateVariants, templateVariantItems, jobBullets, projectBullets, entityOverrides, analysisLayoutOverrides, analysisResults, analysisSkillAdditions, skills, skillCategories, jobPostings } from '../db/schema'
import { eq, and, desc, inArray, isNull } from 'drizzle-orm'
import { buildMergedBuilderData } from '../lib/mergeHelper'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'

type Db = BetterSQLite3Database<typeof schema>

export async function listVariants(db: Db) {
  const rows = await db.select().from(templateVariants).orderBy(desc(templateVariants.createdAt))
  return rows.map((row) => ({
    ...row,
    templateOptions: (() => {
      if (!row.templateOptions) return null
      try { return JSON.parse(row.templateOptions) } catch { return null }
    })(),
  }))
}

export async function createVariant(db: Db, data: { name: string; layoutTemplate?: string }) {
  const layoutTemplate = data.layoutTemplate ?? 'classic'
  const rows = await db
    .insert(templateVariants)
    .values({ name: data.name, layoutTemplate })
    .returning()
  const newRow = rows[0]
  // Default summary to hidden for all non-executive templates
  if (layoutTemplate !== 'executive') {
    await db.insert(templateVariantItems).values({
      variantId: newRow.id,
      itemType: 'summary',
      excluded: true,
    })
  }
  return newRow
}

export async function getVariantOptions(db: Db, variantId: number) {
  const rows = await db
    .select({ templateOptions: templateVariants.templateOptions })
    .from(templateVariants)
    .where(eq(templateVariants.id, variantId))
  if (!rows[0] || !rows[0].templateOptions) return null
  try {
    return JSON.parse(rows[0].templateOptions)
  } catch {
    return null
  }
}

export async function setVariantOptions(db: Db, variantId: number, options: object) {
  await db
    .update(templateVariants)
    .set({ templateOptions: JSON.stringify(options) })
    .where(eq(templateVariants.id, variantId))
}

export async function getAnalysisMargins(db: Db, analysisId: number) {
  const row = await db
    .select()
    .from(analysisLayoutOverrides)
    .where(eq(analysisLayoutOverrides.analysisId, analysisId))
  return row[0] ?? null
}

export async function setAnalysisMargins(
  db: Db,
  analysisId: number,
  margins: { marginTop: number; marginBottom: number; marginSides: number },
) {
  if (
    !Number.isFinite(margins.marginTop) ||
    !Number.isFinite(margins.marginBottom) ||
    !Number.isFinite(margins.marginSides)
  ) {
    throw new Error('setAnalysisMargins: margin values must be finite numbers')
  }
  await db
    .insert(analysisLayoutOverrides)
    .values({ analysisId, ...margins })
    .onConflictDoUpdate({
      target: analysisLayoutOverrides.analysisId,
      set: margins,
    })
}

export async function clearAnalysisMargins(db: Db, analysisId: number) {
  await db
    .delete(analysisLayoutOverrides)
    .where(eq(analysisLayoutOverrides.analysisId, analysisId))
}

export async function renameVariant(db: Db, id: number, name: string) {
  const rows = await db
    .update(templateVariants)
    .set({ name })
    .where(eq(templateVariants.id, id))
    .returning()
  return rows[0]
}

export async function deleteVariant(db: Db, id: number) {
  await db.delete(templateVariants).where(eq(templateVariants.id, id))
}

export function duplicateVariant(db: Db, id: number) {
  // better-sqlite3 transactions must be synchronous — use .all() instead of await
  const [source] = db.select().from(templateVariants).where(eq(templateVariants.id, id)).all()
  if (!source) throw new Error(`Template variant ${id} not found`)

  const sourceItems = db
    .select()
    .from(templateVariantItems)
    .where(eq(templateVariantItems.variantId, id))
    .all()

  const [newVariant] = db
    .insert(templateVariants)
    .values({ name: `${source.name} (Copy)`, layoutTemplate: source.layoutTemplate })
    .returning()
    .all()

  if (sourceItems.length > 0) {
    db.insert(templateVariantItems)
      .values(
        sourceItems.map((item) => ({
          variantId: newVariant.id,
          itemType: item.itemType,
          bulletId: item.bulletId,
          skillId: item.skillId,
          jobId: item.jobId,
          projectId: item.projectId,
          projectBulletId: item.projectBulletId,
          educationId: item.educationId,
          volunteerId: item.volunteerId,
          awardId: item.awardId,
          publicationId: item.publicationId,
          languageId: item.languageId,
          interestId: item.interestId,
          referenceId: item.referenceId,
          excluded: item.excluded,
        })),
      )
      .run()
  }

  // RWD-06: copy variant-tier override rows (analysis_id IS NULL) to the new
  // variant. MUST use isNull() — eq(col, null) is always false in SQL → zero
  // rows. Analysis-tier rows (analysis_id NOT NULL) are intentionally excluded.
  const sourceOverrides = db
    .select()
    .from(entityOverrides)
    .where(and(eq(entityOverrides.variantId, id), isNull(entityOverrides.analysisId)))
    .all()

  if (sourceOverrides.length > 0) {
    db.insert(entityOverrides)
      .values(
        sourceOverrides.map((row) => ({
          variantId: newVariant.id,
          analysisId: null,
          entityType: row.entityType,
          field: row.field,
          bulletId: row.bulletId,
          projectId: row.projectId,
          jobId: row.jobId,
          projectBulletId: row.projectBulletId,
          overrideText: row.overrideText,
          source: row.source,
        })),
      )
      .run()
  }

  return newVariant
}

export async function setLayoutTemplate(db: Db, id: number, layoutTemplate: string) {
  const rows = await db
    .update(templateVariants)
    .set({ layoutTemplate })
    .where(eq(templateVariants.id, id))
    .returning()
  return rows[0]
}

export async function setItemExcluded(db: Db, variantId: number, itemType: string, itemId: number, excluded: boolean) {
  if (itemType === 'bullet') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'bullet'),
          eq(templateVariantItems.bulletId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'bullet',
        bulletId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'skill') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'skill'),
          eq(templateVariantItems.skillId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'skill',
        skillId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'job') {
    // Toggle the job exclusion row
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'job'),
          eq(templateVariantItems.jobId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'job',
        jobId: itemId,
        excluded: true,
      })
    }

    // Cascade: toggle all bullets belonging to this job
    const bulletRows = await db
      .select({ id: jobBullets.id })
      .from(jobBullets)
      .where(eq(jobBullets.jobId, itemId))
    const bulletIds = bulletRows.map((b) => b.id)

    if (bulletIds.length > 0) {
      await db
        .delete(templateVariantItems)
        .where(
          and(
            eq(templateVariantItems.variantId, variantId),
            eq(templateVariantItems.itemType, 'bullet'),
            inArray(templateVariantItems.bulletId, bulletIds),
          ),
        )
      if (excluded) {
        await db.insert(templateVariantItems).values(
          bulletIds.map((bulletId) => ({
            variantId,
            itemType: 'bullet',
            bulletId,
            excluded: true,
          })),
        )
      }
    }
  } else if (itemType === 'project') {
    // Toggle the project exclusion row
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'project'),
          eq(templateVariantItems.projectId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'project',
        projectId: itemId,
        excluded: true,
      })
    }

    // Cascade: toggle all bullets belonging to this project
    const projectBulletRows = await db
      .select({ id: projectBullets.id })
      .from(projectBullets)
      .where(eq(projectBullets.projectId, itemId))
    const projectBulletIds = projectBulletRows.map((b) => b.id)

    if (projectBulletIds.length > 0) {
      await db
        .delete(templateVariantItems)
        .where(
          and(
            eq(templateVariantItems.variantId, variantId),
            eq(templateVariantItems.itemType, 'projectBullet'),
            inArray(templateVariantItems.projectBulletId, projectBulletIds),
          ),
        )
      if (excluded) {
        await db.insert(templateVariantItems).values(
          projectBulletIds.map((projectBulletId) => ({
            variantId,
            itemType: 'projectBullet',
            projectBulletId,
            excluded: true,
          })),
        )
      }
    }
  } else if (itemType === 'projectBullet') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'projectBullet'),
          eq(templateVariantItems.projectBulletId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'projectBullet',
        projectBulletId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'education') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'education'),
          eq(templateVariantItems.educationId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'education',
        educationId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'volunteer') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'volunteer'),
          eq(templateVariantItems.volunteerId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'volunteer',
        volunteerId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'award') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'award'),
          eq(templateVariantItems.awardId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'award',
        awardId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'publication') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'publication'),
          eq(templateVariantItems.publicationId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'publication',
        publicationId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'language') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'language'),
          eq(templateVariantItems.languageId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'language',
        languageId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'interest') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'interest'),
          eq(templateVariantItems.interestId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'interest',
        interestId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'reference') {
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'reference'),
          eq(templateVariantItems.referenceId, itemId),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'reference',
        referenceId: itemId,
        excluded: true,
      })
    }
  } else if (itemType === 'summary') {
    // itemId is a sentinel (0) — summary has no real row ID
    await db
      .delete(templateVariantItems)
      .where(
        and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.itemType, 'summary'),
        ),
      )
    if (excluded) {
      await db.insert(templateVariantItems).values({
        variantId,
        itemType: 'summary',
        excluded: true,
      })
    }
  }
  // Stamp variant updated_at for staleness detection
  await db.update(templateVariants).set({ updatedAt: new Date() }).where(eq(templateVariants.id, variantId))
}

export async function setThreshold(db: Db, variantId: number, threshold: number) {
  await db
    .update(templateVariants)
    .set({ scoreThreshold: threshold })
    .where(eq(templateVariants.id, variantId))
}

export function getThreshold(db: Db, variantId: number) {
  const row = db
    .select({ scoreThreshold: templateVariants.scoreThreshold })
    .from(templateVariants)
    .where(eq(templateVariants.id, variantId))
    .get()
  return row?.scoreThreshold ?? 80
}

// ---------------------------------------------------------------------------
// Variant-tier overrides (Phase 36, D-02/D-03 / OVR-02)
// ---------------------------------------------------------------------------

// T-36-06: entityType is renderer-supplied — validate against the locked token set
// before any write/delete. Reject anything outside this set.
const VARIANT_OVERRIDE_ENTITY_TYPES = new Set(['job_bullet', 'summary', 'project_name'])

type EntityId = { bulletId?: number; projectId?: number }

function assertEntityType(entityType: string): void {
  if (!VARIANT_OVERRIDE_ENTITY_TYPES.has(entityType)) {
    throw new Error(`Invalid override entityType: ${entityType}`)
  }
}

// Build the FK condition for the (variant, analysis_id IS NULL, entityType, field) scope.
// job_bullet → bulletId; project_name → projectId; summary → no FK condition.
function fkCondition(entityId: EntityId) {
  if (entityId.bulletId != null) return eq(entityOverrides.bulletId, entityId.bulletId)
  if (entityId.projectId != null) return eq(entityOverrides.projectId, entityId.projectId)
  return undefined
}

/**
 * D-03 thin raw read: variant-tier override rows only (analysis_id IS NULL).
 * No base/effective enrichment, no JOIN to base text. T-36-07/T-36-08:
 * parameterized SQL with a bound variantId; pinned to analysis_id IS NULL.
 */
export function getVariantOverrides(db: Db, variantId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (db as any).session
  const prepare = session
    ? (sql: string) => session.client.prepare(sql)
    : (sql: string) => sqlite.prepare(sql)
  return prepare(`
    SELECT entity_type AS entityType,
           field,
           bullet_id AS bulletId,
           project_id AS projectId,
           override_text AS overrideText,
           source,
           created_at AS createdAt
    FROM entity_overrides
    WHERE variant_id = ? AND analysis_id IS NULL
  `).all(variantId) as Array<{
    entityType: string
    field: string
    bulletId: number | null
    projectId: number | null
    overrideText: string
    source: string
    createdAt: number
  }>
}

/**
 * D-02 delete: remove the matching variant-tier row. T-36-08/T-36-09:
 * pinned to variantId + analysis_id IS NULL so it can never touch an
 * analysis-tier row or another variant's overrides.
 */
export function clearVariantOverride(
  db: Db,
  variantId: number,
  entityType: string,
  field: string,
  entityId: EntityId,
) {
  assertEntityType(entityType)
  const fk = fkCondition(entityId)
  db.delete(entityOverrides)
    .where(
      and(
        eq(entityOverrides.variantId, variantId),
        isNull(entityOverrides.analysisId),
        eq(entityOverrides.entityType, entityType),
        eq(entityOverrides.field, field),
        ...(fk ? [fk] : []),
      ),
    )
    .run()
  return { success: true }
}

/**
 * D-02 write: empty/whitespace text deletes; non-empty text is stored verbatim
 * as a single variant-tier row (analysis_id NULL, source='user') via an atomic
 * delete+insert (mirrors ai.ts acceptSuggestion). No onConflictDoUpdate
 * (Phase 35 D-01: partial unique index over nullable FKs is unreliable).
 * No compare-to-base — the trimmed value is used only to detect the empty case.
 */
export function setVariantOverride(
  db: Db,
  variantId: number,
  entityType: string,
  field: string,
  entityId: EntityId,
  text: string,
) {
  assertEntityType(entityType)
  const trimmed = text.trim()
  if (!trimmed) {
    return clearVariantOverride(db, variantId, entityType, field, entityId)
  }
  const fk = fkCondition(entityId)
  // db and sqlite share one connection, so the raw transaction is atomic over
  // the Drizzle calls — a failed insert cannot leave the prior override deleted.
  sqlite.transaction(() => {
    db.delete(entityOverrides)
      .where(
        and(
          eq(entityOverrides.variantId, variantId),
          isNull(entityOverrides.analysisId),
          eq(entityOverrides.entityType, entityType),
          eq(entityOverrides.field, field),
          ...(fk ? [fk] : []),
        ),
      )
      .run()

    db.insert(entityOverrides)
      .values({
        variantId,
        analysisId: null, // T-36-09: hardcoded — renderer cannot supply analysisId
        entityType,
        field,
        bulletId: entityId.bulletId ?? null,
        projectId: entityId.projectId ?? null,
        overrideText: trimmed,
        source: 'user',
      })
      .run()
  })()
  return { success: true }
}

// ---------------------------------------------------------------------------
// Phase 41 Plan 05: Analysis-to-variant bake (SAVE-01 / SAVE-02)
// ---------------------------------------------------------------------------

/**
 * Pure transform: rebind analysis-tier entity_overrides rows to a new variant.
 * Each input row is mapped to a variant-tier row (analysisId=null, variantId=newVariantId)
 * with all other fields preserved verbatim.
 */
export function bakeAnalysisOverrideRows(
  analysisTierRows: Array<{
    entityType: string
    field: string
    bulletId: number | null
    projectId: number | null
    jobId: number | null
    projectBulletId: number | null
    overrideText: string
    source: string
  }>,
  newVariantId: number,
): Array<{
  variantId: number
  analysisId: null
  entityType: string
  field: string
  bulletId: number | null
  projectId: number | null
  jobId: number | null
  projectBulletId: number | null
  overrideText: string
  source: string
}> {
  return analysisTierRows.map((row) => ({
    variantId: newVariantId,
    analysisId: null,
    entityType: row.entityType,
    field: row.field,
    bulletId: row.bulletId,
    projectId: row.projectId,
    jobId: row.jobId,
    projectBulletId: row.projectBulletId,
    overrideText: row.overrideText,
    source: row.source,
  }))
}

/**
 * Pure transform: merge a margin override into a variant's templateOptions JSON.
 * - null layoutOverride → returns existingOptionsJson unchanged (including null → null).
 * - Non-null override → deep-merges margin keys into the existing options object
 *   (existing keys like accentColor/showSummary are preserved).
 * - Malformed existingOptionsJson → treats as empty object (no throw).
 */
export function mergeMarginIntoOptions(
  existingOptionsJson: string | null,
  layoutOverride: { marginTop: number; marginBottom: number; marginSides: number } | null,
): string | null {
  if (layoutOverride === null) {
    return existingOptionsJson
  }
  let existing: Record<string, unknown> = {}
  if (existingOptionsJson) {
    try {
      existing = JSON.parse(existingOptionsJson) as Record<string, unknown>
    } catch {
      existing = {}
    }
  }
  return JSON.stringify({
    ...existing,
    marginTop: layoutOverride.marginTop,
    marginBottom: layoutOverride.marginBottom,
    marginSides: layoutOverride.marginSides,
  })
}

/**
 * SAVE-01 / SAVE-02: create a new variant that captures the analysis's accepted
 * rewrites, re-included excluded bullets, added skills, and margin overrides as
 * variant-tier state. The source variant and the analysis are never mutated.
 *
 * Algorithm:
 *  1. Load analysis → get sourceVariantId (error if missing or null).
 *  2. duplicateVariant(db, sourceVariantId) → newVariant (copies templateVariantItems + variant-tier overrides).
 *  3. Single sqlite.transaction bakes:
 *     a) analysis-tier entity_overrides: collision-safe delete-before-insert for each row.
 *     b) accepted analysis_skill_additions: find-or-insert global skills row, then
 *        exclude from every other variant via templateVariantItems (SELECT-first idempotency guard).
 *     c) analysis_layout_overrides: promote into newVariant.templateOptions via mergeMarginIntoOptions.
 *  4. On any bake failure: delete newVariant (cascade-removes its rows), return { error }.
 */
export function saveAnalysisAsVariant(
  db: Db,
  analysisId: number,
): { newVariantId: number } | { error: string } {
  // 1. Load analysis row joined to its job posting (for the job-named variant)
  const analysisRow = db
    .select({
      variantId: analysisResults.variantId,
      company: jobPostings.company,
      role: jobPostings.role,
    })
    .from(analysisResults)
    .innerJoin(jobPostings, eq(analysisResults.jobPostingId, jobPostings.id))
    .where(eq(analysisResults.id, analysisId))
    .get()
  if (!analysisRow) return { error: `Analysis ${analysisId} not found` }
  const sourceVariantId = analysisRow.variantId
  if (sourceVariantId == null) return { error: 'Analysis has no associated variant' }

  // 2. Duplicate source variant outside the bake transaction
  let newVariant: ReturnType<typeof duplicateVariant>
  try {
    newVariant = duplicateVariant(db, sourceVariantId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }

  // 2b. Name the new variant after the job so it's findable among saved variants
  // (replaces duplicateVariant's "<source> (Copy)" default). Falls back to the
  // (Copy) name if the posting has no company/role text.
  const jobName = [analysisRow.company, analysisRow.role].map((s) => s?.trim()).filter(Boolean).join(' – ')
  if (jobName) {
    db.update(templateVariants).set({ name: jobName }).where(eq(templateVariants.id, newVariant.id)).run()
  }

  // 3. Bake analysis-tier state onto the new variant — single synchronous transaction
  try {
    // Read data needed for the bake (outside the transaction, before it starts)
    const analysisTierRows = db
      .select()
      .from(entityOverrides)
      .where(eq(entityOverrides.analysisId, analysisId))
      .all()

    const acceptedSkillRows = db
      .select()
      .from(analysisSkillAdditions)
      .where(
        and(
          eq(analysisSkillAdditions.analysisId, analysisId),
          eq(analysisSkillAdditions.status, 'accepted'),
        ),
      )
      .all()

    const layoutOverride = db
      .select()
      .from(analysisLayoutOverrides)
      .where(eq(analysisLayoutOverrides.analysisId, analysisId))
      .get()

    // All existing variants (for cross-variant skill exclusion)
    const allVariants = db
      .select({ id: templateVariants.id })
      .from(templateVariants)
      .all()
    const otherVariantIds = allVariants.map((v) => v.id).filter((id) => id !== newVariant.id)

    sqlite.transaction(() => {
      // (a) Bake analysis-tier entity_overrides: collision-safe delete-before-insert
      const bakedRows = bakeAnalysisOverrideRows(analysisTierRows, newVariant.id)
      for (const row of bakedRows) {
        // Delete any colliding variant-tier row on the new variant
        db.delete(entityOverrides)
          .where(
            and(
              eq(entityOverrides.variantId, newVariant.id),
              isNull(entityOverrides.analysisId),
              eq(entityOverrides.entityType, row.entityType),
              eq(entityOverrides.field, row.field),
              row.bulletId != null
                ? eq(entityOverrides.bulletId, row.bulletId)
                : isNull(entityOverrides.bulletId),
              row.projectId != null
                ? eq(entityOverrides.projectId, row.projectId)
                : isNull(entityOverrides.projectId),
            ),
          )
          .run()
        // Insert the baked (variant-tier) row
        db.insert(entityOverrides).values(row).run()
      }

      // (b) Bake accepted skills: find-or-insert global skills row, then exclude from other variants
      for (const addition of acceptedSkillRows) {
        // Find-or-insert the global skills row by name
        let skillRow = db
          .select({ id: skills.id })
          .from(skills)
          .where(eq(skills.name, addition.skillName))
          .get()

        if (!skillRow) {
          // Resolve categoryId from skill_categories if a category name is provided
          let categoryId: number | null = null
          if (addition.category) {
            const catRow = db
              .select({ id: skillCategories.id })
              .from(skillCategories)
              .where(eq(skillCategories.name, addition.category))
              .get()
            categoryId = catRow?.id ?? null
          }
          const [inserted] = db
            .insert(skills)
            .values({ name: addition.skillName, tags: '[]', categoryId })
            .returning()
            .all()
          skillRow = inserted
        }

        const skillId = skillRow.id

        // Exclude the skill from every pre-existing variant (not the new one)
        // BLOCKER fix: SELECT-first idempotency guard — no UNIQUE index on (variantId, skillId, itemType)
        for (const otherVariantId of otherVariantIds) {
          const existing = db
            .select({ id: templateVariantItems.id })
            .from(templateVariantItems)
            .where(
              and(
                eq(templateVariantItems.variantId, otherVariantId),
                eq(templateVariantItems.skillId, skillId),
                eq(templateVariantItems.itemType, 'skill'),
              ),
            )
            .get()
          if (!existing) {
            db.insert(templateVariantItems)
              .values({
                variantId: otherVariantId,
                itemType: 'skill',
                skillId,
                excluded: true,
              })
              .run()
          }
        }
      }

      // (c) Promote margin override into new variant's templateOptions
      const mergedOptions = mergeMarginIntoOptions(
        newVariant.templateOptions ?? null,
        layoutOverride ?? null,
      )
      if (mergedOptions !== null) {
        db.update(templateVariants)
          .set({ templateOptions: mergedOptions })
          .where(eq(templateVariants.id, newVariant.id))
          .run()
      }
    })()

    return { newVariantId: newVariant.id }
  } catch (err) {
    // Orphan prevention: delete the newly-created variant so no ghost variant remains
    try {
      db.delete(templateVariants).where(eq(templateVariants.id, newVariant.id)).run()
    } catch {
      // Best-effort cleanup; ignore secondary errors
    }
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function registerTemplateHandlers(): void {
  ipcMain.handle('templates:list', () => listVariants(db))
  ipcMain.handle('templates:create', (_, data) => createVariant(db, data))
  ipcMain.handle('templates:getOptions', (_, variantId) => getVariantOptions(db, variantId))
  ipcMain.handle('templates:setOptions', (_, variantId, options) => setVariantOptions(db, variantId, options))
  ipcMain.handle('templates:rename', (_, id, name) => renameVariant(db, id, name))
  ipcMain.handle('templates:delete', (_, id) => deleteVariant(db, id))
  ipcMain.handle('templates:duplicate', (_, id) => duplicateVariant(db, id))
  ipcMain.handle('templates:setLayoutTemplate', (_, id, layoutTemplate) => setLayoutTemplate(db, id, layoutTemplate))
  ipcMain.handle('templates:getBuilderData', (_, variantId, analysisId) => buildMergedBuilderData(db, variantId, analysisId))
  ipcMain.handle('templates:setItemExcluded', (_, variantId, itemType, itemId, excluded) => setItemExcluded(db, variantId, itemType, itemId, excluded))
  ipcMain.handle('templates:setThreshold', (_, variantId, threshold) => setThreshold(db, variantId, threshold))
  ipcMain.handle('templates:getThreshold', (_, variantId) => getThreshold(db, variantId))
  ipcMain.handle('templates:getVariantOverrides', (_, variantId) => getVariantOverrides(db, variantId))
  ipcMain.handle('templates:setVariantOverride', (_, variantId, entityType, field, entityId, text) =>
    setVariantOverride(db, variantId, entityType, field, entityId, text),
  )
  ipcMain.handle('templates:clearVariantOverride', (_, variantId, entityType, field, entityId) =>
    clearVariantOverride(db, variantId, entityType, field, entityId),
  )
  ipcMain.handle('analysisLayout:getMargins', (_, analysisId) => getAnalysisMargins(db, analysisId))
  ipcMain.handle('analysisLayout:setMargins', (_, analysisId, margins) => setAnalysisMargins(db, analysisId, margins))
  ipcMain.handle('analysisLayout:clearMargins', (_, analysisId) => clearAnalysisMargins(db, analysisId))
  ipcMain.handle('templates:saveAnalysisAsVariant', (_, analysisId: number) => saveAnalysisAsVariant(db, analysisId))
}
