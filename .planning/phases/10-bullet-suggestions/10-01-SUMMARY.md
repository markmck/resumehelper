---
phase: 10-bullet-suggestions
plan: 01
subsystem: analysis-ui
tags: [optimize-variant, suggestion-cards, score-ring, save-flow, ipc]
dependency_graph:
  requires: [09-analysis-core]
  provides: [OptimizeVariant component, jobPostings:updateAnalysisStatus IPC]
  affects: [AnalysisTab routing, AnalysisResults Optimize button]
tech_stack:
  added: []
  patterns: [inline-style-with-css-tokens, useMemo-local-score, suggestion-state-machine, svg-score-ring]
key_files:
  created:
    - src/renderer/src/components/OptimizeVariant.tsx
  modified:
    - src/main/handlers/jobPostings.ts
    - src/preload/index.ts
decisions:
  - "No DB writes on accept/dismiss — all writes batched through existing IPC handlers on Save"
  - "SVG score ring uses inline transition style on stroke-dashoffset, no className needed"
  - "Bullet ID resolved via bulletIdMap (original_text -> id) built from getBuilderData at mount time"
  - "Save as new variant: bullets updated globally (job_bullets), skills linked to duplicate variant"
metrics:
  duration: "4 minutes"
  completed: "2026-03-24"
  tasks_completed: 2
  files_modified: 3
---

# Phase 10 Plan 01: Optimize Variant UI — Summary

**One-liner:** Full interactive OptimizeVariant screen with SVG score ring, per-bullet suggestion state machine (accept/edit/dismiss/undo), skill staging, and batched save flow via existing IPC handlers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add jobPostings:updateAnalysisStatus IPC handler and preload bridge | 400b5e4 | src/main/handlers/jobPostings.ts, src/preload/index.ts |
| 2 | Create OptimizeVariant.tsx with full two-pane layout, state machine, and save flow | 6023e36 | src/renderer/src/components/OptimizeVariant.tsx |

## What Was Built

### Task 1: IPC Handler + Preload Bridge

- Added `ipcMain.handle('jobPostings:updateAnalysisStatus')` to `registerJobPostingHandlers()` in `src/main/handlers/jobPostings.ts`
- Exposed `updateAnalysisStatus: (analysisId, status)` in the `jobPostings` namespace of `src/preload/index.ts`

### Task 2: OptimizeVariant.tsx (1581 lines)

**Component features:**
- Two-pane layout: suggestion cards (left, scrollable), live score panel (right, sticky)
- **Suggestion state machine:** `pending → accepted | dismissed`, with undo reverting to pending. `Accept all` sets all pending to accepted.
- **Edit first:** inline textarea replaces suggested text block; Accept/Confirm writes the edited text
- **Skill suggestions:** gap skills not in variant — add/skip/undo per row, severity badges
- **SVG score ring:** `stroke-dashoffset` driven, CSS `transition: stroke-dashoffset 0.6s ease`, stroke color by score threshold. Score number centered in ring.
- **Local score computation (useMemo):** replicates `deriveOverallScore` formula (keyword×0.35 + skills×0.35 + experience×0.20 + ats×0.10). Resolved keyword count added to keywordHits. Skills score boosted +5 per added skill. All subscores clamped 0–100.
- **Score delta badge:** appears after first accepted change — "+N points from accepted changes"
- **Missing keyword pills:** flip from red to green+strikethrough when targeted keyword is accepted
- **Gap dots:** flip from red/amber to green when skill is staged as added
- **Confirmation dialog:** inline overlay, warns about global bullet text changes. "Save as new variant" appends copy notice.
- **Save flow (sequential):**
  1. Duplicate variant (if save-as-new) via `templates.duplicate`
  2. `bullets.update` for each accepted suggestion (lookup via bulletIdMap built at mount)
  3. `skills.create` + `templates.setItemExcluded` for each added skill
  4. `jobPostings.updateAnalysisStatus(analysisId, 'optimized')`
- **Log submission button:** calls `onBack()` with TODO comment for Phase 11 navigation

## Verification

- `npx tsc --noEmit` passes with 0 errors
- `grep "className" OptimizeVariant.tsx` returns 0 (zero Tailwind classes)
- All key IPC links confirmed: `window.api.jobPostings.updateAnalysisStatus`, `window.api.bullets.update`, `window.api.templates.getBuilderData`
- `jobPostings:updateAnalysisStatus` registered in main process and exposed in preload

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/renderer/src/components/OptimizeVariant.tsx` exists (1581 lines)
- [x] `src/main/handlers/jobPostings.ts` contains `jobPostings:updateAnalysisStatus`
- [x] `src/preload/index.ts` contains `updateAnalysisStatus`
- [x] Commit 400b5e4 exists (Task 1)
- [x] Commit 6023e36 exists (Task 2)

## Self-Check: PASSED
