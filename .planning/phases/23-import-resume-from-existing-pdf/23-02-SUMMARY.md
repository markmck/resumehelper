---
phase: 23-import-resume-from-existing-pdf
plan: "02"
subsystem: renderer
tags: [pdf-import, ui, import-modal, experience-tab]
dependency_graph:
  requires: [import:parseResumePdf, import:confirmAppend]
  provides: [ImportConfirmModal:mode-prop, ExperienceTab:pdf-import-flow]
  affects: [src/renderer/src/components/ImportConfirmModal.tsx, src/renderer/src/components/ExperienceTab.tsx]
tech_stack:
  added: []
  patterns: [mode-aware modal props, conditional Tailwind class strings, append vs replace IPC dispatch]
key_files:
  created: []
  modified:
    - src/renderer/src/components/ImportConfirmModal.tsx
    - src/renderer/src/components/ExperienceTab.tsx
decisions:
  - ImportConfirmModal mode prop defaults to 'replace' for full backward compatibility with JSON import flow
  - Separate importMode state tracks which flow is active (replace vs append) so handleImportConfirm dispatches correctly
  - pdfExtracting is a separate boolean from importLoading — extraction is pre-modal, importLoading is post-modal
metrics:
  duration: "~3 min"
  completed: "2026-04-01"
  tasks: 1
  files: 2
---

# Phase 23 Plan 02: PDF Import UI Flow Summary

Mode-aware ImportConfirmModal (append vs replace messaging) + PDF import button and end-to-end flow in ExperienceTab calling parsePdf and confirmAppend IPC handlers.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update ImportConfirmModal for append mode and add PDF import flow to ExperienceTab | cb293c3 | ImportConfirmModal.tsx, ExperienceTab.tsx |

## What Was Built

**Task 1: ImportConfirmModal append mode + ExperienceTab PDF import flow**

**ImportConfirmModal.tsx changes:**
- Added `mode?: 'replace' | 'append'` prop (defaults to `'replace'` for backward compatibility)
- Title is now conditional: "Import from PDF" for append mode, "Import resume.json" for replace mode
- Warning banner is mode-aware: blue (`bg-blue-950/50 border-blue-800/50 text-blue-300`) for append with "New entries will be added alongside your existing data"; amber for replace with "This will replace all existing data"
- Confirm button color: `bg-blue-600 hover:bg-blue-500` for append (safe/additive), `bg-red-600 hover:bg-red-500` for replace (destructive)
- Confirm button text: "Import Data" for append, "Replace All Data" for replace

**ExperienceTab.tsx changes:**
- Added `pdfExtracting` boolean state for the pre-modal extraction loading phase
- Added `importMode` state (`'replace' | 'append'`) tracking which import flow is active
- Added `handleImportPdfClick`: sets `pdfExtracting=true`, calls `window.api.import_.parsePdf()`, sets `importMode='append'`, populates `importData`, handles errors with toast
- Updated `handleImportClick` to explicitly `setImportMode('replace')` before setting importData
- Updated `handleImportConfirm` to dispatch `confirmAppend` vs `confirmReplace` based on `importMode`
- Added "Import PDF" button alongside "Import JSON" in the header button group — shows "Extracting..." and `opacity: 0.6` with `cursor: wait` while extracting
- Passed `mode={importMode}` to `ImportConfirmModal`

**TypeScript:** `npx tsc --noEmit` exits 0.

## Checkpoint Awaiting Verification

Task 2 (human-verify) is pending user verification of the end-to-end flow in the running application.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both IPC handlers (parsePdf, confirmAppend) were fully wired in Plan 01. The UI calls them directly.

## Self-Check: PASSED

- Both modified files verified present on disk
- Task 1 commit cb293c3 verified in git log
