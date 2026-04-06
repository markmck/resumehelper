import { ipcMain } from 'electron'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
import { db } from '../db'
import { jobs, jobBullets } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

type Db = BetterSQLite3Database<typeof schema>

export async function listJobs(db: Db) {
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
}

export async function createJob(
  db: Db,
  data: { company: string; role: string; startDate: string; endDate?: string },
) {
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
}

export async function updateJob(
  db: Db,
  id: number,
  data: { company?: string; role?: string; startDate?: string; endDate?: string | null },
) {
  const rows = await db.update(jobs).set(data).where(eq(jobs.id, id)).returning()
  return rows[0]
}

export async function deleteJob(db: Db, id: number) {
  await db.delete(jobs).where(eq(jobs.id, id))
}

export async function reorderJobs(db: Db, orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(jobs).set({ sortOrder: i }).where(eq(jobs.id, orderedIds[i]))
  }
}

export function registerJobHandlers(): void {
  ipcMain.handle('jobs:list', () => listJobs(db))
  ipcMain.handle('jobs:create', (_, data) => createJob(db, data))
  ipcMain.handle('jobs:update', (_, id, data) => updateJob(db, id, data))
  ipcMain.handle('jobs:delete', (_, id) => deleteJob(db, id))
  ipcMain.handle('jobs:reorder', (_, orderedIds) => reorderJobs(db, orderedIds))
}
