import { ipcMain } from 'electron'
import { db } from '../db'
import { submissions, submissionEvents, templateVariants, analysisResults, jobPostings, profile } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import type { BuilderJob, BuilderSkill, BuilderProject, BuilderEducation, BuilderVolunteer, BuilderAward, BuilderPublication, BuilderLanguage, BuilderInterest, BuilderReference } from '../../preload/index.d'
import { buildMergedBuilderData } from '../lib/mergeHelper'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'

type Db = BetterSQLite3Database<typeof schema>

export interface SubmissionSnapshot {
  layoutTemplate: string
  templateOptions?: { accentColor?: string; skillsDisplay?: string; marginTop?: number; marginBottom?: number; marginSides?: number; showSummary?: boolean }
  profile?: { name: string; email: string; phone: string; location: string; linkedin: string; summary?: string }
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]
  education: BuilderEducation[]
  volunteer: BuilderVolunteer[]
  awards: BuilderAward[]
  publications: BuilderPublication[]
  languages: BuilderLanguage[]
  interests: BuilderInterest[]
  references: BuilderReference[]
}

export async function buildSnapshotForVariant(db: Db, variantId: number, analysisId?: number): Promise<SubmissionSnapshot> {
  const [variant] = await db
    .select({ layoutTemplate: templateVariants.layoutTemplate, templateOptions: templateVariants.templateOptions })
    .from(templateVariants)
    .where(eq(templateVariants.id, variantId))

  const layoutTemplate = variant?.layoutTemplate ?? 'traditional'
  let templateOptions: SubmissionSnapshot['templateOptions'] = undefined
  try {
    if (variant?.templateOptions) {
      templateOptions = JSON.parse(variant.templateOptions as string)
    }
  } catch { /* keep undefined */ }

  const merged = await buildMergedBuilderData(db, variantId, analysisId)
  const { showSummary, summaryOverride, effectiveMargins, ...builderArrays } = merged

  // Freeze showSummary and effectiveMargins into snapshot's templateOptions for immutability (D-06, D-07, D-08).
  if (templateOptions) {
    templateOptions.showSummary = showSummary
    templateOptions.marginTop = effectiveMargins.top
    templateOptions.marginBottom = effectiveMargins.bottom
    templateOptions.marginSides = effectiveMargins.sides
  } else {
    templateOptions = {
      showSummary,
      marginTop: effectiveMargins.top,
      marginBottom: effectiveMargins.bottom,
      marginSides: effectiveMargins.sides,
    }
  }

  // Freeze profile at submission time
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
  const frozenProfile = profileRow
    ? { name: profileRow.name, email: profileRow.email, phone: profileRow.phone, location: profileRow.location, linkedin: profileRow.linkedin, summary: summaryOverride ?? profileRow.summary ?? undefined }
    : undefined

  return {
    layoutTemplate,
    templateOptions,
    profile: frozenProfile,
    ...builderArrays,
  }
}

export async function listSubmissions(db: Db) {
  const rows = await db
    .select({
      id: submissions.id,
      company: submissions.company,
      role: submissions.role,
      submittedAt: submissions.submittedAt,
      variantId: submissions.variantId,
      resumeSnapshot: submissions.resumeSnapshot,
      url: submissions.url,
      notes: submissions.notes,
      status: submissions.status,
      scoreAtSubmit: submissions.scoreAtSubmit,
      analysisId: submissions.analysisId,
      variantName: templateVariants.name,
    })
    .from(submissions)
    .leftJoin(templateVariants, eq(submissions.variantId, templateVariants.id))
    .orderBy(desc(submissions.submittedAt))

  return rows.map((row) => ({
    id: row.id,
    company: row.company,
    role: row.role,
    submittedAt: row.submittedAt,
    variantId: row.variantId,
    resumeSnapshot: row.resumeSnapshot,
    url: row.url,
    notes: row.notes,
    status: row.status ?? 'applied',
    scoreAtSubmit: row.scoreAtSubmit ?? null,
    analysisId: row.analysisId ?? null,
    variantName: row.variantName ?? null,
  }))
}

export async function createSubmission(
  db: Db,
  data: {
    company: string
    role: string
    submittedAt?: Date
    variantId: number | null
    url?: string
    notes?: string
    status?: string
    scoreAtSubmit?: number | null
    analysisId?: number | null
  },
) {
  let snapshot: SubmissionSnapshot = { layoutTemplate: 'traditional', jobs: [], skills: [], projects: [], education: [], volunteer: [], awards: [], publications: [], languages: [], interests: [], references: [] }
  if (data.variantId != null) {
    snapshot = await buildSnapshotForVariant(db, data.variantId, data.analysisId ?? undefined)
  }

  const rows = await db
    .insert(submissions)
    .values({
      company: data.company,
      role: data.role,
      submittedAt: data.submittedAt ?? new Date(),
      variantId: data.variantId,
      resumeSnapshot: JSON.stringify(snapshot),
      url: data.url ?? null,
      notes: data.notes ?? null,
      status: data.status ?? 'applied',
      scoreAtSubmit: data.scoreAtSubmit ?? null,
      analysisId: data.analysisId ?? null,
    })
    .returning()

  const newRow = rows[0]

  // Also create an initial submission event
  await db
    .insert(submissionEvents)
    .values({
      submissionId: newRow.id,
      status: data.status ?? 'applied',
      note: 'Submission created',
    })

  // Return with variantName via LEFT JOIN
  const [fullRow] = await db
    .select({
      id: submissions.id,
      company: submissions.company,
      role: submissions.role,
      submittedAt: submissions.submittedAt,
      variantId: submissions.variantId,
      resumeSnapshot: submissions.resumeSnapshot,
      url: submissions.url,
      notes: submissions.notes,
      status: submissions.status,
      scoreAtSubmit: submissions.scoreAtSubmit,
      analysisId: submissions.analysisId,
      variantName: templateVariants.name,
    })
    .from(submissions)
    .leftJoin(templateVariants, eq(submissions.variantId, templateVariants.id))
    .where(eq(submissions.id, newRow.id))

  return {
    ...fullRow,
    status: fullRow.status ?? 'applied',
    scoreAtSubmit: fullRow.scoreAtSubmit ?? null,
    analysisId: fullRow.analysisId ?? null,
    variantName: fullRow.variantName ?? null,
  }
}

