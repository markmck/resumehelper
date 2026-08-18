import { describe, test, expect } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import { seedVariant, seedJobPosting, seedAnalysis } from '../../../helpers/factories'
import { coverLetters } from '../../../../src/main/db/schema'
import { eq } from 'drizzle-orm'

describe('cover_letters schema', () => {
  test('cover_letters table exists in createTestDb', () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const jobPosting = seedJobPosting(db)
    const analysis = seedAnalysis(db, jobPosting.id, { variantId: variant.id })

    db.insert(coverLetters).values({ analysisId: analysis.id, letterText: 'x' }).run()

    const rows = db.select().from(coverLetters).where(eq(coverLetters.analysisId, analysis.id)).all()

    expect(rows[0].letterText).toBe('x')
  })
})

describe('generateCoverLetter', () => {
  test.todo('D-04: generateCoverLetter persists the generated text as a draft immediately')
  test.todo('D-10: saveCoverLetterDraft overwrites the existing row, leaving exactly one row per analysisId')
  test.todo('D-12: generateCoverLetter returns an error code when the analysis does not exist')
  test.todo('getCoverLetter returns null when no row exists')
})
