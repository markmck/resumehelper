import { describe, it, expect } from 'vitest'
import { deriveOverallScore } from '../../../../src/main/lib/aiProvider'

describe('deriveOverallScore', () => {
  it('returns 100 when all subscores are 100', () => {
    expect(
      deriveOverallScore({ keyword_score: 100, skills_score: 100, experience_score: 100, ats_score: 100 })
    ).toBe(100)
  })

  it('returns 0 when all subscores are 0', () => {
    expect(
      deriveOverallScore({ keyword_score: 0, skills_score: 0, experience_score: 0, ats_score: 0 })
    ).toBe(0)
  })

  it('weights keyword_score at 35%', () => {
    expect(
      deriveOverallScore({ keyword_score: 100, skills_score: 0, experience_score: 0, ats_score: 0 })
    ).toBe(35)
  })

  it('weights skills_score at 35%', () => {
    expect(
      deriveOverallScore({ keyword_score: 0, skills_score: 100, experience_score: 0, ats_score: 0 })
    ).toBe(35)
  })

  it('weights experience_score at 20%', () => {
    expect(
      deriveOverallScore({ keyword_score: 0, skills_score: 0, experience_score: 100, ats_score: 0 })
    ).toBe(20)
  })

  it('weights ats_score at 10%', () => {
    expect(
      deriveOverallScore({ keyword_score: 0, skills_score: 0, experience_score: 0, ats_score: 100 })
    ).toBe(10)
  })

  it('clamps negative inputs to 0', () => {
    // kw=-50 → clamped to 0; 0*0.35 + 100*0.35 + 100*0.20 + 100*0.10 = 0 + 35 + 20 + 10 = 65
    expect(
      deriveOverallScore({ keyword_score: -50, skills_score: 100, experience_score: 100, ats_score: 100 })
    ).toBe(65)
  })

  it('clamps above-100 inputs to 100', () => {
    // kw=150 → clamped to 100; 100*0.35 + 100*0.35 + 100*0.20 + 100*0.10 = 35 + 35 + 20 + 10 = 100
    expect(
      deriveOverallScore({ keyword_score: 150, skills_score: 100, experience_score: 100, ats_score: 100 })
    ).toBe(100)
  })

  it('rounds to nearest integer (0.5 rounds up)', () => {
    // 80*0.35 + 70*0.35 + 60*0.20 + 90*0.10 = 28 + 24.5 + 12 + 9 = 73.5 → 74
    expect(
      deriveOverallScore({ keyword_score: 80, skills_score: 70, experience_score: 60, ats_score: 90 })
    ).toBe(74)
  })

  it('rounds down when fractional part < 0.5', () => {
    // 50*0.35 + 50*0.35 + 50*0.20 + 51*0.10 = 17.5 + 17.5 + 10 + 5.1 = 50.1 → 50
    expect(
      deriveOverallScore({ keyword_score: 50, skills_score: 50, experience_score: 50, ats_score: 51 })
    ).toBe(50)
  })

  it('handles realistic mixed-input case', () => {
    // 75*0.35 + 82*0.35 + 68*0.20 + 95*0.10 = 26.25 + 28.7 + 13.6 + 9.5 = 78.05 → 78
    expect(
      deriveOverallScore({ keyword_score: 75, skills_score: 82, experience_score: 68, ats_score: 95 })
    ).toBe(78)
  })
})
