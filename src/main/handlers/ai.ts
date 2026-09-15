import { ipcMain, safeStorage } from 'electron'
import { eq, and } from 'drizzle-orm'
import { db, sqlite } from '../db'
import { aiSettings, jobPostings, analysisResults, profile, analysisSkillAdditions, entityOverrides, analysisExcludedBulletSuggestions, analysisExcludedProjectSuggestions, jobBullets, projects, templateVariantItems, coverLetters, templateVariants } from '../db/schema'
import { callJobParser, callResumeScorer, callCoverLetterGenerator, deriveOverallScore, getModel } from '../lib/aiProvider'
import { cleanScorerProse } from '../lib/aiPhrases'
import { buildResumeTextForLlm, resolveLetterTone } from '../lib/analysisPrompts'
import { buildMergedBuilderData } from '../lib/mergeHelper'
import { buildResumeJson } from '../lib/themeRegistry'
import type { ParsedJob } from '../lib/aiProvider'
import type { LanguageModel } from 'ai'
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

    // Build excluded projects context for the scorer prompt (PROJ-01).
    // Collect whole projects excluded in this variant so the scorer can suggest re-inclusions.
    // Skip projects with no showable bullets — a bare name is not worth suggesting.
    const excludedProjectIds = new Set<number>()
    const excludedProjectLines: string[] = []
    for (const project of builderData.projects) {
      if (!project.excluded) continue
      const projectBullets = project.bullets.filter((b) => !b.excluded)
      if (projectBullets.length === 0) continue
      excludedProjectIds.add(project.id)
      excludedProjectLines.push(`[P${project.id}] ${project.name}`)
      for (const b of projectBullets) excludedProjectLines.push(`• ${b.text}`)
    }
    const excludedProjectsText = excludedProjectLines.length > 0
      ? excludedProjectLines.join('\n')
      : ''

    // 5. Call 2 — score resume
    event.sender.send('ai:progress', 'scoring', 50)

    const rawScore = await callResumeScorer(resumeText, parsedJob, llm, excludedBulletsText, excludedProjectsText)
    // Swap machine-sounding words and em-dashes out of the AI-authored prose before anything is
    // stored. The cleaned result is also what goes into rawLlmResponse, because the suggested
    // summary is read back from there (SUM-01).
    const { score: scoreResult, removed: aiPhrasesRemoved } = cleanScorerProse(rawScore, {
      jobText: posting.rawText,
      resumeText,
    })
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
        rawLlmResponse: JSON.stringify({ ...scoreResult, ai_phrases_removed: aiPhrasesRemoved }),
        status: 'unreviewed',
      })
      .returning()
      .get()

    // 7. Seed excluded-bullet suggestions from scorer output (SUG-01).
    // Only validated suggestions (bulletId in job_bullets AND in excludedBulletIds) are persisted.
    ensureExcludedBulletSuggestions(db, inserted.id, scoreResult.excluded_bullet_suggestions, excludedBulletIds)

    // 7b. Seed excluded-project suggestions from scorer output (PROJ-01).
    // Only validated suggestions (projectId in projects AND in excludedProjectIds) are persisted.
    ensureExcludedProjectSuggestions(db, inserted.id, scoreResult.project_suggestions, excludedProjectIds)

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

