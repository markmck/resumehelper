---
phase: 11-submission-pipeline
plan: "02"
subsystem: renderer/submissions
tags: [submissions, pipeline, ui, ipc]
dependency_graph:
  requires: [11-01]
  provides: [SubmissionsTab-router, SubmissionListView, SubmissionPipelineDots, SubmissionLogForm, cross-tab-navigation]
  affects: [App.tsx, AnalysisTab, AnalysisResults]
tech_stack:
  added: []
  patterns: [sub-screen-router, useMemo-filter, sticky-preview-card, cross-tab-state]
key_files:
  created:
    - src/renderer/src/components/SubmissionPipelineDots.tsx
    - src/renderer/src/components/SubmissionListView.tsx
    - src/renderer/src/components/SubmissionLogForm.tsx
  modified:
    - src/renderer/src/components/SubmissionsTab.tsx
    - src/renderer/src/components/AnalysisResults.tsx
    - src/renderer/src/components/AnalysisTab.tsx
    - src/renderer/src/App.tsx
    - src/main/handlers/submissions.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
decisions:
  - submissions:getAnalysisById IPC added to submissions handler (not jobPostings) — joins analysisResults + jobPostings + templateVariants to return pre-fill data for log form
  - pendingLogAnalysis state in App.tsx bridges AnalysisTab -> SubmissionsTab with analysisId; consumed once via onLogAnalysisConsumed callback
  - SubmissionLogForm uses existing window.api.templates.list() for variant dropdown — no new IPC needed
metrics:
  duration: 4min
  tasks_completed: 2
  files_modified: 11
  completed_date: "2026-03-24"
---

# Phase 11 Plan 02: Submissions List View + Log Form Summary

**One-liner:** Metric cards + filter/search table with mini pipeline dots, two-path log form (analysis-linked and scratch), and cross-tab bridge from AnalysisResults to SubmissionsTab.

## What Was Built

### Task 1: SubmissionsTab router + SubmissionPipelineDots + SubmissionListView

**SubmissionPipelineDots** — reusable 5-dot component showing pipeline stage visually:
- Green dots = completed stages
- Blue dot = current Applied stage (index 0)
- Amber dot = current non-Applied stage
- Hollow dots = future stages
- Withdrawn: red dot at position 0, rest transparent; Result: all 5 green

**SubmissionListView** — full list screen with:
- 4 metric cards (Total Applied, Active, Response Rate, Avg Score) computed from `submissions.metrics()` IPC
- Filter pills: All / Applied / In Progress / Offer / Closed (client-side via `useMemo`)
- Search input filtering by company name (case-insensitive)
- Table with merged Company/Role column, variant tag, color-coded score, pipeline mini-dots, applied date
- Clickable rows navigating to detail screen
- Empty states for no submissions and no filter results

**SubmissionsTab** — rewritten as sub-screen router (list / detail / log) mirroring AnalysisTab:
- Listens for `app:navigate-back` CustomEvent for back navigation
- Accepts `initialLogAnalysisId` and `onLogAnalysisConsumed` props for cross-tab wiring
- Detail screen is a placeholder (Plan 03 implements SubmissionDetailView)

**Backend additions:**
- `submissions:getAnalysisById` IPC handler in `submissions.ts` — joins `analysisResults`, `jobPostings`, and `templateVariants` to return `{ id, company, role, score, variantId, variantName, createdAt }` for log form pre-fill
- Preload bridge and TypeScript type declaration added

### Task 2: SubmissionLogForm + cross-tab navigation

**SubmissionLogForm** — full-page form with two-column layout:
- Left column: back link, h1, optional linked analysis card, form fields (company, role, date, variant dropdown, URL, notes, status pills), submit button
- Right column: sticky preview card showing live values (company, role, date, status pill, score bar, variant tag with lock icon, snapshot note)
- Analysis-linked path: loads data via `submissions.getAnalysisById()`, pre-fills fields with purple left-border "prefilled" indicator, shows linked analysis card with Unlink button
- Scratch path: all fields empty, no linked analysis card
- Submits via `window.api.submissions.create()` with scoreAtSubmit and analysisId from linked analysis

**Cross-tab wiring:**
- `App.tsx`: `pendingLogAnalysis` state + `onLogSubmission` callback passed to AnalysisTab
- `AnalysisTab.tsx`: accepts and passes through `onLogSubmission` prop to AnalysisResults
- `AnalysisResults.tsx`: "Log Submission" button enabled with accent border/color styling; calls `onLogSubmission?.(raw.id)` on click; removed `disabled`, `title`, `opacity`, `cursor: not-allowed`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] SubmissionPipelineDots.tsx created at `src/renderer/src/components/SubmissionPipelineDots.tsx`
- [x] SubmissionListView.tsx created at `src/renderer/src/components/SubmissionListView.tsx`
- [x] SubmissionLogForm.tsx created at `src/renderer/src/components/SubmissionLogForm.tsx`
- [x] SubmissionsTab.tsx rewritten with sub-router
- [x] AnalysisResults.tsx Log Submission button enabled
- [x] AnalysisTab.tsx onLogSubmission prop added and passed through
- [x] App.tsx pendingLogAnalysis state and cross-tab wiring added
- [x] `npm run typecheck` passes (both node and web)
- [x] Commits: 63290de (Task 1), 5cff8b2 (Task 2)
