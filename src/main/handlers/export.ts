import { ipcMain, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { promises as fs } from 'fs'
import { Packer } from 'docx'
import { buildResumeDocx, DOCX_MARGIN_DEFAULTS, BuilderData } from '../lib/docxBuilder'
import { db } from '../db'
import { profile, jobs, jobBullets, skills, skillCategories, projects, projectBullets, templateVariantItems, templateVariants, education, volunteer, awards, publications, languages, interests, referenceEntries, analysisBulletOverrides } from '../db/schema'
import { eq, asc, desc } from 'drizzle-orm'
import { applyOverrides } from '../../shared/overrides'
import { BuilderJob, BuilderSkill, BuilderProject, BuilderEducation, BuilderVolunteer, BuilderAward, BuilderPublication, BuilderLanguage, BuilderInterest, BuilderReference } from '../../preload/index.d'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function getBuilderDataForVariant(db: Db, variantId: number, analysisId?: number): Promise<BuilderData> {
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.startDate))
  const allBullets = await db.select().from(jobBullets).orderBy(asc(jobBullets.sortOrder))
  const allSkills = await db.select({
    id: skills.id,
    name: skills.name,
    tags: skills.tags,
    categoryId: skills.categoryId,
    categoryName: skillCategories.name,
    excluded: skills.id, // placeholder — excluded computed below
  }).from(skills).leftJoin(skillCategories, eq(skills.categoryId, skillCategories.id))
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

  const skillsWithExcluded: BuilderSkill[] = allSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    tags: JSON.parse(skill.tags as string) as string[],
    categoryId: skill.categoryId ?? null,
    categoryName: skill.categoryName ?? null,
    excluded: excludedSkillIds.has(skill.id),
  }))

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
  }
}

