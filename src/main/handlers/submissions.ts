import { ipcMain } from 'electron'
import { db } from '../db'
import { submissions, submissionEvents, templateVariants, templateVariantItems, jobs, jobBullets, skills, projects, projectBullets, education, volunteer, awards, publications, languages, interests, referenceEntries, analysisResults, jobPostings, profile, analysisBulletOverrides, analysisSkillAdditions } from '../db/schema'
import { eq, desc, asc, and } from 'drizzle-orm'
import type { BuilderJob, BuilderSkill, BuilderProject, BuilderEducation, BuilderVolunteer, BuilderAward, BuilderPublication, BuilderLanguage, BuilderInterest, BuilderReference } from '../../preload/index.d'
import { applyOverrides } from '../../shared/overrides'

interface SubmissionSnapshot {
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

async function buildSnapshotForVariant(variantId: number, analysisId?: number): Promise<SubmissionSnapshot> {
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

  // Capture showSummary from the sentinel row in templateVariantItems
  const summaryRow = await db
    .select()
    .from(templateVariantItems)
    .where(eq(templateVariantItems.variantId, variantId))
    .then(rows => rows.find(r => r.itemType === 'summary'))
  const showSummary = summaryRow ? !summaryRow.excluded : true
  if (templateOptions) {
    templateOptions.showSummary = showSummary
  } else {
    templateOptions = { showSummary }
  }

  // Freeze profile at submission time
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
  const frozenProfile = profileRow
    ? { name: profileRow.name, email: profileRow.email, phone: profileRow.phone, location: profileRow.location, linkedin: profileRow.linkedin, summary: profileRow.summary ?? undefined }
    : undefined

  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.startDate))
  const allBullets = await db.select().from(jobBullets).orderBy(asc(jobBullets.sortOrder))
  const allSkills = await db.select().from(skills)
  const allProjects = await db.select().from(projects).orderBy(asc(projects.sortOrder))
  const allProjectBullets = await db.select().from(projectBullets).orderBy(asc(projectBullets.sortOrder))
  const allEducation = await db.select().from(education)
  const allVolunteer = await db.select().from(volunteer)
  const allAwards = await db.select().from(awards)
  const allPublications = await db.select().from(publications)
  const allLanguages = await db.select().from(languages)
  const allInterests = await db.select().from(interests)
  const allReferences = await db.select().from(referenceEntries)
  const exclusionItems = await db
    .select()
    .from(templateVariantItems)
    .where(eq(templateVariantItems.variantId, variantId))

  const excludedJobIds = new Set<number>()
  const excludedBulletIds = new Set<number>()
  const excludedSkillIds = new Set<number>()
  const excludedProjectIds = new Set<number>()
  const excludedProjectBulletIds = new Set<number>()
  const excludedEducationIds = new Set<number>()
  const excludedVolunteerIds = new Set<number>()
  const excludedAwardIds = new Set<number>()
  const excludedPublicationIds = new Set<number>()
  const excludedLanguageIds = new Set<number>()
  const excludedInterestIds = new Set<number>()
  const excludedReferenceIds = new Set<number>()

  for (const item of exclusionItems) {
    if (!item.excluded) continue
    if (item.itemType === 'job' && item.jobId != null) excludedJobIds.add(item.jobId)
    if (item.itemType === 'bullet' && item.bulletId != null) excludedBulletIds.add(item.bulletId)
    if (item.itemType === 'skill' && item.skillId != null) excludedSkillIds.add(item.skillId)
    if (item.itemType === 'project' && item.projectId != null) excludedProjectIds.add(item.projectId)
    if (item.itemType === 'projectBullet' && item.projectBulletId != null) excludedProjectBulletIds.add(item.projectBulletId)
    if (item.itemType === 'education' && item.educationId != null) excludedEducationIds.add(item.educationId)
    if (item.itemType === 'volunteer' && item.volunteerId != null) excludedVolunteerIds.add(item.volunteerId)
    if (item.itemType === 'award' && item.awardId != null) excludedAwardIds.add(item.awardId)
    if (item.itemType === 'publication' && item.publicationId != null) excludedPublicationIds.add(item.publicationId)
    if (item.itemType === 'language' && item.languageId != null) excludedLanguageIds.add(item.languageId)
    if (item.itemType === 'interest' && item.interestId != null) excludedInterestIds.add(item.interestId)
    if (item.itemType === 'reference' && item.referenceId != null) excludedReferenceIds.add(item.referenceId)
  }

  const bulletsByJobId = new Map<number, typeof allBullets>()
  for (const bullet of allBullets) {
    if (!bulletsByJobId.has(bullet.jobId)) bulletsByJobId.set(bullet.jobId, [])
    bulletsByJobId.get(bullet.jobId)!.push(bullet)
  }

  const projectBulletsByProjectId = new Map<number, typeof allProjectBullets>()
  for (const bullet of allProjectBullets) {
    if (!projectBulletsByProjectId.has(bullet.projectId)) projectBulletsByProjectId.set(bullet.projectId, [])
    projectBulletsByProjectId.get(bullet.projectId)!.push(bullet)
  }

  const jobsWithBullets: BuilderJob[] = allJobs.map((job) => ({
    id: job.id,
    company: job.company,
    role: job.role,
    startDate: job.startDate,
    endDate: job.endDate,
    excluded: excludedJobIds.has(job.id),
    bullets: (bulletsByJobId.get(job.id) ?? []).map((b) => ({
      id: b.id,
      text: b.text,
      sortOrder: b.sortOrder,
      excluded: excludedBulletIds.has(b.id),
    })),
  }))

  // Merge analysis bullet overrides into snapshot (per D-10)
  if (analysisId != null) {
    const overrideRows = db.select({
      bulletId: analysisBulletOverrides.bulletId,
      overrideText: analysisBulletOverrides.overrideText,
      source: analysisBulletOverrides.source,
      suggestionId: analysisBulletOverrides.suggestionId,
    })
    .from(analysisBulletOverrides)
    .where(eq(analysisBulletOverrides.analysisId, analysisId))
    .all()

    for (const job of jobsWithBullets) {
      job.bullets = applyOverrides(job.bullets, overrideRows as Parameters<typeof applyOverrides>[1]) as typeof job.bullets
    }
  }

  const skillsWithExcluded: BuilderSkill[] = allSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    tags: JSON.parse(skill.tags) as string[],
    excluded: excludedSkillIds.has(skill.id),
  }))

  // Merge accepted skill additions into snapshot (per D-11)
  if (analysisId != null) {
    const acceptedSkills = db.select()
      .from(analysisSkillAdditions)
      .where(and(
        eq(analysisSkillAdditions.analysisId, analysisId),
        eq(analysisSkillAdditions.status, 'accepted')
      ))
      .all()

    for (const sk of acceptedSkills) {
      skillsWithExcluded.push({
        id: -1,
        name: sk.skillName,
        tags: sk.category ? [sk.category] : [],
        excluded: false,
      })
    }
  }

  const projectsWithBullets: BuilderProject[] = allProjects.map((project) => ({
    id: project.id,
    name: project.name,
    excluded: excludedProjectIds.has(project.id),
    bullets: (projectBulletsByProjectId.get(project.id) ?? []).map((b) => ({
      id: b.id,
      text: b.text,
      sortOrder: b.sortOrder,
      excluded: excludedProjectBulletIds.has(b.id),
    })),
  }))

  const educationMapped: BuilderEducation[] = allEducation.map((e) => ({
    id: e.id,
    institution: e.institution,
    area: e.area,
    studyType: e.studyType,
    startDate: e.startDate,
    endDate: e.endDate,
    score: e.score ?? '',
    courses: JSON.parse(e.courses) as string[],
    excluded: excludedEducationIds.has(e.id),
  }))

  const volunteerMapped: BuilderVolunteer[] = allVolunteer.map((v) => ({
    id: v.id,
    organization: v.organization,
    position: v.position,
    startDate: v.startDate,
    endDate: v.endDate,
    summary: v.summary,
    highlights: JSON.parse(v.highlights) as string[],
    excluded: excludedVolunteerIds.has(v.id),
  }))

  const awardsMapped: BuilderAward[] = allAwards.map((a) => ({
    id: a.id,
    title: a.title,
    date: a.date,
    awarder: a.awarder,
    summary: a.summary,
    excluded: excludedAwardIds.has(a.id),
  }))

  const publicationsMapped: BuilderPublication[] = allPublications.map((p) => ({
    id: p.id,
    name: p.name,
    publisher: p.publisher,
    releaseDate: p.releaseDate,
    url: p.url,
    summary: p.summary,
    excluded: excludedPublicationIds.has(p.id),
  }))

  const languagesMapped: BuilderLanguage[] = allLanguages.map((l) => ({
    id: l.id,
    language: l.language,
    fluency: l.fluency,
    excluded: excludedLanguageIds.has(l.id),
  }))

  const interestsMapped: BuilderInterest[] = allInterests.map((i) => ({
    id: i.id,
    name: i.name,
    keywords: JSON.parse(i.keywords) as string[],
    excluded: excludedInterestIds.has(i.id),
  }))

  const referencesMapped: BuilderReference[] = allReferences.map((r) => ({
    id: r.id,
    name: r.name,
    reference: r.reference,
    excluded: excludedReferenceIds.has(r.id),
  }))

  return {
    layoutTemplate,
    templateOptions,
    profile: frozenProfile,
    jobs: jobsWithBullets,
    skills: skillsWithExcluded,
    projects: projectsWithBullets,
    education: educationMapped,
    volunteer: volunteerMapped,
    awards: awardsMapped,
    publications: publicationsMapped,
    languages: languagesMapped,
    interests: interestsMapped,
    references: referencesMapped,
  }
}

