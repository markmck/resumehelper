---
phase: 40-margin-controls-live-preview-in-optimize
plan: "02"
subsystem: ui
tags: [react, margins, sliders, live-preview, debounce, ipc]

# Dependency graph
requires:
  - phase: 40-01
    provides: MARGIN_FLOOR constant in marginConstants.ts; effectiveMargins on BuilderData in index.d.ts
  - phase: 39
    provides: analysisLayout IPC bridge (getMargins/setMargins/clearMargins)
provides:
  - Three Top/Bottom/Sides margin sliders in OptimizeVariant collapsible MARGINS section
  - Seed-on-mount from analysisLayout.getMargins with effectiveMargins fallback via getBuilderData
  - Debounced (~300ms) persist of full triple to analysisLayout.setMargins via saveMarginsRef
  - Always-rendered revert-to-variant-margins control (enabled/disabled by hasOverride state)
  - Live preview updates: marginTop/marginBottom/marginSides props wired to VariantPreview
affects: [phase-41-auto-fit, optimize-variant-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Refs track latest margin values for stale-closure-free debounced IPC writes
    - Collapsible section with chevron toggle + collapsed inline summary (mirrors VariantBuilder LAYOUT footer)
    - Always-rendered disabled-state span for revert (opacity + cursor, no conditional render)

key-files:
  created: []
  modified:
    - src/renderer/src/components/OptimizeVariant.tsx

key-decisions:
  - "Tasks 1+2 committed together: Task 1 state-only produces noUnusedLocals TS errors until Task 2 JSX consumes the variables; both tasks modify the same file"
  - "latestMarginTop/Bottom/Sides refs track latest values to avoid stale closure in 300ms debounce callback"
  - "Revert re-fetches getBuilderData AFTER clearMargins to get fresh effectiveMargins, not a cached value"
  - "Unescaped inch-mark quotes fixed with {quote} JSX expressions; pre-existing CRLF warnings in file are out of scope"

patterns-established:
  - "Parallel latestValueRef alongside useState for debounced IPC writes (avoids stale closure without useCallback re-creation)"

requirements-completed: [LAYOUT-01, LAYOUT-05, LAYOUT-08]

# Metrics
duration: 25min
completed: 2026-06-10
---

# Phase 40 Plan 02: Margin Controls + Live Preview in Optimize Summary

**Three-slider MARGINS section wired to analysis-scoped overrides in OptimizeVariant: debounced IPC persist via analysisLayout.setMargins, seeded from getMargins/effectiveMargins on mount, always-rendered revert control, and live VariantPreview props driven by local slider state**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-10T18:00:00Z
- **Completed:** 2026-06-10T18:25:00Z
- **Tasks:** 2 (committed together)
- **Files modified:** 1

## Accomplishments
- Added margin local state (marginTop/marginBottom/marginSides, hasOverride, marginsOpen) with MARGIN_FLOOR defaults
- Seed-on-mount useEffect: getMargins → if non-null use override; else getBuilderData effectiveMargins; silent fallback on IPC error
- saveMarginsRef + latestMarginTop/Bottom/Sides refs for stale-closure-free debounced setMargins full-triple writes
- handleRevert: clearMargins → re-fetch getBuilderData fresh → re-seed sliders → bump previewRefreshKey → clear hasOverride
- Collapsible MARGINS section with chevron, collapsed inline summary, three range sliders (min=MARGIN_FLOOR, max=1.2, step=0.05, onInput, accentColor #8b5cf6, amber readout when < 0.5)
- Always-rendered revert span with dynamic cursor/opacity/underline on hasOverride
- VariantPreview now receives marginTop/marginBottom/marginSides for instant live preview updates

## Task Commits

Tasks 1 and 2 combined in single commit (Task 1 state-only fails noUnusedLocals until JSX renders the variables):

1. **Tasks 1+2: Margin state/handlers + MARGINS JSX + VariantPreview prop wiring** - `04a3aaa` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `src/renderer/src/components/OptimizeVariant.tsx` - Added margin state, seed effect, debounce handler, revert handler, MARGINS collapsible section JSX, VariantPreview margin props

## Decisions Made
- Tasks 1 and 2 committed together because Task 1 (state-only) produces TypeScript `noUnusedLocals` errors until Task 2 JSX consumes the variables. Both tasks modify the same single file.
- Used `latestMarginTop/Bottom/Sides` refs alongside the state setters to provide stale-closure-free reads inside the 300ms debounce callback, matching the existing `saveThresholdRef` pattern.
- Revert always re-fetches `getBuilderData(variantId, analysisId)` after `clearMargins` rather than caching the effective triple at mount — ensures the re-seed reflects variant margins if they changed since load.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Escaped unescaped inch-mark `"` in JSX text nodes**
- **Found during:** Task 2 (lint pass)
- **Issue:** Literal `"` characters in JSX text (readout spans and collapsed summary) triggered `react/no-unescaped-entities` lint errors
- **Fix:** Replaced `{value.toFixed(2)}"` with `{value.toFixed(2)}{'"'}` in all six locations
- **Files modified:** `src/renderer/src/components/OptimizeVariant.tsx`
- **Verification:** lint passes with 0 errors (only pre-existing CRLF warnings remain, which are file-wide pre-existing issues out of scope per deviation rule SCOPE BOUNDARY)
- **Committed in:** 04a3aaa

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing correctness)
**Impact on plan:** Necessary fix to meet the plan's lint-clean acceptance criterion. No scope creep.

## Issues Encountered
- `noUnusedLocals` TypeScript strict mode means Task 1 (state declarations) cannot typecheck independently without Task 2 JSX consuming the variables. Consolidated into one commit with a clear note in the commit message.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LAYOUT-01, LAYOUT-05, LAYOUT-08 requirements fully satisfied: sliders adjust margins, live preview updates instantly on drag, revert control is always rendered and functional
- Phase 41 auto-fit can import `MARGIN_FLOOR` from `marginConstants.ts` (already done in Plan 01) and drive the same `analysisLayout.setMargins` path the sliders use
- Manual verification recommended: seed sliders from stored override, drag to confirm live preview updates, observe debounced persist, revert to variant margins and confirm preview/page-count reloads

---
*Phase: 40-margin-controls-live-preview-in-optimize*
*Completed: 2026-06-10*
