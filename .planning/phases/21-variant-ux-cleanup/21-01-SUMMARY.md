---
phase: 21-variant-ux-cleanup
plan: 01
subsystem: ui
tags: [react, typescript, variant-builder, electron]

# Dependency graph
requires:
  - phase: 17-schema-override-ipc-foundation
    provides: setItemExcluded IPC handler with job type support and bullet cascade
provides:
  - Job-level toggle checkbox in VariantBuilder with handleJobToggle calling setItemExcluded('job')
  - updatedAt field on TemplateVariant interface for accurate timestamp display
affects: [22-future-variant-features]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/renderer/src/components/VariantBuilder.tsx
    - src/preload/index.d.ts
    - src/renderer/src/components/NewAnalysisForm.tsx

key-decisions:
  - "handleJobToggle does a full getBuilderData refresh after setItemExcluded (not optimistic update) because job toggle cascades bullets — stale local state would be incorrect"
  - "updatedAt is optional on TemplateVariant because pre-Phase-19 variants may not have it"

patterns-established:
  - "Job-level toggles use full server refresh pattern; bullet-level toggles use optimistic local state update"

requirements-completed: [VARNT-01, VARNT-05]

# Metrics
duration: 1min
completed: 2026-03-27
---

# Phase 21 Plan 01: Variant UX Cleanup — Job Toggle and Timestamp Fix Summary

**Job-level checkbox in VariantBuilder toggles all bullets via setItemExcluded with type 'job'; variant cards now show updatedAt with createdAt fallback**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-27T16:46:17Z
- **Completed:** 2026-03-27T16:47:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `handleJobToggle` function and checkbox on job header row that calls `setItemExcluded(variantId, 'job', jobId, newExcluded)`, cascading bullet excluded state server-side
- Job headers show `opacity: 0.5` when excluded; bullet checkboxes were already `disabled` when job excluded (no change needed)
- Added `updatedAt?: Date` to `TemplateVariant` interface — field is already returned by `templates:list` handler via `...row`
- Variant cards in NewAnalysisForm display `updatedAt || createdAt` as the "Last edited" timestamp

## Task Commits

Each task was committed atomically:

1. **Task 1: Add job-level toggle checkbox to VariantBuilder** - `e47aaab` (feat)
2. **Task 2: Fix variant card timestamps and TemplateVariant interface** - `e0c5353` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/renderer/src/components/VariantBuilder.tsx` - Added `handleJobToggle`, job header checkbox with `cbSmallStyle`, opacity on excluded job header
- `src/preload/index.d.ts` - Added `updatedAt?: Date` to `TemplateVariant` interface
- `src/renderer/src/components/NewAnalysisForm.tsx` - Changed timestamp to use `updatedAt || createdAt`

## Decisions Made
- `handleJobToggle` does a full `getBuilderData` refresh (not optimistic update) because the server cascades excluded state to all child bullets — an optimistic update would need to replicate that cascade logic client-side, adding fragile duplication
- `updatedAt` is optional (`?`) on `TemplateVariant` since the field was added in Phase 19 and older variants may not have it in the DB

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 21-02 (remaining cleanup tasks) can proceed — job toggle and timestamp fix are complete
- The `setItemExcluded` job handler was already implemented in Phase 17 with bullet cascade; this plan just wired the UI

---
*Phase: 21-variant-ux-cleanup*
*Completed: 2026-03-27*
