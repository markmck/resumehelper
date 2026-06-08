import { describe, it, expect } from 'vitest'
import {
  JobParserSchema,
  ResumeScorerSchema,
  ResumeJsonSchema,
  JobUrlExtractionSchema,
} from '../../../../src/main/lib/aiProvider'
import { buildScorerPrompt } from '../../../../src/main/lib/analysisPrompts'

describe('JobParserSchema', () => {
  const validJob = {
    title: 'Senior Software Engineer',
    company: 'Acme Corp',
    required_skills: ['TypeScript', 'Node.js'],
    preferred_skills: ['React', 'GraphQL'],
    experience_years: 5,
    education_requirement: "Bachelor's in Computer Science",
    key_responsibilities: ['Design APIs', 'Code review', 'Mentor juniors'],
    keywords: ['typescript', 'node', 'api', 'backend'],
  }

  it('parses a fully-valid job posting', () => {
    expect(() => JobParserSchema.parse(validJob)).not.toThrow()
    const result = JobParserSchema.parse(validJob)
    expect(result.title).toBe('Senior Software Engineer')
    expect(result.required_skills).toHaveLength(2)
  })

  it('rejects when required_skills is missing', () => {
    const invalid = {
      title: 'Engineer',
      company: 'ACME',
      preferred_skills: [],
      key_responsibilities: ['Do stuff'],
      keywords: ['code'],
    }
    expect(() => JobParserSchema.parse(invalid)).toThrow()
  })

  it('accepts experience_years as null', () => {
    const withNull = { ...validJob, experience_years: null }
    expect(() => JobParserSchema.parse(withNull)).not.toThrow()
  })

  it('accepts experience_years omitted (undefined)', () => {
    const { experience_years: _, ...withoutExp } = validJob
    expect(() => JobParserSchema.parse(withoutExp)).not.toThrow()
  })
})

describe('ResumeScorerSchema', () => {
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

  it('parses a fully-valid score result', () => {
    expect(() => ResumeScorerSchema.parse(validScore)).not.toThrow()
    const result = ResumeScorerSchema.parse(validScore)
    expect(result.keyword_score).toBe(82)
    expect(result.gaps).toHaveLength(1)
    expect(result.rewrite_suggestions[0].target_keywords).toContain('microservices')
  })

  it("rejects gaps[].severity outside 'critical'|'moderate' enum", () => {
    const invalid = {
      ...validScore,
      gaps: [{ skill: 'Docker', severity: 'nope' }],
    }
    expect(() => ResumeScorerSchema.parse(invalid)).toThrow()
  })

  it('rejects when rewrite_suggestions[].target_keywords is not an array', () => {
    const invalid = {
      ...validScore,
      rewrite_suggestions: [
        {
          original_text: 'old text',
          suggested_text: 'new text',
          target_keywords: 'should-be-array',
        },
      ],
    }
    expect(() => ResumeScorerSchema.parse(invalid)).toThrow()
  })

  it('accepts empty arrays for optional array fields', () => {
    const minimal = {
      ...validScore,
      exact_keyword_matches: [],
      semantic_keyword_matches: [],
      missing_keywords: [],
      gaps: [],
      rewrite_suggestions: [],
    }
    expect(() => ResumeScorerSchema.parse(minimal)).not.toThrow()
  })

  it('excluded_bullet_suggestions defaults to [] when field is absent (MockLanguageModelV3 fixture compat)', () => {
    // cannedScore-style fixtures omit excluded_bullet_suggestions — must parse successfully
    const result = ResumeScorerSchema.parse(validScore)
    expect(result.excluded_bullet_suggestions).toEqual([])
  })

  it('excluded_bullet_suggestions round-trips when present with valid data', () => {
    const withSuggestions = {
      ...validScore,
      excluded_bullet_suggestions: [{ bulletId: 42, reason: 'x', matched_keywords: ['k'] }],
    }
    const result = ResumeScorerSchema.parse(withSuggestions)
    expect(result.excluded_bullet_suggestions).toHaveLength(1)
    expect(result.excluded_bullet_suggestions[0].bulletId).toBe(42)
    expect(result.excluded_bullet_suggestions[0].reason).toBe('x')
    expect(result.excluded_bullet_suggestions[0].matched_keywords).toEqual(['k'])
  })

  it('excluded_bullet_suggestions rejects bulletId of 0 (must be positive integer)', () => {
    const withZeroId = {
      ...validScore,
      excluded_bullet_suggestions: [{ bulletId: 0, reason: 'x', matched_keywords: [] }],
    }
    expect(() => ResumeScorerSchema.parse(withZeroId)).toThrow()
  })

  it('excluded_bullet_suggestions rejects negative bulletId', () => {
    const withNegativeId = {
      ...validScore,
      excluded_bullet_suggestions: [{ bulletId: -1, reason: 'x', matched_keywords: [] }],
    }
    expect(() => ResumeScorerSchema.parse(withNegativeId)).toThrow()
  })
})