export async function updateSubmission(
  db: Db,
  id: number,
  data: {
    company?: string
    role?: string
    submittedAt?: Date
    url?: string | null
    notes?: string | null
  },
) {
  const rows = await db
    .update(submissions)
    .set({
      ...(data.company !== undefined && { company: data.company }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.submittedAt !== undefined && { submittedAt: data.submittedAt }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.notes !== undefined && { notes: data.notes }),
    })
    .where(eq(submissions.id, id))
    .returning()

  return rows[0]
}

export async function deleteSubmission(db: Db, id: number) {
  await db.delete(submissions).where(eq(submissions.id, id))
}

export async function findByAnalysis(db: Db, analysisId: number) {
  const row = await db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(eq(submissions.analysisId, analysisId))
    .limit(1)

  return row[0] ?? null
}

export async function updateStatus(db: Db, id: number, status: string, note?: string) {
  await db
    .update(submissions)
    .set({ status })
    .where(eq(submissions.id, id))

  await db
    .insert(submissionEvents)
    .values({
      submissionId: id,
      status,
      note: note ?? null,
    })
}

export async function getEvents(db: Db, submissionId: number) {
  const rows = await db
    .select()
    .from(submissionEvents)
    .where(eq(submissionEvents.submissionId, submissionId))
    .orderBy(desc(submissionEvents.createdAt), desc(submissionEvents.id))

  return rows
}

export async function addEvent(db: Db, data: { submissionId: number; status: string; note?: string }) {
  const rows = await db
    .insert(submissionEvents)
    .values({
      submissionId: data.submissionId,
      status: data.status,
      note: data.note ?? null,
    })
    .returning()

  return rows[0]
}

export async function getSubmissionMetrics(db: Db) {
  const all = await db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
      status: submissions.status,
      scoreAtSubmit: submissions.scoreAtSubmit,
    })
    .from(submissions)

  const total = all.length
  if (total === 0) {
    return {
      total: 0,
      thisMonth: 0,
      active: 0,
      responseRate: 0,
      respondedCount: 0,
      avgScore: null,
      respondedAvgScore: null,
    }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const thisMonth = all.filter(
    (s) => s.submittedAt != null && s.submittedAt >= startOfMonth,
  ).length

  const active = all.filter(
    (s) => s.status === 'screening' || s.status === 'interview',
  ).length

  const responded = all.filter(
    (s) => s.status != null && s.status !== 'applied',
  )

  const responseRate = Math.round((responded.length / total) * 100)
  const respondedCount = responded.length

  const scoredAll = all.filter((s) => s.scoreAtSubmit != null)
  const avgScore =
    scoredAll.length > 0
      ? scoredAll.reduce((sum, s) => sum + (s.scoreAtSubmit ?? 0), 0) / scoredAll.length
      : null

  const scoredResponded = responded.filter((s) => s.scoreAtSubmit != null)
  const respondedAvgScore =
    scoredResponded.length > 0
      ? scoredResponded.reduce((sum, s) => sum + (s.scoreAtSubmit ?? 0), 0) / scoredResponded.length
      : null

  return {
    total,
    thisMonth,
    active,
    responseRate,
    respondedCount,
    avgScore,
    respondedAvgScore,
  }
}

export async function getAnalysisById(db: Db, analysisId: number) {
  const rows = await db
    .select({
      id: analysisResults.id,
      company: jobPostings.company,
      role: jobPostings.role,
      score: analysisResults.matchScore,
      variantId: analysisResults.variantId,
      variantName: templateVariants.name,
      createdAt: analysisResults.createdAt,
    })
    .from(analysisResults)
    .innerJoin(jobPostings, eq(analysisResults.jobPostingId, jobPostings.id))
    .leftJoin(templateVariants, eq(analysisResults.variantId, templateVariants.id))
    .where(eq(analysisResults.id, analysisId))

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    score: row.score,
    variantId: row.variantId ?? 0,
    variantName: row.variantName ?? '',
    createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  }
}

export function registerSubmissionHandlers(): void {
  ipcMain.handle('submissions:list', () => listSubmissions(db))
  ipcMain.handle('submissions:create', (_, data) => createSubmission(db, data))
  ipcMain.handle('submissions:update', (_, id, data) => updateSubmission(db, id, data))
  ipcMain.handle('submissions:delete', (_, id) => deleteSubmission(db, id))
  ipcMain.handle('submissions:findByAnalysis', (_, analysisId) => findByAnalysis(db, analysisId))
  ipcMain.handle('submissions:updateStatus', (_, id, status, note) => updateStatus(db, id, status, note))
  ipcMain.handle('submissions:getEvents', (_, submissionId) => getEvents(db, submissionId))
  ipcMain.handle('submissions:addEvent', (_, data) => addEvent(db, data))
  ipcMain.handle('submissions:metrics', () => getSubmissionMetrics(db))
  ipcMain.handle('submissions:getAnalysisById', (_, analysisId) => getAnalysisById(db, analysisId))
}
