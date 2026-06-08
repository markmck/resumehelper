import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import * as schema from './schema'
import { resolveDbPath } from './bootstrap'
import { migrateBulletOverrides, assertOverrideRowCounts } from './migrateOverrides'

// Module-scoped lazy state — nothing is opened at module load
let _sqlite: Database.Database | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _resolvedPath: string | null = null

export function getSqlite(): Database.Database {
  if (!_sqlite) {
    _resolvedPath = resolveDbPath().path
    _sqlite = new Database(_resolvedPath)
    _sqlite.pragma('journal_mode = WAL')
    ensureSchema(_sqlite)
  }
  return _sqlite
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) _db = drizzle(getSqlite(), { schema })
  return _db
}

export function getCurrentDbPath(): string {
  if (!_resolvedPath) getSqlite() // force resolution
  return _resolvedPath!
}

/** WAL-checkpoint and close; clears handle caches. Used by relocate flow. */
export function closeDb(): void {
  if (_sqlite) {
    _sqlite.pragma('wal_checkpoint(TRUNCATE)')
    _sqlite.close()
    _sqlite = null
    _db = null
  }
}

/** closeDb() + clear resolved path so next access re-reads bootstrap. */
export function resetDbCache(): void {
  closeDb()
  _resolvedPath = null
}

// Backwards-compatible Proxy exports — preserves `import { db, sqlite } from '../db'`
// for all 20 handler files with zero call-site migration required.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sqlite: Database.Database = new Proxy({} as any, {
  get: (_, prop) => Reflect.get(getSqlite(), prop, getSqlite()),
}) as Database.Database

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: ReturnType<typeof getDb> = new Proxy({} as any, {
  get: (_, prop) => Reflect.get(getDb(), prop, getDb()),
}) as ReturnType<typeof getDb>

