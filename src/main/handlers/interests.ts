import { ipcMain } from 'electron'
import { db } from '../db'
import { interests } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listInterests(db: Db) {
  const rows = await db.select().from(interests).orderBy(asc(interests.id))
  return rows.map((row) => ({
    ...row,
    keywords: JSON.parse(row.keywords) as string[],
  }))
}

export async function createInterest(
  db: Db,
  data: {
    name: string
    keywords?: string[]
  },
) {
  const rows = await db
    .insert(interests)
    .values({
      name: data.name,
      keywords: JSON.stringify(data.keywords ?? []),
    })
    .returning()
  const row = rows[0]
  return { ...row, keywords: JSON.parse(row.keywords) as string[] }
}

export async function updateInterest(
  db: Db,
  id: number,
  data: {
    name?: string
    keywords?: string[]
  },
) {
  const updateData: Record<string, unknown> = { ...data }
  if (data.keywords !== undefined) {
    updateData.keywords = JSON.stringify(data.keywords)
  }
  const rows = await db.update(interests).set(updateData).where(eq(interests.id, id)).returning()
  const row = rows[0]
  return { ...row, keywords: JSON.parse(row.keywords) as string[] }
}

export async function deleteInterest(db: Db, id: number) {
  await db.delete(interests).where(eq(interests.id, id))
}

export function registerInterestHandlers(): void {
  ipcMain.handle('interests:list', () => listInterests(db))

  ipcMain.handle(
    'interests:create',
    (
      _,
      data: {
        name: string
        keywords?: string[]
      },
    ) => createInterest(db, data),
  )

  ipcMain.handle(
    'interests:update',
    (
      _,
      id: number,
      data: {
        name?: string
        keywords?: string[]
      },
    ) => updateInterest(db, id, data),
  )

  ipcMain.handle('interests:delete', (_, id: number) => deleteInterest(db, id))
}
