import { describe, it, expect } from 'vitest'
import { createTestDb } from '../helpers/db'
import { acceptSuggestion } from '../../src/main/handlers/ai'
import { buildMergedBuilderData } from '../../src/main/lib/mergeHelper'
import * as schema from '../../src/main/db/schema'

// Seed a minimal set of rows for merge tests
function seedMergePrerequisites(db: ReturnType<typeof createTestDb>) {
  // Template variant
  const variant = db
    .insert(schema.templateVariants)
    .values({ name: 'Merge Test Variant', layoutTemplate: 'classic' })
    .returning()
    .all()[0]

  // Job posting
  const posting = db
    .insert(schema.jobPostings)
    .values({ company: 'Merge Co', role: 'Dev', rawText: 'desc' })
    .returning()
    .all()[0]

  // Analysis linked to the variant
  const analysis = db
    .insert(schema.analysisResults)
    .values({ jobPostingId: posting.id, variantId: variant.id, matchScore: 80 })
    .returning()
    .all()[0]

  // A job
  const job = db
    .insert(schema.jobs)
    .values({ company: 'Merge Co', role: 'Dev', startDate: '2020-01' })
    .returning()
    .all()[0]

  // A bullet on that job
  const bullet = db
    .insert(schema.jobBullets)
    .values({ jobId: job.id, text: 'Base', sortOrder: 0 })
    .returning()
    .all()[0]

  return { variant, posting, analysis, job, bullet }
}

describe('mergeHelper Layer 3 reads from entity_overrides', () => {
  it('Test 1: accepted suggestion renders — buildMergedBuilderData returns overridden text (ROADMAP #3 no-regression)', async () => {
    const db = createTestDb()
    const { variant, analysis, job: _job, bullet } = seedMergePrerequisites(db)

    // Accept the suggestion — writes to entity_overrides
    acceptSuggestion(db, analysis.id, bullet.id, 'Accepted text')

    // Merge should reflect the accepted text
    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)
    const allBullets = merged.jobs.flatMap((j) => j.bullets)
    const overriddenBullet = allBullets.find((b) => b.id === bullet.id)

    expect(overriddenBullet).toBeDefined()
    expect(overriddenBullet!.text).toBe('Accepted text')
    // Must NOT be the base text
    expect(overriddenBullet!.text).not.toBe('Base')
  })

  it('Test 2: no analysisId = no override applied — bullet stays as base text', async () => {
    const db = createTestDb()
    const { variant, analysis, bullet } = seedMergePrerequisites(db)

    // Accept the suggestion so there IS a row in entity_overrides
    acceptSuggestion(db, analysis.id, bullet.id, 'Accepted text')

    // Build WITHOUT analysisId — Layer 3 must not run
    const merged = await buildMergedBuilderData(db, variant.id)
    const allBullets = merged.jobs.flatMap((j) => j.bullets)
    const baseBullet = allBullets.find((b) => b.id === bullet.id)

    expect(baseBullet).toBeDefined()
    expect(baseBullet!.text).toBe('Base')
  })

  it('Test 3: migrated-style entity_overrides row renders via buildMergedBuilderData', async () => {
    const db = createTestDb()
    const { variant, analysis, bullet } = seedMergePrerequisites(db)

    // Insert directly as if migrated from Plan 02
    db.insert(schema.entityOverrides).values({
      analysisId: analysis.id,
      variantId: variant.id,
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Migrated',
      source: 'ai_suggestion',
    }).run()

    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)
    const allBullets = merged.jobs.flatMap((j) => j.bullets)
    const migratedBullet = allBullets.find((b) => b.id === bullet.id)

    expect(migratedBullet).toBeDefined()
    expect(migratedBullet!.text).toBe('Migrated')
  })
})
