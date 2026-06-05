---
phase: 34-configurable-sqlite-db-location
plan: "03"
subsystem: ipc-wiring
tags: [ipc, electron, db-location, preload, handlers]
dependency_graph:
  requires: ["34-01", "34-02"]
  provides: ["34-04"]
  affects: ["src/main/handlers/", "src/preload/"]
tech_stack:
  added: []
  patterns:
    - "module-scoped in-flight guard for concurrent IPC rejection"
    - "write-then-delete permission probe (.rh-write-test)"
    - "discriminated union return types from IPC handlers"
key_files:
  created:
    - src/main/handlers/dbLocation.ts
  modified:
    - src/main/handlers/index.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
decisions:
  - "probeError returned as discriminated field (not thrown) so renderer owns UX"
  - "resetDbCache() called on relocate failure so source DB stays usable via re-read of bootstrap (DB-04)"
  - "dbLocation namespace added to existing api object in preload (no contextBridge re-wiring)"
metrics:
  duration: "15m"
  completed: "2026-06-04"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 34 Plan 03: IPC Wiring — dbLocation Handler + Preload Bridge Summary

**One-liner:** 7 `db:*` IPC channels wired with write-probe, in-flight guard, and typed `window.api.dbLocation` preload bridge for Settings UI consumption.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | dbLocation handler module | 686a256 | src/main/handlers/dbLocation.ts (created) |
| 2 | Register handler + preload bridge | 74bff12 | handlers/index.ts, preload/index.ts, preload/index.d.ts |

## What Was Built

### dbLocation.ts (Task 1)

`registerDbLocationHandlers()` registers 7 `ipcMain.handle('db:*')` channels:

- **db:getCurrentPath** — returns `getCurrentDbPath()` from `../db`
- **db:revealInExplorer** — calls `shell.showItemInFolder(getCurrentDbPath())`
- **db:pickFolder** — opens native directory picker; on non-cancel runs the `.rh-write-test` write+unlink permission probe (T-34-08 / DB-02); always attaches `cloudWarning: detectCloudPath(folder)`; returns `{ canceled:false, folder, cloudWarning, writable, probeError? }` — never throws, renderer owns UX
- **db:relocate** — module-scoped `_relocateInFlight` guard rejects concurrent calls (T-34-09); calls `relocateDb({ ..., closeCurrentDb: closeDb })`; on `!result.ok` calls `resetDbCache()` so source DB stays usable (T-34-10 / DB-04)
- **db:listBackups** — `findBackups(dirname(getCurrentDbPath()))`
- **db:deleteOldestBackup** — `deleteMostRecentBackup(dirname(getCurrentDbPath()))`
- **db:restart** — `app.relaunch(); app.exit(0)`

All lifecycle imports come from `'../db'` (not `import { db }`), using the lazy exported functions.

### handlers/index.ts + preload (Task 2)

- `registerDbLocationHandlers()` called inside `registerAllHandlers()`
- `api.dbLocation` namespace added to the preload `api` object with all 7 methods
- `CloudPathResult` type exported from `index.d.ts`
- `Api.dbLocation` typed with the pinned `pickFolder` contract: `{ writable: boolean; probeError?: string }` — Plan 04 can gate on `!writable` without casting

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

All security surface from this plan was pre-analyzed in the plan's threat model:
- T-34-08 (write probe TOCTOU): mitigated — probe runs at pickFolder; pipeline fails-closed on residual fs errors
- T-34-09 (concurrent relocate DoS): mitigated — `_relocateInFlight` guard
- T-34-10 (relocate failure leaves closed handle): mitigated — `resetDbCache()` on `!result.ok`
- T-34-11 (path argument EoP): accepted — targetDir from OS picker; sourcePath from `getCurrentDbPath()`

No new security surface introduced beyond what was planned.

## Self-Check: PASSED

- [x] `src/main/handlers/dbLocation.ts` exists — 102 lines, 7 ipcMain.handle registrations
- [x] `src/main/handlers/index.ts` contains `registerDbLocationHandlers`
- [x] `src/preload/index.ts` contains `dbLocation` namespace with 7 methods
- [x] `src/preload/index.d.ts` contains `dbLocation` in Api interface with `writable` + `probeError?`
- [x] Commit 686a256 exists (Task 1)
- [x] Commit 74bff12 exists (Task 2)
- [x] `npx tsc --noEmit -p tsconfig.node.json` — clean
- [x] `npm test` — 242/242 passed
