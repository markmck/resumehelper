---
phase: 27-data-layer-tests
plan: 03
subsystem: testing
tags: [vitest, drizzle, sqlite, better-sqlite3, ipc-handlers, unit-tests, three-layer, variant-selection]

requires:
  - phase: 27-data-layer-tests/27-01
    provides: factory helpers, createTestDb, extraction pattern
  - phase: 27-data-layer-tests/27-02
    provides: extraction pattern for complex handlers

provides:
  - Extracted pure functions from templates.ts (12 functions) with full ipcMain wiring
  - Extracted pure functions from submissions.ts (11 functions + SubmissionSnapshot interface)
  - templates.test.ts with 15 tests covering CRUD, variant selection (D-06), job cascade, three-layer integration (D-07)
  - submissions.test.ts with 20 tests covering buildSnapshotForVariant, CRUD, pipeline events, metrics

affects:
  - All consumers of templates:getBuilderData and submissions:create — unchanged IPC behavior, same function signatures

tech-stack:
  added: []
  patterns:
    - "Three-layer integration test: seed job/bullets -> variant excludes layer 2 -> analysis overrides layer 3 -> assert merged output"
    - "Cascade test: setItemExcluded('job') creates rows for job + all its bullets; un-excluding removes all"
    - "buildSnapshotForVariant(db, variantId, analysisId) now accepts db as first param matching extraction pattern"

key-files:
  created:
    - tests/unit/handlers/templates.test.ts
    - tests/unit/handlers/submissions.test.ts
  modified:
    - src/main/handlers/templates.ts
    - src/main/handlers/submissions.ts

key-decisions:
  - "Secondary desc(id) ordering added to getEvents — createdAt timestamps can be equal in fast in-memory tests; id ordering is always deterministic"
  - "SubmissionSnapshot interface exported from submissions.ts — required for test type assertions and external consumers"
  - "getThreshold remains synchronous (returns scalar, uses .get()) — kept consistent with original implementation"

metrics:
  duration: ~67min
  completed: "2026-04-06"
  tasks: 2
  files_modified: 4
---

# Phase 27 Plan 03: Templates and Submissions Handler Tests Summary

**Extracted templates.ts (12 pure functions) and submissions.ts (11 functions + SubmissionSnapshot interface) with 35 tests including three-layer merge integration (D-07) and variant selection cascade (D-06)**

## Performance

- **Duration:** ~67 min
- **Started:** 2026-04-06T15:12:00Z
- **Completed:** 2026-04-06T20:19:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extracted 12 named functions from templates.ts: `listVariants`, `createVariant`, `getVariantOptions`, `setVariantOptions`, `renameVariant`, `deleteVariant`, `duplicateVariant`, `setLayoutTemplate`, `getBuilderData`, `setItemExcluded`, `setThreshold`, `getThreshold`
- Extracted 11 named functions + exported `SubmissionSnapshot` interface from submissions.ts: `buildSnapshotForVariant`, `listSubmissions`, `createSubmission`, `updateSubmission`, `deleteSubmission`, `findByAnalysis`, `updateStatus`, `getEvents`, `addEvent`, `getSubmissionMetrics`, `getAnalysisById`
- All `ipcMain.handle()` calls in `registerTemplateHandlers()` and `registerSubmissionHandlers()` reduced to one-liners
- `buildSnapshotForVariant` updated from private module function to `export async function` accepting `db: Db` as first param
- Added 15 tests in templates.test.ts: variant CRUD (7), variant selection D-06 (3), setItemExcluded cascade D-06 (2), three-layer integration D-07 (1), threshold (2)
- Added 20 tests in submissions.test.ts: buildSnapshotForVariant (8), CRUD (5), pipeline events (3), metrics (2), events ordering (2)
- Full test suite: 57 tests across 7 test files — all passing

## Task Commits

1. **Task 1: Extract and test templates.ts** - `6b24e54` (feat)
2. **Task 2: Extract and test submissions.ts** - `7a4e199` (feat)

## Files Created/Modified

- `src/main/handlers/templates.ts` — 12 exported pure functions + `registerTemplateHandlers()` with one-liner wiring
- `src/main/handlers/submissions.ts` — 11 exported pure functions + `export interface SubmissionSnapshot` + `registerSubmissionHandlers()` with one-liner wiring
- `tests/unit/handlers/templates.test.ts` — 15 tests covering CRUD, D-06 variant selection, D-06 cascade, D-07 three-layer integration, threshold
- `tests/unit/handlers/submissions.test.ts` — 20 tests covering buildSnapshotForVariant (profile freeze, exclusions, overrides, skill additions, showSummary), CRUD, pipeline events, metrics

## Decisions Made

- **Secondary desc(id) ordering in getEvents:** The production code originally ordered events by `createdAt desc` only. When inserting two events within the same test (< 1ms apart), `createdAt` timestamps are equal and ordering is non-deterministic. Added `desc(submissionEvents.id)` as secondary sort — IDs are always monotonically increasing, making order deterministic in both tests and production.
- **SubmissionSnapshot exported as interface:** Changed from private `interface SubmissionSnapshot` to `export interface SubmissionSnapshot` for test type assertions and future external use. No behavior change.
- **getThreshold stays synchronous:** Original implementation used `.get()` (sync better-sqlite3 API). Kept as-is to avoid breaking the IPC handler return type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed non-deterministic getEvents ordering in test environment**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** `getEvents` ordered by `createdAt desc` only. In-memory test DB inserts two events in < 1ms, producing equal timestamps and flipped ordering
- **Fix:** Added `desc(submissionEvents.id)` as secondary sort key in `getEvents` function
- **Files modified:** src/main/handlers/submissions.ts
- **Verification:** 20/20 submissions tests pass consistently

**2. [Rule 1 - Bug] Fixed excluded boolean comparison in cascade test**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Test compared `i.excluded === 1` (integer) but Drizzle schema uses `mode: 'boolean'` so value is `true`
- **Fix:** Changed test assertion to `i.excluded === true`
- **Files modified:** tests/unit/handlers/templates.test.ts
- **Verification:** 15/15 templates tests pass

**3. [Rule 3 - Blocking] Merged main branch into worktree before starting**
- **Found during:** Initial setup
- **Issue:** Worktree `agent-ab2b9d88` was on an old commit predating Phase 27 Wave 1 & 2 changes (no tests/ directory, old handler files)
- **Fix:** Fetched and merged local main into worktree via `git fetch D:/Projects/resumeHelper main:refs/remotes/local/main && git merge local/main`
- **Impact:** All Wave 1 factories/helpers and Wave 2 handler extractions now present

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correct test execution. No scope creep.

## Known Stubs

None — all 57 tests assert against real DB operations. No placeholder data.

## Test Coverage Summary

| File | Tests | Coverage |
|------|-------|----------|
| templates.test.ts | 15 | CRUD, D-06 variant selection, D-06 cascade, D-07 three-layer |
| submissions.test.ts | 20 | buildSnapshotForVariant (8 cases), CRUD (5), events (3), metrics (2) |
| **Phase 27 total** | **57** | **All handler files extracted and tested** |

## Self-Check: PASSED

- src/main/handlers/templates.ts: FOUND
- src/main/handlers/submissions.ts: FOUND
- tests/unit/handlers/templates.test.ts: FOUND
- tests/unit/handlers/submissions.test.ts: FOUND
- commit 6b24e54: FOUND
- commit 7a4e199: FOUND
- 57 tests passing: CONFIRMED

---
*Phase: 27-data-layer-tests*
*Completed: 2026-04-06*
