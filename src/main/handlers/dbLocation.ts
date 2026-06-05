import { ipcMain, dialog, app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { closeDb, getCurrentDbPath, resetDbCache, getSqlite } from '../db'
import { relocateDb } from '../db/relocate'
import { detectCloudPath } from '../lib/cloudPathHeuristic'
import { findBackups, deleteMostRecentBackup } from '../db/backups'

// Module-scoped in-flight guard — rejects concurrent db:relocate calls (T-34-09 / Pitfall 6)
let _relocateInFlight = false

/**
 * WR-04: Return the directory that holds backup files.
 * After a switch-immediately relocate, getCurrentDbPath() points at the new location,
 * but the .bak lives in the old (source) directory. We persist the source dir in
 * app_settings under 'lastBackupDir' at relocate time and prefer it here.
 * Falls back to dirname(currentPath) when not set (first launch, before any relocate).
 */
function _getBackupDir(): string {
  try {
    const row = getSqlite().prepare("SELECT value FROM app_settings WHERE key = 'lastBackupDir'").get() as { value: string } | undefined
    if (row?.value) return row.value
  } catch { /* DB not yet open or schema missing — fall through */ }
  return path.dirname(getCurrentDbPath())
}

export function registerDbLocationHandlers(): void {
  ipcMain.handle('db:getCurrentPath', () => getCurrentDbPath())

  ipcMain.handle('db:revealInExplorer', () => {
    const p = getCurrentDbPath()
    shell.showItemInFolder(p)
  })

  ipcMain.handle('db:pickFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Choose database folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (canceled || filePaths.length === 0) return { canceled: true }

    const folder = filePaths[0]

    // Write-permission probe (D-08, T-34-08): write + delete .rh-write-test
    // WR-05: only set writable=false when the writeFileSync itself fails.
    // Cleanup (unlink) runs in finally so it never leaves a probe file behind,
    // and a failed unlink does NOT incorrectly report the folder as non-writable.
    const probePath = path.join(folder, '.rh-write-test')
    let writable = false
    let probeError: string | undefined
    try {
      fs.writeFileSync(probePath, '', { flag: 'w' })
      writable = true
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      probeError =
        code === 'EACCES' || code === 'EPERM' ? 'No write permission to this folder.' :
        code === 'EROFS' ? 'Folder is read-only.' :
        code === 'ENOENT' ? 'Folder does not exist.' :
        `Cannot write to folder: ${(err as Error).message}`
    } finally {
      // Best-effort cleanup — swallow errors; a leftover probe file is cosmetic only
      try { fs.unlinkSync(probePath) } catch { /* */ }
    }

    const result: {
      canceled: false
      folder: string
      cloudWarning: ReturnType<typeof detectCloudPath>
      writable: boolean
      probeError?: string
    } = {
      canceled: false,
      folder,
      cloudWarning: detectCloudPath(folder),
      writable,
    }
    if (probeError !== undefined) result.probeError = probeError
    return result
  })

  ipcMain.handle('db:relocate', async (_, targetDir: unknown) => {
    // CR-02: Server-side validation of targetDir before touching the filesystem.
    // The TypeScript annotation is erased at runtime; validate the raw IPC argument.
    if (typeof targetDir !== 'string' || targetDir.trim() === '' || !path.isAbsolute(targetDir)) {
      return { ok: false, stage: 'collision', error: 'Invalid target folder.' }
    }
    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
      return { ok: false, stage: 'collision', error: 'Target folder does not exist.' }
    }

    // In-flight guard: reject concurrent relocate calls (T-34-09)
    if (_relocateInFlight) {
      return { ok: false, stage: 'collision', error: 'Relocation already in progress.' }
    }
    _relocateInFlight = true
    try {
      const sourcePath = getCurrentDbPath()
      // WR-04: capture source dir before the move so listBackups/deleteOldestBackup can
      // find the .bak even after CR-01 switches the cache to the new path.
      const sourceDir = path.dirname(sourcePath)
      const userDataDir = app.getPath('userData')
      const result = relocateDb({ sourcePath, targetDir, userDataDir, closeCurrentDb: closeDb })
      if (result.ok) {
        // CR-01 (switch-immediately): reset cache so the proxy immediately opens the NEW DB.
        // The new DB is now live; restart is recommended but not required.
        resetDbCache()
        // WR-04: persist the source dir so db:listBackups and db:deleteOldestBackup can
        // find the .bak even though getCurrentDbPath() now returns the new location.
        try {
          getSqlite().prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('lastBackupDir', ?)").run(sourceDir)
        } catch { /* best effort — backup dir tracking is non-critical */ }
      } else {
        // T-34-10: Reset cache so the next getDb() re-reads bootstrap (still points at old path
        // since no bootstrap JSON was written) — source stays usable (DB-04)
        resetDbCache()
      }
      return result
    } finally {
      _relocateInFlight = false
    }
  })

  ipcMain.handle('db:listBackups', () => {
    // WR-04: prefer lastBackupDir (the source dir at relocate time) so the .bak is found
    // even after CR-01 switches getCurrentDbPath() to the new location.
    const backupDir = _getBackupDir()
    return findBackups(backupDir)
  })

  ipcMain.handle('db:deleteOldestBackup', () => {
    // WR-04: same rationale — use tracked source dir, not live DB path.
    const backupDir = _getBackupDir()
    const result = deleteMostRecentBackup(backupDir)
    // If no backups remain after the delete, clear the persisted key (best effort).
    if (result.deleted !== null) {
      try {
        const remaining = findBackups(backupDir)
        if (remaining.length === 0) {
          getSqlite().prepare("DELETE FROM app_settings WHERE key = 'lastBackupDir'").run()
        }
      } catch { /* non-critical */ }
    }
    return result
  })

  ipcMain.handle('db:restart', () => {
    // IN-03: restart is immediate — no async drain. better-sqlite3 is synchronous so the
    // DB layer itself is safe; renderer-side auto-saves should have flushed before this point.
    app.relaunch()
    app.exit(0)
  })
}
