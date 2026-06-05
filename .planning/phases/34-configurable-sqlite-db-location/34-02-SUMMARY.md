---
phase: 34-configurable-sqlite-db-location
plan: 02
subsystem: database
tags: [better-sqlite3, drizzle-orm, lazy-singleton, proxy-pattern, electron]

# Dependency graph
requires:
  - phase: 34-01
    provides: resolveDbPath() from src/main/db/bootstrap.ts — bootstrap JSON resolution with fallback chain
provides:
  - Lazy DB factory (getDb/getSqlite/getCurrentDbPath/closeDb/resetDbCache) in src/main/db/index.ts
  - Proxy-backed db/sqlite exports preserving import surface for all 20 handler files
  - closeDb(): WAL TRUNCATE checkpoint + handle close for relocate flow
  - resetDbCache(): closeDb + clears resolved path so next access re-bootstraps
affects: [34-03, any handler that imports from src/main/db/index.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy singleton via module-scoped _sqlite/_db/_resolvedPath nullables; initialized on first getSqlite() call"
    - "Proxy re-export shim: new Proxy({} as T, { get: (_, prop) => Reflect.get(getX(), prop, getX()) }) cast as T"
    - "ensureSchema() parameterized to accept explicit sqlite arg rather than closing over module-level var"

key-files:
  created: []
  modified:
    - src/main/db/index.ts

key-decisions:
  - "Proxy type exported as explicit Database.Database / ReturnType<typeof getDb> to avoid TS4023 (unnamed external module type error)"
  - "No top-level new Database() — entire open deferred to getSqlite() first call, guaranteeing bootstrap JSON is readable before DB opens"
  - "ensureSchema calls getDb() for migrate() (lazy-safe) rather than capturing db from outer scope"

patterns-established:
  - "Lazy DB singleton: module-level nullables + factory functions; Proxy shim for backwards-compat exports"

requirements-completed: [DB-07, DB-10]

# Metrics
duration: 15min
completed: 2026-06-04
---

# Phase 34 Plan 02: Lazy DB Factory + Proxy Re-export Shim Summary

**db/index.ts refactored from eager top-level `new Database()` to lazy bootstrap-resolved singleton with Proxy-backed db/sqlite exports, enabling DB relocation without touching any of the 20 handler call-sites**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-04T20:45:00Z
- **Completed:** 2026-06-04T20:59:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced top-level `const sqlite = new Database(dbPath)` with lazy `_sqlite`/`_db`/`_resolvedPath` module state initialized to null
- `getSqlite()` calls `resolveDbPath()` from `./bootstrap` (Plan 01) on first access, then opens DB with WAL pragma and runs ensureSchema
- `closeDb()` issues `PRAGMA wal_checkpoint(TRUNCATE)` then closes — satisfies D-11 (clean WAL before relocate)
- `resetDbCache()` = `closeDb()` + null `_resolvedPath` so next access re-reads bootstrap JSON
- Proxy-backed `db` and `sqlite` named exports re-resolve on every property access; all 20 handler files compile unchanged
- Full test suite: 242/242 passing (up from 192+ baseline)

## Task Commits

1. **Task 1: Lazy factory + Proxy re-export shim** - `768388f` (refactor)
2. **Task 2: Full-suite regression gate** - verified via `npm test` (242 tests pass, no new commit required — Task 2 was verification-only)

## Files Created/Modified

- `src/main/db/index.ts` - Lazy factory with getSqlite/getDb/getCurrentDbPath/closeDb/resetDbCache + Proxy re-exports for db/sqlite

## Decisions Made

- Used explicit type annotation (`export const sqlite: Database.Database = new Proxy(...)`) to resolve TS4023 "cannot be named" error from Proxy inference — avoids type erasure while satisfying the TypeScript compiler
- `ensureSchema()` calls `getDb()` for the `migrate()` call rather than the outer-scope `db` Proxy, ensuring migrate receives a live handle even when called during `getSqlite()` initialization
- No call-site migration: Proxy `get` trap re-resolves `getSqlite()`/`getDb()` on every property access — stale handle after `closeDb()` is impossible for handlers (T-34-06 mitigated)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS4023 type export error for Proxy-typed sqlite export**
- **Found during:** Task 1 (TypeScript verification step)
- **Issue:** `export const sqlite = new Proxy(...)` inferred as `BetterSqlite3.Database` from external module that "cannot be named" — TS4023 emitted
- **Fix:** Added explicit type annotation `export const sqlite: Database.Database = new Proxy({} as any, ...) as Database.Database` (same for db)
- **Files modified:** src/main/db/index.ts
- **Verification:** `npx tsc --noEmit -p tsconfig.node.json` exits 0
- **Committed in:** 768388f (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type annotation fix)
**Impact on plan:** Necessary for compilation; no behavior change. Type safety preserved.

## Issues Encountered

None beyond the TS4023 Proxy type annotation issue (auto-fixed above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/main/db/index.ts` now exports the full lifecycle API Plan 03 needs: `closeDb`, `resetDbCache`, `getCurrentDbPath`
- All 20 handler files continue working through Proxy-backed `db`/`sqlite` — no migration needed
- Plan 03 (dbLocation IPC handler) can import these directly and implement the relocate flow

---
*Phase: 34-configurable-sqlite-db-location*
*Completed: 2026-06-04*