export function registerExportHandlers(): void {
  ipcMain.handle('export:pdf', async (_, variantId: number, defaultFilename: string, analysisId?: number) => {
    // 1. Show Save As dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Resume as PDF',
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    // 2. Determine layout: all v2.1 templates (classic/modern/jake/minimal/executive) use print.html path
    const variant = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
    const layoutTemplate = variant?.layoutTemplate ?? 'classic'

    // Parse templateOptions for margin values
    const marginDefaults = DOCX_MARGIN_DEFAULTS[layoutTemplate] ?? { top: 1.0, bottom: 1.0, sides: 1.0 }
    let pdfMarginTop = marginDefaults.top
    let pdfMarginBottom = marginDefaults.bottom
    try {
      const opts = variant?.templateOptions ? JSON.parse(variant.templateOptions as string) : {}
      pdfMarginTop = opts.marginTop ?? marginDefaults.top
      pdfMarginBottom = opts.marginBottom ?? marginDefaults.bottom
    } catch {
      // keep defaults
    }

    // Load print.html + wait for print:ready signal
    const win = new BrowserWindow({
      show: false,
      width: 816, // 8.5in * 96dpi
      height: 1056, // 11in * 96dpi
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      let printUrl = `${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=${variantId}&template=${layoutTemplate ?? 'classic'}`
      if (analysisId != null) printUrl += `&analysisId=${analysisId}`
      await win.loadURL(printUrl)
    } else {
      const query: Record<string, string> = { variantId: String(variantId), template: layoutTemplate ?? 'classic' }
      if (analysisId != null) query.analysisId = String(analysisId)
      await win.loadFile(join(__dirname, '../renderer/print.html'), { query })
    }

    // Wait for React to signal readiness
    await new Promise<void>((resolve) => {
      ipcMain.once('print:ready', () => resolve())
      // Safety timeout — if signal never comes, proceed after 3 seconds
      setTimeout(() => resolve(), 3000)
    })

    // Small settle delay for final paint
    await new Promise((r) => setTimeout(r, 200))

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: pdfMarginTop, bottom: pdfMarginBottom, left: 0, right: 0 },
    })
    win.destroy()
    await fs.writeFile(filePath, pdfBuffer)
    return { canceled: false, filePath }
  })

  ipcMain.handle('export:docx', async (_, variantId: number, defaultFilename: string, analysisId?: number) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Resume as DOCX',
      defaultPath: defaultFilename,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    const variant = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
    const layoutTemplate = variant?.layoutTemplate ?? 'classic'
    let templateOptions: { marginTop?: number; marginBottom?: number; marginSides?: number; skillsDisplay?: string; accentColor?: string } = {}
    if (variant?.templateOptions) {
      try {
        templateOptions = typeof variant.templateOptions === 'string'
          ? JSON.parse(variant.templateOptions)
          : (variant.templateOptions as typeof templateOptions)
      } catch {
        templateOptions = {}
      }
    }
    const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
    const builderData = await getBuilderDataForVariant(db, variantId, analysisId)

    const doc = buildResumeDocx(builderData, profileRow, layoutTemplate, templateOptions)
    const buffer = await Packer.toBuffer(doc)
    await fs.writeFile(filePath, buffer)
    return { canceled: false, filePath }
  })

  // V2.1 template keys — all use the print.html pipeline
  const V2_TEMPLATES = new Set(['classic', 'modern', 'jake', 'minimal', 'executive'])

  ipcMain.handle('export:snapshotPdf', async (_, snapshotData: {
    layoutTemplate?: string
    templateOptions?: { accentColor?: string; skillsDisplay?: string; marginTop?: number; marginBottom?: number; marginSides?: number; showSummary?: boolean }
    jobs?: unknown[]
    skills?: unknown[]
    projects?: unknown[]
    education?: unknown[]
    volunteer?: unknown[]
    awards?: unknown[]
    publications?: unknown[]
    languages?: unknown[]
    interests?: unknown[]
    references?: unknown[]
  }, defaultFilename: string) => {
    // 1. Show Save As dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Snapshot as PDF',
      defaultPath: defaultFilename ?? 'resume-snapshot.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    // 2. Resolve template key — old snapshots (professional/traditional/unknown) fall back to classic
    const rawTemplate = snapshotData?.layoutTemplate ?? ''
    const resolvedTemplate = V2_TEMPLATES.has(rawTemplate) ? rawTemplate : 'classic'

    // 3. Use frozen profile from snapshot, fall back to live DB for old snapshots
    const frozenProfile = (snapshotData as { profile?: { name: string; email: string; phone: string; location: string; linkedin: string; summary?: string } }).profile
    const profileRow = frozenProfile ?? db.select().from(profile).where(eq(profile.id, 1)).get()

    // 4. Build payload matching PrintApp's expected shape
    const payload = {
      profile: profileRow ?? { id: 1, name: '', email: '', phone: '', location: '', linkedin: '', summary: '' },
      jobs: snapshotData?.jobs ?? [],
      skills: snapshotData?.skills ?? [],
      projects: snapshotData?.projects ?? [],
      education: snapshotData?.education ?? [],
      volunteer: snapshotData?.volunteer ?? [],
      awards: snapshotData?.awards ?? [],
      publications: snapshotData?.publications ?? [],
      languages: snapshotData?.languages ?? [],
      interests: snapshotData?.interests ?? [],
      references: snapshotData?.references ?? [],
    }

    // 6. Create a hidden BrowserWindow with preload for IPC support
    const win = new BrowserWindow({
      show: false,
      width: 816,
      height: 1056,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    // 7. Load print.html with variantId=0 (snapshot sentinel) and resolved template
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      await win.loadURL(
        `${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=0&template=${resolvedTemplate}`
      )
    } else {
      await win.loadFile(join(__dirname, '../renderer/print.html'), {
        query: { variantId: '0', template: resolvedTemplate },
      })
    }

    // 8. Wait for PrintApp to signal it's ready to receive data (print:ready IPC)
    await new Promise<void>((resolve) => {
      ipcMain.once('print:ready', () => resolve())
      // Safety timeout — if signal never comes, proceed after 3 seconds
      setTimeout(() => resolve(), 3000)
    })

    // 9. Push snapshot data to PrintApp via postMessage using executeJavaScript
    const marginDefaults = DOCX_MARGIN_DEFAULTS[resolvedTemplate] ?? { top: 1.0, bottom: 1.0, sides: 1.0 }
    const snapOpts = snapshotData?.templateOptions
    const pdfMarginTop = snapOpts?.marginTop ?? marginDefaults.top
    const pdfMarginBottom = snapOpts?.marginBottom ?? marginDefaults.bottom
    await win.webContents.executeJavaScript(
      `window.postMessage(${JSON.stringify({
        type: 'print-data',
        template: resolvedTemplate,
        showSummary: snapOpts?.showSummary ?? true,
        accentColor: snapOpts?.accentColor,
        skillsDisplay: snapOpts?.skillsDisplay,
        marginTop: pdfMarginTop,
        marginBottom: pdfMarginBottom,
        marginSides: snapOpts?.marginSides ?? marginDefaults.sides,
        payload,
      })}, '*')`
    )

    // 10. Settle delay to let React render
    await new Promise((r) => setTimeout(r, 500))

    // 11. Print to PDF — margins match what was sent to PrintApp
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: pdfMarginTop, bottom: pdfMarginBottom, left: 0, right: 0 },
    })
    win.destroy()
    await fs.writeFile(filePath, pdfBuffer)
    return { canceled: false, filePath }
  })
}
