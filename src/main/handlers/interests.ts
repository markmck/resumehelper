import { ipcMain } from 'electron'
import { db } from '../db'
import { interests } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerInterestHandlers(): void {
  ipcMain.handle('interests:list', async () => {
    const rows = await db.select().from(interests).orderBy(asc(interests.id))
    return rows.map((row) => ({
      ...row,
      keywords: JSON.parse(row.keywords) as string[],
    }))
  })

  ipcMain.handle(
    'interests:create',
    async (
      _,
      data: {
        name: string
        keywords?: string[]
      },
    ) => {
      const rows = await db
        .insert(interests)
        .values({
          name: data.name,
          keywords: JSON.stringify(data.keywords ?? []),
        })
        .returning()
      const row = rows[0]
      return { ...row, keywords: JSON.parse(row.keywords) as string[] }
    },
  )

  ipcMain.handle(
    'interests:update',
    async (
      _,
      id: number,
      data: {
        name?: string
        keywords?: string[]
      },
    ) => {
      const updateData: Record<string, unknown> = { ...data }
      if (data.keywords !== undefined) {
        updateData.keywords = JSON.stringify(data.keywords)
      }
      const rows = await db.update(interests).set(updateData).where(eq(interests.id, id)).returning()
      const row = rows[0]
      return { ...row, keywords: JSON.parse(row.keywords) as string[] }
    },
  )

  ipcMain.handle('interests:delete', async (_, id: number) => {
    await db.delete(interests).where(eq(interests.id, id))
  })
}
