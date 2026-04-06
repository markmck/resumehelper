import { ipcMain } from 'electron'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
import { db } from '../db'
import { jobBullets } from '../db/schema'
import { eq } from 'drizzle-orm'

type Db = BetterSQLite3Database<typeof schema>

export async function createBullet(
  db: Db,
  data: { jobId: number; text: string; sortOrder: number },
) {
  const rows = await db
    .insert(jobBullets)
    .values({
      jobId: data.jobId,
      text: data.text,
      sortOrder: data.sortOrder,
    })
    .returning()
  return rows[0]
}

export async function updateBullet(db: Db, id: number, data: { text?: string }) {
  const rows = await db
    .update(jobBullets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(jobBullets.id, id))
    .returning()
  return rows[0]
}

export async function deleteBullet(db: Db, id: number) {
  await db.delete(jobBullets).where(eq(jobBullets.id, id))
}

export async function reorderBullets(db: Db, _jobId: number, orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(jobBullets)
      .set({ sortOrder: i })
      .where(eq(jobBullets.id, orderedIds[i]))
  }
}

export function registerBulletHandlers(): void {
  ipcMain.handle('bullets:create', (_, data) => createBullet(db, data))
  ipcMain.handle('bullets:update', (_, id, data) => updateBullet(db, id, data))
  ipcMain.handle('bullets:delete', (_, id) => deleteBullet(db, id))
  ipcMain.handle('bullets:reorder', (_, _jobId, orderedIds) => reorderBullets(db, _jobId, orderedIds))
}
