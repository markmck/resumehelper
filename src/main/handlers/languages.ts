import { ipcMain } from 'electron'
import { db } from '../db'
import { languages } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerLanguageHandlers(): void {
  ipcMain.handle('languages:list', async () => {
    return db.select().from(languages).orderBy(asc(languages.id))
  })

  ipcMain.handle(
    'languages:create',
    async (
      _,
      data: {
        language: string
        fluency?: string
      },
    ) => {
      const rows = await db
        .insert(languages)
        .values({
          language: data.language,
          fluency: data.fluency ?? '',
        })
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle(
    'languages:update',
    async (
      _,
      id: number,
      data: {
        language?: string
        fluency?: string
      },
    ) => {
      const rows = await db.update(languages).set(data).where(eq(languages.id, id)).returning()
      return rows[0]
    },
  )

  ipcMain.handle('languages:delete', async (_, id: number) => {
    await db.delete(languages).where(eq(languages.id, id))
  })
}
