import { ipcMain } from 'electron'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
import { db } from '../db'
import { profile } from '../db/schema'
import { eq } from 'drizzle-orm'

type Db = BetterSQLite3Database<typeof schema>

const DEFAULT_PROFILE = {
  id: 1,
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  summary: '',
}

export function getProfile(db: Db) {
  const rows = db.select().from(profile).where(eq(profile.id, 1)).all()
  return rows[0] ?? DEFAULT_PROFILE
}

export function setProfile(
  db: Db,
  data: { name: string; email: string; phone: string; location: string; linkedin: string; summary: string },
) {
  db.insert(profile)
    .values({ id: 1, ...data })
    .onConflictDoUpdate({ target: profile.id, set: data })
    .run()
  const rows = db.select().from(profile).where(eq(profile.id, 1)).all()
  return rows[0] ?? { id: 1, ...data }
}

export function registerProfileHandlers(): void {
  ipcMain.handle('profile:get', () => getProfile(db))
  ipcMain.handle('profile:set', (_, data) => setProfile(db, data))
}
