/**
 * Phase 39 Plan 01 Task 2 — Unit tests for getAnalysisMargins / setAnalysisMargins / clearAnalysisMargins
 *
 * Covers:
 *  - persist / read-back (set → get returns same triple)
 *  - upsert (set twice → one row, latest values)
 *  - missing row → null
 *  - clear → null
 *  - non-finite rejection (NaN / Infinity / -Infinity) — D-09
 *  - variant templateOptions isolation (SC#1 / LAYOUT-02)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import { seedVariant, seedJobPosting, seedAnalysis } from '../../../helpers/factories'
import {
  getAnalysisMargins,
  setAnalysisMargins,
  clearAnalysisMargins,
} from '../../../../src/main/handlers/templates'
import { templateVariants } from '../../../../src/main/db/schema'
import { eq } from 'drizzle-orm'

describe('analysisLayout margin handlers (D-01/D-05/D-09/SC#1)', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
  })

  it('set → get returns the same margin triple', async () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    await setAnalysisMargins(db, analysis.id, { marginTop: 0.75, marginBottom: 0.8, marginSides: 0.5 })
    const result = await getAnalysisMargins(db, analysis.id)

    expect(result).not.toBeNull()
    expect(result!.marginTop).toBe(0.75)
    expect(result!.marginBottom).toBe(0.8)
    expect(result!.marginSides).toBe(0.5)
    expect(result!.analysisId).toBe(analysis.id)
  })

  it('set twice for same analysisId updates in place (one row, latest values)', async () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    await setAnalysisMargins(db, analysis.id, { marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 })
    await setAnalysisMargins(db, analysis.id, { marginTop: 0.5, marginBottom: 0.6, marginSides: 0.4 })

    const result = await getAnalysisMargins(db, analysis.id)
    expect(result).not.toBeNull()
    expect(result!.marginTop).toBe(0.5)
    expect(result!.marginBottom).toBe(0.6)
    expect(result!.marginSides).toBe(0.4)

    // Confirm only one row exists in the table
    const { analysisLayoutOverrides } = await import('../../../../src/main/db/schema')
    const rows = db.select().from(analysisLayoutOverrides).where(eq(analysisLayoutOverrides.analysisId, analysis.id)).all()
    expect(rows).toHaveLength(1)
  })

  it('getAnalysisMargins returns null when no row exists', async () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    const result = await getAnalysisMargins(db, analysis.id)
    expect(result).toBeNull()
  })

  it('clearAnalysisMargins deletes the row; subsequent get returns null', async () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    await setAnalysisMargins(db, analysis.id, { marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 })
    expect(await getAnalysisMargins(db, analysis.id)).not.toBeNull()

    await clearAnalysisMargins(db, analysis.id)
    expect(await getAnalysisMargins(db, analysis.id)).toBeNull()
  })

  it('D-09: setAnalysisMargins throws on NaN marginTop', async () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    await expect(
      setAnalysisMargins(db, analysis.id, { marginTop: NaN, marginBottom: 1.0, marginSides: 1.0 })
    ).rejects.toThrow()
  })

  it('D-09: setAnalysisMargins throws on Infinity marginBottom', async () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    await expect(
      setAnalysisMargins(db, analysis.id, { marginTop: 1.0, marginBottom: Infinity, marginSides: 1.0 })
    ).rejects.toThrow()
  })

  it('D-09: setAnalysisMargins throws on -Infinity marginSides', async () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    await expect(
      setAnalysisMargins(db, analysis.id, { marginTop: 1.0, marginBottom: 1.0, marginSides: -Infinity })
    ).rejects.toThrow()
  })

  it('SC#1 / LAYOUT-02: setting analysis margins does NOT mutate the variant templateOptions', async () => {
    const variant = seedVariant(db, { templateOptions: JSON.stringify({ marginTop: 1.0, marginBottom: 1.0, marginSides: 0.75 }) })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    // Read variant templateOptions before
    const before = db.select({ templateOptions: templateVariants.templateOptions })
      .from(templateVariants)
      .where(eq(templateVariants.id, variant.id))
      .all()[0]

    // Set analysis margin override
    await setAnalysisMargins(db, analysis.id, { marginTop: 0.4, marginBottom: 0.4, marginSides: 0.3 })

    // Read variant templateOptions after — must be unchanged
    const after = db.select({ templateOptions: templateVariants.templateOptions })
      .from(templateVariants)
      .where(eq(templateVariants.id, variant.id))
      .all()[0]

    expect(after.templateOptions).toBe(before.templateOptions)
  })
})
