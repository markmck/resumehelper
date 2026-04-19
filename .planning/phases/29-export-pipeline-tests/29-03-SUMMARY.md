---
phase: 29-export-pipeline-tests
plan: "03"
subsystem: tests
tags: [testing, snapshots, templates, vitest, react]
dependency_graph:
  requires: [29-01]
  provides: [EXPORT-02, EXPORT-03]
  affects: [submissions-snapshot, template-rendering]
tech_stack:
  added: []
  patterns: [vitest, renderToString, jsdom, drizzle-orm, better-sqlite3]
key_files:
  created:
    - tests/unit/main/handlers/submissions.snapshot.test.ts
    - tests/unit/main/handlers/submissions.create.test.ts
    - tests/unit/renderer/components/templates/templates.render.test.tsx
  modified: []
decisions:
  - "Snapshot exclusion marks items with excluded:true rather than filtering them out — filtering happens at render time via filterResumeData; test adjusted to verify flags rather than absence"
  - "Profile interface requires id and summary fields in ResumeTemplateProps factory"
  - "All 5 templates use 'Work Experience' heading; html.toUpperCase().toContain('EXPERIENCE') handles case variation"
metrics:
  duration: "5 min"
  completed_date: "2026-04-19"
  tasks_completed: 3
  files_created: 3
---

# Phase 29 Plan 03: Submission Snapshot Shape Tests and Template Render Tests Summary

**One-liner:** Snapshot shape tests verify all required fields and exclusion flags; template render tests confirm all five templates produce valid HTML with profile/job/bullet content via renderToString.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Submission snapshot direct builder test | 75a390e | tests/unit/main/handlers/submissions.snapshot.test.ts |
| 2 | createSubmission round-trip test | 68f66b9 | tests/unit/main/handlers/submissions.create.test.ts |
| 3 | Template component render tests for all 5 templates | 6685244 | tests/unit/renderer/components/templates/templates.render.test.tsx |

## Verification Results

- `npx vitest run tests/unit/main/handlers/submissions.snapshot.test.ts` — 2/2 passed
- `npx vitest run tests/unit/main/handlers/submissions.create.test.ts` — 1/1 passed
- `npx vitest run tests/unit/renderer/components/templates/templates.render.test.tsx` — 25/25 passed
- `npx vitest run --pool=forks` (full suite) — 143/143 passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan exclusion test assertion did not match actual implementation**
- **Found during:** Task 1 (exclusion filtering test)
- **Issue:** Plan specified `expect(companies).not.toContain('TestCo')` — asserting the excluded job would be absent from the snapshot array. But `buildSnapshotForVariant` does NOT filter out excluded items from the snapshot; it marks them with `excluded: true` and keeps them in the array. Actual filtering happens at render time via `filterResumeData` in the template layer.
- **Fix:** Changed assertion to verify `testCoJob.excluded === true` and `keepCoJob.excluded === false` — testing the actual contract (flag preservation) rather than filtering behavior.
- **Files modified:** tests/unit/main/handlers/submissions.snapshot.test.ts
- **Commit:** 75a390e

### Notes

- The full test suite has a pre-existing race condition when run without `--pool=forks`. The `tests/unit/handlers/jobs.test.ts` file imports from handlers which chain to `src/main/db/index.ts` (real DB); concurrent thread-pool imports cause disk I/O contention. All tests pass with `--pool=forks`. This pre-existed before this plan's changes.

## Known Stubs

None. All three test files contain real assertions against actual behavior.

## Self-Check: PASSED

- tests/unit/main/handlers/submissions.snapshot.test.ts: FOUND
- tests/unit/main/handlers/submissions.create.test.ts: FOUND
- tests/unit/renderer/components/templates/templates.render.test.tsx: FOUND
- Commits 75a390e, 68f66b9, 6685244: FOUND
