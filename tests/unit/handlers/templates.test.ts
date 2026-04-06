import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../helpers/db'
import {
  seedJob,
  seedJobWithBullets,
  seedVariant,
  seedSkill,
  seedJobPosting,
  seedAnalysis,
  seedBulletOverride,
} from '../../helpers/factories'
import {
  listVariants,
  createVariant,
  renameVariant,
  deleteVariant,
  duplicateVariant,
  getBuilderData,
  setItemExcluded,
  setThreshold,
  getThreshold,
} from '../../../src/main/handlers/templates'
import * as schema from '../../../src/main/db/schema'

describe('variant CRUD', () => {
  it('listVariants returns empty array on fresh DB', async () => {
    const db = createTestDb()
    const result = await listVariants(db)
    expect(result).toEqual([])
  })

  it('createVariant with name returns row with id and default layoutTemplate classic', async () => {
    const db = createTestDb()
    const result = await createVariant(db, { name: 'My Variant' })
    expect(result.id).toBeTypeOf('number')
    expect(result.name).toBe('My Variant')
    expect(result.layoutTemplate).toBe('classic')
  })

  it('createVariant with non-executive template auto-inserts summary exclusion row', async () => {
    const db = createTestDb()
    const result = await createVariant(db, { name: 'Classic Var', layoutTemplate: 'classic' })
    const items = db.select().from(schema.templateVariantItems).where(
      // eq would normally filter but we check all items of this variant
    ).all()
    const summaryItem = items.find(
      (i: typeof schema.templateVariantItems.$inferSelect) => i.variantId === result.id && i.itemType === 'summary',
    )
    expect(summaryItem).toBeDefined()
    expect(summaryItem?.excluded).toBe(true)
  })

  it('createVariant with executive template does NOT auto-insert summary exclusion', async () => {
    const db = createTestDb()
    const result = await createVariant(db, { name: 'Exec Var', layoutTemplate: 'executive' })
    const items = db.select().from(schema.templateVariantItems).all()
    const summaryItem = items.find(
      (i: typeof schema.templateVariantItems.$inferSelect) => i.variantId === result.id && i.itemType === 'summary',
    )
    expect(summaryItem).toBeUndefined()
  })

  it('renameVariant changes variant name', async () => {
    const db = createTestDb()
    const created = await createVariant(db, { name: 'Original Name' })
    await renameVariant(db, created.id, 'New Name')
    const variants = await listVariants(db)
    expect(variants[0].name).toBe('New Name')
  })

  it('deleteVariant removes variant and its items', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    // Add an exclusion item
    db.insert(schema.templateVariantItems).values({ variantId: variant.id, itemType: 'summary', excluded: true }).run()
    await deleteVariant(db, variant.id)
    const variants = await listVariants(db)
    expect(variants).toHaveLength(0)
    const items = db.select().from(schema.templateVariantItems).all()
    expect(items).toHaveLength(0)
  })

  it('duplicateVariant copies variant and all exclusion items', async () => {
    const db = createTestDb()
    const { job, bullets } = seedJobWithBullets(db, ['Bullet A'])
    const variant = seedVariant(db, { name: 'Original' })
    // Add a bullet exclusion
    db.insert(schema.templateVariantItems).values({
      variantId: variant.id,
      itemType: 'bullet',
      bulletId: bullets[0].id,
      excluded: true,
    }).run()
    const newVariant = duplicateVariant(db, variant.id)
    expect(newVariant.name).toBe('Original (Copy)')
    const newItems = db.select().from(schema.templateVariantItems).where(
      // we want all items, filter in JS
    ).all().filter((i: typeof schema.templateVariantItems.$inferSelect) => i.variantId === newVariant.id)
    expect(newItems).toHaveLength(1)
    expect(newItems[0].itemType).toBe('bullet')
    expect(newItems[0].bulletId).toBe(bullets[0].id)
    void job // suppress unused warning
  })
})

