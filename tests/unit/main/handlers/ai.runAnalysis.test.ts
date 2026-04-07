import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MockLanguageModelV3 } from 'ai/test'
import { runAnalysis } from '../../../../src/main/handlers/ai'
import * as aiProvider from '../../../../src/main/lib/aiProvider'
import { createTestDb } from '../../../helpers/db'
import {
  seedJobPosting,
  seedVariant,
  seedJobWithBullets,
  updateProfile,
} from '../../../helpers/factories'
import { aiSettings, jobPostings as jpTable, analysisResults as arTable } from '../../../../src/main/db/schema'
import { eq } from 'drizzle-orm'

// Minimum seed requirements for getBuilderDataForVariant:
// - The function queries all jobs, bullets, skills, etc. from the DB, then filters by templateVariantItems.
// - It does NOT throw on empty tables — it returns empty arrays gracefully.
// - We need at least: a templateVariant row (so getBuilderDataForVariant returns a valid BuilderData object).
// - Profile row id=1 is auto-inserted by createTestDb() via INSERT OR IGNORE.
// - aiSettings row id=1 is auto-inserted by createTestDb() via INSERT OR IGNORE.

// Fake IPC event with a vi.fn()-backed sender.send
function makeEvent() {
  const send = vi.fn()
  return {
    event: { sender: { send } } as unknown as Electron.IpcMainInvokeEvent,
    send,
  }
}

// Canned ParsedJob returned by the mock LLM for "parse" calls
const cannedParsed = {
  title: 'Software Engineer',
  company: 'ACME Corp',
  required_skills: ['TypeScript'],
  preferred_skills: ['Rust'],
  experience_years: 5,
  education_requirement: 'BS',
  key_responsibilities: ['Build features'],
  keywords: ['typescript', 'react'],
}

// Canned ResumeScore returned by the mock LLM for "score" calls
const cannedScore = {
  keyword_score: 80,
  skills_score: 75,
  experience_score: 70,
  ats_score: 90,
  exact_keyword_matches: ['typescript'],
  semantic_keyword_matches: [],
  missing_keywords: ['rust'],
  gaps: [],
  rewrite_suggestions: [],
}

// Builds a MockLanguageModelV3 whose doGenerate returns a different object on
// successive calls — needed because runAnalysis makes two generateObject calls
// (parse then score) against the same `llm` instance.
function makeSequentialMock(responses: unknown[]): MockLanguageModelV3 {
  let i = 0
  return new MockLanguageModelV3({
    doGenerate: async () => {
      const obj = responses[Math.min(i, responses.length - 1)]
      i++
      return {
        finishReason: 'stop' as const,
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        content: [{ type: 'text', text: JSON.stringify(obj) }],
        warnings: [],
      }
    },
  })
}

// Seed helper — populates aiSettings, profile, a job+bullets, a variant, and a jobPosting
function seedRunAnalysisFixtures(db: ReturnType<typeof createTestDb>, opts?: { parsedKeywords?: string }) {
  // Profile (row id=1 already exists from ensureSchema INSERT OR IGNORE)
  updateProfile(db, { name: 'Test User', email: 'test@x.com', phone: '555', location: 'NYC' })

  // Base job + bullets so getBuilderDataForVariant has content
  const { job } = seedJobWithBullets(db, ['Shipped feature A', 'Led team of 3'])

  // Variant
  const variant = seedVariant(db, { name: 'For Test' })

  // Job posting (cache-miss by default: parsedKeywords = '[]')
  const posting = seedJobPosting(db, {
    company: 'TestCo',
    role: 'Engineer',
    rawText: 'We need a TypeScript engineer...',
    parsedKeywords: opts?.parsedKeywords ?? '[]',
  })

  // aiSettings — row id=1 already exists from ensureSchema; update with fake key
  // The electron mock's safeStorage.decryptString does b.toString('utf8'), so
  // storing the base64 of 'fake-key' yields 'fake-key' on decrypt.
  const fakeKey = Buffer.from('fake-key', 'utf8').toString('base64')
  db.update(aiSettings).set({ provider: 'openai', model: 'gpt-4o', apiKey: fakeKey }).where(eq(aiSettings.id, 1)).run()

  return { job, variant, posting }
}

