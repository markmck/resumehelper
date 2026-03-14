import { ipcMain } from 'electron'
import { db } from '../db'
import { submissions, templateVariants, templateVariantItems, jobs, jobBullets, skills } from '../db/schema'
import { eq, desc, asc } from 'drizzle-orm'
import type { BuilderJob, BuilderSkill } from '../../preload/index.d'

interface SubmissionSnapshot {
  layoutTemplate: string
  jobs: BuilderJob[]
  skills: BuilderSkill[]
}

async function buildSnapshotForVariant(variantId: number): Promise<SubmissionSnapshot> {
  const [variant] = await db
    .select({ layoutTemplate: templateVariants.layoutTemplate })
    .from(templateVariants)
    .where(eq(templateVariants.id, variantId))

  const layoutTemplate = variant?.layoutTemplate ?? 'traditional'

  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.startDate))
  const allBullets = await db.select().from(jobBullets).orderBy(asc(jobBullets.sortOrder))
  const allSkills = await db.select().from(skills)
  const exclusionItems = await db
    .select()
    .from(templateVariantItems)
    .where(eq(templateVariantItems.variantId, variantId))

  const excludedJobIds = new Set<number>()
  const excludedBulletIds = new Set<number>()
  const excludedSkillIds = new Set<number>()

  for (const item of exclusionItems) {
    if (!item.excluded) continue
    if (item.itemType === 'job' && item.jobId != null) excludedJobIds.add(item.jobId)
    if (item.itemType === 'bullet' && item.bulletId != null) excludedBulletIds.add(item.bulletId)
    if (item.itemType === 'skill' && item.skillId != null) excludedSkillIds.add(item.skillId)
  }

  const bulletsByJobId = new Map<number, typeof allBullets>()
  for (const bullet of allBullets) {
    if (!bulletsByJobId.has(bullet.jobId)) bulletsByJobId.set(bullet.jobId, [])
    bulletsByJobId.get(bullet.jobId)!.push(bullet)
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
    tags: JSON.parse(skill.tags) as string[],
    excluded: excludedSkillIds.has(skill.id),
  }))

  return { layoutTemplate, jobs: jobsWithBullets, skills: skillsWithExcluded }
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
      },
    ) => {
      let snapshot: SubmissionSnapshot = { layoutTemplate: 'traditional', jobs: [], skills: [] }
      if (data.variantId != null) {
        snapshot = await buildSnapshotForVariant(data.variantId)
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
        })
        .returning()

      return rows[0]
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
}
