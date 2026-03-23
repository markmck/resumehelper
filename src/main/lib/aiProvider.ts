import { generateObject } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { buildJobParserPrompt, buildScorerPrompt } from './analysisPrompts'

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
  keyword_score: z.number().min(0).max(100),
  skills_score: z.number().min(0).max(100),
  experience_score: z.number().min(0).max(100),
  ats_score: z.number().min(0).max(100),
  exact_keyword_matches: z.array(z.string()),
  semantic_keyword_matches: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  gaps: z.array(
    z.object({
      skill: z.string(),
      severity: z.enum(['critical', 'moderate']),
      reason: z.string().optional(),
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

// ─── Exported Types ──────────────────────────────────────────────────────────

export type ParsedJob = z.infer<typeof JobParserSchema>
export type ResumeScore = z.infer<typeof ResumeScorerSchema>

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

// ─── Score Derivation ─────────────────────────────────────────────────────────

export function deriveOverallScore(subscores: {
  keyword_score: number
  skills_score: number
  experience_score: number
  ats_score: number
}): number {
  return Math.round(
    subscores.keyword_score * 0.35 +
      subscores.skills_score * 0.35 +
      subscores.experience_score * 0.20 +
      subscores.ats_score * 0.10
  )
}
