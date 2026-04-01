---
phase: 22-ats-score-threshold
plan: 03
subsystem: ui
tags: [react, typescript, scoreColor, threshold, warning-banner]

# Dependency graph
requires:
  - phase: 22-01
    provides: shared scoreColor utility (lib/scoreColor.ts) and window.api.templates.getThreshold IPC binding

provides:
  - SubmissionLogForm with informational below-target warning banner when linkedAnalysis.score < threshold
  - AnalysisResults using shared scoreColor utility (no local duplicates)
  - AnalysisList using shared scoreColor utility (no local duplicates)

affects:
  - 22-ats-score-threshold

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared scoreColor utility consumed in all three analysis-adjacent components — no local duplicates"
    - "Threshold loaded via IPC alongside linkedAnalysis in SubmissionLogForm useEffect"

key-files:
  created: []
  modified:
    - src/renderer/src/components/SubmissionLogForm.tsx
    - src/renderer/src/components/AnalysisResults.tsx
    - src/renderer/src/components/AnalysisList.tsx

key-decisions:
  - "Warning banner uses linkedAnalysis.score (DB matchScore), not live computedScore — SubmissionLogForm has no access to OptimizeVariant's live acceptance state"
  - "Warning is informational only — submit button disabled only by missing company/role, not by threshold comparison"
  - "AnalysisList/AnalysisResults pass no threshold arg to getScoreColor/getScoreBg — fixed 80/50 bands per D-10/D-11"

patterns-established:
  - "Import getScoreColor/getScoreBg from lib/scoreColor — never define locally in components"

requirements-completed: [ATS-07]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 22 Plan 03: Below-Target Warning and Score Color Consolidation Summary

**Informational below-target warning banner on SubmissionLogForm and scoreColor utility consolidated from three local copies to a single shared import**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T14:50:00Z
- **Completed:** 2026-04-01T14:58:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- SubmissionLogForm loads variant threshold alongside linkedAnalysis and displays a non-blocking "Below target (score/threshold)" warning banner when score falls short
- AnalysisResults local `getScoreColor`/`getScoreBg` removed, replaced with shared lib import — behavior unchanged (fixed 80/50 bands)
- AnalysisList local `getScoreColor`/`getScoreBgColor` removed, replaced with shared lib import, call site updated from `getScoreBgColor` to `getScoreBg`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add below-target warning to SubmissionLogForm and migrate color imports** - `72b28d6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/renderer/src/components/SubmissionLogForm.tsx` - Added threshold state + IPC load, warning banner JSX, replaced local getScoreColor with shared import
- `src/renderer/src/components/AnalysisResults.tsx` - Removed local getScoreColor/getScoreBg, added shared lib import
- `src/renderer/src/components/AnalysisList.tsx` - Removed local getScoreColor/getScoreBgColor, added shared lib import, updated call site

## Decisions Made

- Warning banner uses `linkedAnalysis.score` (stored DB matchScore), not live computedScore — SubmissionLogForm does not have access to OptimizeVariant's live acceptance state (Pitfall 4 from plan)
- Submit button `disabled` prop references only `isSubmitting`, `company.trim()`, and `role.trim()` — threshold never blocks submission (D-19)
- AnalysisList/AnalysisResults do not pass threshold arg — fixed 80/50 bands per D-10/D-11

## Deviations from Plan

None - plan executed exactly as written.

One adaptation: the worktree branch was behind `main` (Plan 22-01 commits were on main but not on this worktree branch). Merged main into the worktree before proceeding — standard parallel execution housekeeping.

## Issues Encountered

- Worktree branch `worktree-agent-a3689f01` did not yet have Plan 22-01 changes (lib/scoreColor.ts was missing). Resolved by merging main into the worktree before proceeding.

## Self-Check: PASSED

- SubmissionLogForm.tsx: FOUND
- AnalysisResults.tsx: FOUND
- AnalysisList.tsx: FOUND
- Commit 72b28d6: FOUND

## Next Phase Readiness

- Phase 22 complete — all three plans delivered: schema + IPC (22-01), OptimizeVariant threshold UI (22-02), SubmissionLogForm warning + color consolidation (22-03)
- ATS score threshold feature is fully shipped: stored per-variant, surfaced in OptimizeVariant, warned on SubmissionLogForm, and score color logic is DRY across all consumers

---
*Phase: 22-ats-score-threshold*
*Completed: 2026-04-01*
