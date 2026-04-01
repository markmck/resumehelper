---
phase: 22-ats-score-threshold
plan: 01
subsystem: backend/data-layer
tags: [schema, ipc, preload, utility, sqlite, drizzle]
dependency_graph:
  requires: []
  provides: [score_threshold column, templates:setThreshold IPC, templates:getThreshold IPC, scoreColor utility]
  affects: [templateVariants table, preload API, renderer score color rendering]
tech_stack:
  added: [src/renderer/src/lib/scoreColor.ts]
  patterns: [ALTER TABLE migration pattern, Drizzle .get() for synchronous query, threshold-aware color bands]
key_files:
  created:
    - src/renderer/src/lib/scoreColor.ts
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - src/main/handlers/templates.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
decisions:
  - scoreThreshold optional on TemplateVariant interface (pre-existing variants may not have it returned from list until DB migrates)
  - lib/ directory created fresh — no prior lib directory existed in renderer/src
metrics:
  duration: ~2 min
  completed: 2026-04-01
  tasks_completed: 2
  files_modified: 5
  files_created: 1
---

# Phase 22 Plan 01: ATS Score Threshold Foundation Summary

**One-liner:** score_threshold integer column (default 80) on templateVariants with full IPC round-trip (set/get) and threshold-aware scoreColor utility extracted to shared lib.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add score_threshold column to schema and migration | 8004dc8 |
| 2 | Add IPC handlers, preload bindings, type declarations, scoreColor utility | 550f06b |

## What Was Built

**Task 1 — Schema and Migration:**
- Added `scoreThreshold: integer('score_threshold').notNull().default(80)` to the `templateVariants` Drizzle schema definition
- Updated the `CREATE TABLE IF NOT EXISTS template_variants` block in `index.ts` to include `score_threshold integer NOT NULL DEFAULT 80` for fresh installs
- Appended `ALTER TABLE template_variants ADD COLUMN score_threshold integer NOT NULL DEFAULT 80` to the `alterStatements` array for existing install upgrades (try/catch pattern handles duplicate column errors)

**Task 2 — IPC, Preload, Types, Utility:**
- Added `templates:setThreshold` handler: updates `scoreThreshold` via Drizzle update
- Added `templates:getThreshold` handler: returns `row?.scoreThreshold ?? 80` using synchronous `.get()` pattern (consistent with existing better-sqlite3 sync handlers)
- Added `setThreshold` and `getThreshold` to `preload/index.ts` templates object
- Added `scoreThreshold?: number` to `TemplateVariant` interface in `index.d.ts`
- Added `setThreshold` and `getThreshold` method signatures to `Api.templates` type in `index.d.ts`
- Created `src/renderer/src/lib/scoreColor.ts` with `getScoreColor` and `getScoreBg` exports, both supporting optional `threshold` parameter with two branches:
  - Threshold-aware: green >= threshold, yellow >= threshold-15, red below
  - Fixed-band (no threshold): green >= 80, yellow >= 50, red below

## Deviations from Plan

**1. [Rule 3 - Blocking] Created lib/ directory**
- **Found during:** Task 2
- **Issue:** `src/renderer/src/lib/` directory did not exist; plan referenced creating `scoreColor.ts` there
- **Fix:** Created directory before writing the file
- **Files modified:** (directory creation only)

**2. [Rule 2 - Observation] No setOptions handler in templates.ts**
- **Found during:** Task 2 read
- **Issue:** Plan referenced inserting after `templates:setOptions` handler, but that handler doesn't exist in the current codebase version
- **Fix:** Added new handlers at end of `registerTemplateHandlers()` function body instead — functionally equivalent, registration order doesn't matter for IPC handlers
- **Files modified:** src/main/handlers/templates.ts

## Known Stubs

None — all functionality is fully wired.

## Self-Check: PASSED

- [x] src/main/db/schema.ts contains scoreThreshold
- [x] src/main/db/index.ts contains score_threshold (x2: CREATE TABLE + ALTER TABLE)
- [x] src/main/handlers/templates.ts contains templates:setThreshold and templates:getThreshold
- [x] src/preload/index.ts contains setThreshold (x2: setThreshold + getThreshold)
- [x] src/preload/index.d.ts contains scoreThreshold
- [x] src/renderer/src/lib/scoreColor.ts exists with getScoreColor and getScoreBg exports
- [x] TypeScript (npx tsc --noEmit) passes with no errors
- [x] Commits 8004dc8 and 550f06b exist
