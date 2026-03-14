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
  : path.join(__dirname, '../../../drizzle')

migrate(db, { migrationsFolder })
