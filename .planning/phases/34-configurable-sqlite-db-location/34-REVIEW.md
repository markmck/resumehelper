---
phase: 34-configurable-sqlite-db-location
reviewed: 2026-06-04T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/main/db/backups.ts
  - src/main/db/bootstrap.ts
  - src/main/db/index.ts
  - src/main/db/relocate.ts
  - src/main/handlers/dbLocation.ts
  - src/main/handlers/index.ts
  - src/main/lib/cloudPathHeuristic.ts
  - src/preload/index.d.ts
  - src/preload/index.ts
  - src/renderer/src/components/CloudPathWarningModal.tsx
  - src/renderer/src/components/DatabaseLocationCard.tsx
  - src/renderer/src/components/DbRelocateConfirmModal.tsx
  - src/renderer/src/components/RestartRequiredModal.tsx
  - src/renderer/src/components/SettingsTab.tsx
  - tests/__mocks__/electron.ts
  - tests/helpers/tmpDb.ts
  - tests/unit/main/db/backups.test.ts
  - tests/unit/main/db/bootstrap.test.ts
  - tests/unit/main/db/relocate.test.ts
  - tests/unit/main/lib/cloudPathHeuristic.test.ts
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
status: resolved
---

# Phase 34: Code Review Report

**Reviewed:** 2026-06-04
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the configurable SQLite DB-location feature: the pure staged relocation
pipeline (`relocate.ts`), the lazy DB factory with Proxy re-exports (`db/index.ts`),
the bootstrap resolver (`bootstrap.ts`), the IPC handler layer (`dbLocation.ts`),
the cloud-path heuristic, and the Settings UI.

The pipeline structure and the integrity-verify-against-target invariant are sound,
and the test coverage for the pure modules is good. However, the review surfaced two
correctness defects that can corrupt or silently switch the active database, plus
several robustness and validation gaps in the IPC layer and the UI flow.

Highest-impact issues:

- **CR-01** — The relocation commit point is not atomic with the in-memory cache
  state. After a successful relocate without an immediate restart, the lazy DB
  factory will silently re-open the **new** database mid-session, contradicting the
  documented "app continues using the old location until restart" contract and
  risking writes landing in an inconsistent split-brain state.
- **CR-02** — `db:relocate` performs zero validation on the `targetDir` argument
  received over IPC. A non-string / empty / non-existent value flows straight into
  `path.join` and `fs.copyFileSync`, and the write-permission probe that the
  pipeline relies on is only enforced in the renderer, not in the handler.

## Critical Issues

### CR-01: Successful relocate silently switches the live DB before restart (cache/commit race)

**File:** `src/main/db/index.ts:29-48`, `src/main/handlers/dbLocation.ts:65-84`

**Issue:**
`closeDb()` clears `_sqlite` and `_db` but intentionally leaves `_resolvedPath`
untouched (only `resetDbCache()` clears it). On the **success** path the handler does
NOT call `resetDbCache()` — it returns `ok` and the UI offers "Restart later," with
`RestartRequiredModal` promising "the app continues using the old database location"
until restart.

But that promise is false. The relocate flow runs:
1. `getCurrentDbPath()` → opens `_sqlite`, sets `_resolvedPath` = old path.
2. `relocateDb()` → calls `closeDb()` → `_sqlite = null`, `_db = null`,
   **bootstrap JSON now points at the new path**.
3. Handler returns success; no cache reset.
4. The next access through the `db` / `sqlite` Proxy calls `getSqlite()`, sees
   `_sqlite === null`, and re-runs `resolveDbPath()` — which now reads the **new**
   bootstrap and opens the **new** database (and overwrites `_resolvedPath` with the
   new path).

So any DB read/write performed after the user clicks "Restart later" silently lands
in the new location, not the old one. Worse, `getCurrentDbPath()` (used by
`db:listBackups` / `db:deleteOldestBackup`) returns the stale old path only until the
first proxy access re-resolves it, so the reported path and the actually-open file
can disagree depending on call ordering. This is a data-consistency hazard and a
direct contradiction of the stated restart contract.

**Fix:** Make the intended post-relocate behavior explicit and consistent. Either
(a) hard-relaunch on success and remove the "Restart later" option, or (b) keep the
old DB open until restart by NOT closing/clearing the live handle in a way that lets
the proxy re-resolve. The simplest correct fix for the "use old until restart"
contract is to re-open the source immediately after a successful copy+commit so the
running session keeps using the old file, and only let the new path take effect on
next launch:

```ts
// dbLocation.ts, success branch
const result = relocateDb({ sourcePath, targetDir, userDataDir, closeCurrentDb: closeDb })
if (result.ok) {
  // Re-open the OLD source for the remainder of this session so the running app
  // does not silently switch databases before the user restarts.
  // (Old file still exists as the .bak; re-point or copy back as appropriate,
  //  OR relaunch immediately.)
}
```

