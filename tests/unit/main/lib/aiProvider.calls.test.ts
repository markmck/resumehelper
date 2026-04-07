import { describe, it, expect } from 'vitest'
import { MockLanguageModelV3 } from 'ai/test'
import {
  callJobParser,
  callResumeScorer,
  callResumeExtractor,
  type ParsedJob,
} from '../../../../src/main/lib/aiProvider'

// Helper: build a mock that returns a canned object serialized as JSON text
function mockReturning(obj: unknown): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      finishReason: 'stop' as const,
      usage: { inputTokens: 10, outputTokens: 20 },
      content: [{ type: 'text' as const, text: JSON.stringify(obj) }],
      warnings: [],
    }),
  })
}

// Helper: build a mock that captures the prompt passed to doGenerate
function mockCapturingPrompt(obj: unknown): { model: MockLanguageModelV3; getPrompt: () => string } {
  let capturedPrompt = ''
  const model = new MockLanguageModelV3({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doGenerate: async (options: any) => {
      // Vercel AI SDK passes a `prompt` array; stringify for substring checks
      capturedPrompt = JSON.stringify(options.prompt ?? options)
      return {
        finishReason: 'stop' as const,
        usage: { inputTokens: 10, outputTokens: 20 },
        content: [{ type: 'text' as const, text: JSON.stringify(obj) }],
        warnings: [],
      }
    },
  })
  return { model, getPrompt: () => capturedPrompt }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validParsedJob: ParsedJob = {
  title: 'Senior Engineer',
  company: 'ACME Corp',
  required_skills: ['TypeScript', 'React'],
  preferred_skills: ['Rust'],
  experience_years: 5,
  education_requirement: 'BS Computer Science',
  key_responsibilities: ['Build features', 'Review PRs'],
  keywords: ['typescript', 'react', 'node'],
}

const validScore = {
  keyword_score: 80,
  skills_score: 75,
  experience_score: 90,
  ats_score: 85,
  exact_keyword_matches: ['typescript'],
  semantic_keyword_matches: ['node'],
  missing_keywords: ['rust'],
  gaps: [{ skill: 'Rust', severity: 'moderate' as const, reason: 'not listed', category: 'language' }],
  rewrite_suggestions: [{ original_text: 'Used TS', suggested_text: 'Shipped TypeScript services', target_keywords: ['typescript'] }],
}

const validResumeJson = {
  basics: { name: 'Mark', email: 'm@x.com', phone: '555', city: 'NYC', url: 'https://x' },
  work: [{ name: 'ACME', position: 'Eng', startDate: '2022', endDate: '2024', highlights: ['shipped X'] }],
  skills: [{ name: 'Languages', keywords: ['TypeScript'] }],
  projects: [],
  education: [],
  volunteer: [],
  awards: [],
  publications: [],
  languages: [],
  interests: [],
  references: [],
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('callJobParser', () => {
  it('returns the parsed object when mock yields valid JobParserSchema data', async () => {
    const model = mockReturning(validParsedJob)
    const result = await callJobParser('raw posting text', model as any)
    expect(result).toEqual(validParsedJob)
  })

  it('rejects when mock returns an object missing required_skills', async () => {
    const { required_skills: _omit, ...invalid } = validParsedJob
    const model = mockReturning(invalid)
    await expect(callJobParser('raw posting text', model as any)).rejects.toThrow()
  })

  it('passes the raw job text through to the prompt', async () => {
    const marker = 'UNIQUE_RAW_TEXT_MARKER_98765'
    const { model, getPrompt } = mockCapturingPrompt(validParsedJob)
    await callJobParser(marker, model as any)
    expect(getPrompt()).toContain(marker)
  })
})

describe('callResumeScorer', () => {
  it('returns the parsed score when mock yields valid ResumeScorerSchema data', async () => {
    const model = mockReturning(validScore)
    const result = await callResumeScorer('resume text', validParsedJob, model as any)
    expect(result).toEqual(validScore)
  })

  it('rejects when mock returns a score missing gaps', async () => {
    const { gaps: _omit, ...invalid } = validScore
    const model = mockReturning(invalid)
    await expect(callResumeScorer('resume text', validParsedJob, model as any)).rejects.toThrow()
  })

  it('passes parsedJob keywords through to the scorer prompt', async () => {
    const { model, getPrompt } = mockCapturingPrompt(validScore)
    await callResumeScorer('resume text', validParsedJob, model as any)
    // At least one of the ParsedJob keywords should appear in the prompt
    const prompt = getPrompt()
    const anyKeywordPresent = validParsedJob.keywords.some(k => prompt.includes(k))
    expect(anyKeywordPresent).toBe(true)
  })
})

describe('callResumeExtractor', () => {
  // callResumeExtractor uses generateText, not generateObject.
  // The mock's content[0].text must be the raw string the extractor will pass to extractJsonFromText.
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

  it('parses markdown-fenced valid ResumeJson', async () => {
    const fenced = '```json\n' + JSON.stringify(validResumeJson) + '\n```'
    const model = mockReturningText(fenced)
    const result = await callResumeExtractor('pdf text', model as any)
    expect(result.basics.email).toBe('m@x.com')
  })

  it('rejects when the fenced JSON is malformed', async () => {
    const model = mockReturningText('```json\nnot valid json\n```')
    await expect(callResumeExtractor('pdf text', model as any)).rejects.toThrow()
  })

  it('rejects when JSON is valid but fails ResumeJsonSchema (missing basics.email)', async () => {
    const invalid = { ...validResumeJson, basics: { name: 'x', phone: 'y', city: 'z', url: 'u' } }
    const model = mockReturningText(JSON.stringify(invalid))
    await expect(callResumeExtractor('pdf text', model as any)).rejects.toThrow()
  })

  it('parses minimal-but-valid unfenced JSON', async () => {
    const model = mockReturningText(JSON.stringify(validResumeJson))
    const result = await callResumeExtractor('pdf text', model as any)
    expect(result.work.length).toBe(1)
  })
})
