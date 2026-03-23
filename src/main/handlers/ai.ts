import { ipcMain, safeStorage } from 'electron'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { aiSettings, jobPostings, analysisResults, profile } from '../db/schema'
import { callJobParser, callResumeScorer, deriveOverallScore } from '../lib/aiProvider'
import { buildResumeTextForLlm } from '../lib/analysisPrompts'
import { getBuilderDataForVariant } from './export'
import { buildResumeJson } from '../lib/themeRegistry'
import type { ParsedJob } from '../lib/aiProvider'

export function registerAiHandlers(): void {
  ipcMain.handle('ai:analyze', async (event, jobPostingId: number, variantId: number) => {
    try {
      // 1. Load AI settings, decrypt key
      const row = db.select().from(aiSettings).where(eq(aiSettings.id, 1)).get()
      if (!row || row.apiKey.length === 0) {
        return { error: 'AI provider not configured', code: 'NOT_CONFIGURED' }
      }

      if (!safeStorage.isEncryptionAvailable()) {
        return { error: 'Encryption not available on this system', code: 'NOT_CONFIGURED' }
      }

      const apiKey = safeStorage.decryptString(Buffer.from(row.apiKey, 'base64'))
      const provider = row.provider
      const model = row.model

      // 2. Load job posting by id
      const posting = db.select().from(jobPostings).where(eq(jobPostings.id, jobPostingId)).get()
      if (!posting) {
        return { error: 'Job posting not found', code: 'NOT_FOUND' }
      }

      // 3. Parse job posting (or use cached data)
      let parsedJob: ParsedJob

      const hasCachedParsed = posting.parsedKeywords !== '[]'
      if (hasCachedParsed) {
        // Reconstruct ParsedJob from stored columns
        parsedJob = {
          title: posting.role,
          company: posting.company,
          required_skills: JSON.parse(posting.parsedSkills) as string[],
          preferred_skills: JSON.parse(posting.parsedPreferred) as string[],
          experience_years: null,
          education_requirement: null,
          key_responsibilities: JSON.parse(posting.parsedRequirements) as string[],
          keywords: JSON.parse(posting.parsedKeywords) as string[],
        }
      } else {
        // Call 1 — parse job posting
        event.sender.send('ai:progress', 'parsing', 10)

        parsedJob = await callJobParser(posting.rawText, apiKey, provider, model)

        // Cache parsed result in the job posting row
        db.update(jobPostings)
          .set({
            parsedSkills: JSON.stringify(parsedJob.required_skills),
            parsedKeywords: JSON.stringify(parsedJob.keywords),
            parsedRequirements: JSON.stringify(parsedJob.key_responsibilities),
            parsedPreferred: JSON.stringify(parsedJob.preferred_skills),
          })
          .where(eq(jobPostings.id, jobPostingId))
          .run()

        event.sender.send('ai:progress', 'parsed', 30, {
          company: parsedJob.company,
          role: parsedJob.title,
          requiredSkills: parsedJob.required_skills,
          preferredSkills: parsedJob.preferred_skills,
          keywords: parsedJob.keywords,
          keyResponsibilities: parsedJob.key_responsibilities,
          experienceYears: parsedJob.experience_years,
          educationRequirement: parsedJob.education_requirement,
        })
      }

      // 4. Build resume text from the specified variant
      const builderData = await getBuilderDataForVariant(variantId)
      const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
      const resumeJson = buildResumeJson(profileRow, builderData)
      const resumeText = buildResumeTextForLlm(resumeJson)

      // 5. Call 2 — score resume
      event.sender.send('ai:progress', 'scoring', 50)

      const scoreResult = await callResumeScorer(resumeText, parsedJob, apiKey, provider, model)
      const overallScore = deriveOverallScore(scoreResult)

      // 6. Store results in analysis_results table
      event.sender.send('ai:progress', 'storing', 90)

      const inserted = db
        .insert(analysisResults)
        .values({
          jobPostingId,
          variantId,
          matchScore: overallScore,
          keywordHits: JSON.stringify(scoreResult.exact_keyword_matches),
          keywordMisses: JSON.stringify(scoreResult.missing_keywords),
          semanticMatches: JSON.stringify(scoreResult.semantic_keyword_matches),
          gapSkills: JSON.stringify(scoreResult.gaps),
          suggestions: JSON.stringify(scoreResult.rewrite_suggestions),
          scoreBreakdown: JSON.stringify({
            keyword_score: scoreResult.keyword_score,
            skills_score: scoreResult.skills_score,
            experience_score: scoreResult.experience_score,
            ats_score: scoreResult.ats_score,
          }),
          rawLlmResponse: JSON.stringify(scoreResult),
          status: 'unreviewed',
        })
        .returning()
        .get()

      // 7. Signal completion
      event.sender.send('ai:progress', 'done', 100)

      return { analysisId: inserted.id, parsedJob }
    } catch (err) {
      console.error('ai:analyze error', err)
      return {
        error: err instanceof Error ? err.message : String(err),
        code: 'ANALYSIS_FAILED',
      }
    }
  })

  // Stub — will be implemented in Phase 10
  ipcMain.handle('ai:acceptSuggestion', async () => {
    return { error: 'Not yet implemented', code: 'NOT_CONFIGURED' }
  })

  // Stub — will be implemented in Phase 10
  ipcMain.handle('ai:dismissSuggestion', async () => {
    return { error: 'Not yet implemented', code: 'NOT_CONFIGURED' }
  })
}