describe('buildScorerPrompt excluded bullets section', () => {
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

  it('produces no "## Excluded Bullets" section when third arg is omitted', () => {
    const { prompt } = buildScorerPrompt('resume text', minimalJob)
    expect(prompt).not.toContain('## Excluded Bullets')
  })

  it('produces no "## Excluded Bullets" section when third arg is empty string', () => {
    const { prompt } = buildScorerPrompt('resume text', minimalJob, '')
    expect(prompt).not.toContain('## Excluded Bullets')
  })

  it('appends "## Excluded Bullets" section when third arg is non-empty', () => {
    const { prompt } = buildScorerPrompt('resume text', minimalJob, '[B42] foo bullet')
    expect(prompt).toContain('## Excluded Bullets (base experience not on your variant)')
    expect(prompt).toContain('[B42] foo bullet')
  })
})

describe('ResumeJsonSchema', () => {
  const validResume = {
    basics: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-123-4567',
      city: 'San Francisco',
      url: 'https://janedoe.dev',
    },
    work: [
      {
        name: 'Acme Corp',
        position: 'Software Engineer',
        startDate: '2020-01',
        endDate: '2023-12',
        highlights: ['Built REST APIs', 'Reduced latency by 40%'],
      },
    ],
    skills: [
      {
        name: 'Programming Languages',
        keywords: ['TypeScript', 'Python', 'Go'],
      },
    ],
    projects: [],
    education: [],
    volunteer: [],
    awards: [],
    publications: [],
    languages: [],
    interests: [],
    references: [],
  }

  it('parses a minimal fully-populated resume', () => {
    expect(() => ResumeJsonSchema.parse(validResume)).not.toThrow()
    const result = ResumeJsonSchema.parse(validResume)
    expect(result.basics.name).toBe('Jane Doe')
    expect(result.work).toHaveLength(1)
    expect(result.skills[0].name).toBe('Programming Languages')
  })

  it('rejects when basics.email is missing', () => {
    const { email: _, ...basicsWithoutEmail } = validResume.basics
    const invalid = {
      ...validResume,
      basics: basicsWithoutEmail,
    }
    expect(() => ResumeJsonSchema.parse(invalid)).toThrow()
  })
})

describe('JobUrlExtractionSchema', () => {
  it('parses a valid extraction result', () => {
    const valid = {
      isJobPosting: true,
      jobTitle: 'Software Engineer',
      company: 'ACME Inc',
      jobDescriptionText: 'We are looking for a skilled engineer...',
    }
    expect(() => JobUrlExtractionSchema.parse(valid)).not.toThrow()
    const result = JobUrlExtractionSchema.parse(valid)
    expect(result.isJobPosting).toBe(true)
  })

  it('rejects when isJobPosting is a string instead of boolean', () => {
    expect(() =>
      JobUrlExtractionSchema.parse({
        isJobPosting: 'yes',
        jobTitle: 'Engineer',
        company: 'ACME',
        jobDescriptionText: 'Job description here',
      })
    ).toThrow()
  })

  it('parses when isJobPosting is false', () => {
    const notAJob = {
      isJobPosting: false,
      jobTitle: '',
      company: '',
      jobDescriptionText: '',
    }
    expect(() => JobUrlExtractionSchema.parse(notAJob)).not.toThrow()
  })
})
