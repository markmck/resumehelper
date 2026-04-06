import { ipcMain } from 'electron'
import { db } from '../db'
import { education } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listEducation(db: Db) {
  const rows = await db.select().from(education).orderBy(asc(education.id))
  return rows.map((row) => ({
    ...row,
    courses: JSON.parse(row.courses) as string[],
  }))
}

export async function createEducation(
  db: Db,
  data: {
    institution: string
    area?: string
    studyType?: string
    startDate?: string
    endDate?: string
    score?: string
    courses?: string[]
  },
) {
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
}

export async function updateEducation(
  db: Db,
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
) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.courses !== undefined) {
    updateData.courses = JSON.stringify(data.courses)
  }
  const rows = await db.update(education).set(updateData).where(eq(education.id, id)).returning()
  const row = rows[0]
  return { ...row, courses: JSON.parse(row.courses) as string[] }
}

export async function deleteEducation(db: Db, id: number) {
  await db.delete(education).where(eq(education.id, id))
}

export function registerEducationHandlers(): void {
  ipcMain.handle('education:list', () => listEducation(db))

  ipcMain.handle(
    'education:create',
    (
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
    ) => createEducation(db, data),
  )

  ipcMain.handle(
    'education:update',
    (
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
    ) => updateEducation(db, id, data),
  )

  ipcMain.handle('education:delete', (_, id: number) => deleteEducation(db, id))
}