If the product decision is "switch immediately," then `RestartRequiredModal`'s copy
must be corrected and the cache reset made deterministic. Pick one and make the code
and UI agree.

### CR-02: `db:relocate` IPC handler does not validate `targetDir` (untrusted input reaches fs)

**File:** `src/main/handlers/dbLocation.ts:65-84`

**Issue:**
`ipcMain.handle('db:relocate', async (_, targetDir: string) => …)` passes `targetDir`
straight into `relocateDb`, which does `path.join(targetDir, 'app.db')` and
`fs.copyFileSync(sourcePath, targetPath)`. There is no check that `targetDir` is a
non-empty string, that it exists, or that it is actually writable. The TypeScript
annotation is erased at runtime; a renderer bug (or any other caller able to reach the
channel) can pass `undefined`, `''`, a number, or an arbitrary path.

The write-permission probe (D-08) that the pipeline's comment says guarantees a
known-writable target runs only in `db:pickFolder` and only in the renderer flow. The
`db:relocate` handler trusts that the renderer enforced it, but nothing rebinds the
probed folder to the relocated folder — the renderer sends whatever string it holds in
`pendingFolder`. If the two ever diverge (or the channel is invoked directly), the
"already known-writable" invariant documented in `relocate.ts:10-12` is violated, and
failures surface as raw `copyFileSync` errors instead of the intended typed result.

`relocate.ts:39` (`path.join(targetDir, 'app.db')`) with a non-string `targetDir`
throws a `TypeError` synchronously inside the handler, which rejects the IPC promise —
the renderer's `handleConfirm` catch shows a generic message, but the in-flight guard
still resets correctly. The deeper issue is the missing server-side validation and
re-probe.

**Fix:** Validate and re-probe inside the handler before calling `relocateDb`:

```ts
ipcMain.handle('db:relocate', async (_, targetDir: unknown) => {
  if (typeof targetDir !== 'string' || targetDir.trim() === '' || !path.isAbsolute(targetDir)) {
    return { ok: false, stage: 'collision', error: 'Invalid target folder.' }
  }
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    return { ok: false, stage: 'collision', error: 'Target folder does not exist.' }
  }
  // Re-run the write probe here so the "known-writable" invariant is enforced
  // server-side, not just in the renderer.
  // ... existing in-flight guard + relocateDb call
})
```

## Warnings

### WR-01: Relocation copies only `app.db`, ignoring a possible stale `-wal` / `-shm` at the target

**File:** `src/main/db/relocate.ts:42-49, 62-96`

**Issue:** The collision check only looks for `targetPath` (`app.db`). It does not
check for or clean up a pre-existing `app.db-wal` / `app.db-shm` in the target
directory. The verify step then opens `targetPath` (read-only). If a stale `-wal`
exists at the target (e.g., left over from a prior crashed/partial relocate, or a
foreign file), SQLite will attempt to apply it against the freshly copied `app.db`,
which can corrupt the verified copy or make `integrity_check` non-deterministic. The
copy is correct only under the assumption that the target directory contains no SQLite
sidecars for `app.db`.

**Fix:** Before copy, also treat `targetPath + '-wal'` and `targetPath + '-shm'` as
collisions (or remove them after confirming they are not in use), e.g.:

```ts
for (const sidecar of ['-wal', '-shm']) {
  if (fs.existsSync(targetPath + sidecar)) {
    return { ok: false, stage: 'collision',
      error: `A leftover SQLite sidecar (${path.basename(targetPath) + sidecar}) exists at the target. Remove it and retry.` }
  }
}
```

### WR-02: Orphaned `-wal` / `-shm` left in the source directory after a successful move

**File:** `src/main/db/relocate.ts:116-135`

**Issue:** Step 6 renames `app.db` → `app.db.bak`, but the source `app.db-wal` and
`app.db-shm` files are not renamed or removed. After a clean `wal_checkpoint(TRUNCATE)`
+ close these are typically empty, but they remain on disk pointing at a file that no
longer exists under that name. On a future launch that falls back to `defaultPath`
(`fallback-missing` / `fallback-corrupt`), SQLite opening a freshly created
`app.db` next to a stale `-wal`/`-shm` is a known corruption footgun.

**Fix:** After the successful rename, best-effort unlink the source sidecars:

```ts
for (const sidecar of ['-wal', '-shm']) {
  try { fs.unlinkSync(sourcePath + sidecar) } catch { /* may not exist */ }
}
```

### WR-03: `rename` failure returns `ok:false` even though the move already committed

**File:** `src/main/db/relocate.ts:116-133`, `src/renderer/.../DatabaseLocationCard.tsx:120-127`

