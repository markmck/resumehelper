import { describe, test, expect } from 'vitest'
import { buildCoverLetterPrompt, resolveLetterTone } from '../../../../src/main/lib/analysisPrompts'
import type { ParsedJob } from '../../../../src/main/lib/aiProvider'

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

describe('cover letter prompt', () => {
  test('D-01: system prompt contains the no-fabrication fence', () => {
    const { system } = buildCoverLetterPrompt('resume text', validParsedJob, 'neutral', 'Mark M')
    expect(system).toContain('do NOT fabricate experience, titles, or credentials')
  })

  test('D-02: system prompt instructs silence on unsupported requirements', () => {
    const { system } = buildCoverLetterPrompt('resume text', validParsedJob, 'neutral', 'Mark M')
    expect(system).toContain('say nothing about them')
    expect(system).toContain('do not attempt to bridge unrelated or transferable experience')
  })

  test('D-03: system prompt requires the literal [why this company — your words] placeholder', () => {
    const { system } = buildCoverLetterPrompt('resume text', validParsedJob, 'neutral', 'Mark M')
    expect(system).toContain('[why this company — your words]')
  })

  test('D-05: system prompt requires exactly 3 paragraphs', () => {
    const { system } = buildCoverLetterPrompt('resume text', validParsedJob, 'neutral', 'Mark M')
    expect(system).toContain('EXACTLY 3 paragraphs')
  })

  test('D-06: system prompt states the ~250 word target', () => {
    const { system } = buildCoverLetterPrompt('resume text', validParsedJob, 'neutral', 'Mark M')
    expect(system).toContain('250 words')
  })

  test('D-07: resolveLetterTone maps executive/modern/jake/unknown to formal/direct/plain/neutral', () => {
    expect(resolveLetterTone('executive')).toBe('formal')
    expect(resolveLetterTone('modern')).toBe('direct')
    expect(resolveLetterTone('jake')).toBe('plain')
    expect(resolveLetterTone('classic')).toBe('neutral')
    expect(resolveLetterTone('minimal')).toBe('neutral')
    expect(resolveLetterTone('')).toBe('neutral')
    expect(resolveLetterTone(undefined)).toBe('neutral')
    expect(resolveLetterTone(null)).toBe('neutral')

    const formalSystem = buildCoverLetterPrompt('resume text', validParsedJob, resolveLetterTone('executive'), 'Mark M').system
    expect(formalSystem).toContain('formal')
    const plainSystem = buildCoverLetterPrompt('resume text', validParsedJob, resolveLetterTone('jake'), 'Mark M').system
    expect(plainSystem).toContain('plain')
  })

  test('D-08: prompt carries the candidate profile name for the signature and greeting instruction', () => {
    const { system, prompt } = buildCoverLetterPrompt('resume text', validParsedJob, 'neutral', 'Mark M')
    expect(system).toContain('Dear Hiring Manager,')
    expect(system).toContain('Mark M')
    expect(prompt).toContain('Mark M')
  })

  test('prompt includes resumeText verbatim and parsedJob fields', () => {
    const marker = 'UNIQUE_RESUME_TEXT_MARKER_12345'
    const { prompt } = buildCoverLetterPrompt(marker, validParsedJob, 'neutral', 'Mark M')
    expect(prompt).toContain(marker)
    expect(prompt).toContain(validParsedJob.title)
    expect(prompt).toContain(validParsedJob.company)
    expect(prompt).toContain(validParsedJob.required_skills[0])
  })
})
