import { ipcMain, safeStorage } from 'electron'
import { eq, and } from 'drizzle-orm'
import { db, sqlite } from '../db'
import { aiSettings, jobPostings, analysisResults, profile, analysisBulletOverrides, analysisSkillAdditions } from '../db/schema'
import { callJobParser, callResumeScorer, deriveOverallScore } from '../lib/aiProvider'
import { buildResumeTextForLlm } from '../lib/analysisPrompts'
import { getBuilderDataForVariant } from './export'
import { buildResumeJson } from '../lib/themeRegistry'
import type { ParsedJob } from '../lib/aiProvider'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function runAnalysis(db: Db, event: Electron.IpcMainInvokeEvent, jobPostingId: number, variantId: number) {
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
    const builderData = await getBuilderDataForVariant(db, variantId)
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
}

export function acceptSuggestion(db: Db, analysisId: number, bulletId: number, text: string) {
  try {
    db.insert(analysisBulletOverrides)
      .values({
        analysisId,
        bulletId,
        overrideText: text,
        source: 'ai_suggestion',
      })
      .onConflictDoUpdate({
        target: [analysisBulletOverrides.analysisId, analysisBulletOverrides.bulletId],
        set: { overrideText: text, source: 'ai_suggestion' },
      })
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:acceptSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function dismissSuggestion(db: Db, analysisId: number, bulletId: number) {
  try {
    db.delete(analysisBulletOverrides)
      .where(
        and(
          eq(analysisBulletOverrides.analysisId, analysisId),
          eq(analysisBulletOverrides.bulletId, bulletId)
        )
      )
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:dismissSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function getOverrides(_db: Db, analysisId: number) {
  try {
    const rows = sqlite.prepare(`
      SELECT abo.bullet_id AS bulletId, abo.override_text AS overrideText,
             abo.source, abo.suggestion_id AS suggestionId,
             CASE WHEN jb.id IS NULL THEN 1 ELSE 0 END AS isOrphaned
      FROM analysis_bullet_overrides abo
      LEFT JOIN job_bullets jb ON jb.id = abo.bullet_id
      WHERE abo.analysis_id = ?
    `).all(analysisId) as Array<{
      bulletId: number
      overrideText: string
      source: string
      suggestionId: string | null
      isOrphaned: 0 | 1
    }>
    return rows.map(r => ({
      ...r,
      isOrphaned: r.isOrphaned === 1,
    }))
  } catch (err) {
    console.error('ai:getOverrides error', err)
    return []
  }
}

export function acceptSkillAddition(db: Db, analysisId: number, skillName: string) {
  try {
    db.update(analysisSkillAdditions)
      .set({ status: 'accepted' })
      .where(and(
        eq(analysisSkillAdditions.analysisId, analysisId),
        eq(analysisSkillAdditions.skillName, skillName),
      ))
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:acceptSkillAddition error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function dismissSkillAddition(db: Db, analysisId: number, skillName: string) {
  try {
    db.update(analysisSkillAdditions)
      .set({ status: 'dismissed' })
      .where(and(
        eq(analysisSkillAdditions.analysisId, analysisId),
        eq(analysisSkillAdditions.skillName, skillName),
      ))
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:dismissSkillAddition error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function ensureSkillAdditions(db: Db, analysisId: number, skills: Array<{ skill: string; severity: string; reason?: string; category?: string }>) {
  try {
    for (const sk of skills) {
      const existing = db.select({ id: analysisSkillAdditions.id })
        .from(analysisSkillAdditions)
        .where(and(
          eq(analysisSkillAdditions.analysisId, analysisId),
          eq(analysisSkillAdditions.skillName, sk.skill),
        ))
        .get()
      if (!existing) {
        db.insert(analysisSkillAdditions)
          .values({
            analysisId,
            skillName: sk.skill,
            reason: sk.reason ?? '',
            category: sk.category ?? '',
            status: 'pending',
          })
          .run()
      }
    }
    return { success: true }
  } catch (err) {
    console.error('ai:ensureSkillAdditions error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function registerAiHandlers(): void {
  ipcMain.handle('ai:analyze', (event, jobPostingId: number, variantId: number) =>
    runAnalysis(db, event, jobPostingId, variantId),
  )

  ipcMain.handle('ai:acceptSuggestion', (_event, analysisId: number, bulletId: number, text: string) =>
    acceptSuggestion(db, analysisId, bulletId, text),
  )

  ipcMain.handle('ai:dismissSuggestion', (_event, analysisId: number, bulletId: number) =>
    dismissSuggestion(db, analysisId, bulletId),
  )

  ipcMain.handle('ai:getOverrides', (_event, analysisId: number) =>
    getOverrides(db, analysisId),
  )

  ipcMain.handle('ai:acceptSkillAddition', (_event, analysisId: number, skillName: string) =>
    acceptSkillAddition(db, analysisId, skillName),
  )

  ipcMain.handle('ai:dismissSkillAddition', (_event, analysisId: number, skillName: string) =>
    dismissSkillAddition(db, analysisId, skillName),
  )

  ipcMain.handle('ai:ensureSkillAdditions', (_event, analysisId: number, skills: Array<{ skill: string; severity: string; reason?: string; category?: string }>) =>
    ensureSkillAdditions(db, analysisId, skills),
  )
}
