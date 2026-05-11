import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
import { appSettings } from '../db/schema'

type Db = BetterSQLite3Database<typeof schema>

/**
 * Read a string-valued setting from the app_settings k/v table.
 * Returns undefined when the key is absent.
 */
export function getSetting(db: Db, key: string): string | undefined {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get()
  return row?.value
}

/**
 * Write/overwrite a string-valued setting (UPSERT — no UNIQUE collision).
 */
export function setSetting(db: Db, key: string, value: string): void {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run()
}
