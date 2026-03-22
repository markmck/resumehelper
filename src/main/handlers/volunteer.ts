import { ipcMain } from 'electron'
import { db } from '../db'
import { volunteer } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerVolunteerHandlers(): void {
  ipcMain.handle('volunteer:list', async () => {
    const rows = await db.select().from(volunteer).orderBy(asc(volunteer.id))
    return rows.map((row) => ({
      ...row,
      highlights: JSON.parse(row.highlights) as string[],
    }))
  })

  ipcMain.handle(
    'volunteer:create',
    async (
      _,
      data: {
        organization: string
        position?: string
        startDate?: string
        endDate?: string
        summary?: string
        highlights?: string[]
      },
    ) => {
      const rows = await db
        .insert(volunteer)
        .values({
          organization: data.organization,
          position: data.position ?? '',
          startDate: data.startDate ?? '',
          endDate: data.endDate,
          summary: data.summary ?? '',
          highlights: JSON.stringify(data.highlights ?? []),
        })
        .returning()
      const row = rows[0]
      return { ...row, highlights: JSON.parse(row.highlights) as string[] }
    },
  )

  ipcMain.handle(
    'volunteer:update',
    async (
      _,
      id: number,
      data: {
        organization?: string
        position?: string
        startDate?: string
        endDate?: string | null
        summary?: string
        highlights?: string[]
      },
    ) => {
      const updateData: Record<string, unknown> = { ...data }
      if (data.highlights !== undefined) {
        updateData.highlights = JSON.stringify(data.highlights)
      }
      const rows = await db.update(volunteer).set(updateData).where(eq(volunteer.id, id)).returning()
      const row = rows[0]
      return { ...row, highlights: JSON.parse(row.highlights) as string[] }
    },
  )

  ipcMain.handle('volunteer:delete', async (_, id: number) => {
    await db.delete(volunteer).where(eq(volunteer.id, id))
  })
}
