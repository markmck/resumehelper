import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDb } from '../helpers/db'
import { migrateBulletOverrides, assertOverrideRowCounts } from '../../src/main/db/migrateOverrides'

// Helper: get the raw sqlite handle from createTestDb
// createTestDb returns a drizzle db; we need the raw sqlite for the migration functions.
// We open a parallel raw Database on :memory: and apply the same schema via createTestDb internally.
function createTestSqlite(): Database.Database {
  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  // Apply schema matching createTestDb (we call createTestDb to get the drizzle wrapper,
  // but we need to use a raw handle that has the same tables — so we wire createTestDb
  // to seed data via drizzle, then use a separate raw sqlite for migration functions).
  // Instead, we open raw and apply the DDL manually from the test helper.
  // The cleanest approach: use createTestDb() to produce the schema, then access
  // the underlying sqlite via a closure workaround.
  // Since createTestDb doesn't expose sqlite, we re-apply the same DDL here.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS \`jobs\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`company\` text NOT NULL,
      \`role\` text NOT NULL,
      \`start_date\` text NOT NULL,
      \`end_date\` text,
      \`created_at\` integer NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS \`job_bullets\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`job_id\` integer NOT NULL,
      \`text\` text NOT NULL,
      \`sort_order\` integer DEFAULT 0 NOT NULL,
      FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS \`template_variants\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`layout_template\` text DEFAULT 'traditional' NOT NULL,
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      \`score_threshold\` integer NOT NULL DEFAULT 80
    );

    CREATE TABLE IF NOT EXISTS \`job_postings\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`company\` text NOT NULL,
      \`role\` text NOT NULL,
      \`raw_text\` text NOT NULL DEFAULT '',
      \`parsed_skills\` text NOT NULL DEFAULT '[]',
      \`parsed_keywords\` text NOT NULL DEFAULT '[]',
      \`parsed_requirements\` text NOT NULL DEFAULT '[]',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS \`analysis_results\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`job_posting_id\` integer NOT NULL,
      \`variant_id\` integer,
      \`match_score\` integer NOT NULL DEFAULT 0,
      \`keyword_hits\` text NOT NULL DEFAULT '[]',
      \`keyword_misses\` text NOT NULL DEFAULT '[]',
      \`gap_skills\` text NOT NULL DEFAULT '[]',
      \`suggestions\` text NOT NULL DEFAULT '[]',
      \`ats_flags\` text NOT NULL DEFAULT '[]',
      \`raw_llm_response\` text NOT NULL DEFAULT '',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`job_posting_id\`) REFERENCES \`job_postings\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`variant_id\`) REFERENCES \`template_variants\`(\`id\`) ON DELETE set null
    );

    CREATE TABLE IF NOT EXISTS \`projects\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`sort_order\` integer DEFAULT 0 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS \`project_bullets\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`project_id\` integer NOT NULL,
      \`text\` text NOT NULL,
      \`sort_order\` integer DEFAULT 0 NOT NULL,
      FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS \`analysis_bullet_overrides\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`analysis_id\` integer NOT NULL,
      \`bullet_id\` integer NOT NULL,
      \`override_text\` text NOT NULL,
      \`source\` text NOT NULL DEFAULT 'ai_suggestion',
      \`suggestion_id\` text,
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`analysis_id\`) REFERENCES \`analysis_results\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade,
      UNIQUE (\`analysis_id\`, \`bullet_id\`)
    );

    CREATE TABLE IF NOT EXISTS \`entity_overrides\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`variant_id\` integer,
      \`analysis_id\` integer,
      \`entity_type\` text NOT NULL,
      \`bullet_id\` integer,
      \`project_id\` integer,
      \`job_id\` integer,
      \`project_bullet_id\` integer,
      \`field\` text NOT NULL,
      \`override_text\` text NOT NULL,
      \`source\` text NOT NULL DEFAULT 'user',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`variant_id\`) REFERENCES \`template_variants\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`analysis_id\`) REFERENCES \`analysis_results\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`project_bullet_id\`) REFERENCES \`project_bullets\`(\`id\`) ON DELETE cascade
    );

    CREATE UNIQUE INDEX IF NOT EXISTS \`entity_overrides_variant_tier_uidx\`
      ON \`entity_overrides\` (\`variant_id\`, \`entity_type\`, \`bullet_id\`, \`project_id\`, \`job_id\`, \`project_bullet_id\`, \`field\`)
      WHERE \`analysis_id\` IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS \`entity_overrides_analysis_tier_uidx\`
      ON \`entity_overrides\` (\`analysis_id\`, \`entity_type\`, \`bullet_id\`, \`project_id\`, \`job_id\`, \`project_bullet_id\`, \`field\`)
      WHERE \`analysis_id\` IS NOT NULL;
  `)
  return sqlite
}

