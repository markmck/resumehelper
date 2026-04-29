---
phase: 30-merge-helper-reconciliation-docx-showsummary-fix
plan: "03"
subsystem: docx-export
tags: [docx, showSummary, tdd, signature-change]
dependency_graph:
  requires: []
  provides: [buildResumeDocx-showSummary-arg]
  affects: [src/main/handlers/export.ts, tests/unit/integration/mergedSurfaces.test.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, spread-conditional array suppression]
key_files:
  created: []
  modified:
    - src/main/lib/docxBuilder.ts
    - tests/unit/main/lib/docxBuilder.test.ts
decisions:
  - "showSummary is required positional 5th arg (not optional with default) to surface wiring bugs"
  - "Array spread collapses to [] when showSummary=false — both paragraph and spacing suppressed together"
metrics:
  duration: "11 minutes"
  completed: "2026-04-29"
  tasks_completed: 2
  files_modified: 2
---

# Phase 30 Plan 03: Add showSummary to buildResumeDocx Summary

Added `showSummary: boolean` as a required 5th positional arg to `buildResumeDocx` and gated the summary paragraph on `showSummary && profileRow?.summary`, suppressing both paragraph and spacing when false (no double-gap).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing showSummary tests | 2677b79 | tests/unit/main/lib/docxBuilder.test.ts |
| 1 | Add showSummary arg and gate summary | 005839b | src/main/lib/docxBuilder.ts |
| 2 | Update test call sites with 5th arg | 494323f | tests/unit/main/lib/docxBuilder.test.ts |

## Verification Results

- `npm test -- docxBuilder.test`: 18/18 tests pass
- `npm run typecheck`: Only expected transitional failure on `src/main/handlers/export.ts:301` (missing 5th arg — Plan 04 resolves this)
- `grep -c "showSummary && profileRow?.summary" src/main/lib/docxBuilder.ts`: 1
- All 10 `buildResumeDocx(...)` call sites in the test file pass 5 arguments

## Transitional Typecheck Note

`src/main/handlers/export.ts:301` currently calls `buildResumeDocx` with 4 args:
```
error TS2554: Expected 5 arguments, but got 4.
```
This is intentional and expected. Plan 04 will wire `showSummary` from `buildMergedBuilderData` into the export handler, resolving this failure. Plans 03 and 04 must land together for the project to have zero typecheck errors.

## Deviations from Plan

### TDD Approach - Additional Tests Added

The TDD protocol (tdd="true") required writing failing tests before implementing. During the RED phase, 4 new behavior tests were added to `docxBuilder.test.ts`:
- `showSummary=true renders summary text in DOCX XML` (passes after GREEN)
- `showSummary=false suppresses summary text in DOCX XML` (was the RED failing test)
- `showSummary=true with null summary renders no summary paragraph`
- `showSummary=false with null summary — no double-gap (summary spacing absent)`

The plan noted these behaviors belong to Plan 05's parameterized matrix, but the TDD protocol requires failing tests before implementation. These 4 tests are complementary to Plan 05's matrix (which will cover all 5 templates x 2 states x 2 surfaces); they specifically validate the `docxBuilder.ts` implementation directly.

The `'contains job bullet text'` call site was also updated in the RED commit (needed `true` to pass TypeScript since I updated it simultaneously to confirm the RED test was for the right reason).

## Known Stubs

None — the implementation is complete and functional.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The change is a pure internal function signature update. T-30-03-02 (summary text suppression) is positively mitigated — summary text is now gated and not emitted to DOCX when `showSummary=false`.

## Self-Check: PASSED

Files exist:
- src/main/lib/docxBuilder.ts: FOUND
- tests/unit/main/lib/docxBuilder.test.ts: FOUND

Commits exist:
- 2677b79: FOUND (test RED)
- 005839b: FOUND (feat GREEN)
- 494323f: FOUND (feat Task 2)
