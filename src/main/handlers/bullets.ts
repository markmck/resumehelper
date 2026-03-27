import { ipcMain } from 'electron'
import { db } from '../db'
import { jobBullets } from '../db/schema'
import { eq } from 'drizzle-orm'

export function registerBulletHandlers(): void {
  ipcMain.handle(
    'bullets:create',
    async (_, data: { jobId: number; text: string; sortOrder: number }) => {
      const rows = await db
        .insert(jobBullets)
        .values({
          jobId: data.jobId,
          text: data.text,
          sortOrder: data.sortOrder,
        })
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle('bullets:update', async (_, id: number, data: { text?: string }) => {
    const rows = await db.update(jobBullets).set({ ...data, updatedAt: new Date() }).where(eq(jobBullets.id, id)).returning()
    return rows[0]
  })

  ipcMain.handle('bullets:delete', async (_, id: number) => {
    await db.delete(jobBullets).where(eq(jobBullets.id, id))
  })

  ipcMain.handle('bullets:reorder', async (_, _jobId: number, orderedIds: number[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(jobBullets)
        .set({ sortOrder: i })
        .where(eq(jobBullets.id, orderedIds[i]))
    }
  })
}
