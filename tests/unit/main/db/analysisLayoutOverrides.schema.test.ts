/**
 * Phase 39 Plan 01 Task 1 — RED tests
 * Verifies the analysis_layout_overrides table exists in createTestDb()
 * with correct structure, unique constraint, and cascade delete.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import { seedJobPosting, seedAnalysis } from '../../../helpers/factories'
import { analysisLayoutOverrides, analysisResults } from '../../../../src/main/db/schema'
import { eq } from 'drizzle-orm'

describe('analysis_layout_overrides table (D-01/D-02/D-03/D-04/D-05)', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
  })

  it('D-01: inserts a row and reads back the same margin triple', () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    db.insert(analysisLayoutOverrides)
      .values({ analysisId: analysis.id, marginTop: 0.75, marginBottom: 0.75, marginSides: 0.5 })
      .run()

    const rows = db.select().from(analysisLayoutOverrides).where(eq(analysisLayoutOverrides.analysisId, analysis.id)).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].marginTop).toBe(0.75)
    expect(rows[0].marginBottom).toBe(0.75)
    expect(rows[0].marginSides).toBe(0.5)
  })

  it('D-02: unique constraint — second insert for same analysisId throws', () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    db.insert(analysisLayoutOverrides)
      .values({ analysisId: analysis.id, marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 })
      .run()

    expect(() => {
      db.insert(analysisLayoutOverrides)
        .values({ analysisId: analysis.id, marginTop: 0.5, marginBottom: 0.5, marginSides: 0.5 })
        .run()
    }).toThrow()
  })

  it('D-02: onConflictDoUpdate replaces values for same analysisId (one row, latest values)', () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    db.insert(analysisLayoutOverrides)
      .values({ analysisId: analysis.id, marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 })
      .onConflictDoUpdate({
        target: analysisLayoutOverrides.analysisId,
        set: { marginTop: 0.5, marginBottom: 0.6, marginSides: 0.4 },
      })
      .run()

    db.insert(analysisLayoutOverrides)
      .values({ analysisId: analysis.id, marginTop: 0.5, marginBottom: 0.6, marginSides: 0.4 })
      .onConflictDoUpdate({
        target: analysisLayoutOverrides.analysisId,
        set: { marginTop: 0.5, marginBottom: 0.6, marginSides: 0.4 },
      })
      .run()

    const rows = db.select().from(analysisLayoutOverrides).where(eq(analysisLayoutOverrides.analysisId, analysis.id)).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].marginTop).toBe(0.5)
  })

  it('D-02: cascade delete — deleting analysis_results row removes override row', () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    db.insert(analysisLayoutOverrides)
      .values({ analysisId: analysis.id, marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 })
      .run()

    // Verify row exists
    expect(db.select().from(analysisLayoutOverrides).where(eq(analysisLayoutOverrides.analysisId, analysis.id)).all()).toHaveLength(1)

    // Delete the parent analysis
    db.delete(analysisResults).where(eq(analysisResults.id, analysis.id)).run()

    // Override row should be cascaded away
    const remaining = db.select().from(analysisLayoutOverrides).where(eq(analysisLayoutOverrides.analysisId, analysis.id)).all()
    expect(remaining).toHaveLength(0)
  })

  it('D-05: clear (delete row) causes re-read to return empty', () => {
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)

    db.insert(analysisLayoutOverrides)
      .values({ analysisId: analysis.id, marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 })
      .run()

    // Clear
    db.delete(analysisLayoutOverrides).where(eq(analysisLayoutOverrides.analysisId, analysis.id)).run()

    const rows = db.select().from(analysisLayoutOverrides).where(eq(analysisLayoutOverrides.analysisId, analysis.id)).all()
    expect(rows).toHaveLength(0)
  })
})
