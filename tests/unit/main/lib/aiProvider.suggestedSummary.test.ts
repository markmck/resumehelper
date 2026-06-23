import { describe, it, expect } from 'vitest'
import { ResumeScorerSchema } from '../../../../src/main/lib/aiProvider'
import { buildScorerPrompt } from '../../../../src/main/lib/analysisPrompts'

// Reuse the same validScore fixture shape from aiProvider.schema.test.ts
// (without suggested_summary — that is the backward-compat fixture shape)
const validScore = {
  keyword_score: 82,
  skills_score: 75,
  experience_score: 68,
  ats_score: 90,
  exact_keyword_matches: ['typescript', 'node.js'],
  semantic_keyword_matches: ['backend development'],
  missing_keywords: ['kubernetes'],
  gaps: [
    {
      skill: 'Kubernetes',
      severity: 'moderate' as const,
      reason: 'Listed as preferred skill',
      category: 'DevOps',
    },
  ],
  rewrite_suggestions: [
    {
      original_text: 'Worked on backend services',
      suggested_text: 'Designed and deployed scalable backend microservices',
      target_keywords: ['microservices', 'scalable'],
    },
  ],
}

const minimalJob = {
  title: 'Engineer',
  company: 'ACME',
  required_skills: [],
  preferred_skills: [],
  experience_years: null,
  education_requirement: null,
  key_responsibilities: [],
  keywords: [],
}

describe('ResumeScorerSchema — suggested_summary extension', () => {
  it('defaults suggested_summary to empty string when field is absent (MockLanguageModelV3 fixture backward compat)', () => {
    // validScore does NOT have suggested_summary — simulates all existing fixture shapes
    const result = ResumeScorerSchema.parse(validScore)
    expect(result.suggested_summary).toBe('')
  })

  it('round-trips a present string suggested_summary', () => {
    const withSummary = {
      ...validScore,
      suggested_summary: 'Senior engineer with 10 years of TypeScript and Node.js experience.',
    }
    const result = ResumeScorerSchema.parse(withSummary)
    expect(result.suggested_summary).toBe('Senior engineer with 10 years of TypeScript and Node.js experience.')
  })

  it('rejects a non-string suggested_summary (e.g. a number)', () => {
    const withNumber = {
      ...validScore,
      suggested_summary: 42,
    }
    expect(() => ResumeScorerSchema.parse(withNumber)).toThrow()
  })
})

describe('buildScorerPrompt — suggested_summary guideline', () => {
  it('system text contains suggested_summary field reference and tailored/no-fabrication guidance', () => {
    const { system } = buildScorerPrompt('resume text', minimalJob)
    // Must reference the output field name so model knows to produce it
    expect(system).toContain('suggested_summary')
    // Must include the "2-4 sentence" / "tailored" guidance from the research spec
    expect(system).toContain('tailored')
    // Must include no-fabrication constraint
    expect(system.toLowerCase()).toContain('fabricat')
  })
})
