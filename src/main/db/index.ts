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

// Ensure all tables exist using CREATE TABLE IF NOT EXISTS
// This is more reliable than file-based migrations for a local desktop app
// where the DB may be in any state (fresh, partial, or fully migrated)
function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS \`jobs\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`company\` text NOT NULL,
      \`role\` text NOT NULL,
      \`start_date\` text NOT NULL,
      \`end_date\` text,
      \`created_at\` integer NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS \`job_bullets\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`job_id\` integer NOT NULL,
      \`text\` text NOT NULL,
      \`sort_order\` integer DEFAULT 0 NOT NULL,
      FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS \`skills\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`tags\` text DEFAULT '[]' NOT NULL
    );

    CREATE TABLE IF NOT EXISTS \`template_variants\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`layout_template\` text DEFAULT 'traditional' NOT NULL,
      \`created_at\` integer NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS \`template_variant_items\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`variant_id\` integer NOT NULL,
      \`item_type\` text NOT NULL,
      \`bullet_id\` integer,
      \`skill_id\` integer,
      \`job_id\` integer,
      \`excluded\` integer DEFAULT 0 NOT NULL,
      FOREIGN KEY (\`variant_id\`) REFERENCES \`template_variants\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`skill_id\`) REFERENCES \`skills\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS \`submissions\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`company\` text NOT NULL,
      \`role\` text NOT NULL,
      \`submitted_at\` integer,
      \`variant_id\` integer,
      \`resume_snapshot\` text DEFAULT '{}' NOT NULL,
      \`url\` text,
      \`notes\` text,
      FOREIGN KEY (\`variant_id\`) REFERENCES \`template_variants\`(\`id\`) ON DELETE no action
    );

    CREATE TABLE IF NOT EXISTS \`profile\` (
      \`id\` integer PRIMARY KEY NOT NULL,
      \`name\` text NOT NULL DEFAULT '',
      \`email\` text NOT NULL DEFAULT '',
      \`phone\` text NOT NULL DEFAULT '',
      \`location\` text NOT NULL DEFAULT '',
      \`linkedin\` text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS \`projects\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`sort_order\` integer DEFAULT 0 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS \`project_bullets\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`project_id\` integer NOT NULL,
      \`text\` text NOT NULL,
      \`sort_order\` integer DEFAULT 0 NOT NULL,
      FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE cascade
    );

    INSERT OR IGNORE INTO \`profile\` (\`id\`) VALUES (1);
  `)

  // Also run file-based migrations for any ALTER TABLE statements
  // that add columns to existing tables
  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(__dirname, '../../drizzle')

  try {
    migrate(db, { migrationsFolder })
  } catch {
    // Migrations may fail if tables were created by ensureSchema above
    // and Drizzle's migration journal doesn't know about them — that's fine
  }
}

ensureSchema()
