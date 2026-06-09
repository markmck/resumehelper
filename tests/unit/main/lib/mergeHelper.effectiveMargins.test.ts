/**
 * Phase 39 Plan 02 RED tests — effectiveMargins on MergedBuilderData.
 *
 * Integration tests: buildMergedBuilderData resolves margins from the override row
 * using the three-tier precedence (D-06/D-07 / LAYOUT-03).
 *
 * Uses createTestDb() + setAnalysisMargins to seed override rows.
 */
import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import { seedVariant, seedJobPosting, seedAnalysis } from '../../../helpers/factories'
import { buildMergedBuilderData } from '../../../../src/main/lib/mergeHelper'
import { setAnalysisMargins } from '../../../../src/main/handlers/templates'

describe('buildMergedBuilderData — effectiveMargins (D-07 / LAYOUT-03)', () => {
  it('case 1: returns effectiveMargins equal to override triple when override row exists', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    await setAnalysisMargins(db, analysis.id, {
      marginTop: 0.5,
      marginBottom: 0.6,
      marginSides: 0.4,
    })

    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)

    expect(merged.effectiveMargins).toBeDefined()
    expect(merged.effectiveMargins).toEqual({ top: 0.5, bottom: 0.6, sides: 0.4 })
  })

  it('case 2: returns effectiveMargins from variant templateOptions when no override row exists', async () => {
    const db = createTestDb()
    // Seed variant with templateOptions margins
    const variant = seedVariant(db, {
      layoutTemplate: 'modern',
      templateOptions: JSON.stringify({ marginTop: 0.8, marginBottom: 0.9, marginSides: 0.7 }),
    })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // No setAnalysisMargins call — no override row

    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)

    expect(merged.effectiveMargins).toEqual({ top: 0.8, bottom: 0.9, sides: 0.7 })
  })

  it('case 3: analysisId undefined — no override lookup, effectiveMargins from variant templateOptions', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, {
      layoutTemplate: 'jake',
      templateOptions: JSON.stringify({ marginTop: 0.55, marginBottom: 0.55, marginSides: 0.45 }),
    })

    // No analysisId passed
    const merged = await buildMergedBuilderData(db, variant.id)

    expect(merged.effectiveMargins).toEqual({ top: 0.55, bottom: 0.55, sides: 0.45 })
  })

  it('case 4: analysisId undefined, no variant templateOptions → falls back to DOCX_MARGIN_DEFAULTS', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, { layoutTemplate: 'jake' })
    // No templateOptions — no analysisId

    const merged = await buildMergedBuilderData(db, variant.id)

    // jake default: { top: 0.60, bottom: 0.60, sides: 0.50 }
    expect(merged.effectiveMargins).toEqual({ top: 0.60, bottom: 0.60, sides: 0.50 })
  })

  it('case 5: override row exists but analysisId is not passed → override NOT applied', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    await setAnalysisMargins(db, analysis.id, {
      marginTop: 0.3,
      marginBottom: 0.3,
      marginSides: 0.3,
    })

    // No analysisId — should use variant/default not override
    const merged = await buildMergedBuilderData(db, variant.id)

    // classic default: { top: 1.0, bottom: 1.0, sides: 1.0 }
    expect(merged.effectiveMargins).toEqual({ top: 1.0, bottom: 1.0, sides: 1.0 })
    expect(merged.effectiveMargins).not.toEqual({ top: 0.3, bottom: 0.3, sides: 0.3 })
  })

  it('case 6: effectiveMargins is always present (not optional) on the returned object', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, { layoutTemplate: 'minimal' })

    const merged = await buildMergedBuilderData(db, variant.id)

    // The field must always exist (not optional per D-07)
    expect(Object.prototype.hasOwnProperty.call(merged, 'effectiveMargins')).toBe(true)
    // minimal default: { top: 1.0, bottom: 1.0, sides: 1.0 }
    expect(merged.effectiveMargins).toEqual({ top: 1.0, bottom: 1.0, sides: 1.0 })
  })

  it('case 7: malformed variant templateOptions JSON falls back to defaults gracefully (T-39-05)', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, {
      layoutTemplate: 'executive',
      templateOptions: '{ this is not valid JSON !!!',
    })

    // Should not throw; should fall back to template defaults
    const merged = await buildMergedBuilderData(db, variant.id)

    // executive default: { top: 0.80, bottom: 0.80, sides: 0.80 }
    expect(merged.effectiveMargins).toEqual({ top: 0.80, bottom: 0.80, sides: 0.80 })
  })
})
