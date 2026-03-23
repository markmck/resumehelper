---
phase: 09-analysis-core
plan: 02
subsystem: ui
tags: [react, electron, inline-styles, design-tokens]

# Dependency graph
requires:
  - phase: 08-foundation
    provides: design system tokens (CSS custom properties), inline styles pattern
provides:
  - AnalysisTab.tsx — 4-screen useState router (list/new/analyzing/results)
  - AnalysisList.tsx — Screen 1 with metric cards, search/sort, analysis table, empty state
  - NewAnalysisForm.tsx — Screen 2 with textarea, variant selection, run/draft actions
affects: [09-03-analyzing-progress, 09-04-results-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useState screen router — AnalysisTab manages navigation between 4 screens via AnalysisScreen discriminated union type"
    - "Client-side filter+sort — search and sort applied as derived state from fetched rows array"
    - "Inline hover via onMouseEnter/onMouseLeave — consistent with SubmissionsTab pattern"

key-files:
  created:
    - src/renderer/src/components/AnalysisList.tsx
    - src/renderer/src/components/NewAnalysisForm.tsx
  modified:
    - src/renderer/src/components/AnalysisTab.tsx

key-decisions:
  - "AnalysisList defensively handles API stub responses — wraps list() result in Array.isArray check since jobPostings:list still returns NOT_CONFIGURED stub in Phase 9 Plan 01"
  - "Row click navigates to results via analysisId (analysis_results.id), not posting id — avoids collision"
  - "Re-analyze action passes jobPostingId + variantId to AnalysisTab which transitions to analyzing screen — AnalyzingProgress component (Plan 03) owns the actual ai:analyze call"

patterns-established:
  - "AnalysisScreen discriminated union: { name: 'list' } | { name: 'new' } | { name: 'analyzing'; jobPostingId, variantId } | { name: 'results'; analysisId }"
  - "Score color function: >=80 = success (green), >=50 = warning (amber), <50 = danger (red)"

requirements-completed: [ANLYS-01, ANLYS-05]

# Metrics
duration: 15min
completed: 2026-03-23
---

# Phase 9 Plan 02: Analysis UI Components Summary

**3-component analysis UI: AnalysisTab screen router, AnalysisList with metric cards and sortable table, NewAnalysisForm with textarea, variant radio cards, and run/draft actions — all inline styles with design tokens**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-23T22:30:00Z
- **Completed:** 2026-03-23T22:45:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- AnalysisTab rewired from static empty state into a 4-screen router using AnalysisScreen discriminated union
- AnalysisList renders 3 metric cards (analyses run, avg score, optimized count), client-side search/sort, analysis table with score mini-bars, status badges (unreviewed/reviewed/optimized/submitted), and context-aware action buttons (View, Re-analyze, Optimize+Submit disabled with tooltips)
- NewAnalysisForm delivers tabbed job posting input (Paste active, URL disabled with "Coming soon"), variant selection as radio-style cards loaded from templates:list, company/role override fields, Run Analysis (disabled until text+variant selected) and Save as Draft buttons

## Task Commits

1. **Task 1: Create AnalysisTab router, AnalysisList, and NewAnalysisForm** - `510bb8d` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/renderer/src/components/AnalysisTab.tsx` - Rewritten as 4-screen router; 'analyzing' and 'results' are placeholders for Plans 03/04
- `src/renderer/src/components/AnalysisList.tsx` - Screen 1: metric cards, search/sort, analysis table with all specified columns, empty state
- `src/renderer/src/components/NewAnalysisForm.tsx` - Screen 2: textarea with char count, variant cards, company/role fields, run/draft buttons

## Decisions Made
- AnalysisList wraps the `jobPostings.list()` call in `Array.isArray` check — the handler is still a stub returning `{ error, code: 'NOT_CONFIGURED' }` which is not an array, so the component gracefully shows empty state instead of crashing
- Row click uses `analysisId` (analysis_results.id) not `id` (job_posting id) for onViewResult — per plan spec to avoid collision
- Re-analyze does not call `window.api.ai.analyze` directly — it calls `onReanalyze(jobPostingId, variantId)` which transitions to the 'analyzing' screen; Plan 03's AnalyzingProgress component will initiate the actual LLM call

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None — TypeScript compiled cleanly on first attempt.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan 03: AnalyzingProgress component — receives `{ name: 'analyzing', jobPostingId, variantId }` state, calls `window.api.ai.analyze`, subscribes to `ai:progress` events, renders step stepper
- Plan 04: AnalysisResults component — receives `{ name: 'results', analysisId }`, calls `window.api.jobPostings.getAnalysis(analysisId)`, renders metrics and keyword cards
- Both plans can slot directly into the AnalysisTab router placeholders without modifying AnalysisTab.tsx

---
*Phase: 09-analysis-core*
*Completed: 2026-03-23*
