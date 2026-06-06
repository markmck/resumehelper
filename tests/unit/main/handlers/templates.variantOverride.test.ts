/**
 * Phase 36 Wave-0 RED tests — D-02/D-03 variant-override handler round-trip.
 *
 * The three handlers (getVariantOverrides/setVariantOverride/clearVariantOverride) are
 * added by Plan 03 in src/main/handlers/templates.ts. Until then these imports resolve to
 * undefined and the suite is RED — this is the explicitly-allowed RED-via-missing-export
 * case for this plan (the handlers are not yet exported). All fixtures use the locked
 * tokens (job_bullet/text) and source='user' verbatim. We never use eq(col, null).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import { seedVariant, seedJob, seedBullet, seedJobPosting, seedAnalysis } from '../../../helpers/factories'
import {
  getVariantOverrides,
  setVariantOverride,
  clearVariantOverride,
} from '../../../../src/main/handlers/templates'
import { entityOverrides } from '../../../../src/main/db/schema'

describe('variant-override handlers (D-02/D-03)', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
  })

  it('case 1: setVariantOverride stores a row that getVariantOverrides returns with the correct shape', async () => {
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id, { text: 'Base text' })
    const variant = seedVariant(db)

    await setVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id }, 'New text')

    const rows = await getVariantOverrides(db, variant.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].entityType).toBe('job_bullet')
    expect(rows[0].field).toBe('text')
    expect(rows[0].bulletId).toBe(bullet.id)
    expect(rows[0].overrideText).toBe('New text')
    expect(rows[0].source).toBe('user')
  })

  it('case 2: setVariantOverride with whitespace-only text DELETES the override (D-02 empty-deletes)', async () => {
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id, { text: 'Base text' })
    const variant = seedVariant(db)

    // First store a real override
    await setVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id }, 'New text')
    expect(await getVariantOverrides(db, variant.id)).toHaveLength(1)

    // Then call again with whitespace — should delete it
    await setVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id }, '   ')

    const rows = await getVariantOverrides(db, variant.id)
    expect(rows).toHaveLength(0)
  })

  it('case 3: setVariantOverride twice on the same entity replaces (no duplicate, second text wins)', async () => {
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id, { text: 'Base text' })
    const variant = seedVariant(db)

    await setVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id }, 'First text')
    await setVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id }, 'Second text')

    const rows = await getVariantOverrides(db, variant.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].overrideText).toBe('Second text')
  })

  it('case 4: clearVariantOverride deletes the row → getVariantOverrides empty', async () => {
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id, { text: 'Base text' })
    const variant = seedVariant(db)

    await setVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id }, 'New text')
    expect(await getVariantOverrides(db, variant.id)).toHaveLength(1)

    await clearVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id })

    const rows = await getVariantOverrides(db, variant.id)
    expect(rows).toHaveLength(0)
  })

  it('case 5: getVariantOverrides returns ONLY analysis_id IS NULL rows (no cross-tier leak)', async () => {
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id, { text: 'Base text' })
    const variant = seedVariant(db)

    // Variant-tier row (analysis_id NULL) via the handler
    await setVariantOverride(db, variant.id, 'job_bullet', 'text', { bulletId: bullet.id }, 'Variant text')

    // Directly insert an analysis-tier row for the SAME variant — must NOT be returned.
    // Reference a real analysis_results FK (foreign_keys is ON, matching production); the
    // row is asserted to be excluded by the analysis_id IS NULL read, not joined.
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })
    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: analysis.id,
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Analysis text',
      source: 'ai_suggestion',
    }).run()

    const rows = await getVariantOverrides(db, variant.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].overrideText).toBe('Variant text')
    expect(rows.every((r) => r.overrideText !== 'Analysis text')).toBe(true)
  })
})
