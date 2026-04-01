import { ipcMain, net, safeStorage } from 'electron'
import { db, sqlite } from '../db'
import { jobPostings, analysisResults, templateVariants } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getModel } from '../lib/aiProvider'
import { buildJobPostingUrlPrompt } from '../lib/jobPostingUrlPrompt'

const JobUrlExtractionSchema = z.object({
  isJobPosting: z.boolean(),
  jobTitle: z.string(),
  company: z.string(),
  jobDescriptionText: z.string(),
})

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function registerJobPostingHandlers(): void {
  // Returns all job postings with their latest analysis result (if any)
  ipcMain.handle('jobPostings:list', async () => {
    try {
      const postings = await db
        .select()
        .from(jobPostings)
        .orderBy(desc(jobPostings.createdAt))

      // For each posting, get the latest analysis result
      const results = await Promise.all(
        postings.map(async (posting) => {
          const latestAnalysis = await db
            .select()
            .from(analysisResults)
            .where(eq(analysisResults.jobPostingId, posting.id))
            .orderBy(desc(analysisResults.createdAt))
            .limit(1)
            .then((rows) => rows[0] ?? null)

          return {
            id: posting.id,
            company: posting.company,
            role: posting.role,
            rawText: posting.rawText,
            parsedSkills: JSON.parse(posting.parsedSkills) as string[],
            parsedKeywords: JSON.parse(posting.parsedKeywords) as string[],
            parsedRequirements: JSON.parse(posting.parsedRequirements) as string[],
            parsedPreferred: JSON.parse(posting.parsedPreferred) as string[],
            createdAt: posting.createdAt,
            // Latest analysis data (null if no analysis yet)
            analysisId: latestAnalysis?.id ?? null,
            matchScore: latestAnalysis?.matchScore ?? null,
            status: latestAnalysis?.status ?? null,
            keywordHitsCount: latestAnalysis
              ? (JSON.parse(latestAnalysis.keywordHits) as unknown[]).length
              : null,
            keywordMissesCount: latestAnalysis
              ? (JSON.parse(latestAnalysis.keywordMisses) as unknown[]).length
              : null,
            semanticMatches: latestAnalysis
              ? (JSON.parse(latestAnalysis.semanticMatches) as string[])
              : null,
            analysisCreatedAt: latestAnalysis?.createdAt ?? null,
            variantId: latestAnalysis?.variantId ?? null,
          }
        })
      )

      return results
    } catch (err) {
      console.error('jobPostings:list error', err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Creates a new job posting
  ipcMain.handle(
    'jobPostings:create',
    async (_event, data: { company: string; role: string; rawText: string }) => {
      try {
        const result = await db
          .insert(jobPostings)
          .values({
            company: data.company,
            role: data.role,
            rawText: data.rawText,
          })
          .returning()

        return result[0]
      } catch (err) {
        console.error('jobPostings:create error', err)
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  // Updates a job posting's company and/or role
  ipcMain.handle('jobPostings:update', async (_event, id: number, data: { company?: string; role?: string }) => {
    try {
      const result = await db
        .update(jobPostings)
        .set(data)
        .where(eq(jobPostings.id, id))
        .returning()
      return result[0]
    } catch (err) {
      console.error('jobPostings:update error', err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Deletes a job posting by id (cascade removes analysis_results)
  ipcMain.handle('jobPostings:delete', async (_event, id: number) => {
    try {
      await db.delete(jobPostings).where(eq(jobPostings.id, id))
      return { success: true }
    } catch (err) {
      console.error('jobPostings:delete error', err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Returns full analysis data for a given analysis result id
  // Also marks status as 'reviewed' if currently 'unreviewed'
  ipcMain.handle('jobPostings:getAnalysis', async (_event, analysisId: number) => {
    try {
      const analysis = await db
        .select({
          // Analysis columns
          id: analysisResults.id,
          jobPostingId: analysisResults.jobPostingId,
          variantId: analysisResults.variantId,
          matchScore: analysisResults.matchScore,
          keywordHits: analysisResults.keywordHits,
          keywordMisses: analysisResults.keywordMisses,
          semanticMatches: analysisResults.semanticMatches,
          gapSkills: analysisResults.gapSkills,
          suggestions: analysisResults.suggestions,
          atsFlags: analysisResults.atsFlags,
          rawLlmResponse: analysisResults.rawLlmResponse,
          status: analysisResults.status,
          scoreBreakdown: analysisResults.scoreBreakdown,
          analysisCreatedAt: analysisResults.createdAt,
          // Job posting columns
          company: jobPostings.company,
          role: jobPostings.role,
          rawText: jobPostings.rawText,
        })
        .from(analysisResults)
        .innerJoin(jobPostings, eq(analysisResults.jobPostingId, jobPostings.id))
        .where(eq(analysisResults.id, analysisId))
        .get()

      if (!analysis) {
        return { error: 'Analysis not found', code: 'NOT_FOUND' }
      }

      // Get variant name if available
      let variantName: string | null = null
      if (analysis.variantId != null) {
        const variant = db
          .select({ name: templateVariants.name })
          .from(templateVariants)
          .where(eq(templateVariants.id, analysis.variantId))
          .get()
        variantName = variant?.name ?? null
      }

      // Compute staleness (D-07, D-08): on-demand, no stored column
      let isStale = false
      if (analysis.variantId != null) {
        const analysisEpoch = Math.floor(new Date(analysis.analysisCreatedAt as unknown as string | number).getTime() / 1000)
        const bulletStale = sqlite.prepare(`
          SELECT 1 FROM job_bullets jb
          JOIN template_variant_items tvi ON tvi.bullet_id = jb.id AND tvi.variant_id = ?
          WHERE (tvi.excluded = 0 OR tvi.excluded IS NULL)
            AND jb.updated_at > ?
          LIMIT 1
        `).get(analysis.variantId, analysisEpoch) != null

        const variantStale = sqlite.prepare(`
          SELECT 1 FROM template_variants WHERE id = ? AND updated_at > ? LIMIT 1
        `).get(analysis.variantId, analysisEpoch) != null

        isStale = bulletStale || variantStale
      }

      // Mark as reviewed if currently unreviewed
      if (analysis.status === 'unreviewed') {
        db.update(analysisResults)
          .set({ status: 'reviewed' })
          .where(eq(analysisResults.id, analysisId))
          .run()
      }

      return {
        id: analysis.id,
        jobPostingId: analysis.jobPostingId,
        variantId: analysis.variantId,
        variantName,
        matchScore: analysis.matchScore,
        keywordHits: JSON.parse(analysis.keywordHits) as string[],
        keywordMisses: JSON.parse(analysis.keywordMisses) as string[],
        semanticMatches: JSON.parse(analysis.semanticMatches) as string[],
        gapSkills: JSON.parse(analysis.gapSkills) as Array<{
          skill: string
          severity: 'critical' | 'moderate'
          reason?: string
        }>,
        suggestions: JSON.parse(analysis.suggestions) as Array<{
          original_text: string
          suggested_text: string
          target_keywords: string[]
        }>,
        atsFlags: JSON.parse(analysis.atsFlags) as string[],
        rawLlmResponse: analysis.rawLlmResponse,
        status: analysis.status === 'unreviewed' ? 'reviewed' : analysis.status,
        scoreBreakdown: JSON.parse(analysis.scoreBreakdown) as {
          keyword_score: number
          skills_score: number
          experience_score: number
          ats_score: number
        },
        createdAt: analysis.analysisCreatedAt,
        company: analysis.company,
        role: analysis.role,
        rawText: analysis.rawText,
        isStale,
      }
    } catch (err) {
      console.error('jobPostings:getAnalysis error', err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Updates analysis status (e.g., to 'optimized' after saving accepted suggestions)
  ipcMain.handle('jobPostings:updateAnalysisStatus', async (_event, analysisId: number, status: string) => {
    try {
      db.update(analysisResults).set({ status }).where(eq(analysisResults.id, analysisId)).run()
      return { success: true }
    } catch (err) {
      console.error('jobPostings:updateAnalysisStatus error', err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  // Fetches a job posting URL, strips HTML, and extracts structured job data via AI
  ipcMain.handle('jobPostings:fetchUrl', async (_event, url: string) => {
    // 1. AI config check first (mirrors import:parseResumePdf pattern)
    const aiRow = sqlite.prepare(
      'SELECT provider, model, api_key as apiKey FROM ai_settings WHERE id=1'
    ).get() as { provider: string; model: string; apiKey: string } | undefined
    if (!aiRow?.apiKey?.length) {
      return { error: 'AI provider not configured. Set up your API key in Settings.' }
    }

    // 2. Validate URL
    try {
      new URL(url)
    } catch {
      return { error: 'Please enter a valid URL (e.g., https://jobs.example.com/...)' }
    }

    // 3. Fetch with 15s timeout + browser User-Agent
    let html: string
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await net.fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      })
      clearTimeout(timer)
      if (!response.ok) {
        return { error: `Could not fetch page (HTTP ${response.status})` }
      }
      html = await response.text()
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof Error && err.name === 'AbortError') {
        return { error: 'Request timed out. The page took too long to respond.' }
      }
      return { error: `Network error: ${err instanceof Error ? err.message : String(err)}` }
    }

    // 4. Strip HTML, truncate to 15k chars
    const plainText = stripHtml(html).slice(0, 15000)

    // 5. Decrypt API key and call AI extraction
    const apiKey = safeStorage.decryptString(Buffer.from(aiRow.apiKey, 'base64'))
    const modelInstance = getModel(aiRow.provider, aiRow.model, apiKey)
    const { system, prompt } = buildJobPostingUrlPrompt(plainText)

    let extracted: z.infer<typeof JobUrlExtractionSchema>
    try {
      const result = await generateObject({
        model: modelInstance as Parameters<typeof generateObject>[0]['model'],
        schema: JobUrlExtractionSchema,
        system,
        prompt,
        temperature: 0,
      })
      extracted = result.object
    } catch (err) {
      return { error: `AI extraction failed: ${err instanceof Error ? err.message : String(err)}` }
    }

    // 6. Validate extracted content
    if (!extracted.isJobPosting || extracted.jobDescriptionText.trim().length < 50) {
      return { error: 'Could not extract job posting from this page. The page may require JavaScript or login. Try copying and pasting the job text instead.' }
    }

    return {
      jobTitle: extracted.jobTitle,
      company: extracted.company,
      jobDescriptionText: extracted.jobDescriptionText,
    }
  })
}