// Seed helpers
function seedJob(sqlite: Database.Database): number {
  sqlite.exec(`INSERT INTO jobs (company, role, start_date) VALUES ('ACME', 'Dev', '2020-01')`)
  return (sqlite.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id
}

function seedVariant(sqlite: Database.Database): number {
  sqlite.exec(`INSERT INTO template_variants (name) VALUES ('Default')`)
  return (sqlite.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id
}

function seedJobPosting(sqlite: Database.Database): number {
  sqlite.exec(`INSERT INTO job_postings (company, role) VALUES ('ACME', 'Dev')`)
  return (sqlite.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id
}

function seedAnalysis(sqlite: Database.Database, jobPostingId: number, variantId: number | null): number {
  sqlite.prepare(`INSERT INTO analysis_results (job_posting_id, variant_id) VALUES (?, ?)`).run(jobPostingId, variantId)
  return (sqlite.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id
}

function seedBullet(sqlite: Database.Database, jobId: number): number {
  sqlite.prepare(`INSERT INTO job_bullets (job_id, text) VALUES (?, ?)`).run(jobId, 'Some bullet')
  return (sqlite.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id
}

function seedOverride(
  sqlite: Database.Database,
  analysisId: number,
  bulletId: number,
  overrideText: string,
  source = 'ai_suggestion'
): number {
  sqlite.prepare(
    `INSERT INTO analysis_bullet_overrides (analysis_id, bullet_id, override_text, source) VALUES (?, ?, ?, ?)`
  ).run(analysisId, bulletId, overrideText, source)
  return (sqlite.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id
}

describe('migrateBulletOverrides', () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = createTestSqlite()
  })

  it('Test 1 (column mapping): maps bullet_id correctly, NOT analysis_id (guards Pitfall 1)', () => {
    const jobId = seedJob(sqlite)
    const variantId = seedVariant(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    // Insert a "dummy" analysis first so analysisId != bulletId we care about
    const _dummyAnalysisId = seedAnalysis(sqlite, jobPostingId, null)  // analysisId=1 (NULL variant, will be skipped)
    const analysisId = seedAnalysis(sqlite, jobPostingId, variantId)   // analysisId=2

    // Insert a "dummy" bullet first so the next bulletId is > analysisId
    const _dummyBulletId = seedBullet(sqlite, jobId)  // bulletId=1
    const _dummyBulletId2 = seedBullet(sqlite, jobId) // bulletId=2
    const bulletId = seedBullet(sqlite, jobId)        // bulletId=3 — clearly != analysisId=2

    seedOverride(sqlite, analysisId, bulletId, 'X', 'ai_suggestion')

    migrateBulletOverrides(sqlite)

    const row = sqlite.prepare(
      `SELECT * FROM entity_overrides WHERE entity_type='job_bullet'`
    ).get() as {
      bullet_id: number
      analysis_id: number
      variant_id: number
      entity_type: string
      field: string
      override_text: string
      source: string
      project_id: number | null
      job_id: number | null
      project_bullet_id: number | null
    } | undefined

    expect(row).toBeDefined()
    // CRITICAL: bullet_id must be bulletId (3) — NOT analysisId (2) — Pitfall 1 guard
    expect(row!.bullet_id).toBe(bulletId)       // 3
    expect(row!.bullet_id).not.toBe(analysisId) // not 2
    expect(row!.analysis_id).toBe(analysisId)   // 2
    expect(row!.variant_id).toBe(variantId)
    expect(row!.entity_type).toBe('job_bullet')
    expect(row!.field).toBe('text')
    expect(row!.override_text).toBe('X')
    expect(row!.source).toBe('ai_suggestion')
    expect(row!.project_id).toBeNull()
    expect(row!.job_id).toBeNull()
    expect(row!.project_bullet_id).toBeNull()
  })

  it('Test 2 (row-count parity): all N rows with resolvable variant_id migrate', () => {
    const jobId = seedJob(sqlite)
    const variantId = seedVariant(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    const analysisId = seedAnalysis(sqlite, jobPostingId, variantId)

    const N = 3
    for (let i = 0; i < N; i++) {
      const bulletId = seedBullet(sqlite, jobId)
      seedOverride(sqlite, analysisId, bulletId, `Override ${i}`)
    }

    migrateBulletOverrides(sqlite)

    const { cnt } = sqlite.prepare(
      `SELECT COUNT(*) as cnt FROM entity_overrides WHERE entity_type='job_bullet'`
    ).get() as { cnt: number }

    expect(cnt).toBe(N)
  })

  it('Test 3 (idempotency): calling twice does not duplicate rows', () => {
    const jobId = seedJob(sqlite)
    const variantId = seedVariant(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    const analysisId = seedAnalysis(sqlite, jobPostingId, variantId)
    const bulletId = seedBullet(sqlite, jobId)
    seedOverride(sqlite, analysisId, bulletId, 'Idempotent test')

    migrateBulletOverrides(sqlite)
    migrateBulletOverrides(sqlite)

    const { cnt } = sqlite.prepare(
      `SELECT COUNT(*) as cnt FROM entity_overrides WHERE entity_type='job_bullet'`
    ).get() as { cnt: number }

    expect(cnt).toBe(1)
  })

  it('Test 4 (NULL variant skip): rows with NULL variant_id are not inserted', () => {
    const jobId = seedJob(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    // analysis_results row with variant_id = NULL
    const analysisId = seedAnalysis(sqlite, jobPostingId, null)
    const bulletId = seedBullet(sqlite, jobId)
    seedOverride(sqlite, analysisId, bulletId, 'Should be skipped')

    const result = migrateBulletOverrides(sqlite)

    const { cnt } = sqlite.prepare(
      `SELECT COUNT(*) as cnt FROM entity_overrides`
    ).get() as { cnt: number }

    expect(cnt).toBe(0)
    expect(result.skippedNullVariant).toBe(1)
    expect(result.migrated).toBe(0)
  })

  it('Test 5 (source carried verbatim): manual_edit source is preserved', () => {
    const jobId = seedJob(sqlite)
    const variantId = seedVariant(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    const analysisId = seedAnalysis(sqlite, jobPostingId, variantId)
    const bulletId = seedBullet(sqlite, jobId)
    seedOverride(sqlite, analysisId, bulletId, 'Manual text', 'manual_edit')

    migrateBulletOverrides(sqlite)

    const row = sqlite.prepare(
      `SELECT source FROM entity_overrides WHERE entity_type='job_bullet'`
    ).get() as { source: string } | undefined

    expect(row).toBeDefined()
    expect(row!.source).toBe('manual_edit')
  })
})

describe('assertOverrideRowCounts', () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = createTestSqlite()
  })

  it('Test 6 (assertion warn-not-throw): returns mismatch result without throwing', () => {
    const jobId = seedJob(sqlite)
    const variantId = seedVariant(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    const analysisId = seedAnalysis(sqlite, jobPostingId, variantId)
    const bulletId = seedBullet(sqlite, jobId)
    seedOverride(sqlite, analysisId, bulletId, 'Before migration')

    // Run migration first so entity_overrides has 1 row
    migrateBulletOverrides(sqlite)

    // Now insert a new row into analysis_bullet_overrides AFTER migration
    // to force a mismatch (src > dst)
    const bulletId2 = seedBullet(sqlite, jobId)
    seedOverride(sqlite, analysisId, bulletId2, 'After migration — causes mismatch')

    // assertOverrideRowCounts should return { ok: false } WITHOUT throwing
    let result: ReturnType<typeof assertOverrideRowCounts>
    expect(() => {
      result = assertOverrideRowCounts(sqlite)
    }).not.toThrow()

    result = assertOverrideRowCounts(sqlite)
    expect(result.ok).toBe(false)
    expect(result.srcCount).toBeGreaterThan(result.dstCount)
  })

  it('assertOverrideRowCounts returns ok:true when counts match', () => {
    const jobId = seedJob(sqlite)
    const variantId = seedVariant(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    const analysisId = seedAnalysis(sqlite, jobPostingId, variantId)
    const bulletId = seedBullet(sqlite, jobId)
    seedOverride(sqlite, analysisId, bulletId, 'Test row')

    migrateBulletOverrides(sqlite)

    const result = assertOverrideRowCounts(sqlite)
    expect(result.ok).toBe(true)
  })

  it('assertOverrideRowCounts accounts for NULL-variant skipped rows', () => {
    const jobId = seedJob(sqlite)
    const variantId = seedVariant(sqlite)
    const jobPostingId = seedJobPosting(sqlite)
    // One row with valid variant, one with NULL
    const analysisId1 = seedAnalysis(sqlite, jobPostingId, variantId)
    const analysisId2 = seedAnalysis(sqlite, jobPostingId, null)
    const bulletId1 = seedBullet(sqlite, jobId)
    const bulletId2 = seedBullet(sqlite, jobId)
    seedOverride(sqlite, analysisId1, bulletId1, 'Migrated row')
    seedOverride(sqlite, analysisId2, bulletId2, 'Skipped row (NULL variant)')

    migrateBulletOverrides(sqlite)

    const result = assertOverrideRowCounts(sqlite)
    // srcCount=2, dstCount=1, skippedNullVariant=1 => dstCount + skipped = srcCount => ok:true
    expect(result.ok).toBe(true)
    expect(result.srcCount).toBe(2)
    expect(result.dstCount).toBe(1)
    expect(result.skippedNullVariant).toBe(1)
  })
})
