/**
 * Unified three-layer merge helper.
 *
 * Single source of truth for merging:
 *   base data (jobs/skills/projects/education/volunteer/awards/publications/languages/interests/references)
 *   ↓ variant-level exclusions (templateVariantItems)
 *   ↓ analysis-level overrides (analysisBulletOverrides) and skill additions (analysisSkillAdditions)
 *   = MergedBuilderData
 *
 * Replaces the three parallel implementations:
 *   - src/main/handlers/templates.ts::getBuilderData
 *   - src/main/handlers/export.ts::getBuilderDataForVariant
 *   - inline merge loop in src/main/handlers/submissions.ts::buildSnapshotForVariant
 *
 * Pure function — no IPC, BrowserWindow, dialog, or fs touches. Per Phase 30 D-01.
 */
import { eq, and, asc, desc, or, isNull } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
import {
  jobs,
  jobBullets,
  skills,
  skillCategories,
  projects,
  projectBullets,
  templateVariantItems,
  education,
  volunteer,
  awards,
  publications,
  languages,
  interests,
  referenceEntries,
  analysisSkillAdditions,
  analysisResults,
  entityOverrides,
} from '../db/schema'
import type {
  BuilderJob,
  BuilderSkill,
  BuilderProject,
  BuilderEducation,
  BuilderVolunteer,
  BuilderAward,
  BuilderPublication,
  BuilderLanguage,
  BuilderInterest,
  BuilderReference,
} from '../../preload/index.d'

type Db = BetterSQLite3Database<typeof schema>

export type MergedBuilderData = {
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
  showSummary: boolean
  summaryOverride?: string // absent = use profileRow.summary
}

