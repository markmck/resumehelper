import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

// NOTE: bootstrap.ts is the only Phase-34 helper that imports electron.
// All other helpers (relocate.ts, backups.ts, cloudPathHeuristic.ts) receive
// electron-sourced values via injection to remain electron-free and unit-testable.

export type ResolveDbPathSource = 'bootstrap' | 'default' | 'fallback-corrupt' | 'fallback-missing'

/**
 * Resolve the path to the active app.db, consulting userData/db-location.json
 * as a bootstrap override (D-04/D-05).
 *
 * Fallback priority (DB-07, D-06):
 *   1. Valid JSON + absolute path + file on disk → source: 'bootstrap'
 *   2. ENOENT (first launch, no JSON yet) → source: 'default'
 *   3. Unreadable / invalid JSON / wrong shape → source: 'fallback-corrupt'
 *   4. Valid JSON but dbPath missing on disk → source: 'fallback-missing'
 *
 * Never throws. The app must always be able to open its DB.
 */
export function resolveDbPath(): { path: string; source: ResolveDbPathSource } {
  const userData = app.getPath('userData')
  const bootstrapPath = path.join(userData, 'db-location.json')
  const defaultPath = path.join(userData, 'app.db')

  // Step 1: read bootstrap JSON
  let raw: string
  try {
    raw = fs.readFileSync(bootstrapPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // Normal first-launch case — no override written yet
      return { path: defaultPath, source: 'default' }
    }
    // Any other read error (permissions, ENXIO, etc.) → corrupt
    console.warn('[db.bootstrap] read error, falling back to default', err)
    return { path: defaultPath, source: 'fallback-corrupt' }
  }

  // Step 2: parse JSON
  let parsed: { version?: unknown; dbPath?: unknown }
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn('[db.bootstrap] invalid JSON in db-location.json, falling back to default')
    return { path: defaultPath, source: 'fallback-corrupt' }
  }

  // Step 3: validate shape (D-05: { version: 1, dbPath: <absolute string> })
  if (
    parsed.version !== 1 ||
    typeof parsed.dbPath !== 'string' ||
    !path.isAbsolute(parsed.dbPath)
  ) {
    console.warn('[db.bootstrap] invalid shape in db-location.json, falling back to default', parsed)
    return { path: defaultPath, source: 'fallback-corrupt' }
  }

  // Step 4: validate target exists on disk (D-06 spirit — see RESEARCH Pitfall 7)
  if (!fs.existsSync(parsed.dbPath)) {
    console.warn('[db.bootstrap] dbPath missing on disk, falling back to default', parsed.dbPath)
    return { path: defaultPath, source: 'fallback-missing' }
  }

  return { path: parsed.dbPath, source: 'bootstrap' }
}
