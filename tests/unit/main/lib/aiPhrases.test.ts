import { describe, it, expect } from 'vitest'
import { cleanAiPhrases, cleanScorerProse } from '../../../../src/main/lib/aiPhrases'

describe('cleanAiPhrases', () => {
  describe('word replacement', () => {
    it('replaces a phrase and keeps sentence-initial capitalization', () => {
      const result = cleanAiPhrases('Leveraged Kafka to cut latency by 40%')
      expect(result.text).toBe('Used Kafka to cut latency by 40%')
      expect(result.removed).toEqual(['leveraged'])
    })

    it('replaces mid-sentence in lowercase', () => {
      expect(cleanAiPhrases('Built pipelines utilizing Airflow').text).toBe('Built pipelines using Airflow')
    })

    it('matches whole words only', () => {
      const result = cleanAiPhrases('Designed container orchestration on EKS')
      expect(result.text).toBe('Designed container orchestration on EKS')
      expect(result.removed).toEqual([])
    })

    it('fixes a/an agreement when the replacement changes the leading sound', () => {
      expect(cleanAiPhrases('Produced an actionable roadmap').text).toBe('Produced a practical roadmap')
      expect(cleanAiPhrases('Built a cutting-edge platform').text).toBe('Built a modern platform')
    })

    it('capitalizes the next word when a sentence-initial phrase is deleted', () => {
      expect(cleanAiPhrases('Proactively identified 12 outages').text).toBe('Identified 12 outages')
    })

    it('collapses the gap left by a mid-sentence deletion', () => {
      expect(cleanAiPhrases('Migrated services seamlessly to Azure').text).toBe('Migrated services to Azure')
    })

    it('simplifies filler phrases', () => {
      expect(cleanAiPhrases('Refactored the ORM in order to reduce query time').text).toBe(
        'Refactored the ORM to reduce query time',
      )
    })

    it('does not list precise engineering terms', () => {
      const text = 'Architected a scalable, robust platform for stakeholders'
      expect(cleanAiPhrases(text)).toEqual({ text, removed: [] })
    })

    it('does not glue .NET onto the previous word while tidying', () => {
      expect(cleanAiPhrases('Leveraged C# .NET services').text).toBe('Used C# .NET services')
    })
  })

  describe('punctuation', () => {
    it('turns a spaced em-dash into a comma', () => {
      const result = cleanAiPhrases('Rebuilt the billing API — cutting costs 30%')
      expect(result.text).toBe('Rebuilt the billing API, cutting costs 30%')
      expect(result.removed).toEqual(['—'])
    })

    it('turns an unspaced em-dash into a comma', () => {
      expect(cleanAiPhrases('Rebuilt the API—cutting costs').text).toBe('Rebuilt the API, cutting costs')
    })

    it('drops a trailing em-dash instead of leaving a dangling comma', () => {
      expect(cleanAiPhrases('Shipped v2 —').text).toBe('Shipped v2')
    })

    it('leaves en-dash date ranges alone', () => {
      const text = 'Led migration (2019–2021)'
      expect(cleanAiPhrases(text)).toEqual({ text, removed: [] })
    })

    it('turns a double hyphen into a comma', () => {
      expect(cleanAiPhrases('Rebuilt the API -- cutting costs').text).toBe('Rebuilt the API, cutting costs')
    })
  })

  describe('protection', () => {
    it('keeps a phrase that appears in the job posting', () => {
      const text = 'Leveraged Kafka for event streaming'
      const result = cleanAiPhrases(text, { jobText: 'Experience having leveraged event streaming at scale' })
      expect(result).toEqual({ text, removed: [] })
    })

    it('keeps a phrase that appears in the source text', () => {
      const text = 'Spearheaded the Azure migration'
      const result = cleanAiPhrases(text, { sourceText: 'Spearheaded migration to cloud' })
      expect(result).toEqual({ text, removed: [] })
    })

    it('does not let the job posting protect em-dashes', () => {
      const result = cleanAiPhrases('Rebuilt API — cut costs', { jobText: 'We build fast — and ship' })
      expect(result.text).toBe('Rebuilt API, cut costs')
    })

    it('lets the source text protect em-dashes', () => {
      const text = 'Rebuilt API — cut costs'
      expect(cleanAiPhrases(text, { sourceText: 'Rebuilt API — saved money' })).toEqual({ text, removed: [] })
    })
  })

  it('returns untouched text byte-for-byte, including existing double spaces', () => {
    const text = 'Led a team of 3  engineers'
    expect(cleanAiPhrases(text)).toEqual({ text, removed: [] })
  })

  it('handles empty text', () => {
    expect(cleanAiPhrases('')).toEqual({ text: '', removed: [] })
  })
})

describe('cleanScorerProse', () => {
  const baseScore = {
    keyword_score: 80,
    rewrite_suggestions: [
      {
        original_text: 'Used Kafka for events',
        suggested_text: 'Leveraged Kafka for event streaming',
        target_keywords: ['event streaming'],
      },
    ],
    suggested_summary: 'Seasoned engineer who spearheaded cloud migrations — cutting costs',
  }

  it('cleans suggested_text and suggested_summary, leaving original_text and other fields alone', () => {
    const { score, removed } = cleanScorerProse(baseScore, { jobText: '', resumeText: 'Used Kafka for events' })

    expect(score.rewrite_suggestions[0]).toEqual({
      original_text: 'Used Kafka for events',
      suggested_text: 'Used Kafka for event streaming',
      target_keywords: ['event streaming'],
    })
    expect(score.suggested_summary).toBe('Seasoned engineer who led cloud migrations, cutting costs')
    expect(score.keyword_score).toBe(80)
    expect(removed).toHaveLength(3)
    expect(removed).toEqual(expect.arrayContaining(['leveraged', 'spearheaded', '—']))
  })

  it('protects summary wording with the full resume text', () => {
    const { score } = cleanScorerProse(baseScore, {
      jobText: '',
      resumeText: 'Spearheaded the move to AWS',
    })
    expect(score.suggested_summary).toBe('Seasoned engineer who spearheaded cloud migrations, cutting costs')
  })

  it('still cleans summary em-dashes when the formatted resume text contains them', () => {
    // buildResumeTextForLlm emits "### Position — Company" and "start — end" for every job.
    const { score } = cleanScorerProse(baseScore, {
      jobText: '',
      resumeText: '### Senior Engineer — ACME\n2021-01 — Present\n• Spearheaded the move to AWS',
    })
    expect(score.suggested_summary).toBe('Seasoned engineer who spearheaded cloud migrations, cutting costs')
  })

  it('does not mutate its input', () => {
    const input = structuredClone(baseScore)
    cleanScorerProse(input, { jobText: '', resumeText: '' })
    expect(input).toEqual(baseScore)
  })
})
