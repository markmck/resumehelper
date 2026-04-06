import { ipcMain } from 'electron'
import { db } from '../db'
import { publications } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listPublications(db: Db) {
  return db.select().from(publications).orderBy(asc(publications.id))
}

export async function createPublication(
  db: Db,
  data: {
    name: string
    publisher?: string
    releaseDate?: string
    url?: string
    summary?: string
  },
) {
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
}

export async function updatePublication(
  db: Db,
  id: number,
  data: {
    name?: string
    publisher?: string
    releaseDate?: string | null
    url?: string
    summary?: string
  },
) {
  const rows = await db.update(publications).set(data).where(eq(publications.id, id)).returning()
  return rows[0]
}

export async function deletePublication(db: Db, id: number) {
  await db.delete(publications).where(eq(publications.id, id))
}

export function registerPublicationHandlers(): void {
  ipcMain.handle('publications:list', () => listPublications(db))

  ipcMain.handle(
    'publications:create',
    (
      _,
      data: {
        name: string
        publisher?: string
        releaseDate?: string
        url?: string
        summary?: string
      },
    ) => createPublication(db, data),
  )

  ipcMain.handle(
    'publications:update',
    (
      _,
      id: number,
      data: {
        name?: string
        publisher?: string
        releaseDate?: string | null
        url?: string
        summary?: string
      },
    ) => updatePublication(db, id, data),
  )

  ipcMain.handle('publications:delete', (_, id: number) => deletePublication(db, id))
}