// Ensure all tables exist using CREATE TABLE IF NOT EXISTS
// This is more reliable than file-based migrations for a local desktop app
// where the DB may be in any state (fresh, partial, or fully migrated)
function ensureSchema(sqlite: Database.Database): void {
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

    CREATE TABLE IF NOT EXISTS \`skill_categories\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`sort_order\` integer NOT NULL DEFAULT 0
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
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      \`score_threshold\` integer NOT NULL DEFAULT 80
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

    CREATE TABLE IF NOT EXISTS \`education\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`institution\` text NOT NULL,
      \`area\` text NOT NULL DEFAULT '',
      \`study_type\` text NOT NULL DEFAULT '',
      \`start_date\` text NOT NULL DEFAULT '',
      \`end_date\` text,
      \`score\` text DEFAULT '',
      \`courses\` text NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS \`volunteer\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`organization\` text NOT NULL,
      \`position\` text NOT NULL DEFAULT '',
      \`start_date\` text NOT NULL DEFAULT '',
      \`end_date\` text,
      \`summary\` text NOT NULL DEFAULT '',
      \`highlights\` text NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS \`awards\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`title\` text NOT NULL,
      \`date\` text,
      \`awarder\` text NOT NULL DEFAULT '',
      \`summary\` text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS \`publications\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`publisher\` text NOT NULL DEFAULT '',
      \`release_date\` text,
      \`url\` text NOT NULL DEFAULT '',
      \`summary\` text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS \`languages\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`language\` text NOT NULL,
      \`fluency\` text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS \`interests\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`keywords\` text NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS \`references\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`reference\` text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS \`ai_settings\` (
      \`id\` integer PRIMARY KEY NOT NULL,
      \`provider\` text NOT NULL DEFAULT 'openai',
      \`model\` text NOT NULL DEFAULT '',
      \`api_key\` text NOT NULL DEFAULT ''
    );

    INSERT OR IGNORE INTO \`ai_settings\` (\`id\`) VALUES (1);

    CREATE TABLE IF NOT EXISTS \`app_settings\` (
      \`key\` text PRIMARY KEY NOT NULL,
      \`value\` text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS \`job_postings\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`company\` text NOT NULL,
      \`role\` text NOT NULL,
      \`raw_text\` text NOT NULL DEFAULT '',
      \`parsed_skills\` text NOT NULL DEFAULT '[]',
      \`parsed_keywords\` text NOT NULL DEFAULT '[]',
      \`parsed_requirements\` text NOT NULL DEFAULT '[]',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS \`analysis_results\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`job_posting_id\` integer NOT NULL,
      \`variant_id\` integer,
      \`match_score\` integer NOT NULL DEFAULT 0,
      \`keyword_hits\` text NOT NULL DEFAULT '[]',
      \`keyword_misses\` text NOT NULL DEFAULT '[]',
      \`gap_skills\` text NOT NULL DEFAULT '[]',
      \`suggestions\` text NOT NULL DEFAULT '[]',
      \`ats_flags\` text NOT NULL DEFAULT '[]',
      \`raw_llm_response\` text NOT NULL DEFAULT '',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`job_posting_id\`) REFERENCES \`job_postings\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`variant_id\`) REFERENCES \`template_variants\`(\`id\`) ON DELETE set null
    );

    CREATE TABLE IF NOT EXISTS \`submission_events\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`submission_id\` integer NOT NULL,
      \`status\` text NOT NULL,
      \`note\` text,
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`submission_id\`) REFERENCES \`submissions\`(\`id\`) ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS \`analysis_bullet_overrides\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`analysis_id\` integer NOT NULL,
      \`bullet_id\` integer NOT NULL,
      \`override_text\` text NOT NULL,
      \`source\` text NOT NULL DEFAULT 'ai_suggestion',
      \`suggestion_id\` text,
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`analysis_id\`) REFERENCES \`analysis_results\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade,
      UNIQUE (\`analysis_id\`, \`bullet_id\`)
    );

    CREATE TABLE IF NOT EXISTS \`analysis_skill_additions\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`analysis_id\` integer NOT NULL,
      \`skill_name\` text NOT NULL,
      \`reason\` text NOT NULL DEFAULT '',
      \`category\` text NOT NULL DEFAULT '',
      \`status\` text NOT NULL DEFAULT 'pending',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`analysis_id\`) REFERENCES \`analysis_results\`(\`id\`) ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS \`analysis_excluded_bullet_suggestions\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`analysis_id\` integer NOT NULL,
      \`bullet_id\` integer NOT NULL,
      \`reason\` text NOT NULL DEFAULT '',
      \`matched_keywords\` text NOT NULL DEFAULT '[]',
      \`status\` text NOT NULL DEFAULT 'pending',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`analysis_id\`) REFERENCES \`analysis_results\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS \`entity_overrides\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`variant_id\` integer,
      \`analysis_id\` integer,
      \`entity_type\` text NOT NULL,
      \`bullet_id\` integer,
      \`project_id\` integer,
      \`job_id\` integer,
      \`project_bullet_id\` integer,
      \`field\` text NOT NULL,
      \`override_text\` text NOT NULL,
      \`source\` text NOT NULL DEFAULT 'user',
      \`created_at\` integer NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (\`variant_id\`) REFERENCES \`template_variants\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`analysis_id\`) REFERENCES \`analysis_results\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE cascade,
      FOREIGN KEY (\`project_bullet_id\`) REFERENCES \`project_bullets\`(\`id\`) ON DELETE cascade
    );

    CREATE UNIQUE INDEX IF NOT EXISTS \`entity_overrides_variant_tier_uidx\`
      ON \`entity_overrides\` (\`variant_id\`, \`entity_type\`, \`bullet_id\`, \`project_id\`, \`job_id\`, \`project_bullet_id\`, \`field\`)
      WHERE \`analysis_id\` IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS \`entity_overrides_analysis_tier_uidx\`
      ON \`entity_overrides\` (\`analysis_id\`, \`entity_type\`, \`bullet_id\`, \`project_id\`, \`job_id\`, \`project_bullet_id\`, \`field\`)
      WHERE \`analysis_id\` IS NOT NULL;
  `)

  // Add columns that may be missing on existing databases
  const alterStatements = [
    'ALTER TABLE `submissions` ADD COLUMN `status` text DEFAULT \'applied\'',
    'ALTER TABLE `submissions` ADD COLUMN `job_posting_id` integer REFERENCES `job_postings`(`id`)',
    'ALTER TABLE `template_variant_items` ADD COLUMN `project_id` integer REFERENCES `projects`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `project_bullet_id` integer REFERENCES `project_bullets`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `education_id` integer REFERENCES `education`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `volunteer_id` integer REFERENCES `volunteer`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `award_id` integer REFERENCES `awards`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `publication_id` integer REFERENCES `publications`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `language_id` integer REFERENCES `languages`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `interest_id` integer REFERENCES `interests`(`id`) ON DELETE cascade',
    'ALTER TABLE `template_variant_items` ADD COLUMN `reference_id` integer REFERENCES `references`(`id`) ON DELETE cascade',
    'ALTER TABLE `profile` ADD COLUMN `summary` text NOT NULL DEFAULT \'\'',
    'ALTER TABLE `analysis_results` ADD COLUMN `semantic_matches` text NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE `analysis_results` ADD COLUMN `status` text NOT NULL DEFAULT \'unreviewed\'',
    'ALTER TABLE `analysis_results` ADD COLUMN `score_breakdown` text NOT NULL DEFAULT \'{}\'',
    'ALTER TABLE `job_postings` ADD COLUMN `parsed_preferred` text NOT NULL DEFAULT \'[]\'',
    'ALTER TABLE `submissions` ADD COLUMN `score_at_submit` integer',
    'ALTER TABLE `submissions` ADD COLUMN `analysis_id` integer REFERENCES `analysis_results`(`id`)',
    'ALTER TABLE `jobs` ADD COLUMN `sort_order` integer NOT NULL DEFAULT 0',
    'ALTER TABLE `template_variants` ADD COLUMN `template_options` text',
    'ALTER TABLE `job_bullets` ADD COLUMN `updated_at` integer',
    'ALTER TABLE `template_variants` ADD COLUMN `updated_at` integer',
    'ALTER TABLE `skills` ADD COLUMN `category_id` integer REFERENCES `skill_categories`(`id`) ON DELETE set null',
    'ALTER TABLE `template_variants` ADD COLUMN `score_threshold` integer NOT NULL DEFAULT 80',
  ]
  for (const sql of alterStatements) {
    try { sqlite.exec(sql) } catch { /* column already exists */ }
  }

  // Migrate skill tags to skill_categories (idempotent — only processes skills with NULL category_id)
  try {
    const needsMigration = sqlite.prepare("SELECT COUNT(*) as cnt FROM skills WHERE category_id IS NULL AND tags != '[]' AND tags IS NOT NULL").get() as { cnt: number }
    if (needsMigration.cnt > 0) {
      const migrateTx = sqlite.transaction(() => {
        const rows = sqlite.prepare("SELECT DISTINCT json_extract(tags, '$[0]') as tag FROM skills WHERE tags != '[]' AND tags IS NOT NULL AND json_extract(tags, '$[0]') IS NOT NULL").all() as { tag: string }[]
        let order = 0
        for (const row of rows) {
          if (!row.tag) continue
          const existing = sqlite.prepare("SELECT id FROM skill_categories WHERE name = ?").get(row.tag) as { id: number } | undefined
          if (!existing) {
            sqlite.prepare("INSERT INTO skill_categories (name, sort_order) VALUES (?, ?)").run(row.tag, order++)
          }
        }
        sqlite.exec(`
          UPDATE skills
          SET category_id = (
            SELECT sc.id FROM skill_categories sc
            WHERE sc.name = json_extract(skills.tags, '$[0]')
          )
          WHERE category_id IS NULL AND tags != '[]' AND tags IS NOT NULL
        `)
      })
      migrateTx()
    }
  } catch { /* migration already complete or no skills to migrate */ }

  // Migrate analysis_bullet_overrides rows into entity_overrides (idempotent, all-or-nothing)
  // D-05: runs inside sqlite.transaction(); old table untouched (D-07)
  migrateBulletOverrides(sqlite)
  // Startup row-count assertion: warns-but-allows on mismatch (D-05, never throws)
  const assertResult = assertOverrideRowCounts(sqlite)
  if (!assertResult.ok) {
    console.warn(
      `[ensureSchema] Override row-count assertion mismatch — ` +
      `src=${assertResult.srcCount}, dst=${assertResult.dstCount}, skipped=${assertResult.skippedNullVariant}. ` +
      `Launch continues.`
    )
  }

  // Also run file-based migrations for any ALTER TABLE statements
  // that add columns to existing tables
  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(__dirname, '../../drizzle')

  try {
    migrate(getDb(), { migrationsFolder })
  } catch {
    // Migrations may fail if tables were created by ensureSchema above
    // and Drizzle's migration journal doesn't know about them — that's fine
  }
}
