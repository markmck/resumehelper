import { ipcMain } from 'electron'
import { db } from '../db'
import { awards } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listAwards(db: Db) {
  return db.select().from(awards).orderBy(asc(awards.id))
}

export async function createAward(
  db: Db,
  data: {
    title: string
    date?: string
    awarder?: string
    summary?: string
  },
) {
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
}

export async function updateAward(
  db: Db,
  id: number,
  data: {
    title?: string
    date?: string | null
    awarder?: string
    summary?: string
  },
) {
  const rows = await db.update(awards).set(data).where(eq(awards.id, id)).returning()
  return rows[0]
}

export async function deleteAward(db: Db, id: number) {
  await db.delete(awards).where(eq(awards.id, id))
}

export function registerAwardHandlers(): void {
  ipcMain.handle('awards:list', () => listAwards(db))

  ipcMain.handle(
    'awards:create',
    (
      _,
      data: {
        title: string
        date?: string
        awarder?: string
        summary?: string
      },
    ) => createAward(db, data),
  )

  ipcMain.handle(
    'awards:update',
    (
      _,
      id: number,
      data: {
        title?: string
        date?: string | null
        awarder?: string
        summary?: string
      },
    ) => updateAward(db, id, data),
  )

  ipcMain.handle('awards:delete', (_, id: number) => deleteAward(db, id))
}
