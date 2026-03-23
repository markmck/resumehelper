import { ipcMain } from 'electron'
import { db } from '../db'
import { jobPostings, analysisResults, templateVariants } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

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
      }
    } catch (err) {
      console.error('jobPostings:getAnalysis error', err)
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}
