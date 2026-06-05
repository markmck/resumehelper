import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

// NOTE: relocate.ts does NOT import electron.
// userDataDir and closeCurrentDb are injected by the caller (IPC handler in Plan 03)
// so this module stays pure and unit-testable without an Electron environment.

export type RelocateStage = 'collision' | 'copy' | 'verify' | 'bootstrap' | 'rename'
// NOTE: 'probe' is intentionally absent. The write-permission probe (D-08) runs earlier,
// at db:pickFolder in Plan 03's IPC handler, before the user ever reaches the confirm step.
// By the time targetDir reaches relocateDb(), it is already known-writable.

export type RelocateResult =
  | { ok: true; newPath: string; backupPath: string | null; warning?: string }
  | { ok: false; error: string; stage: RelocateStage }

/**
 * Pure staged DB relocation pipeline (D-07/D-12).
 *
 * Pipeline (each step is a potential failure point):
 *   1. Collision check — target/app.db must not already exist (D-09)
 *   2. WAL checkpoint + close source via injected closeCurrentDb() (D-11)
 *   3. Copy source → target (fs.copyFileSync; cleans up partial target on throw)
 *   4. Verify TARGET copy via readonly-open + PRAGMA integrity_check (D-10 / T-34-01)
 *   5. Write bootstrap JSON — THIS IS THE COMMIT POINT (D-12); bootstrap written only after verify
 *   6. Rename source → .bak with numbered suffix loop (D-14)
 *
 * On any failure before step 5, no bootstrap JSON is written and the source file is intact.
 * The caller is responsible for re-opening the source DB after a failure (resetDbCache()).
 */
export function relocateDb(args: {
  sourcePath: string
  targetDir: string
  userDataDir: string
  closeCurrentDb: () => void
}): RelocateResult {
  const { sourcePath, targetDir, userDataDir, closeCurrentDb } = args
  const targetPath = path.join(targetDir, 'app.db')
  const bootstrapPath = path.join(userDataDir, 'db-location.json')

  // Step 1: Collision check (D-09) — block; never silently overwrite
  if (fs.existsSync(targetPath)) {
    return {
      ok: false,
      stage: 'collision',
      error: `A database already exists at ${targetPath}. Choose a different folder or remove the existing file.`,
    }
  }
  // WR-01: also treat stale SQLite sidecars at the target as collisions.
  // A pre-existing -wal/-shm (e.g. from a prior crashed relocate) would be
  // applied against the freshly copied app.db by SQLite, potentially corrupting it.
  for (const sidecar of ['-wal', '-shm'] as const) {
    if (fs.existsSync(targetPath + sidecar)) {
      return {
        ok: false,
        stage: 'collision',
        error: `A leftover SQLite sidecar (${path.basename(targetPath) + sidecar}) exists at the target. Remove it and retry.`,
      }
    }
  }

  // Step 2: WAL checkpoint + close source so the file is safe to copy (D-11)
  try {
    closeCurrentDb()
  } catch (err) {
    return {
      ok: false,
      stage: 'copy',
      error: `Failed to close source database: ${(err as Error).message}`,
    }
  }

  // Step 3: Copy source → target
  try {
    fs.copyFileSync(sourcePath, targetPath)
  } catch (err) {
    // Disk full, permission denied, etc. — source untouched; clean up partial target.
    try { fs.unlinkSync(targetPath) } catch { /* may not have been created */ }
    return {
      ok: false,
      stage: 'copy',
      error: `Copy failed: ${(err as Error).message}`,
    }
  }

  // Step 4: Verify TARGET (not source) via PRAGMA integrity_check (T-34-01 / D-10)
  // Opens read-only so we never accidentally modify the just-copied file.
  try {
    const verifyDb = new Database(targetPath, { readonly: true, fileMustExist: true })
    const result = verifyDb.pragma('integrity_check', { simple: true }) as string
    verifyDb.close()
    if (result !== 'ok') {
      try { fs.unlinkSync(targetPath) } catch { /* */ }
      return {
        ok: false,
        stage: 'verify',
        error: `Integrity check failed: ${result}`,
      }
    }
  } catch (err) {
    try { fs.unlinkSync(targetPath) } catch { /* */ }
    return {
      ok: false,
      stage: 'verify',
      error: `Verification error: ${(err as Error).message}`,
    }
  }

  // Step 5: Write bootstrap JSON — COMMIT POINT (D-12)
  // Only reached when the copy is verified. Any failure here removes the target
  // so the next launch doesn't open a DB that has no bootstrap pointing to it.
  try {
    fs.writeFileSync(
      bootstrapPath,
      JSON.stringify({ version: 1, dbPath: targetPath }, null, 2),
      'utf-8',
    )
  } catch (err) {
    try { fs.unlinkSync(targetPath) } catch { /* */ }
    return {
      ok: false,
      stage: 'bootstrap',
      error: `Failed to write bootstrap JSON: ${(err as Error).message}`,
    }
  }

  // Step 6: Rename source → .bak with numbered suffix if needed (D-14)
  let bakPath = sourcePath + '.bak'
  let n = 1
  while (fs.existsSync(bakPath)) {
    bakPath = sourcePath + '.bak.' + n
    n++
  }
  try {
    fs.renameSync(sourcePath, bakPath)
  } catch (err) {
    // WR-03: Bootstrap is already written (commit point passed), so the move has effectively
    // succeeded — only the cosmetic .bak rename failed. Treat as success-with-warning so
    // the UI correctly transitions to the restart step rather than showing a hard failure.
    return {
      ok: true,
      newPath: targetPath,
      backupPath: null,
      warning: `Could not rename the original file to .bak; please delete it manually. (${(err as Error).message})`,
    }
  }

  // WR-02: Best-effort removal of source sidecars left after a successful move.
  // A stale -wal/-shm next to the renamed .bak is a corruption footgun if the app
  // ever falls back to the default path and SQLite opens a new app.db there.
  for (const sidecar of ['-wal', '-shm'] as const) {
    try { fs.unlinkSync(sourcePath + sidecar) } catch { /* may not exist — best effort */ }
  }

  return { ok: true, newPath: targetPath, backupPath: bakPath }
}
