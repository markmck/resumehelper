import { ipcMain } from 'electron'
import { db } from '../db'
import { volunteer } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listVolunteer(db: Db) {
  const rows = await db.select().from(volunteer).orderBy(asc(volunteer.id))
  return rows.map((row) => ({
    ...row,
    highlights: JSON.parse(row.highlights) as string[],
  }))
}

export async function createVolunteer(
  db: Db,
  data: {
    organization: string
    position?: string
    startDate?: string
    endDate?: string
    summary?: string
    highlights?: string[]
  },
) {
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
}

export async function updateVolunteer(
  db: Db,
  id: number,
  data: {
    organization?: string
    position?: string
    startDate?: string
    endDate?: string | null
    summary?: string
    highlights?: string[]
  },
) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.highlights !== undefined) {
    updateData.highlights = JSON.stringify(data.highlights)
  }
  const rows = await db.update(volunteer).set(updateData).where(eq(volunteer.id, id)).returning()
  const row = rows[0]
  return { ...row, highlights: JSON.parse(row.highlights) as string[] }
}

export async function deleteVolunteer(db: Db, id: number) {
  await db.delete(volunteer).where(eq(volunteer.id, id))
}

export function registerVolunteerHandlers(): void {
  ipcMain.handle('volunteer:list', () => listVolunteer(db))

  ipcMain.handle(
    'volunteer:create',
    (
      _,
      data: {
        organization: string
        position?: string
        startDate?: string
        endDate?: string
        summary?: string
        highlights?: string[]
      },
    ) => createVolunteer(db, data),
  )

  ipcMain.handle(
    'volunteer:update',
    (
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
    ) => updateVolunteer(db, id, data),
  )

  ipcMain.handle('volunteer:delete', (_, id: number) => deleteVolunteer(db, id))
}
