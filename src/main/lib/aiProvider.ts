import { generateObject } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { buildJobParserPrompt, buildScorerPrompt } from './analysisPrompts'
import { buildPdfResumeParserPrompt } from './pdfResumePrompt'

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const JobParserSchema = z.object({
  title: z.string(),
  company: z.string(),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  experience_years: z.number().nullish(),
  education_requirement: z.string().nullish(),
  key_responsibilities: z.array(z.string()),
  keywords: z.array(z.string()),
})

export const ResumeScorerSchema = z.object({
  keyword_score: z.number(),
  skills_score: z.number(),
  experience_score: z.number(),
  ats_score: z.number(),
  exact_keyword_matches: z.array(z.string()),
  semantic_keyword_matches: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  gaps: z.array(
    z.object({
      skill: z.string(),
      severity: z.enum(['critical', 'moderate']),
      reason: z.string().optional(),
      category: z.string().optional(),
    })
  ),
  rewrite_suggestions: z.array(
    z.object({
      original_text: z.string(),
      suggested_text: z.string(),
      target_keywords: z.array(z.string()),
    })
  ),
})

export const ResumeJsonSchema = z.object({
  basics: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.object({ city: z.string().optional() }).optional(),
    profiles: z.array(z.object({ url: z.string().optional() })).optional(),
  }).optional(),
  work: z.array(z.object({
    name: z.string().optional(),
    position: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })).optional(),
  skills: z.array(z.object({
    name: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })).optional(),
  projects: z.array(z.object({
    name: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })).optional(),
  education: z.array(z.object({
    institution: z.string().optional(),
    area: z.string().optional(),
    studyType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    score: z.string().optional(),
    courses: z.array(z.string()).optional(),
  })).optional(),
  volunteer: z.array(z.object({
    organization: z.string().optional(),
    position: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })).optional(),
  awards: z.array(z.object({
    title: z.string().optional(),
    date: z.string().optional(),
    awarder: z.string().optional(),
    summary: z.string().optional(),
  })).optional(),
  publications: z.array(z.object({
    name: z.string().optional(),
    publisher: z.string().optional(),
    releaseDate: z.string().optional(),
    url: z.string().optional(),
    summary: z.string().optional(),
  })).optional(),
  languages: z.array(z.object({
    language: z.string().optional(),
    fluency: z.string().optional(),
  })).optional(),
  interests: z.array(z.object({
    name: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })).optional(),
  references: z.array(z.object({
    name: z.string().optional(),
    reference: z.string().optional(),
  })).optional(),
})

// ─── Exported Types ──────────────────────────────────────────────────────────

export type ParsedJob = z.infer<typeof JobParserSchema>
export type ResumeScore = z.infer<typeof ResumeScorerSchema>
export type ResumeJsonParsed = z.infer<typeof ResumeJsonSchema>

// ─── Model Factory ───────────────────────────────────────────────────────────

export function getModel(
  provider: string,
  model: string,
  apiKey: string
): ReturnType<ReturnType<typeof createAnthropic>> | ReturnType<ReturnType<typeof createOpenAI>> {
  const modelId =
    model.length > 0
      ? model
      : provider === 'anthropic'
        ? 'claude-sonnet-4-5-20250514'
        : 'gpt-4o'

  if (provider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey })
    return anthropic(modelId)
  } else {
    const openai = createOpenAI({ apiKey })
    return openai(modelId)
  }
}

// ─── LLM Calls ───────────────────────────────────────────────────────────────

export async function callJobParser(
  rawText: string,
  apiKey: string,
  provider: string,
  model: string
): Promise<ParsedJob> {
  const { system, prompt } = buildJobParserPrompt(rawText)
  const modelInstance = getModel(provider, model, apiKey)

  const result = await generateObject({
    model: modelInstance as Parameters<typeof generateObject>[0]['model'],
    schema: JobParserSchema,
    system,
    prompt,
    temperature: 0,
  })

  return result.object
}

export async function callResumeScorer(
  resumeText: string,
  parsedJob: ParsedJob,
  apiKey: string,
  provider: string,
  model: string
): Promise<ResumeScore> {
  const { system, prompt } = buildScorerPrompt(resumeText, parsedJob)
  const modelInstance = getModel(provider, model, apiKey)

  const result = await generateObject({
    model: modelInstance as Parameters<typeof generateObject>[0]['model'],
    schema: ResumeScorerSchema,
    system,
    prompt,
    temperature: 0,
  })

  return result.object
}

export async function callResumeExtractor(
  pdfText: string,
  apiKey: string,
  provider: string,
  model: string
): Promise<ResumeJsonParsed> {
  const { system, prompt } = buildPdfResumeParserPrompt(pdfText)
  const modelInstance = getModel(provider, model, apiKey)

  const result = await generateObject({
    model: modelInstance as Parameters<typeof generateObject>[0]['model'],
    schema: ResumeJsonSchema,
    system,
    prompt,
    temperature: 0,
  })

  return result.object
}

// ─── Score Derivation ─────────────────────────────────────────────────────────

export function deriveOverallScore(subscores: {
  keyword_score: number
  skills_score: number
  experience_score: number
  ats_score: number
}): number {
  const clamp = (n: number): number => Math.max(0, Math.min(100, n))
  return Math.round(
    clamp(subscores.keyword_score) * 0.35 +
      clamp(subscores.skills_score) * 0.35 +
      clamp(subscores.experience_score) * 0.20 +
      clamp(subscores.ats_score) * 0.10
  )
}
