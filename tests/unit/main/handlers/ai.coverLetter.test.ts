import { describe, test, expect } from 'vitest'
import { MockLanguageModelV3 } from 'ai/test'
import { createTestDb } from '../../../helpers/db'
import { seedVariant, seedJobPosting, seedAnalysis, updateProfile } from '../../../helpers/factories'
import { coverLetters } from '../../../../src/main/db/schema'
import { eq } from 'drizzle-orm'
import {
  generateCoverLetter,
  saveCoverLetterDraft,
  getCoverLetter,
} from '../../../../src/main/handlers/ai'

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

// Helper: build a mock LanguageModel that returns a fixed text response.
function mockReturningText(text: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      finishReason: 'stop' as const,
      usage: { inputTokens: 10, outputTokens: 20 },
      content: [{ type: 'text' as const, text }],
      warnings: [],
    }),
  })
}

// Helper: build a mock that captures the prompt passed to doGenerate, for D-07 tone assertions.
function mockCapturingPrompt(text: string): { model: MockLanguageModelV3; getPrompt: () => string } {
  let capturedPrompt = ''
  const model = new MockLanguageModelV3({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doGenerate: async (options: any) => {
      capturedPrompt = JSON.stringify(options.prompt ?? options)
      return {
        finishReason: 'stop' as const,
        usage: { inputTokens: 10, outputTokens: 20 },
        content: [{ type: 'text' as const, text }],
        warnings: [],
      }
    },
  })
  return { model, getPrompt: () => capturedPrompt }
}

describe('generateCoverLetter', () => {
  test('D-04: generateCoverLetter persists the generated text as a draft immediately', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane Doe' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    const jobPosting = seedJobPosting(db, {
      parsedSkills: JSON.stringify(['TypeScript']),
      parsedKeywords: JSON.stringify(['typescript', 'react']),
      parsedRequirements: JSON.stringify(['Build features']),
      parsedPreferred: JSON.stringify(['Rust']),
    })
    const analysis = seedAnalysis(db, jobPosting.id, { variantId: variant.id })

    const model = mockReturningText('  Dear Hiring Manager, ... Jane Doe  ')
    const result = await generateCoverLetter(db, analysis.id, model)

    expect('letter' in result && result.letter).toBe('Dear Hiring Manager, ... Jane Doe')

    const stored = getCoverLetter(db, analysis.id)
    expect(stored).toBe('Dear Hiring Manager, ... Jane Doe')
  })

  test('D-10: saveCoverLetterDraft overwrites the existing row, leaving exactly one row per analysisId', () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const jobPosting = seedJobPosting(db)
    const analysis = seedAnalysis(db, jobPosting.id, { variantId: variant.id })

    const first = saveCoverLetterDraft(db, analysis.id, 'first')
    expect(first).toEqual({ success: true })
    const second = saveCoverLetterDraft(db, analysis.id, 'second')
    expect(second).toEqual({ success: true })

    const rows = db.select().from(coverLetters).where(eq(coverLetters.analysisId, analysis.id)).all()
    expect(rows.length).toBe(1)
    expect(rows[0].letterText).toBe('second')
    expect(rows[0].updatedAt).not.toBeNull()
  })

  test('D-10: calling generateCoverLetter twice leaves exactly one row, holding the second result', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane Doe' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    const jobPosting = seedJobPosting(db, {
      parsedSkills: JSON.stringify(['TypeScript']),
      parsedKeywords: JSON.stringify(['typescript']),
      parsedRequirements: JSON.stringify(['Build features']),
      parsedPreferred: JSON.stringify(['Rust']),
    })
    const analysis = seedAnalysis(db, jobPosting.id, { variantId: variant.id })

    await generateCoverLetter(db, analysis.id, mockReturningText('first letter'))
    await generateCoverLetter(db, analysis.id, mockReturningText('second letter'))

    const rows = db.select().from(coverLetters).where(eq(coverLetters.analysisId, analysis.id)).all()
    expect(rows.length).toBe(1)
    expect(rows[0].letterText).toBe('second letter')
  })

  test('D-12: generateCoverLetter returns an error code when the analysis does not exist', async () => {
    const db = createTestDb()
    const result = await generateCoverLetter(db, 999999, mockReturningText('unused'))
    expect('error' in result).toBe(true)
    expect('letter' in result).toBe(false)
  })

  test('D-07: an analysis on a variant with layoutTemplate "executive" produces a prompt containing "formal"', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane Doe' })
    const variant = seedVariant(db, { layoutTemplate: 'executive' })
    const jobPosting = seedJobPosting(db, {
      parsedSkills: JSON.stringify(['TypeScript']),
      parsedKeywords: JSON.stringify(['typescript']),
      parsedRequirements: JSON.stringify(['Build features']),
      parsedPreferred: JSON.stringify(['Rust']),
    })
    const analysis = seedAnalysis(db, jobPosting.id, { variantId: variant.id })

    const { model, getPrompt } = mockCapturingPrompt('letter text')
    await generateCoverLetter(db, analysis.id, model)

    expect(getPrompt()).toContain('formal')
  })

  test('D-07: an analysis on a variant with layoutTemplate "jake" produces a prompt containing "plain"', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane Doe' })
    const variant = seedVariant(db, { layoutTemplate: 'jake' })
    const jobPosting = seedJobPosting(db, {
      parsedSkills: JSON.stringify(['TypeScript']),
      parsedKeywords: JSON.stringify(['typescript']),
      parsedRequirements: JSON.stringify(['Build features']),
      parsedPreferred: JSON.stringify(['Rust']),
    })
    const analysis = seedAnalysis(db, jobPosting.id, { variantId: variant.id })

    const { model, getPrompt } = mockCapturingPrompt('letter text')
    await generateCoverLetter(db, analysis.id, model)

    expect(getPrompt()).toContain('plain')
  })

  test('getCoverLetter returns null when no row exists', () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const jobPosting = seedJobPosting(db)
    const analysis = seedAnalysis(db, jobPosting.id, { variantId: variant.id })

    expect(getCoverLetter(db, analysis.id)).toBeNull()
  })
})
