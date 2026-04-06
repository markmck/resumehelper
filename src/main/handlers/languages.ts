import { ipcMain } from 'electron'
import { db } from '../db'
import { languages } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listLanguages(db: Db) {
  return db.select().from(languages).orderBy(asc(languages.id))
}

export async function createLanguage(
  db: Db,
  data: {
    language: string
    fluency?: string
  },
) {
  const rows = await db
    .insert(languages)
    .values({
      language: data.language,
      fluency: data.fluency ?? '',
    })
    .returning()
  return rows[0]
}

export async function updateLanguage(
  db: Db,
  id: number,
  data: {
    language?: string
    fluency?: string
  },
) {
  const rows = await db.update(languages).set(data).where(eq(languages.id, id)).returning()
  return rows[0]
}

export async function deleteLanguage(db: Db, id: number) {
  await db.delete(languages).where(eq(languages.id, id))
}

export function registerLanguageHandlers(): void {
  ipcMain.handle('languages:list', () => listLanguages(db))

  ipcMain.handle(
    'languages:create',
    (
      _,
      data: {
        language: string
        fluency?: string
      },
    ) => createLanguage(db, data),
  )

  ipcMain.handle(
    'languages:update',
    (
      _,
      id: number,
      data: {
        language?: string
        fluency?: string
      },
    ) => updateLanguage(db, id, data),
  )

  ipcMain.handle('languages:delete', (_, id: number) => deleteLanguage(db, id))
}
