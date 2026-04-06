import { ipcMain } from 'electron'
import { db } from '../db'
import { referenceEntries } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listReferences(db: Db) {
  return db.select().from(referenceEntries).orderBy(asc(referenceEntries.id))
}

export async function createReference(
  db: Db,
  data: {
    name: string
    reference?: string
  },
) {
  const rows = await db
    .insert(referenceEntries)
    .values({
      name: data.name,
      reference: data.reference ?? '',
    })
    .returning()
  return rows[0]
}

export async function updateReference(
  db: Db,
  id: number,
  data: {
    name?: string
    reference?: string
  },
) {
  const rows = await db
    .update(referenceEntries)
    .set(data)
    .where(eq(referenceEntries.id, id))
    .returning()
  return rows[0]
}

export async function deleteReference(db: Db, id: number) {
  await db.delete(referenceEntries).where(eq(referenceEntries.id, id))
}

export function registerReferenceHandlers(): void {
  ipcMain.handle('references:list', () => listReferences(db))

  ipcMain.handle(
    'references:create',
    (
      _,
      data: {
        name: string
        reference?: string
      },
    ) => createReference(db, data),
  )

  ipcMain.handle(
    'references:update',
    (
      _,
      id: number,
      data: {
        name?: string
        reference?: string
      },
    ) => updateReference(db, id, data),
  )

  ipcMain.handle('references:delete', (_, id: number) => deleteReference(db, id))
}
