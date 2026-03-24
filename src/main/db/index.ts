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
export { sqlite }

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
  ]
  for (const sql of alterStatements) {
    try { sqlite.exec(sql) } catch { /* column already exists */ }
  }

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
