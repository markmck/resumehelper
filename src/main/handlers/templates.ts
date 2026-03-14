import { ipcMain } from 'electron'
import { db } from '../db'
import { templateVariants, templateVariantItems, jobs, jobBullets, skills } from '../db/schema'
import { eq, and, asc, desc, inArray } from 'drizzle-orm'

export function registerTemplateHandlers(): void {
  ipcMain.handle('templates:list', async () => {
    return db.select().from(templateVariants).orderBy(desc(templateVariants.createdAt))
  })

  ipcMain.handle('templates:create', async (_, data: { name: string }) => {
    const rows = await db
      .insert(templateVariants)
      .values({ name: data.name })
      .returning()
    return rows[0]
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

  ipcMain.handle('templates:getBuilderData', async (_, variantId: number) => {
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
      tags: JSON.parse(skill.tags) as string[],
      excluded: excludedSkillIds.has(skill.id),
    }))

    return { jobs: jobsWithBullets, skills: skillsWithExcluded }
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
      }
    },
  )
}