**Issue:** The bootstrap JSON (the documented commit point, step 5) is written before
the rename. If the rename to `.bak` fails, the function returns
`{ ok: false, stage: 'rename' }`. But the bootstrap now points at the new, verified DB
— the move has effectively succeeded; only the cosmetic backup-rename failed. The
renderer treats any `ok:false` as a hard failure (`setStatus('error')`,
`Relocation failed (rename): …`) and does NOT update `currentPath` or offer restart.
Meanwhile the handler ran `resetDbCache()` (failure branch), so on next access the app
opens the NEW path. The user is told the relocation failed while it actually
succeeded, leaving the source `app.db` un-backed-up but in place. This is a confusing
and potentially data-risky state (the old `app.db` is still there and may be edited as
a stale copy if the user retries).

**Fix:** Treat a post-commit rename failure as a success-with-warning, not a failure.
Return `{ ok: true, newPath, backupPath: null, warning: 'Could not rename the original
file to .bak; please delete it manually.' }` and have the UI surface the warning while
still proceeding to the restart step.

### WR-04: `db:revealInExplorer` / `db:listBackups` / `db:deleteOldestBackup` operate on a possibly stale path after relocate

**File:** `src/main/handlers/dbLocation.ts:15-18, 86-96`

**Issue:** All three handlers derive their target from `getCurrentDbPath()`, which (per
CR-01) can be stale or, after a re-resolve, point at the new location. After a
"Restart later" relocate, `db:listBackups` uses `path.dirname(getCurrentDbPath())`. If
the proxy has re-resolved to the new path, `dirname` is the new folder — which has no
`.bak` files — so the backup list silently empties and the "Delete old backup" button
disappears even though the real backup sits in the old folder. The correctness of
these handlers is entirely dependent on the unresolved CR-01 timing.

**Fix:** Resolve CR-01 first. Additionally, consider tracking the backup directory
explicitly (the source dir at relocate time) rather than re-deriving it from the
live DB path.

### WR-05: Write-permission probe can leave a `.rh-write-test` file behind

**File:** `src/main/handlers/dbLocation.ts:31-47`

**Issue:** The probe writes `.rh-write-test`, then `fs.unlinkSync`. If the `writeFileSync`
succeeds but `unlinkSync` throws (e.g., AV lock, transient EBUSY on Windows), the catch
block attempts a single cleanup unlink and then reports the folder as **not writable**
even though it is. The leftover `.rh-write-test` also pollutes the user's chosen folder.
Net effect: a writable folder can be reported unwritable, blocking a legitimate
relocation.