export function registerSubmissionHandlers(): void {
  ipcMain.handle('submissions:list', async () => {
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
  })

  ipcMain.handle(
    'submissions:create',
    async (
      _,
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
    ) => {
      let snapshot: SubmissionSnapshot = { layoutTemplate: 'traditional', jobs: [], skills: [], projects: [], education: [], volunteer: [], awards: [], publications: [], languages: [], interests: [], references: [] }
      if (data.variantId != null) {
        snapshot = await buildSnapshotForVariant(data.variantId, data.analysisId ?? undefined)
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
    },
  )

  ipcMain.handle(
    'submissions:update',
    async (
      _,
      id: number,
      data: {
        company?: string
        role?: string
        submittedAt?: Date
        url?: string | null
        notes?: string | null
      },
    ) => {
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
    },
  )

  ipcMain.handle('submissions:delete', async (_, id: number) => {
    await db.delete(submissions).where(eq(submissions.id, id))
  })

  ipcMain.handle('submissions:findByAnalysis', async (_, analysisId: number) => {
    const row = await db
      .select({
        id: submissions.id,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .where(eq(submissions.analysisId, analysisId))
      .limit(1)

    return row[0] ?? null
  })

  ipcMain.handle('submissions:updateStatus', async (_, id: number, status: string, note?: string) => {
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
  })

  ipcMain.handle('submissions:getEvents', async (_, submissionId: number) => {
    const rows = await db
      .select()
      .from(submissionEvents)
      .where(eq(submissionEvents.submissionId, submissionId))
      .orderBy(desc(submissionEvents.createdAt))

    return rows
  })

  ipcMain.handle(
    'submissions:addEvent',
    async (_, data: { submissionId: number; status: string; note?: string }) => {
      const rows = await db
        .insert(submissionEvents)
        .values({
          submissionId: data.submissionId,
          status: data.status,
          note: data.note ?? null,
        })
        .returning()

      return rows[0]
    },
  )

  ipcMain.handle('submissions:metrics', async () => {
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
  })

  ipcMain.handle('submissions:getAnalysisById', async (_, analysisId: number) => {
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
  })
}
