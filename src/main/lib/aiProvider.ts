import { generateObject, generateText } from 'ai'
import type { LanguageModel } from 'ai'
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
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    city: z.string(),
    url: z.string(),
  }),
  work: z.array(z.object({
    name: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    highlights: z.array(z.string()),
  })),
  skills: z.array(z.object({
    name: z.string(),
    keywords: z.array(z.string()),
  })),
  projects: z.array(z.object({
    name: z.string(),
    highlights: z.array(z.string()),
  })),
  education: z.array(z.object({
    institution: z.string(),
    area: z.string(),
    studyType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    score: z.string(),
    courses: z.array(z.string()),
  })),
  volunteer: z.array(z.object({
    organization: z.string(),
    position: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    summary: z.string(),
    highlights: z.array(z.string()),
  })),
  awards: z.array(z.object({
    title: z.string(),
    date: z.string(),
    awarder: z.string(),
    summary: z.string(),
  })),
  publications: z.array(z.object({
    name: z.string(),
    publisher: z.string(),
    releaseDate: z.string(),
    url: z.string(),
    summary: z.string(),
  })),
  languages: z.array(z.object({
    language: z.string(),
    fluency: z.string(),
  })),
  interests: z.array(z.object({
    name: z.string(),
    keywords: z.array(z.string()),
  })),
  references: z.array(z.object({
    name: z.string(),
    reference: z.string(),
  })),
})

export const JobUrlExtractionSchema = z.object({
  isJobPosting: z.boolean(),
  jobTitle: z.string(),
  company: z.string(),
  jobDescriptionText: z.string(),
})

export type JobUrlExtraction = z.infer<typeof JobUrlExtractionSchema>

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
  model: LanguageModel,
): Promise<ParsedJob> {
  const { system, prompt } = buildJobParserPrompt(rawText)
  const result = await generateObject({
    model: model as Parameters<typeof generateObject>[0]['model'],
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
  model: LanguageModel,
): Promise<ResumeScore> {
  const { system, prompt } = buildScorerPrompt(resumeText, parsedJob)
  const result = await generateObject({
    model: model as Parameters<typeof generateObject>[0]['model'],
    schema: ResumeScorerSchema,
    system,
    prompt,
    temperature: 0,
  })
  return result.object
}

export async function callResumeExtractor(
  pdfText: string,
  model: LanguageModel,
): Promise<ResumeJsonParsed> {
  const { system, prompt } = buildPdfResumeParserPrompt(pdfText)
  const result = await generateText({
    model: model as Parameters<typeof generateText>[0]['model'],
    system,
    prompt,
    temperature: 0,
  })
  const parsed = ResumeJsonSchema.parse(extractJsonFromText(result.text))
  return parsed
}

/**
 * Strips ```json ... ``` or ``` ... ``` markdown fences if present, then JSON.parses.
 * Throws on invalid JSON — propagation is intentional.
 */
export function extractJsonFromText(text: string): unknown {
  let jsonText = text.trim()
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) jsonText = fenceMatch[1].trim()
  return JSON.parse(jsonText)
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
