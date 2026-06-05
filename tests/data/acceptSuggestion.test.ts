import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { createTestDb } from '../helpers/db'
import { acceptSuggestion, dismissSuggestion, getOverrides } from '../../src/main/handlers/ai'
import * as schema from '../../src/main/db/schema'

// Helpers to seed prerequisite rows
function seedPrerequisites(db: ReturnType<typeof createTestDb>) {
  // Seed a job posting (required for analysis_results FK)
  const posting = db
    .insert(schema.jobPostings)
    .values({ company: 'Test Co', role: 'Engineer', rawText: 'desc' })
    .returning()
    .all()[0]

  // Seed a template variant (required for analysis_results.variant_id)
  const variant = db
    .insert(schema.templateVariants)
    .values({ name: 'Test Variant', layoutTemplate: 'classic' })
    .returning()
    .all()[0]

  // Seed analysis_results with variant_id=variant.id (id=1, variant_id=7 per plan analogy)
  const analysis = db
    .insert(schema.analysisResults)
    .values({ jobPostingId: posting.id, variantId: variant.id, matchScore: 80 })
    .returning()
    .all()[0]

  // Seed a job (required for job_bullets FK)
  const job = db
    .insert(schema.jobs)
    .values({ company: 'Test Co', role: 'Engineer', startDate: '2020-01' })
    .returning()
    .all()[0]

  // Seed a job bullet
  const bullet = db
    .insert(schema.jobBullets)
    .values({ jobId: job.id, text: 'Base bullet text', sortOrder: 0 })
    .returning()
    .all()[0]

  return { posting, variant, analysis, job, bullet }
}

describe('acceptSuggestion', () => {
  it('Test 1: writes analysis-tier row to entity_overrides with correct columns; no row in analysis_bullet_overrides (no dual-write)', () => {
    const db = createTestDb()
    const { analysis, variant, bullet } = seedPrerequisites(db)

    const result = acceptSuggestion(db, analysis.id, bullet.id, 'New text')
    expect(result).toEqual({ success: true })

    // entity_overrides should have exactly one row
    const eoRows = db
      .select()
      .from(schema.entityOverrides)
      .all()
    expect(eoRows).toHaveLength(1)
    const row = eoRows[0]
    expect(row.analysisId).toBe(analysis.id)
    expect(row.variantId).toBe(variant.id)
    expect(row.entityType).toBe('job_bullet')
    expect(row.field).toBe('text')
    expect(row.bulletId).toBe(bullet.id)
    expect(row.overrideText).toBe('New text')
    expect(row.source).toBe('ai_suggestion')

    // analysis_bullet_overrides must have ZERO rows (no dual-write, D-06)
    const aboRows = db
      .select()
      .from(schema.analysisBulletOverrides)
      .all()
    expect(aboRows).toHaveLength(0)
  })

  it('Test 2: accept is upsert — calling twice keeps exactly one row with latest text', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    acceptSuggestion(db, analysis.id, bullet.id, 'First text')
    acceptSuggestion(db, analysis.id, bullet.id, 'Second text')

    const eoRows = db
      .select()
      .from(schema.entityOverrides)
      .all()
    expect(eoRows).toHaveLength(1)
    expect(eoRows[0].overrideText).toBe('Second text')
  })

  it('Test 3: dismissSuggestion removes the entity_overrides row for that analysis+bullet', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    acceptSuggestion(db, analysis.id, bullet.id, 'New text')
    // Verify it was inserted
    expect(db.select().from(schema.entityOverrides).all()).toHaveLength(1)

    const result = dismissSuggestion(db, analysis.id, bullet.id)
    expect(result).toEqual({ success: true })

    const eoRows = db
      .select()
      .from(schema.entityOverrides)
      .all()
    expect(eoRows).toHaveLength(0)
  })

  it('Test 4: getOverrides reads from entity_overrides and returns correct shape with isOrphaned:false', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    acceptSuggestion(db, analysis.id, bullet.id, 'Accepted text')

    const overrides = getOverrides(db, analysis.id) as Array<{
      bulletId: number
      overrideText: string
      source: string
      suggestionId: null
      isOrphaned: boolean
    }>

    expect(overrides).toHaveLength(1)
    expect(overrides[0].bulletId).toBe(bullet.id)
    expect(overrides[0].overrideText).toBe('Accepted text')
    expect(overrides[0].source).toBe('ai_suggestion')
    expect(overrides[0].suggestionId).toBeNull()
    expect(overrides[0].isOrphaned).toBe(false)
  })

  it('Test 4b: getOverrides returns isOrphaned:true for a row whose bullet no longer exists', () => {
    // We need to insert an entity_overrides row with a bulletId that has no matching job_bullets row.
    // Approach: create a fresh sqlite db, disable FK checks to insert the orphaned row,
    // then re-enable and run getOverrides through drizzle.
    const sqlite = new Database(':memory:')
    sqlite.pragma('journal_mode = WAL')
    // Apply the same schema as createTestDb uses (minimal subset needed for this test)
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
        FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`entity_overrides_analysis_tier_uidx\`
        ON \`entity_overrides\` (\`analysis_id\`, \`entity_type\`, \`bullet_id\`, \`project_id\`, \`job_id\`, \`project_bullet_id\`, \`field\`)
        WHERE \`analysis_id\` IS NOT NULL;
    `)

    // Seed prerequisite rows
    sqlite.prepare("INSERT INTO template_variants (name, layout_template) VALUES ('V', 'classic')").run()
    sqlite.prepare("INSERT INTO job_postings (company, role, raw_text) VALUES ('Co', 'Role', '')").run()
    sqlite.prepare("INSERT INTO analysis_results (job_posting_id, variant_id, match_score) VALUES (1, 1, 80)").run()

    // Disable FK checks temporarily to insert an orphaned row
    sqlite.pragma('foreign_keys = OFF')
    // bulletId 9999 does not exist in job_bullets
    sqlite.prepare(
      "INSERT INTO entity_overrides (analysis_id, variant_id, entity_type, field, bullet_id, override_text, source) VALUES (1, 1, 'job_bullet', 'text', 9999, 'Orphaned text', 'ai_suggestion')"
    ).run()
    sqlite.pragma('foreign_keys = ON')

    const db2 = drizzle(sqlite, { schema })
    const overrides = getOverrides(db2, 1) as Array<{
      bulletId: number
      overrideText: string
      source: string
      suggestionId: null
      isOrphaned: boolean
    }>

    expect(overrides).toHaveLength(1)
    expect(overrides[0].bulletId).toBe(9999)
    expect(overrides[0].isOrphaned).toBe(true)
    expect(overrides[0].suggestionId).toBeNull()
  })

  it('Test 5: acceptSuggestion returns {success:true} on success; error path returns {error: string}', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    // Success path
    const successResult = acceptSuggestion(db, analysis.id, bullet.id, 'text')
    expect(successResult).toEqual({ success: true })

    // Error path: pass null as db to trigger a runtime error caught by try/catch
    const errResult = acceptSuggestion(null as never, -1, -1, 'text')
    expect(errResult).toHaveProperty('error')
    expect(typeof (errResult as { error: string }).error).toBe('string')
  })
})