describe('runAnalysis', () => {
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cache-miss path: parses, scores, caches parsed fields, inserts analysisResults, emits progress events', async () => {
    const { posting, variant } = seedRunAnalysisFixtures(db)
    const { event, send } = makeEvent()

    const mock = makeSequentialMock([cannedParsed, cannedScore])
    vi.spyOn(aiProvider, 'getModel').mockReturnValue(mock as any)

    const result = await runAnalysis(db, event, posting.id, variant.id)

    // Success shape
    expect(result).toHaveProperty('analysisId')
    expect((result as any).parsedJob).toBeDefined()

    // Progress events
    const progressStages = send.mock.calls
      .filter(c => c[0] === 'ai:progress')
      .map(c => c[1])
    expect(progressStages).toContain('parsing')
    expect(progressStages).toContain('parsed')
    expect(progressStages).toContain('scoring')
    expect(progressStages).toContain('storing')
    expect(progressStages).toContain('done')

    // Cache write: jobPostings parsed* columns populated
    const updated = db.select().from(jpTable).where(eq(jpTable.id, posting.id)).get()
    expect(updated!.parsedKeywords).toBe(JSON.stringify(cannedParsed.keywords))
    expect(updated!.parsedSkills).toBe(JSON.stringify(cannedParsed.required_skills))
    expect(updated!.parsedPreferred).toBe(JSON.stringify(cannedParsed.preferred_skills))
    expect(updated!.parsedRequirements).toBe(JSON.stringify(cannedParsed.key_responsibilities))

    // analysisResults row inserted with correct matchScore
    // Weighted: 80*0.35 + 75*0.35 + 70*0.20 + 90*0.10 = 28 + 26.25 + 14 + 9 = 77.25 → 77
    const analysisRow = db.select().from(arTable).where(eq(arTable.id, (result as any).analysisId)).get()
    expect(analysisRow).toBeTruthy()
    expect(analysisRow!.matchScore).toBe(77)
    expect(analysisRow!.variantId).toBe(variant.id)
    expect(analysisRow!.jobPostingId).toBe(posting.id)
  })

  it('cache-hit path: skips parsing, calls LLM only once for scoring', async () => {
    const { posting, variant } = seedRunAnalysisFixtures(db, { parsedKeywords: '["typescript"]' })

    // Pre-populate the other parsed* columns so the cache-hit reconstruction (ai.ts:42-51) succeeds
    db.update(jpTable)
      .set({
        parsedSkills: '["TypeScript"]',
        parsedRequirements: '["Build features"]',
        parsedPreferred: '["Rust"]',
      })
      .where(eq(jpTable.id, posting.id))
      .run()

    const { event, send } = makeEvent()

    // Count doGenerate calls with a local closure
    let callCount = 0
    const mock = new MockLanguageModelV3({
      doGenerate: async () => {
        callCount++
        return {
          finishReason: 'stop' as const,
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
          content: [{ type: 'text', text: JSON.stringify(cannedScore) }],
          warnings: [],
        }
      },
    })
    vi.spyOn(aiProvider, 'getModel').mockReturnValue(mock as any)

    const result = await runAnalysis(db, event, posting.id, variant.id)

    expect(result).toHaveProperty('analysisId')
    expect(callCount).toBe(1) // scoring only — parsing was cached

    const progressStages = send.mock.calls
      .filter(c => c[0] === 'ai:progress')
      .map(c => c[1])
    expect(progressStages).not.toContain('parsing')
    expect(progressStages).not.toContain('parsed')
    expect(progressStages).toContain('scoring')
    expect(progressStages).toContain('storing')
    expect(progressStages).toContain('done')
  })
})
