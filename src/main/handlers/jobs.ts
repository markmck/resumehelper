import { ipcMain } from 'electron'
import { db } from '../db'
import { jobs, jobBullets } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerJobHandlers(): void {
  ipcMain.handle('jobs:list', async () => {
    const allJobs = await db.select().from(jobs).orderBy(asc(jobs.sortOrder))
    const result = await Promise.all(
      allJobs.map(async (job) => {
        const bullets = await db
          .select()
          .from(jobBullets)
          .where(eq(jobBullets.jobId, job.id))
          .orderBy(asc(jobBullets.sortOrder))
        return { ...job, bullets }
      }),
    )
    return result
  })

  ipcMain.handle(
    'jobs:create',
    async (
      _,
      data: { company: string; role: string; startDate: string; endDate?: string },
    ) => {
      const rows = await db
        .insert(jobs)
        .values({
          company: data.company,
          role: data.role,
          startDate: data.startDate,
          endDate: data.endDate ?? null,
        })
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle(
    'jobs:update',
    async (
      _,
      id: number,
      data: { company?: string; role?: string; startDate?: string; endDate?: string | null },
    ) => {
      const rows = await db.update(jobs).set(data).where(eq(jobs.id, id)).returning()
      return rows[0]
    },
  )

  ipcMain.handle('jobs:delete', async (_, id: number) => {
    await db.delete(jobs).where(eq(jobs.id, id))
  })

  ipcMain.handle('jobs:reorder', async (_, orderedIds: number[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(jobs).set({ sortOrder: i }).where(eq(jobs.id, orderedIds[i]))
    }
  })
}