**Fix:** Distinguish "write failed" (truly not writable) from "cleanup failed" (writable,
just couldn't delete the probe). Only set `writable = false` when the `writeFileSync`
itself throws:

```ts
try {
  fs.writeFileSync(probePath, '', { flag: 'w' })
  writable = true
} catch (err) { /* set probeError, writable stays false */ }
finally {
  try { fs.unlinkSync(probePath) } catch { /* best effort */ }
}
```

### WR-06: `detectCloudPath` matches any segment that merely starts with "OneDrive" / "Google Drive", causing false positives

**File:** `src/main/lib/cloudPathHeuristic.ts:28-29, 46-48`

**Issue:** `seg.startsWith('OneDrive')` flags legitimate local folders such as
`OneDriveBackups`, `OneDrive_archive`, or a project literally named `Google Drive Exports`.
The project's own test (`cloudPathHeuristic.test.ts:99-104`) explicitly acknowledges
`C:\OneDriveBackups` would match and calls it "accepted D-17 noise," but the comment in
the source (line 27) implies the intent is to match the OneDrive *tenant* form
`OneDrive - <Tenant>`. The `startsWith` is broader than the documented intent and will
nag users about non-cloud folders. This is advisory-only (warn, not block), so it is a
warning rather than a blocker, but the over-broad match degrades the UX the heuristic
exists to provide.

**Fix:** Tighten to the known shapes: exact `OneDrive`, or `OneDrive - ` prefix
(tenant form); same for Google Drive (`Google Drive` exact or `Google Drive (` prefix):

```ts
if (seg === 'OneDrive' || seg.startsWith('OneDrive - ')) { … }
if (seg === 'Google Drive' || seg.startsWith('Google Drive (')) { … }
```

### WR-07: `handleConfirm` can leave the confirm modal open on success, and step labels are misleading

**File:** `src/renderer/.../DatabaseLocationCard.tsx:113-145`; `DbRelocateConfirmModal.tsx:11-17`

**Issue:** `setActiveStep('Step 1 of 5: Copying database…')` is the only progress
update — the pipeline never reports real progress, so the label is hard-coded and
inaccurate (the main process runs all five stages synchronously in one IPC call; the
renderer cannot show steps 2-5). More importantly, on the **error** branch the code sets
`setModalOpen(false)` but on the **success** branch it transitions to `'restart'` —
correct — yet if the relocate promise rejects (CR-02 TypeError path), the catch sets
`setModalOpen(false)` and an error status, which is fine, but `pendingFolder` is never
cleared, so a subsequent "Change location" that is canceled could re-show a stale
target. Minor state-leak; combined with the fake progress label this is a quality
defect in the relocation UX.

**Fix:** Remove the fake "Step 1 of 5" label (or drive it from real IPC progress
events), and clear `pendingFolder` in every terminal branch of `handleConfirm`.

## Info

### IN-01: Schema definition duplicated verbatim between production and test helper

**File:** `tests/helpers/tmpDb.ts:22-271` vs `src/main/db/index.ts:66-315`

**Issue:** The entire `CREATE TABLE` block and the `alterStatements` array are copy-pasted
into the test helper with a "CRITICAL: Keep in sync" comment. This is a maintenance hazard
— the two will drift. (Out of strict scope as duplication, noted for awareness.)

**Fix:** Export the schema DDL / alter list from a single module and import it in both
production `ensureSchema` and the test helper.

### IN-02: `bootstrap.ts` does not validate that `dbPath`'s basename is `app.db` or that the parent is a directory

**File:** `src/main/db/bootstrap.ts:52-65`

**Issue:** A bootstrap JSON pointing at any absolute, existing path is accepted as the DB.
If `dbPath` happens to point at a directory or a non-SQLite file that exists, `existsSync`
passes and `getSqlite()` will try to open it, failing later with a less clear error. Low
likelihood given the file is app-written, but the resolver claims to "never throw" while
the downstream open can.

**Fix:** Optionally `fs.statSync(...).isFile()` in the existence check, and/or run a cheap
header check before committing to the bootstrap path.

### IN-03: `db:restart` has no guard for unsaved in-flight writes

**File:** `src/main/handlers/dbLocation.ts:98-101`

**Issue:** `app.relaunch(); app.exit(0)` exits immediately. If any async write is mid-flight
when the user clicks "Restart now," it can be lost. better-sqlite3 is synchronous so the DB
layer itself is safe, but renderer-side debounced saves (e.g., the auto-save patterns in
SettingsTab) may not have flushed.

**Fix:** Consider a brief drain / flush signal before exit, or document that restart is
immediate.

### IN-04: `FALLBACK_MODELS[newProvider][0]` indexed without guarding an empty array

**File:** `src/renderer/.../SettingsTab.tsx:108-109, 113`

**Issue:** `setModel(FALLBACK_MODELS[newProvider][0])` assumes the fallback list is
non-empty. It currently always is, but if a provider entry were ever set to `[]`, this
yields `undefined` and silently sets an empty model. Defensive only.

**Fix:** Guard with `FALLBACK_MODELS[newProvider][0] ?? ''`.

---

_Reviewed: 2026-06-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Resolution

**Fixed:** 2026-06-05
**Test count after fixes:** 247 passed (26 test files)
**TypeScript:** clean (`tsconfig.node.json` and `tsconfig.web.json`)
**Build:** succeeds

### Commits

| SHA | Finding(s) | Summary |
|-----|-----------|---------|
| `f3c76ef` | WR-01, WR-02, WR-03 | Sidecar collision check at target; best-effort orphan cleanup at source; rename failure is now ok:true+warning (post-commit soft failure). Type updates to `RelocateResult` and `index.d.ts`. |
| `833ac19` | CR-01, CR-02, WR-04, WR-05, IN-03 | `resetDbCache()` on success (switch-immediately); server-side `targetDir` validation; `lastBackupDir` tracking in `app_settings`; write-probe `finally` cleanup; restart comment. |
| `13f194a` | WR-06 | Tightened cloud heuristic: `OneDrive` exact or `OneDrive - ` prefix; `Google Drive` exact or `Google Drive (` prefix. Tests updated to assert `C:\OneDriveBackups` no longer matches. |
| `d3232ab` | CR-01, WR-07 | Renderer UX: RestartRequiredModal copy reflects switch-immediately; badge copy updated; fake step label removed; `pendingFolder` cleared in all terminal branches of `handleConfirm`. |
| `0b7c642` | IN-02, IN-04 | `bootstrap.ts` isFile guard; `FALLBACK_MODELS[newProvider][0] ?? ''` safety. |

### Intentionally deferred

- **IN-01** (schema DDL duplicated between `tests/helpers/tmpDb.ts` and `src/main/db/index.ts`): not fixed — cross-cutting refactor beyond review scope; risks drift bugs. Existing "keep in sync" comment retained.
