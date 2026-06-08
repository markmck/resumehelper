import { ipcMain, safeStorage } from 'electron'
import { eq, and } from 'drizzle-orm'
import { db, sqlite } from '../db'
import { aiSettings, jobPostings, analysisResults, profile, analysisSkillAdditions, entityOverrides, analysisExcludedBulletSuggestions, jobBullets, templateVariantItems } from '../db/schema'
import { callJobParser, callResumeScorer, deriveOverallScore, getModel } from '../lib/aiProvider'
import { buildResumeTextForLlm } from '../lib/analysisPrompts'
import { buildMergedBuilderData } from '../lib/mergeHelper'
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
    const llm = getModel(provider, model, apiKey)

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

      parsedJob = await callJobParser(posting.rawText, llm)

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
    const merged = await buildMergedBuilderData(db, variantId)
    const { showSummary: _showSummary, summaryOverride, ...builderData } = merged
    const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
    // Thread variant-tier summary override into the scored profile (D-05).
    // Forward-compat: buildResumeTextForLlm does not currently render basics.summary,
    // so this has no effect on scorer text today, but keeps the merge path the single
    // source of truth for when summary is added to the LLM text.
    const effectiveProfile = profileRow && summaryOverride ? { ...profileRow, summary: summaryOverride } : profileRow
    const resumeJson = buildResumeJson(effectiveProfile, builderData)
    const resumeText = buildResumeTextForLlm(resumeJson)

    // Build excluded bullets context for the scorer prompt.
    // Collect bullets that are excluded in this variant — the scorer uses these to
    // suggest re-inclusions that close JD gaps (SUG-01).
    const excludedBulletIds = new Set<number>()
    const excludedBulletLines: string[] = []
    for (const job of builderData.jobs) {
      for (const b of job.bullets) {
        if (b.excluded) {
          excludedBulletIds.add(b.id)
          excludedBulletLines.push(`[B${b.id}] ${b.text}`)
        }
      }
    }
    const excludedBulletsText = excludedBulletLines.length > 0
      ? excludedBulletLines.join('\n')
      : ''

    // 5. Call 2 — score resume
    event.sender.send('ai:progress', 'scoring', 50)

    const scoreResult = await callResumeScorer(resumeText, parsedJob, llm, excludedBulletsText)
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

    // 7. Seed excluded-bullet suggestions from scorer output (SUG-01).
    // Only validated suggestions (bulletId in job_bullets AND in excludedBulletIds) are persisted.
    ensureExcludedBulletSuggestions(db, inserted.id, scoreResult.excluded_bullet_suggestions, excludedBulletIds)

    // 8. Signal completion
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
    // Resolve variantId from the analysis row
    const analysisRow = db
      .select({ variantId: analysisResults.variantId })
      .from(analysisResults)
      .where(eq(analysisResults.id, analysisId))
      .get()
    const variantId = analysisRow?.variantId ?? null

    // Manual upsert: SQLite partial unique indexes with multiple nullable FK columns
    // do not prevent duplicate rows when NULL values are present (SQLite treats NULLs as
    // distinct in UNIQUE constraints). For job_bullet overrides where project_id, job_id,
    // and project_bullet_id are all NULL, onConflictDoUpdate would insert a duplicate.
    // Instead: delete any existing row for this analysis+bullet, then insert fresh.
    // This is safe — only one override per (analysis_id, entity_type='job_bullet', bullet_id)
    // is semantically valid (D-06 single source of truth). T-35-07: parameterized Drizzle — no SQL injection.
    // Wrapped in a single transaction so a failed insert cannot leave the prior override
    // deleted-but-not-replaced (atomic upsert — restores the guarantee onConflictDoUpdate gave).
    // db and sqlite share one connection, so the raw transaction is atomic over the Drizzle calls.
    sqlite.transaction(() => {
      db.delete(entityOverrides)
        .where(
          and(
            eq(entityOverrides.analysisId, analysisId),
            eq(entityOverrides.entityType, 'job_bullet'),
            eq(entityOverrides.bulletId, bulletId)
          )
        )
        .run()

      db.insert(entityOverrides)
        .values({
          variantId,
          analysisId,
          entityType: 'job_bullet',
          field: 'text',
          bulletId,
          overrideText: text,
          source: 'ai_suggestion',
        })
        .run()
    })()

    return { success: true }
  } catch (err) {
    console.error('ai:acceptSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function dismissSuggestion(db: Db, analysisId: number, bulletId: number) {
  try {
    db.delete(entityOverrides)
      .where(
        and(
          eq(entityOverrides.analysisId, analysisId),
          eq(entityOverrides.entityType, 'job_bullet'),
          eq(entityOverrides.bulletId, bulletId)
        )
      )
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:dismissSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function getOverrides(db: Db, analysisId: number) {
  try {
    // Read job_bullet overrides from entity_overrides.
    // Use the raw sqlite session from the drizzle db instance for parameterized SQL
    // (needed for LEFT JOIN isOrphaned check). T-35-07: parameterized — no string interpolation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (db as any).session
    const prepare = session
      ? (sql: string) => session.client.prepare(sql)
      : (sql: string) => sqlite.prepare(sql)
    const rows = prepare(`
      SELECT eo.bullet_id AS bulletId, eo.override_text AS overrideText,
             eo.source,
             NULL AS suggestionId,
             CASE WHEN jb.id IS NULL THEN 1 ELSE 0 END AS isOrphaned
      FROM entity_overrides eo
      LEFT JOIN job_bullets jb ON jb.id = eo.bullet_id
      WHERE eo.analysis_id = ? AND eo.entity_type = 'job_bullet'
    `).all(analysisId) as Array<{
      bulletId: number
      overrideText: string
      source: string
      suggestionId: null
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

export function ensureExcludedBulletSuggestions(
  db: Db,
  analysisId: number,
  suggestions: Array<{ bulletId: number; reason: string; matched_keywords: string[] }>,
  excludedBulletIds: Set<number>,
) {
  try {
    for (const sg of suggestions) {
      // D-07 guard 1: bulletId must exist in job_bullets (reject hallucinated IDs)
      const bulletRow = db.select({ id: jobBullets.id })
        .from(jobBullets)
        .where(eq(jobBullets.id, sg.bulletId))
        .get()
      if (!bulletRow) {
        console.error(`ensureExcludedBulletSuggestions: bulletId ${sg.bulletId} not found in job_bullets — skipping`)
        continue
      }
      // D-07 guard 2: bulletId must be in the excluded set built at analysis time
      if (!excludedBulletIds.has(sg.bulletId)) {
        console.error(`ensureExcludedBulletSuggestions: bulletId ${sg.bulletId} not in excludedBulletIds set — skipping`)
        continue
      }
      // Insert only if not already present for this (analysisId, bulletId)
      const existing = db.select({ id: analysisExcludedBulletSuggestions.id })
        .from(analysisExcludedBulletSuggestions)
        .where(and(
          eq(analysisExcludedBulletSuggestions.analysisId, analysisId),
          eq(analysisExcludedBulletSuggestions.bulletId, sg.bulletId),
        ))
        .get()
      if (!existing) {
        db.insert(analysisExcludedBulletSuggestions)
          .values({
            analysisId,
            bulletId: sg.bulletId,
            reason: sg.reason,
            matchedKeywords: JSON.stringify(sg.matched_keywords),
            status: 'pending',
          })
          .run()
      }
    }
    return { success: true }
  } catch (err) {
    console.error('ai:ensureExcludedBulletSuggestions error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function acceptExcludedBulletSuggestion(db: Db, analysisId: number, bulletId: number) {
  try {
    // Resolve variantId from the analysis row
    const analysisRow = db
      .select({ variantId: analysisResults.variantId })
      .from(analysisResults)
      .where(eq(analysisResults.id, analysisId))
      .get()
    const variantId = analysisRow?.variantId ?? null

    // D-07 re-validation at accept time (not just at seed time — variant may have changed).
    // Guard 1: bulletId must exist in job_bullets
    const bulletRow = db.select({ id: jobBullets.id })
      .from(jobBullets)
      .where(eq(jobBullets.id, bulletId))
      .get()
    if (!bulletRow) {
      console.error(`acceptExcludedBulletSuggestion: bulletId ${bulletId} not found in job_bullets`)
      return { error: `bulletId ${bulletId} not found in job_bullets` }
    }

    // Guard 2: bulletId must be excluded in template_variant_items for this variant
    if (variantId !== null) {
      const exclusionRow = db.select({ id: templateVariantItems.id })
        .from(templateVariantItems)
        .where(and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.bulletId, bulletId),
          eq(templateVariantItems.excluded, true),
        ))
        .get()
      if (!exclusionRow) {
        console.error(`acceptExcludedBulletSuggestion: bulletId ${bulletId} is not excluded in variant ${variantId}`)
        return { error: `bulletId ${bulletId} is not excluded in variant ${variantId}` }
      }
    }

    // Write inclusion entityOverrides row using manual delete+insert upsert (same atomicity
    // pattern as acceptSuggestion). field='inclusion' and source='inclusion' — NOT field='text'
    // (writing field='text' with overrideText='' would blank the bullet text). The mergeHelper
    // reads source === 'inclusion' to build the inclusion set (D-01).
    sqlite.transaction(() => {
      db.delete(entityOverrides)
        .where(
          and(
            eq(entityOverrides.analysisId, analysisId),
            eq(entityOverrides.entityType, 'job_bullet'),
            eq(entityOverrides.bulletId, bulletId),
          )
        )
        .run()

      db.insert(entityOverrides)
        .values({
          variantId,
          analysisId,
          entityType: 'job_bullet',
          field: 'inclusion',
          bulletId,
          overrideText: '',
          source: 'inclusion',
        })
        .run()
    })()

    // Flip suggestion status to accepted
    db.update(analysisExcludedBulletSuggestions)
      .set({ status: 'accepted' })
      .where(and(
        eq(analysisExcludedBulletSuggestions.analysisId, analysisId),
        eq(analysisExcludedBulletSuggestions.bulletId, bulletId),
      ))
      .run()

    return { success: true }
  } catch (err) {
    console.error('ai:acceptExcludedBulletSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function dismissExcludedBulletSuggestion(db: Db, analysisId: number, bulletId: number) {
  try {
    db.update(analysisExcludedBulletSuggestions)
      .set({ status: 'dismissed' })
      .where(and(
        eq(analysisExcludedBulletSuggestions.analysisId, analysisId),
        eq(analysisExcludedBulletSuggestions.bulletId, bulletId),
      ))
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:dismissExcludedBulletSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function getExcludedBulletSuggestions(db: Db, analysisId: number): Array<{
  bulletId: number
  bulletText: string
  reason: string
  matchedKeywords: string[]
  status: string
}> {
  try {
    // Use raw sqlite session shim for testability (createTestDb uses better-sqlite3 directly).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (db as any).session
    const prepare = session
      ? (sql: string) => session.client.prepare(sql)
      : (sql: string) => sqlite.prepare(sql)
    const rows = prepare(`
      SELECT aebs.bullet_id AS bulletId,
             jb.text AS bulletText,
             aebs.reason,
             aebs.matched_keywords AS matchedKeywords,
             aebs.status
      FROM analysis_excluded_bullet_suggestions aebs
      JOIN job_bullets jb ON jb.id = aebs.bullet_id
      WHERE aebs.analysis_id = ?
      ORDER BY aebs.id
    `).all(analysisId) as Array<{
      bulletId: number
      bulletText: string
      reason: string
      matchedKeywords: string
      status: string
    }>
    return rows.map(r => ({
      ...r,
      matchedKeywords: JSON.parse(r.matchedKeywords) as string[],
    }))
  } catch (err) {
    console.error('ai:getExcludedBulletSuggestions error', err)
    return []
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

  ipcMain.handle('ai:getExcludedBulletSuggestions', (_event, analysisId: number) =>
    getExcludedBulletSuggestions(db, analysisId),
  )

  ipcMain.handle('ai:acceptExcludedBulletSuggestion', (_event, analysisId: number, bulletId: number) =>
    acceptExcludedBulletSuggestion(db, analysisId, bulletId),
  )

  ipcMain.handle('ai:dismissExcludedBulletSuggestion', (_event, analysisId: number, bulletId: number) =>
    dismissExcludedBulletSuggestion(db, analysisId, bulletId),
  )
}
