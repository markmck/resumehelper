---
phase: 40-margin-controls-live-preview-in-optimize
plan: 01
subsystem: ui
tags: [typescript, react, electron, types, constants]

# Dependency graph
requires:
  - phase: 39-analysis-margin-override-data-layer
    provides: effectiveMargins on MergedBuilderData; analysisLayout IPC bridge in preload

provides:
  - MARGIN_FLOOR = 0.4 constant in src/renderer/src/lib/marginConstants.ts
  - effectiveMargins optional field on BuilderData in src/preload/index.d.ts

affects:
  - 40-02 (OptimizeVariant margin sliders — imports MARGIN_FLOOR, reads effectiveMargins to seed)
  - 41 (auto-fit clamp imports MARGIN_FLOOR as lower bound)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin single-concern export module with JSDoc (see marginConstants.ts — mirrors scoreColor.ts)"
    - "Optional field extension on renderer BuilderData type — value already travels over IPC, only type surfaced"

key-files:
  created:
    - src/renderer/src/lib/marginConstants.ts
  modified:
    - src/preload/index.d.ts

key-decisions:
  - "MARGIN_FLOOR = 0.4 placed in a dedicated lib module so Phase 40 slider min and Phase 41 auto-fit clamp share the same constant (D-03)"
  - "effectiveMargins exposed as optional on BuilderData — value already serialised over IPC by templates:getBuilderData returning full MergedBuilderData; type-only change, zero runtime impact (D-07)"

patterns-established:
  - "Shared floor constant in src/renderer/src/lib/ for cross-plan numeric constraints"

requirements-completed: [LAYOUT-01]

# Metrics
duration: 10min
completed: 2026-06-10
---

# Phase 40 Plan 01: Foundation Seams Summary

**Shared MARGIN_FLOOR = 0.4 constant and effectiveMargins type extension on BuilderData — two prerequisite seams for Plan 02 margin slider wiring**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-10T17:35:00Z
- **Completed:** 2026-06-10T17:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/renderer/src/lib/marginConstants.ts` exporting `MARGIN_FLOOR = 0.4` with JSDoc naming both Phase 40 (slider min) and Phase 41 (auto-fit clamp) as consumers
- Added `effectiveMargins?: { top: number; bottom: number; sides: number }` to the `BuilderData` interface in `src/preload/index.d.ts` so sliders can seed from the pre-resolved triple without re-implementing precedence
- `npm run typecheck` passes with no new errors — type-only change, zero runtime impact

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared MARGIN_FLOOR constant module** - `b4cff32` (feat)
2. **Task 2: Expose effectiveMargins on the renderer-facing BuilderData type** - `e4c56b2` (feat)

## Files Created/Modified
- `src/renderer/src/lib/marginConstants.ts` - New thin constant module; exports `MARGIN_FLOOR = 0.4`
- `src/preload/index.d.ts` - One-line addition of optional `effectiveMargins` field on `BuilderData` interface

## Decisions Made
- `effectiveMargins` made optional (`?`) so all existing `BuilderData` callsites (VariantPreview.tsx, etc.) compile without change
- No changes to main-process or IPC handler code — value already serialised over the wire; only the renderer type was missing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (OptimizeVariant margin sliders) can now `import { MARGIN_FLOOR } from '../lib/marginConstants'` for slider `min` and read `builderData.effectiveMargins` type-safely to seed initial state
- Phase 41 (auto-fit) can import `MARGIN_FLOOR` as the clamp lower bound

---
*Phase: 40-margin-controls-live-preview-in-optimize*
*Completed: 2026-06-10*
