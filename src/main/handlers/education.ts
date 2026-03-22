import { ipcMain } from 'electron'
import { db } from '../db'
import { education } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerEducationHandlers(): void {
  ipcMain.handle('education:list', async () => {
    const rows = await db.select().from(education).orderBy(asc(education.id))
    return rows.map((row) => ({
      ...row,
      courses: JSON.parse(row.courses) as string[],
    }))
  })

  ipcMain.handle(
    'education:create',
    async (
      _,
      data: {
        institution: string
        area?: string
        studyType?: string
        startDate?: string
        endDate?: string
        score?: string
        courses?: string[]
      },
    ) => {
      const rows = await db
        .insert(education)
        .values({
          institution: data.institution,
          area: data.area ?? '',
          studyType: data.studyType ?? '',
          startDate: data.startDate ?? '',
          endDate: data.endDate,
          score: data.score ?? '',
          courses: JSON.stringify(data.courses ?? []),
        })
        .returning()
      const row = rows[0]
      return { ...row, courses: JSON.parse(row.courses) as string[] }
    },
  )

  ipcMain.handle(
    'education:update',
    async (
      _,
      id: number,
      data: {
        institution?: string
        area?: string
        studyType?: string
        startDate?: string
        endDate?: string | null
        score?: string
        courses?: string[]
      },
    ) => {
      const updateData: Record<string, unknown> = { ...data }
      if (data.courses !== undefined) {
        updateData.courses = JSON.stringify(data.courses)
      }
      const rows = await db.update(education).set(updateData).where(eq(education.id, id)).returning()
      const row = rows[0]
      return { ...row, courses: JSON.parse(row.courses) as string[] }
    },
  )

  ipcMain.handle('education:delete', async (_, id: number) => {
    await db.delete(education).where(eq(education.id, id))
  })
}
