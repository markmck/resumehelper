import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import * as schema from './schema'

const dbPath = path.join(app.getPath('userData'), 'app.db')
const sqlite = new Database(dbPath)

sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })

const migrationsFolder = app.isPackaged
  ? path.join(process.resourcesPath, 'drizzle')
  : path.join(__dirname, '../../drizzle')

try {
  migrate(db, { migrationsFolder })
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  // If tables already exist, the DB is ahead of migrations — safe to continue
  if (msg.includes('already exists') || msg.includes('Failed to run the query')) {
    console.warn('Migration warning (tables may already exist):', msg)
  } else {
    throw err
  }
}
