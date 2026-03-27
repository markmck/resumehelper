import { ipcMain } from 'electron'
import { db } from '../db'
import { templateVariants, templateVariantItems, jobs, jobBullets, skills, skillCategories, projects, projectBullets, education, volunteer, awards, publications, languages, interests, referenceEntries, analysisBulletOverrides } from '../db/schema'
import { eq, and, asc, desc, inArray } from 'drizzle-orm'
import { applyOverrides } from '../../shared/overrides'

export function registerTemplateHandlers(): void {
  ipcMain.handle('templates:list', async () => {
    const rows = await db.select().from(templateVariants).orderBy(desc(templateVariants.createdAt))
    return rows.map((row) => ({
      ...row,
      templateOptions: (() => {
        if (!row.templateOptions) return null
        try { return JSON.parse(row.templateOptions) } catch { return null }
      })(),
    }))
  })

  ipcMain.handle('templates:create', async (_, data: { name: string; layoutTemplate?: string }) => {
    const layoutTemplate = data.layoutTemplate ?? 'classic'
    const rows = await db
      .insert(templateVariants)
      .values({ name: data.name, layoutTemplate })
      .returning()
    const newRow = rows[0]
    // Default summary to hidden for all non-executive templates
    if (layoutTemplate !== 'executive') {
      await db.insert(templateVariantItems).values({
        variantId: newRow.id,
        itemType: 'summary',
        excluded: true,
      })
    }
    return newRow
  })

  ipcMain.handle('templates:getOptions', async (_, variantId: number) => {
    const rows = await db
      .select({ templateOptions: templateVariants.templateOptions })
      .from(templateVariants)
      .where(eq(templateVariants.id, variantId))
    if (!rows[0] || !rows[0].templateOptions) return null
    try {
      return JSON.parse(rows[0].templateOptions)
    } catch {
      return null
    }
  })

  ipcMain.handle('templates:setOptions', async (_, variantId: number, options: object) => {
    await db
      .update(templateVariants)
      .set({ templateOptions: JSON.stringify(options) })
      .where(eq(templateVariants.id, variantId))
  })

  ipcMain.handle('templates:rename', async (_, id: number, name: string) => {
    const rows = await db
      .update(templateVariants)
      .set({ name })
      .where(eq(templateVariants.id, id))
      .returning()
    return rows[0]
  })

  ipcMain.handle('templates:delete', async (_, id: number) => {
    await db.delete(templateVariants).where(eq(templateVariants.id, id))
  })

  ipcMain.handle('templates:duplicate', async (_, id: number) => {
    // better-sqlite3 transactions must be synchronous — use .all() instead of await
    const [source] = db.select().from(templateVariants).where(eq(templateVariants.id, id)).all()
    if (!source) throw new Error(`Template variant ${id} not found`)

    const sourceItems = db
      .select()
      .from(templateVariantItems)
      .where(eq(templateVariantItems.variantId, id))
      .all()

    const [newVariant] = db
      .insert(templateVariants)
      .values({ name: `${source.name} (Copy)`, layoutTemplate: source.layoutTemplate })
      .returning()
      .all()

    if (sourceItems.length > 0) {
      db.insert(templateVariantItems)
        .values(
          sourceItems.map((item) => ({
            variantId: newVariant.id,
            itemType: item.itemType,
            bulletId: item.bulletId,
            skillId: item.skillId,
            jobId: item.jobId,
            projectId: item.projectId,
            projectBulletId: item.projectBulletId,
            educationId: item.educationId,
            volunteerId: item.volunteerId,
            awardId: item.awardId,
            publicationId: item.publicationId,
            languageId: item.languageId,
            interestId: item.interestId,
            referenceId: item.referenceId,
            excluded: item.excluded,
          })),
        )
        .run()
    }

    return newVariant
  })

  ipcMain.handle('templates:setLayoutTemplate', async (_, id: number, layoutTemplate: string) => {
    const rows = await db
      .update(templateVariants)
      .set({ layoutTemplate })
      .where(eq(templateVariants.id, id))
      .returning()
    return rows[0]
  })

  ipcMain.handle('templates:getBuilderData', async (_, variantId: number, analysisId?: number) => {
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

    const jobsWithBullets = allJobs.map((job) => ({
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

    const skillsWithExcluded = allSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      tags: JSON.parse(skill.tags as string) as string[],
      categoryId: skill.categoryId ?? null,
      categoryName: skill.categoryName ?? null,
      excluded: excludedSkillIds.has(skill.id),
    }))

    const projectsWithBullets = allProjects.map((project) => ({
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

    const educationWithExcluded = allEducation.map((e) => ({
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

    const volunteerWithExcluded = allVolunteer.map((v) => ({
      id: v.id,
      organization: v.organization,
      position: v.position,
      startDate: v.startDate,
      endDate: v.endDate,
      summary: v.summary,
      highlights: JSON.parse(v.highlights) as string[],
      excluded: excludedVolunteerIds.has(v.id),
    }))

    const awardsWithExcluded = allAwards.map((a) => ({
      id: a.id,
      title: a.title,
      date: a.date,
      awarder: a.awarder,
      summary: a.summary,
      excluded: excludedAwardIds.has(a.id),
    }))

    const publicationsWithExcluded = allPublications.map((p) => ({
      id: p.id,
      name: p.name,
      publisher: p.publisher,
      releaseDate: p.releaseDate,
      url: p.url,
      summary: p.summary,
      excluded: excludedPublicationIds.has(p.id),
    }))

    const languagesWithExcluded = allLanguages.map((l) => ({
      id: l.id,
      language: l.language,
      fluency: l.fluency,
      excluded: excludedLanguageIds.has(l.id),
    }))

    const interestsWithExcluded = allInterests.map((i) => ({
      id: i.id,
      name: i.name,
      keywords: JSON.parse(i.keywords) as string[],
      excluded: excludedInterestIds.has(i.id),
    }))

    const referencesWithExcluded = allReferences.map((r) => ({
      id: r.id,
      name: r.name,
      reference: r.reference,
      excluded: excludedReferenceIds.has(r.id),
    }))

    if (analysisId != null) {
      const overrideRows = db.select({
        bulletId: analysisBulletOverrides.bulletId,
        overrideText: analysisBulletOverrides.overrideText,
        source: analysisBulletOverrides.source,
        suggestionId: analysisBulletOverrides.suggestionId,
      })
      .from(analysisBulletOverrides)
      .where(eq(analysisBulletOverrides.analysisId, analysisId))
      .all() as Array<{ bulletId: number; overrideText: string; source: 'ai_suggestion' | 'manual_edit'; suggestionId: string | null }>

      for (const job of jobsWithBullets) {
        job.bullets = applyOverrides(job.bullets, overrideRows) as typeof job.bullets
      }
    }

    const summaryExclusionRow = exclusionItems.find(
      (item) => item.itemType === 'summary' && item.excluded,
    )
    const summaryExcluded = summaryExclusionRow != null

    return {
      jobs: jobsWithBullets,
      skills: skillsWithExcluded,
      projects: projectsWithBullets,
      education: educationWithExcluded,
      volunteer: volunteerWithExcluded,
      awards: awardsWithExcluded,
      publications: publicationsWithExcluded,
      languages: languagesWithExcluded,
      interests: interestsWithExcluded,
      references: referencesWithExcluded,
      summaryExcluded,
    }
  })

  ipcMain.handle(
    'templates:setItemExcluded',
    async (_, variantId: number, itemType: string, itemId: number, excluded: boolean) => {
      if (itemType === 'bullet') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'bullet'),
              eq(templateVariantItems.bulletId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'bullet',
            bulletId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'skill') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'skill'),
              eq(templateVariantItems.skillId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'skill',
            skillId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'job') {
        // Toggle the job exclusion row
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'job'),
              eq(templateVariantItems.jobId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'job',
            jobId: itemId,
            excluded: true,
          })
        }

        // Cascade: toggle all bullets belonging to this job
        const bulletRows = await db
          .select({ id: jobBullets.id })
          .from(jobBullets)
          .where(eq(jobBullets.jobId, itemId))
        const bulletIds = bulletRows.map((b) => b.id)

        if (bulletIds.length > 0) {
          await db
            .delete(templateVariantItems)
            .where(
              and(
                eq(templateVariantItems.variantId, variantId),
                eq(templateVariantItems.itemType, 'bullet'),
                inArray(templateVariantItems.bulletId, bulletIds),
              ),
            )
          if (excluded) {
            await db.insert(templateVariantItems).values(
              bulletIds.map((bulletId) => ({
                variantId,
                itemType: 'bullet',
                bulletId,
                excluded: true,
              })),
            )
          }
        }
      } else if (itemType === 'project') {
        // Toggle the project exclusion row
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'project'),
              eq(templateVariantItems.projectId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'project',
            projectId: itemId,
            excluded: true,
          })
        }

        // Cascade: toggle all bullets belonging to this project
        const projectBulletRows = await db
          .select({ id: projectBullets.id })
          .from(projectBullets)
          .where(eq(projectBullets.projectId, itemId))
        const projectBulletIds = projectBulletRows.map((b) => b.id)

        if (projectBulletIds.length > 0) {
          await db
            .delete(templateVariantItems)
            .where(
              and(
                eq(templateVariantItems.variantId, variantId),
                eq(templateVariantItems.itemType, 'projectBullet'),
                inArray(templateVariantItems.projectBulletId, projectBulletIds),
              ),
            )
          if (excluded) {
            await db.insert(templateVariantItems).values(
              projectBulletIds.map((projectBulletId) => ({
                variantId,
                itemType: 'projectBullet',
                projectBulletId,
                excluded: true,
              })),
            )
          }
        }
      } else if (itemType === 'projectBullet') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'projectBullet'),
              eq(templateVariantItems.projectBulletId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'projectBullet',
            projectBulletId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'education') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'education'),
              eq(templateVariantItems.educationId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'education',
            educationId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'volunteer') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'volunteer'),
              eq(templateVariantItems.volunteerId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'volunteer',
            volunteerId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'award') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'award'),
              eq(templateVariantItems.awardId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'award',
            awardId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'publication') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'publication'),
              eq(templateVariantItems.publicationId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'publication',
            publicationId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'language') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'language'),
              eq(templateVariantItems.languageId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'language',
            languageId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'interest') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'interest'),
              eq(templateVariantItems.interestId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'interest',
            interestId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'reference') {
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'reference'),
              eq(templateVariantItems.referenceId, itemId),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'reference',
            referenceId: itemId,
            excluded: true,
          })
        }
      } else if (itemType === 'summary') {
        // itemId is a sentinel (0) — summary has no real row ID
        await db
          .delete(templateVariantItems)
          .where(
            and(
              eq(templateVariantItems.variantId, variantId),
              eq(templateVariantItems.itemType, 'summary'),
            ),
          )
        if (excluded) {
          await db.insert(templateVariantItems).values({
            variantId,
            itemType: 'summary',
            excluded: true,
          })
        }
      }
      // Stamp variant updated_at for staleness detection
      await db.update(templateVariants).set({ updatedAt: new Date() }).where(eq(templateVariants.id, variantId))
    },
  )
}
