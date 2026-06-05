import { ipcMain, dialog, app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { closeDb, getCurrentDbPath, resetDbCache } from '../db'
import { relocateDb } from '../db/relocate'
import { detectCloudPath } from '../lib/cloudPathHeuristic'
import { findBackups, deleteMostRecentBackup } from '../db/backups'

// Module-scoped in-flight guard — rejects concurrent db:relocate calls (T-34-09 / Pitfall 6)
let _relocateInFlight = false

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
    // Returns { writable, probeError? } — never throws; renderer owns the UX decision
    const probePath = path.join(folder, '.rh-write-test')
    let writable = false
    let probeError: string | undefined
    try {
      fs.writeFileSync(probePath, '', { flag: 'w' })
      fs.unlinkSync(probePath)
      writable = true
    } catch (err) {
      // Try to clean up a partial probe file if write succeeded but unlink failed
      try { fs.unlinkSync(probePath) } catch { /* */ }
      const code = (err as NodeJS.ErrnoException).code
      probeError =
        code === 'EACCES' || code === 'EPERM' ? 'No write permission to this folder.' :
        code === 'EROFS' ? 'Folder is read-only.' :
        code === 'ENOENT' ? 'Folder does not exist.' :
        `Cannot write to folder: ${(err as Error).message}`
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

  ipcMain.handle('db:relocate', async (_, targetDir: string) => {
    // In-flight guard: reject concurrent relocate calls (T-34-09)
    if (_relocateInFlight) {
      return { ok: false, stage: 'collision', error: 'Relocation already in progress.' }
    }
    _relocateInFlight = true
    try {
      const sourcePath = getCurrentDbPath()
      const userDataDir = app.getPath('userData')
      const result = relocateDb({ sourcePath, targetDir, userDataDir, closeCurrentDb: closeDb })
      if (!result.ok) {
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
    const current = getCurrentDbPath()
    return findBackups(path.dirname(current))
  })

  ipcMain.handle('db:deleteOldestBackup', () => {
    const current = getCurrentDbPath()
    // D-15: deleteMostRecentBackup deletes the backup created most recently
    // (the "oldest data" / pre-relocation backup in practice)
    return deleteMostRecentBackup(path.dirname(current))
  })

  ipcMain.handle('db:restart', () => {
    app.relaunch()
    app.exit(0)
  })
}