describe('getBuilderData - variant selection (D-06)', () => {
  it('returns all jobs with bullets when no exclusions exist', async () => {
    const db = createTestDb()
    const { job, bullets } = seedJobWithBullets(db, ['Bullet 1', 'Bullet 2'])
    const variant = seedVariant(db)
    const result = await getBuilderData(db, variant.id)
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0].id).toBe(job.id)
    expect(result.jobs[0].excluded).toBe(false)
    expect(result.jobs[0].bullets).toHaveLength(2)
    expect(result.jobs[0].bullets[0].excluded).toBe(false)
    void bullets
  })

  it('marks bullet as excluded:true when variant excludes that bullet', async () => {
    const db = createTestDb()
    const { bullets } = seedJobWithBullets(db, ['Bullet A', 'Bullet B'])
    const variant = seedVariant(db)
    await setItemExcluded(db, variant.id, 'bullet', bullets[0].id, true)
    const result = await getBuilderData(db, variant.id)
    expect(result.jobs[0].bullets[0].excluded).toBe(true)
    expect(result.jobs[0].bullets[1].excluded).toBe(false)
  })

  it('marks job as excluded:true when variant excludes that job', async () => {
    const db = createTestDb()
    const { job } = seedJobWithBullets(db, ['Bullet 1'])
    const variant = seedVariant(db)
    await setItemExcluded(db, variant.id, 'job', job.id, true)
    const result = await getBuilderData(db, variant.id)
    expect(result.jobs[0].excluded).toBe(true)
  })
})

describe('setItemExcluded cascade (D-06)', () => {
  it('excluding a job creates templateVariantItems rows for job AND each of its bullets', async () => {
    const db = createTestDb()
    const { job, bullets } = seedJobWithBullets(db, ['Bullet A', 'Bullet B', 'Bullet C'])
    const variant = seedVariant(db)
    await setItemExcluded(db, variant.id, 'job', job.id, true)
    const items = db.select().from(schema.templateVariantItems).all()
    const jobItem = items.find((i: typeof schema.templateVariantItems.$inferSelect) => i.itemType === 'job' && i.jobId === job.id)
    const bulletItems = items.filter((i: typeof schema.templateVariantItems.$inferSelect) => i.itemType === 'bullet')
    expect(jobItem).toBeDefined()
    expect(bulletItems).toHaveLength(3)
    expect(bulletItems.every((i: typeof schema.templateVariantItems.$inferSelect) => i.excluded === true)).toBe(true)
    void bullets
  })

  it('un-excluding a job (excluded=false) removes all bullet exclusion rows too', async () => {
    const db = createTestDb()
    const { job, bullets } = seedJobWithBullets(db, ['Bullet A', 'Bullet B'])
    const variant = seedVariant(db)
    // First exclude
    await setItemExcluded(db, variant.id, 'job', job.id, true)
    // Then un-exclude
    await setItemExcluded(db, variant.id, 'job', job.id, false)
    const items = db.select().from(schema.templateVariantItems).all()
    const jobItem = items.find((i: typeof schema.templateVariantItems.$inferSelect) => i.itemType === 'job' && i.jobId === job.id)
    const bulletItems = items.filter((i: typeof schema.templateVariantItems.$inferSelect) => i.itemType === 'bullet')
    expect(jobItem).toBeUndefined()
    expect(bulletItems).toHaveLength(0)
    void bullets
  })
})

describe('three-layer integration (D-07)', () => {
  it('merges variant exclusions (layer 2) and analysis overrides (layer 3) correctly', async () => {
    const db = createTestDb()
    // Seed: job with 3 bullets
    const { bullets } = seedJobWithBullets(db, ['Bullet A', 'Bullet B', 'Bullet C'])
    const bulletA = bullets[0]
    const bulletB = bullets[1]
    const bulletC = bullets[2]

    const variant = seedVariant(db)

    // Layer 2: variant excludes Bullet B
    await setItemExcluded(db, variant.id, 'bullet', bulletB.id, true)

    // Layer 3: analysis overrides Bullet A text
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)
    seedBulletOverride(db, analysis.id, bulletA.id, { overrideText: 'AI-enhanced Bullet A' })

    // Call getBuilderData with both variantId and analysisId
    const result = await getBuilderData(db, variant.id, analysis.id)

    expect(result.jobs[0].bullets).toHaveLength(3)

    // Layer 3 applied: bullet A text replaced by override
    const resultA = result.jobs[0].bullets.find((b) => b.id === bulletA.id)
    expect(resultA?.text).toBe('AI-enhanced Bullet A')

    // Layer 2 applied: bullet B marked excluded
    const resultB = result.jobs[0].bullets.find((b) => b.id === bulletB.id)
    expect(resultB?.excluded).toBe(true)

    // Layer 1 unchanged: bullet C text unchanged
    const resultC = result.jobs[0].bullets.find((b) => b.id === bulletC.id)
    expect(resultC?.text).toBe('Bullet C')
    expect(resultC?.excluded).toBe(false)
  })
})

describe('threshold', () => {
  it('setThreshold and getThreshold round-trip', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    await setThreshold(db, variant.id, 85)
    const result = getThreshold(db, variant.id)
    expect(result).toBe(85)
  })

  it('getThreshold returns 80 when no threshold set', () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const result = getThreshold(db, variant.id)
    expect(result).toBe(80)
  })
})
