import fs from 'node:fs'
import path from 'node:path'

// NOTE: This module does NOT import electron. The sourceDir is injected by the caller.

const BACKUP_RE = /^app\.db\.bak(?:\.\d+)?$/

/**
 * Scan sourceDir for app.db.bak and numbered variants (app.db.bak.1, .bak.2, …).
 * Returns a list sorted newest-mtime-first (D-15/D-16).
 */
export function findBackups(sourceDir: string): Array<{ path: string; mtime: number }> {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && BACKUP_RE.test(e.name))
    .map((e) => {
      const p = path.join(sourceDir, e.name)
      return { path: p, mtime: fs.statSync(p).mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)
}

/**
 * Delete the most recently modified backup file in sourceDir (D-15).
 * Returns the path of the deleted file, or { deleted: null } when none exist.
 */
export function deleteMostRecentBackup(sourceDir: string): { deleted: string } | { deleted: null } {
  const list = findBackups(sourceDir)
  if (list.length === 0) return { deleted: null }
  fs.unlinkSync(list[0].path)
  return { deleted: list[0].path }
}
