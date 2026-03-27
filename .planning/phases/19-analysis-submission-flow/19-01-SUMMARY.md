---
phase: 19-analysis-submission-flow
plan: 01
subsystem: database
tags: [sqlite, drizzle-orm, ipc, electron, better-sqlite3, schema-migration]

# Dependency graph
requires:
  - phase: 17-schema-override-ipc-foundation
    provides: analysis_bullet_overrides table, ai:getOverrides IPC channel, BulletOverride type
  - phase: 18-three-layer-model-wiring
    provides: three-layer data model wiring, templates:setItemExcluded handler
provides:
  - updated_at columns on job_bullets and template_variants (schema + ALTER TABLE migration)
  - jobPostings:update IPC handler for company/role edits
  - isStale boolean on getAnalysis return — on-demand timestamp comparison via raw SQL
  - isOrphaned boolean per override in ai:getOverrides — LEFT JOIN on job_bullets
  - BulletOverride.isOrphaned type in shared/overrides.ts and preload/index.d.ts
  - jobPostings.update method in preload bridge and Api type declaration
affects: [19-02-renderer-ui, phase-20-future-analysis-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Staleness detection via on-demand raw SQL epoch comparison (no stored column)"
    - "Orphaned record detection via LEFT JOIN returning IS NULL CASE"
    - "updated_at stamping via Drizzle .set({ updatedAt: new Date() }) in update handlers"

key-files:
  created: []
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - src/main/handlers/bullets.ts
    - src/main/handlers/templates.ts
    - src/main/handlers/jobPostings.ts
    - src/main/handlers/ai.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/shared/overrides.ts

key-decisions:
  - "Staleness computed on-demand in getAnalysis via analysisEpoch integer comparison — no stored isStale column (D-07, D-08)"
  - "Orphaned override detection uses LEFT JOIN on job_bullets; isOrphaned returned as boolean (not 0|1) via map"
  - "updatedAt stamped only in setItemExcluded (not skill acceptance handlers) per D-07 Pitfall 5"
  - "analysisCreatedAt converted to unix epoch via getTime()/1000 before raw SQL comparison"

patterns-established:
  - "Import sqlite raw connection alongside db for prepared statement queries: import { db, sqlite } from '../db'"
  - "Raw SQL LEFT JOIN for orphan detection when Drizzle lacks leftJoin convenience for conditional mapping"

requirements-completed: [ANLYS-03, ANLYS-04, ANLYS-05]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 19 Plan 01: Analysis Submission Flow — Backend IPC Layer Summary

**updated_at schema columns, jobPostings:update IPC handler, isStale staleness detection in getAnalysis, and isOrphaned orphan detection in getOverrides — complete backend plumbing for Phase 19 UI**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-27T12:51:00Z
- **Completed:** 2026-03-27T12:59:06Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added `updated_at` column to `job_bullets` and `template_variants` in Drizzle schema and via ALTER TABLE migration statements
- Wired `updatedAt: new Date()` stamping into `bullets:update` and `templates:setItemExcluded` handlers
- Added `jobPostings:update` IPC handler persisting company/role changes with error handling
- Implemented `isStale` computation in `getAnalysis` using raw sqlite prepared statements comparing analysisEpoch against bullet and variant `updated_at` columns
- Replaced Drizzle-based `ai:getOverrides` with raw SQL LEFT JOIN version returning `isOrphaned` boolean per override
- Updated `BulletOverride` interface in both `shared/overrides.ts` and `preload/index.d.ts` with `isOrphaned?: boolean`
- Added `update` method to `jobPostings` in preload bridge (`index.ts`) and type declaration (`index.d.ts`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema columns, Drizzle fields, and updated_at stamping** - `9792d9c` (feat)
2. **Task 2: IPC handlers, staleness, orphaned detection, types** - `e1d4808` (feat)

## Files Created/Modified

- `src/main/db/schema.ts` - Added updatedAt field to jobBullets and templateVariants table definitions
- `src/main/db/index.ts` - Added two ALTER TABLE migration statements for updated_at columns
- `src/main/handlers/bullets.ts` - Updated bullets:update to stamp updatedAt: new Date()
- `src/main/handlers/templates.ts` - Stamps variant updatedAt at end of setItemExcluded
- `src/main/handlers/jobPostings.ts` - Added jobPostings:update handler, isStale computation in getAnalysis, sqlite import
- `src/main/handlers/ai.ts` - Replaced ai:getOverrides with LEFT JOIN raw SQL version returning isOrphaned, sqlite import
- `src/preload/index.ts` - Added jobPostings.update method to preload bridge
- `src/preload/index.d.ts` - Added BulletOverride.isOrphaned and jobPostings.update to Api type
- `src/shared/overrides.ts` - Added isOrphaned?: boolean to BulletOverride interface

## Decisions Made

- Staleness detection uses on-demand epoch comparison in `getAnalysis` rather than a stored column, per plan decisions D-07/D-08. `analysisCreatedAt` is converted to unix epoch via `Math.floor(new Date(...).getTime() / 1000)` before raw SQL comparison since the DB stores integer seconds.
- `updated_at` is stamped only in `setItemExcluded`, not in skill acceptance handlers — per plan Pitfall 5, skill acceptance does not invalidate variant content for staleness purposes.
- `isOrphaned` detection uses raw SQL LEFT JOIN rather than Drizzle ORM to avoid type gymnastics with conditional CASE expressions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- All IPC handlers ready for Plan 02 renderer UI consumption
- `jobPostings:update` callable from renderer for company/role edit forms
- `getAnalysis` returns `isStale: boolean` for badge/warning display in UI
- `getOverrides` returns `isOrphaned: boolean` per override for orphaned-badge display
- TypeScript compiles cleanly with no errors

---
*Phase: 19-analysis-submission-flow*
*Completed: 2026-03-27*