export async function buildMergedBuilderData(
  db: Db,
  variantId: number,
  analysisId?: number,
): Promise<MergedBuilderData> {
  // ----------------------------------------------------------------
  // Layer 1: Fetch all base data
  // ----------------------------------------------------------------
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.startDate))

  const allBullets = await db.select().from(jobBullets).orderBy(asc(jobBullets.sortOrder))

  const allSkills = await db
    .select({
      id: skills.id,
      name: skills.name,
      tags: skills.tags,
      categoryId: skills.categoryId,
      categoryName: skillCategories.name,
    })
    .from(skills)
    .leftJoin(skillCategories, eq(skills.categoryId, skillCategories.id))

  const allProjects = await db.select().from(projects).orderBy(asc(projects.sortOrder))

  const allProjectBullets = await db
    .select()
    .from(projectBullets)
    .orderBy(asc(projectBullets.sortOrder))

  const allEducation = await db.select().from(education)
  const allVolunteer = await db.select().from(volunteer)
  const allAwards = await db.select().from(awards)
  const allPublications = await db.select().from(publications)
  const allLanguages = await db.select().from(languages)
  const allInterests = await db.select().from(interests)
  const allReferences = await db.select().from(referenceEntries)

  // ----------------------------------------------------------------
  // Layer 2: Variant exclusion items — fetch and build exclusion sets
  // ----------------------------------------------------------------
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
    if (item.itemType === 'projectBullet' && item.projectBulletId != null)
      excludedProjectBulletIds.add(item.projectBulletId)
    if (item.itemType === 'education' && item.educationId != null)
      excludedEducationIds.add(item.educationId)
    if (item.itemType === 'volunteer' && item.volunteerId != null)
      excludedVolunteerIds.add(item.volunteerId)
    if (item.itemType === 'award' && item.awardId != null) excludedAwardIds.add(item.awardId)
    if (item.itemType === 'publication' && item.publicationId != null)
      excludedPublicationIds.add(item.publicationId)
    if (item.itemType === 'language' && item.languageId != null)
      excludedLanguageIds.add(item.languageId)
    if (item.itemType === 'interest' && item.interestId != null)
      excludedInterestIds.add(item.interestId)
    if (item.itemType === 'reference' && item.referenceId != null)
      excludedReferenceIds.add(item.referenceId)
  }

  // ----------------------------------------------------------------
  // Layer 2.5: Two-pass override map (OVR-02 precedence: analysis → variant → base)
  //
  // This block is intentionally placed BEFORE the jobs/projects maps so that
  // getOverrideText() can be called inline during those maps' construction.
  //
  // Text-substitution concern: getOverrideText(entityType, id, field) resolves
  //   the effective override text for a field, with analysis-tier winning over
  //   variant-tier (pass 2 overwrites pass 1).
  // Inclusion concern (D-01): analysisInclusionBulletIds re-includes bullets that
  //   the variant excluded, scoped to the active analysis only.
  // ----------------------------------------------------------------
  // Fail-closed consistency guard (WR-01): the analysis-tier branch below matches
  // override rows by analysisId alone (bullets are global), so a caller passing a
  // (variantId, analysisId) pair that belong to DIFFERENT variants would otherwise
  // leak another variant's analysis-tier overrides + inclusion set into this render.
  // buildMergedBuilderData is a public export forwarded from the getBuilderData IPC
  // handler, so we cannot assume the pair is consistent. Resolve the analysis's owning
  // variant and reject a concrete mismatch. A NULL owner is allowed — acceptSuggestion
  // mirrors a NULL analysisResults.variantId onto its override rows (analysis run with
  // no variant association), and those are legitimately scoped by analysisId.
  if (analysisId != null) {
    const analysisOwner = db
      .select({ variantId: analysisResults.variantId })
      .from(analysisResults)
      .where(eq(analysisResults.id, analysisId))
      .get()
    if (analysisOwner?.variantId != null && analysisOwner.variantId !== variantId) {
      throw new Error(
        `buildMergedBuilderData: analysis ${analysisId} belongs to variant ${analysisOwner.variantId}, ` +
          `not the requested variant ${variantId} — refusing to apply cross-variant overrides.`,
      )
    }
  }

  const overrideCondition =
    analysisId != null
      ? or(
          // Variant-tier rows are scoped by variantId (analysis_id IS NULL).
          and(eq(entityOverrides.variantId, variantId), isNull(entityOverrides.analysisId)),
          // Analysis-tier rows are identified by analysisId alone — it is globally unique
          // and already implies its variant. Do NOT additionally pin variantId here:
          // acceptSuggestion() mirrors the analysis's variantId onto the override row, which
          // is NULL when the analysis has no variant association, and an added eq(variantId)
          // would silently drop those rows (the override would vanish from the merge).
          eq(entityOverrides.analysisId, analysisId),
        )
      : and(eq(entityOverrides.variantId, variantId), isNull(entityOverrides.analysisId))

  const overrideRows = await db
    .select({
      analysisId: entityOverrides.analysisId,
      entityType: entityOverrides.entityType,
      bulletId: entityOverrides.bulletId,
      projectId: entityOverrides.projectId,
      field: entityOverrides.field,
      overrideText: entityOverrides.overrideText,
      source: entityOverrides.source,
    })
    .from(entityOverrides)
    .where(overrideCondition)

  const mkKey = (entityType: string, id: number | null, field: string): string =>
    `${entityType}:${id ?? null}:${field}`

  const overrideMap = new Map<string, string>()
  // Pass 1: variant-tier rows (analysisId null) — lower precedence
  for (const row of overrideRows) {
    if (row.analysisId != null) continue
    const id = row.bulletId ?? row.projectId ?? null
    overrideMap.set(mkKey(row.entityType, id, row.field), row.overrideText)
  }
  // Pass 2: analysis-tier rows — higher precedence, overwrite variant-tier
  for (const row of overrideRows) {
    if (row.analysisId == null) continue
    const id = row.bulletId ?? row.projectId ?? null
    overrideMap.set(mkKey(row.entityType, id, row.field), row.overrideText)
  }

  const getOverrideText = (
    entityType: string,
    id: number | null,
    field: string,
  ): string | undefined => overrideMap.get(mkKey(entityType, id, field))

  // D-01 inclusion set: analysis-tier source='inclusion' rows re-include bullets
  const analysisInclusionBulletIds = new Set<number>()
  for (const row of overrideRows) {
    if (row.analysisId != null && row.source === 'inclusion' && row.bulletId != null) {
      analysisInclusionBulletIds.add(row.bulletId)
    }
  }

  const summaryOverride = getOverrideText('summary', null, 'text')

  // ----------------------------------------------------------------
  // Build jobs → attach bullets, apply exclusions
  // ----------------------------------------------------------------
  const bulletsByJobId = new Map<number, typeof allBullets>()
  for (const bullet of allBullets) {
    if (!bulletsByJobId.has(bullet.jobId)) bulletsByJobId.set(bullet.jobId, [])
    bulletsByJobId.get(bullet.jobId)!.push(bullet)
  }

  const projectBulletsByProjectId = new Map<number, typeof allProjectBullets>()
  for (const bullet of allProjectBullets) {
    if (!projectBulletsByProjectId.has(bullet.projectId))
      projectBulletsByProjectId.set(bullet.projectId, [])
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
      text: getOverrideText('job_bullet', b.id, 'text') ?? b.text,
      sortOrder: b.sortOrder,
      excluded: excludedBulletIds.has(b.id) && !analysisInclusionBulletIds.has(b.id),
    })),
  }))

  // ----------------------------------------------------------------
  // Build skills — correct shape from templates.ts:131-140 (NOT export.ts vestigial form)
  // ----------------------------------------------------------------
  const skillsWithExcluded: BuilderSkill[] = allSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    tags: JSON.parse(skill.tags as string) as string[],
    categoryId: skill.categoryId ?? null,
    categoryName: skill.categoryName ?? null,
    excluded: excludedSkillIds.has(skill.id),
  }))

  // ----------------------------------------------------------------
  // Build projects → attach bullets, apply exclusions
  // ----------------------------------------------------------------
  const projectsWithBullets: BuilderProject[] = allProjects.map((project) => ({
    id: project.id,
    name: getOverrideText('project_name', project.id, 'name') ?? project.name,
    excluded: excludedProjectIds.has(project.id),
    bullets: (projectBulletsByProjectId.get(project.id) ?? []).map((b) => ({
      id: b.id,
      text: b.text,
      sortOrder: b.sortOrder,
      excluded: excludedProjectBulletIds.has(b.id),
    })),
  }))

  // ----------------------------------------------------------------
  // Build remaining entity arrays
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // Layer 3: Analysis-level skill additions (accepted only)
  // Ported from submissions.ts:166-186 per PATTERNS.md landmine 2
  // ----------------------------------------------------------------
  if (analysisId != null) {
    const acceptedSkills = db
      .select()
      .from(analysisSkillAdditions)
      .where(eq(analysisSkillAdditions.analysisId, analysisId))
      .all()

    for (const sk of acceptedSkills) {
      if (sk.status !== 'accepted') continue
      skillsWithExcluded.push({
        id: -1,
        name: sk.skillName,
        tags: sk.category && sk.category !== '' ? [sk.category] : [],
        categoryId: null,
        categoryName: sk.category && sk.category !== '' ? sk.category : null,
        excluded: false,
      })
    }
  }

  // ----------------------------------------------------------------
  // showSummary derivation (D-05) — positive-semantic
  // Default true: no sentinel row means "not excluded" = show summary
  // ----------------------------------------------------------------
  const summarySentinel = exclusionItems.find((item) => item.itemType === 'summary')
  const showSummary = summarySentinel ? !summarySentinel.excluded : true

  // ----------------------------------------------------------------
  // Return the merged builder data
  // ----------------------------------------------------------------
  return {
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
    showSummary,
    summaryOverride,
  }
}
