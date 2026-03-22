import { ipcMain } from 'electron'
import { db } from '../db'
import { awards } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerAwardHandlers(): void {
  ipcMain.handle('awards:list', async () => {
    return db.select().from(awards).orderBy(asc(awards.id))
  })

  ipcMain.handle(
    'awards:create',
    async (
      _,
      data: {
        title: string
        date?: string
        awarder?: string
        summary?: string
      },
    ) => {
      const rows = await db
        .insert(awards)
        .values({
          title: data.title,
          date: data.date,
          awarder: data.awarder ?? '',
          summary: data.summary ?? '',
        })
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle(
    'awards:update',
    async (
      _,
      id: number,
      data: {
        title?: string
        date?: string | null
        awarder?: string
        summary?: string
      },
    ) => {
      const rows = await db.update(awards).set(data).where(eq(awards.id, id)).returning()
      return rows[0]
    },
  )

  ipcMain.handle('awards:delete', async (_, id: number) => {
    await db.delete(awards).where(eq(awards.id, id))
  })
}
