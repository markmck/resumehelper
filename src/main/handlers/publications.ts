import { ipcMain } from 'electron'
import { db } from '../db'
import { publications } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerPublicationHandlers(): void {
  ipcMain.handle('publications:list', async () => {
    return db.select().from(publications).orderBy(asc(publications.id))
  })

  ipcMain.handle(
    'publications:create',
    async (
      _,
      data: {
        name: string
        publisher?: string
        releaseDate?: string
        url?: string
        summary?: string
      },
    ) => {
      const rows = await db
        .insert(publications)
        .values({
          name: data.name,
          publisher: data.publisher ?? '',
          releaseDate: data.releaseDate,
          url: data.url ?? '',
          summary: data.summary ?? '',
        })
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle(
    'publications:update',
    async (
      _,
      id: number,
      data: {
        name?: string
        publisher?: string
        releaseDate?: string | null
        url?: string
        summary?: string
      },
    ) => {
      const rows = await db.update(publications).set(data).where(eq(publications.id, id)).returning()
      return rows[0]
    },
  )

  ipcMain.handle('publications:delete', async (_, id: number) => {
    await db.delete(publications).where(eq(publications.id, id))
  })
}