// SUM-02: Write an analysis-tier entity_overrides summary override.
// Mirrors acceptSuggestion exactly — delete-then-insert in one sqlite.transaction
// so there is always exactly one summary row per analysis (upsert guarantee).
// Does NOT route through setVariantOverride (which hardcodes analysisId:null — research pitfall).
export function acceptAnalysisSummary(db: Db, analysisId: number, text: string) {
  try {
    // Resolve variantId from the analysis row (may be null — matches acceptSuggestion pattern)
    const analysisRow = db
      .select({ variantId: analysisResults.variantId })
      .from(analysisResults)
      .where(eq(analysisResults.id, analysisId))
      .get()
    const variantId = analysisRow?.variantId ?? null

    sqlite.transaction(() => {
      // Delete any existing analysis-tier summary override for this analysis
      db.delete(entityOverrides)
        .where(
          and(
            eq(entityOverrides.analysisId, analysisId),
            eq(entityOverrides.entityType, 'summary'),
            eq(entityOverrides.field, 'text'),
          )
        )
        .run()

      db.insert(entityOverrides)
        .values({
          variantId,
          analysisId,
          entityType: 'summary',
          field: 'text',
          overrideText: text,
          source: 'ai_suggestion',
        })
        .run()
    })()

    return { success: true }
  } catch (err) {
    console.error('ai:acceptAnalysisSummary error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// SUM-03: Remove a previously accepted analysis-tier summary override (reject).
// Idempotent — deleting a non-existent override is a no-op.
export function clearAnalysisSummary(db: Db, analysisId: number) {
  try {
    db.delete(entityOverrides)
      .where(
        and(
          eq(entityOverrides.analysisId, analysisId),
          eq(entityOverrides.entityType, 'summary'),
          eq(entityOverrides.field, 'text'),
        )
      )
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:clearAnalysisSummary error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// Return the accepted analysis-tier summary override text, or null if none.
// Used to hydrate the summary card's "accepted" state when re-opening Optimize.
export function getAnalysisSummary(db: Db, analysisId: number): string | null {
  try {
    const row = db
      .select({ text: entityOverrides.overrideText })
      .from(entityOverrides)
      .where(
        and(
          eq(entityOverrides.analysisId, analysisId),
          eq(entityOverrides.entityType, 'summary'),
          eq(entityOverrides.field, 'text'),
        )
      )
      .get()
    return row?.text ?? null
  } catch (err) {
    console.error('ai:getAnalysisSummary error', err)
    return null
  }
}

// ─── Cover letter generation + persistence (Phase 42) ──────────────────────

// D-10: blind overwrite, no versioning — a regenerate-guard warning was explicitly
// declined (T-02). Do NOT read the existing row first, do NOT warn.
export function saveCoverLetterDraft(db: Db, analysisId: number, text: string) {
  try {
    sqlite.transaction(() => {
      db.delete(coverLetters).where(eq(coverLetters.analysisId, analysisId)).run()
      db.insert(coverLetters)
        .values({ analysisId, letterText: text, updatedAt: new Date() })
        .run()
    })()
    return { success: true }
  } catch (err) {
    console.error('ai:saveCoverLetterDraft error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function getCoverLetter(db: Db, analysisId: number): string | null {
  try {
    const row = db
      .select({ letterText: coverLetters.letterText })
      .from(coverLetters)
      .where(eq(coverLetters.analysisId, analysisId))
      .get()
    return row?.letterText ?? null
  } catch (err) {
    console.error('ai:getCoverLetter error', err)
    return null
  }
}

// D-12: generation requires an analysis — there is no variant+raw-JD fallback and
// no inline offer to run analysis. D-07: tone is derived from the analysis's
// variant layoutTemplate. D-04: the letter saves as a draft immediately on
// generation, with no accept/edit/dismiss gate.
export async function generateCoverLetter(db: Db, analysisId: number, injectedModel?: LanguageModel) {
  try {
    // 1. Load the analysis row (D-12 — generation requires an analysis)
    const analysis = db
      .select({ id: analysisResults.id, jobPostingId: analysisResults.jobPostingId, variantId: analysisResults.variantId })
      .from(analysisResults)
      .where(eq(analysisResults.id, analysisId))
      .get()
    if (!analysis) {
      return { error: 'Analysis not found', code: 'NOT_FOUND' }
    }
    if (analysis.variantId == null) {
      return { error: 'Analysis has no variant', code: 'NOT_FOUND' }
    }
    const variantId = analysis.variantId

    // 2. Resolve the model — replicate runAnalysis's key-decryption path exactly.
    // No new secret surface (ASVS V6).
    let llm: LanguageModel
    if (injectedModel) {
      llm = injectedModel
    } else {
      const row = db.select().from(aiSettings).where(eq(aiSettings.id, 1)).get()
      if (!row || row.apiKey.length === 0) {
        return { error: 'AI provider not configured', code: 'NOT_CONFIGURED' }
      }
      if (!safeStorage.isEncryptionAvailable()) {
        return { error: 'Encryption not available on this system', code: 'NOT_CONFIGURED' }
      }
      const apiKey = safeStorage.decryptString(Buffer.from(row.apiKey, 'base64'))
      llm = getModel(row.provider, row.model, apiKey) as LanguageModel
    }

    // 3. Load the job posting and reconstruct ParsedJob from cached columns —
    // D-12 guarantees an analysis (and therefore cached parsed data) exists, so
    // no second callJobParser LLM call is made here.
    const posting = db.select().from(jobPostings).where(eq(jobPostings.id, analysis.jobPostingId)).get()
    if (!posting) {
      return { error: 'Job posting not found', code: 'NOT_FOUND' }
    }
    const parsedJob: ParsedJob = {
      title: posting.role,
      company: posting.company,
      required_skills: JSON.parse(posting.parsedSkills) as string[],
      preferred_skills: JSON.parse(posting.parsedPreferred) as string[],
      experience_years: null,
      education_requirement: null,
      key_responsibilities: JSON.parse(posting.parsedRequirements) as string[],
      keywords: JSON.parse(posting.parsedKeywords) as string[],
    }

    // 4. Resolve tone from the analysis's variant layoutTemplate (D-07)
    const variant = db
      .select({ layoutTemplate: templateVariants.layoutTemplate })
      .from(templateVariants)
      .where(eq(templateVariants.id, variantId))
      .get()
    const tone = resolveLetterTone(variant?.layoutTemplate)

    // 5. Build resume text exactly as runAnalysis does
    const merged = await buildMergedBuilderData(db, variantId)
    const { showSummary: _showSummary, summaryOverride, ...builderData } = merged
    const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
    const effectiveProfile = profileRow && summaryOverride ? { ...profileRow, summary: summaryOverride } : profileRow
    const resumeJson = buildResumeJson(effectiveProfile, builderData)
    const resumeText = buildResumeTextForLlm(resumeJson)
    const candidateName = profileRow?.name ?? ''

    // 6. Call the LLM — MUST stay outside any sqlite.transaction() callback (RESEARCH.md
    // Pitfall 4 — better-sqlite3 transactions are synchronous).
    const letter = await callCoverLetterGenerator(resumeText, parsedJob, tone, candidateName, llm)

    // 7. Persist immediately as a draft — D-04, no accept step.
    saveCoverLetterDraft(db, analysisId, letter)

    // 8. Return the letter
    return { letter }
  } catch (err) {
    console.error('ai:generateCoverLetter error', err)
    return {
      error: err instanceof Error ? err.message : String(err),
      code: 'GENERATION_FAILED',
    }
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

// Set the category for a staged skill addition. Controls which skills section the
// added skill lands in on the optimized resume (mergeHelper uses sk.category as the
// categoryName). Persists the user's choice across reloads.
export function setSkillAdditionCategory(db: Db, analysisId: number, skillName: string, category: string) {
  try {
    db.update(analysisSkillAdditions)
      .set({ category })
      .where(and(
        eq(analysisSkillAdditions.analysisId, analysisId),
        eq(analysisSkillAdditions.skillName, skillName),
      ))
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:setSkillAdditionCategory error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// Return staged skill additions (name, category, status) so the Optimize screen can
// hydrate user-set categories and accept/dismiss state across reloads.
export function getSkillAdditions(db: Db, analysisId: number) {
  try {
    return db
      .select({
        skillName: analysisSkillAdditions.skillName,
        category: analysisSkillAdditions.category,
        status: analysisSkillAdditions.status,
      })
      .from(analysisSkillAdditions)
      .where(eq(analysisSkillAdditions.analysisId, analysisId))
      .all()
  } catch (err) {
    console.error('ai:getSkillAdditions error', err)
    return []
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

// ─── Excluded-project suggestions (PROJ-01) — mirrors the excluded-bullet flow ──

export function ensureExcludedProjectSuggestions(
  db: Db,
  analysisId: number,
  suggestions: Array<{ projectId: number; reason: string; matched_keywords: string[] }>,
  excludedProjectIds: Set<number>,
) {
  try {
    for (const sg of suggestions) {
      // Guard 1: projectId must exist in projects (reject hallucinated IDs)
      const projectRow = db.select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, sg.projectId))
        .get()
      if (!projectRow) {
        console.error(`ensureExcludedProjectSuggestions: projectId ${sg.projectId} not found in projects — skipping`)
        continue
      }
      // Guard 2: projectId must be in the excluded set built at analysis time
      if (!excludedProjectIds.has(sg.projectId)) {
        console.error(`ensureExcludedProjectSuggestions: projectId ${sg.projectId} not in excludedProjectIds set — skipping`)
        continue
      }
      // Insert only if not already present for this (analysisId, projectId)
      const existing = db.select({ id: analysisExcludedProjectSuggestions.id })
        .from(analysisExcludedProjectSuggestions)
        .where(and(
          eq(analysisExcludedProjectSuggestions.analysisId, analysisId),
          eq(analysisExcludedProjectSuggestions.projectId, sg.projectId),
        ))
        .get()
      if (!existing) {
        db.insert(analysisExcludedProjectSuggestions)
          .values({
            analysisId,
            projectId: sg.projectId,
            reason: sg.reason,
            matchedKeywords: JSON.stringify(sg.matched_keywords),
            status: 'pending',
          })
          .run()
      }
    }
    return { success: true }
  } catch (err) {
    console.error('ai:ensureExcludedProjectSuggestions error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function acceptExcludedProjectSuggestion(db: Db, analysisId: number, projectId: number) {
  try {
    // Resolve variantId from the analysis row
    const analysisRow = db
      .select({ variantId: analysisResults.variantId })
      .from(analysisResults)
      .where(eq(analysisResults.id, analysisId))
      .get()
    const variantId = analysisRow?.variantId ?? null

    // Re-validation at accept time (variant may have changed since seeding).
    // Guard 1: projectId must exist in projects
    const projectRow = db.select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .get()
    if (!projectRow) {
      console.error(`acceptExcludedProjectSuggestion: projectId ${projectId} not found in projects`)
      return { error: `projectId ${projectId} not found in projects` }
    }

    // Guard 2: projectId must be excluded in template_variant_items for this variant
    if (variantId !== null) {
      const exclusionRow = db.select({ id: templateVariantItems.id })
        .from(templateVariantItems)
        .where(and(
          eq(templateVariantItems.variantId, variantId),
          eq(templateVariantItems.projectId, projectId),
          eq(templateVariantItems.excluded, true),
        ))
        .get()
      if (!exclusionRow) {
        console.error(`acceptExcludedProjectSuggestion: projectId ${projectId} is not excluded in variant ${variantId}`)
        return { error: `projectId ${projectId} is not excluded in variant ${variantId}` }
      }
    }

    // Write inclusion entityOverrides row (delete+insert upsert). field='inclusion' and
    // source='inclusion' — NOT field='text'. The mergeHelper reads source === 'inclusion'
    // with projectId set to build the project inclusion set (PROJ-01).
    sqlite.transaction(() => {
      db.delete(entityOverrides)
        .where(
          and(
            eq(entityOverrides.analysisId, analysisId),
            eq(entityOverrides.entityType, 'project'),
            eq(entityOverrides.projectId, projectId),
          )
        )
        .run()

      db.insert(entityOverrides)
        .values({
          variantId,
          analysisId,
          entityType: 'project',
          field: 'inclusion',
          projectId,
          overrideText: '',
          source: 'inclusion',
        })
        .run()
    })()

    // Flip suggestion status to accepted
    db.update(analysisExcludedProjectSuggestions)
      .set({ status: 'accepted' })
      .where(and(
        eq(analysisExcludedProjectSuggestions.analysisId, analysisId),
        eq(analysisExcludedProjectSuggestions.projectId, projectId),
      ))
      .run()

    return { success: true }
  } catch (err) {
    console.error('ai:acceptExcludedProjectSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function dismissExcludedProjectSuggestion(db: Db, analysisId: number, projectId: number) {
  try {
    db.update(analysisExcludedProjectSuggestions)
      .set({ status: 'dismissed' })
      .where(and(
        eq(analysisExcludedProjectSuggestions.analysisId, analysisId),
        eq(analysisExcludedProjectSuggestions.projectId, projectId),
      ))
      .run()
    return { success: true }
  } catch (err) {
    console.error('ai:dismissExcludedProjectSuggestion error', err)
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export function getExcludedProjectSuggestions(db: Db, analysisId: number): Array<{
  projectId: number
  projectName: string
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
      SELECT aeps.project_id AS projectId,
             p.name AS projectName,
             aeps.reason,
             aeps.matched_keywords AS matchedKeywords,
             aeps.status
      FROM analysis_excluded_project_suggestions aeps
      JOIN projects p ON p.id = aeps.project_id
      WHERE aeps.analysis_id = ?
      ORDER BY aeps.id
    `).all(analysisId) as Array<{
      projectId: number
      projectName: string
      reason: string
      matchedKeywords: string
      status: string
    }>
    return rows.map(r => ({
      ...r,
      matchedKeywords: JSON.parse(r.matchedKeywords) as string[],
    }))
  } catch (err) {
    console.error('ai:getExcludedProjectSuggestions error', err)
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

  ipcMain.handle('ai:getExcludedProjectSuggestions', (_event, analysisId: number) =>
    getExcludedProjectSuggestions(db, analysisId),
  )

  ipcMain.handle('ai:acceptExcludedProjectSuggestion', (_event, analysisId: number, projectId: number) =>
    acceptExcludedProjectSuggestion(db, analysisId, projectId),
  )

  ipcMain.handle('ai:dismissExcludedProjectSuggestion', (_event, analysisId: number, projectId: number) =>
    dismissExcludedProjectSuggestion(db, analysisId, projectId),
  )

  ipcMain.handle('ai:acceptAnalysisSummary', (_event, analysisId: number, text: string) =>
    acceptAnalysisSummary(db, analysisId, text),
  )

  ipcMain.handle('ai:clearAnalysisSummary', (_event, analysisId: number) =>
    clearAnalysisSummary(db, analysisId),
  )

  ipcMain.handle('ai:getAnalysisSummary', (_event, analysisId: number) =>
    getAnalysisSummary(db, analysisId),
  )

  ipcMain.handle('ai:setSkillAdditionCategory', (_event, analysisId: number, skillName: string, category: string) =>
    setSkillAdditionCategory(db, analysisId, skillName, category),
  )

  ipcMain.handle('ai:getSkillAdditions', (_event, analysisId: number) =>
    getSkillAdditions(db, analysisId),
  )

  ipcMain.handle('ai:generateCoverLetter', (_event, analysisId: number) =>
    generateCoverLetter(db, analysisId),
  )

  ipcMain.handle('ai:saveCoverLetterDraft', (_event, analysisId: number, text: string) =>
    saveCoverLetterDraft(db, analysisId, text),
  )

  ipcMain.handle('ai:getCoverLetter', (_event, analysisId: number) =>
    getCoverLetter(db, analysisId),
  )
}
