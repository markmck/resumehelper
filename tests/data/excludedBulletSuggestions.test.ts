import { describe, it, expect } from 'vitest'
import { createTestDb } from '../helpers/db'
import {
  ensureExcludedBulletSuggestions,
  acceptExcludedBulletSuggestion,
  dismissExcludedBulletSuggestion,
  getExcludedBulletSuggestions,
} from '../../src/main/handlers/ai'
import * as schema from '../../src/main/db/schema'

// Seed prerequisite rows including a templateVariantItems row with excluded:true
function seedPrerequisites(db: ReturnType<typeof createTestDb>) {
  const posting = db
    .insert(schema.jobPostings)
    .values({ company: 'Test Co', role: 'Engineer', rawText: 'desc' })
    .returning()
    .all()[0]

  const variant = db
    .insert(schema.templateVariants)
    .values({ name: 'Test Variant', layoutTemplate: 'classic' })
    .returning()
    .all()[0]

  const analysis = db
    .insert(schema.analysisResults)
    .values({ jobPostingId: posting.id, variantId: variant.id, matchScore: 80 })
    .returning()
    .all()[0]

  const job = db
    .insert(schema.jobs)
    .values({ company: 'Test Co', role: 'Engineer', startDate: '2020-01' })
    .returning()
    .all()[0]

  const bullet = db
    .insert(schema.jobBullets)
    .values({ jobId: job.id, text: 'Base bullet text', sortOrder: 0 })
    .returning()
    .all()[0]

  // Insert a templateVariantItems row with excluded:true — required for D-07 validation
  db.insert(schema.templateVariantItems)
    .values({ variantId: variant.id, itemType: 'bullet', bulletId: bullet.id, excluded: true })
    .run()

  return { posting, variant, analysis, job, bullet }
}

describe('ensureExcludedBulletSuggestions', () => {
  it('Test 1: valid excluded bulletId inserts 1 pending row; matchedKeywords stored as JSON string', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    const result = ensureExcludedBulletSuggestions(
      db,
      analysis.id,
      [{ bulletId: bullet.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([bullet.id]),
    )
    expect(result).toEqual({ success: true })

    const rows = db.select().from(schema.analysisExcludedBulletSuggestions).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    expect(rows[0].matchedKeywords).toBe('["kw1"]')
    expect(rows[0].bulletId).toBe(bullet.id)
    expect(rows[0].analysisId).toBe(analysis.id)
  })

  it('Test 2: bulletId 99999 (not in job_bullets) inserts 0 rows', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    ensureExcludedBulletSuggestions(
      db,
      analysis.id,
      [{ bulletId: 99999, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([99999]),
    )

    const rows = db.select().from(schema.analysisExcludedBulletSuggestions).all()
    expect(rows).toHaveLength(0)
  })

  it('Test 3: real bulletId but empty excludedBulletIds set inserts 0 rows', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    ensureExcludedBulletSuggestions(
      db,
      analysis.id,
      [{ bulletId: bullet.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set<number>(),
    )

    const rows = db.select().from(schema.analysisExcludedBulletSuggestions).all()
    expect(rows).toHaveLength(0)
  })
})

describe('acceptExcludedBulletSuggestion', () => {
  it('Test 4: writes exactly 1 entityOverrides row with source=inclusion, field=inclusion, bulletId, overrideText=""; suggestion status flips to accepted', () => {
    const db = createTestDb()
    const { analysis, variant, bullet } = seedPrerequisites(db)

    // Seed the suggestion first
    ensureExcludedBulletSuggestions(
      db,
      analysis.id,
      [{ bulletId: bullet.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([bullet.id]),
    )

    const result = acceptExcludedBulletSuggestion(db, analysis.id, bullet.id)
    expect(result).toEqual({ success: true })

    // entityOverrides should have exactly one row
    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(1)
    const row = eoRows[0]
    expect(row.source).toBe('inclusion')
    expect(row.field).toBe('inclusion')
    expect(row.bulletId).toBe(bullet.id)
    expect(row.overrideText).toBe('')
    expect(row.analysisId).toBe(analysis.id)
    expect(row.variantId).toBe(variant.id)

    // Suggestion status flipped to accepted
    const suggRows = db.select().from(schema.analysisExcludedBulletSuggestions).all()
    expect(suggRows).toHaveLength(1)
    expect(suggRows[0].status).toBe('accepted')
  })

  it('Test 5: bulletId 99999 returns {error}, writes 0 entityOverrides rows', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    const result = acceptExcludedBulletSuggestion(db, analysis.id, 99999)
    expect(result).toHaveProperty('error')
    expect(typeof (result as { error: string }).error).toBe('string')

    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(0)
  })

  it('Test 6: bullet NOT excluded in variant returns {error}, writes 0 entityOverrides rows', () => {
    const db = createTestDb()
    const { posting, variant, analysis, job } = seedPrerequisites(db)

    // Create a different bullet WITHOUT excluded=true in templateVariantItems
    const includedBullet = db
      .insert(schema.jobBullets)
      .values({ jobId: job.id, text: 'Included bullet', sortOrder: 1 })
      .returning()
      .all()[0]

    const result = acceptExcludedBulletSuggestion(db, analysis.id, includedBullet.id)
    expect(result).toHaveProperty('error')
    expect(typeof (result as { error: string }).error).toBe('string')

    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(0)
  })
})

describe('dismissExcludedBulletSuggestion', () => {
  it('Test 7: flips status to dismissed and writes 0 entityOverrides rows', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    ensureExcludedBulletSuggestions(
      db,
      analysis.id,
      [{ bulletId: bullet.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([bullet.id]),
    )

    const result = dismissExcludedBulletSuggestion(db, analysis.id, bullet.id)
    expect(result).toEqual({ success: true })

    const suggRows = db.select().from(schema.analysisExcludedBulletSuggestions).all()
    expect(suggRows).toHaveLength(1)
    expect(suggRows[0].status).toBe('dismissed')

    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(0)
  })
})

describe('getExcludedBulletSuggestions', () => {
  it('Test 8: returns rows with bulletId, bulletText (joined), reason, matchedKeywords (parsed string[]), status', () => {
    const db = createTestDb()
    const { analysis, bullet } = seedPrerequisites(db)

    ensureExcludedBulletSuggestions(
      db,
      analysis.id,
      [{ bulletId: bullet.id, reason: 'test reason', matched_keywords: ['kw1', 'kw2'] }],
      new Set([bullet.id]),
    )

    // Accept one so we have a non-pending status to verify
    acceptExcludedBulletSuggestion(db, analysis.id, bullet.id)

    const rows = getExcludedBulletSuggestions(db, analysis.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].bulletId).toBe(bullet.id)
    expect(rows[0].bulletText).toBe('Base bullet text')
    expect(rows[0].reason).toBe('test reason')
    expect(Array.isArray(rows[0].matchedKeywords)).toBe(true)
    expect(rows[0].matchedKeywords).toEqual(['kw1', 'kw2'])
    expect(rows[0].status).toBe('accepted')
  })
})
