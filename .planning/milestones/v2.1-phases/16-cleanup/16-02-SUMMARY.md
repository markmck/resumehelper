---
phase: 16-cleanup
plan: 02
subsystem: ui
tags: [electron, ipc, print-html, postmessage, snapshot, cleanup]

# Dependency graph
requires:
  - phase: 16-cleanup
    plan: 01
    provides: snapshotPdf handler stubbed, SnapshotViewer stubbed to ProfessionalLayout — ready for full rewrite
  - phase: 13-pipeline-foundation
    provides: print.html iframe + postMessage pipeline, __printBase URL pattern
  - phase: 15-controls-page-break-overlay
    provides: TEMPLATE_DEFAULTS, templateOptions, DOCX_MARGIN_DEFAULTS in export.ts
provides:
  - PrintApp supports variantId=0 as snapshot mode sentinel (postMessage path in BrowserWindow)
  - snapshotPdf handler uses print.html BrowserWindow pipeline with Classic fallback for old templates
  - SnapshotViewer renders snapshots via iframe + postMessage matching VariantPreview pattern
  - ProfessionalLayout.tsx deleted — zero consumers remain
  - Unified rendering pipeline: preview, PDF export, snapshot view, snapshot export all use print.html
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "variantId=0 sentinel in print.html URL — triggers postMessage data path in both iframe and BrowserWindow contexts"
    - "Snapshot BrowserWindow mode: sends print:ready IPC to trigger executeJavaScript postMessage from main process"
    - "SnapshotViewer fetches profile separately (snapshot data lacks profile), merges before postMessage"
    - "Classic fallback for unknown layoutTemplate keys in both SnapshotViewer and snapshotPdf handler"

key-files:
  created: []
  modified:
    - src/renderer/src/PrintApp.tsx
    - src/main/handlers/export.ts
    - src/renderer/src/components/SnapshotViewer.tsx
  deleted:
    - src/renderer/src/components/ProfessionalLayout.tsx

key-decisions:
  - "variantId=0 is the snapshot mode sentinel — cleanly bifurcates snapshot vs. normal variant paths in PrintApp without new query params"
  - "Snapshot BrowserWindow sends print:ready IPC before receiving data, main process uses ipcMain.once to push data via executeJavaScript"
  - "SnapshotViewer maxWidth widened from 48rem to 56rem for iframe snapshot display (iframe is 100% width, 70vh height)"
  - "onReExport prop added to SnapshotViewer as optional — not used by current caller but available for future wiring"
  - "Classic fallback for old layoutTemplate values (professional/traditional/unknown) confirmed working"

patterns-established:
  - "All rendering paths (VariantPreview, PDF export, SnapshotViewer, snapshot PDF) use print.html + postMessage pipeline — single unified renderer"

requirements-completed: [CLEAN-02, CLEAN-03]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 16 Plan 02: Snapshot Migration Summary

**Migrated snapshot PDF export and SnapshotViewer to the print.html postMessage pipeline; deleted ProfessionalLayout.tsx — unified rendering pipeline complete**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-26T12:48:22Z
- **Completed:** 2026-03-26T12:51:00Z
- **Tasks:** 2
- **Files modified:** 3 (+ 1 deleted)

## Accomplishments
- PrintApp now handles variantId=0 as snapshot mode sentinel — postMessage path activated in both iframe and BrowserWindow contexts
- snapshotPdf handler rewrites from stub to full print.html BrowserWindow pipeline with Classic fallback for old snapshot templates
- SnapshotViewer fully rewritten from ProfessionalLayout inline render to iframe + postMessage pattern matching VariantPreview
- ProfessionalLayout.tsx deleted (532 lines) — codebase now has a single rendering pipeline for all template display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PrintApp snapshot mode and rewrite snapshotPdf handler** - `d7ab928` (feat)
2. **Task 2: Rewrite SnapshotViewer as iframe and delete ProfessionalLayout** - `eaa030c` (feat)

## Files Created/Modified
- `src/renderer/src/PrintApp.tsx` - Added snapshot mode detection (variantId=0 sentinel), sends print:ready IPC in BrowserWindow snapshot context
- `src/main/handlers/export.ts` - Rewrote snapshotPdf handler: BrowserWindow + print.html + executeJavaScript postMessage + Classic fallback
- `src/renderer/src/components/SnapshotViewer.tsx` - Full rewrite: iframe src=print.html, postMessage on print-ready, profile fetched separately
- `src/renderer/src/components/ProfessionalLayout.tsx` - DELETED (532 lines, zero consumers remaining)

## Decisions Made
- variantId=0 used as snapshot mode sentinel — allows the same print.html entry point to serve both normal variants (by ID) and snapshots (by postMessage), without adding a new route or query param
- SnapshotViewer fetches profile data on mount via window.api.profile.get() because SubmissionSnapshot type doesn't include profile fields (name, email, phone, etc.)
- Snapshot PDF export uses DOCX_MARGIN_DEFAULTS for margins since snapshots don't store templateOptions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build passed on first attempt after each task.

## Next Phase Readiness
- Phase 16 cleanup complete: all v1.0 theme infrastructure removed, ProfessionalLayout deleted, snapshot rendering unified
- The entire app now uses a single rendering pipeline (print.html) for all template display
- No blockers for any future work

---
*Phase: 16-cleanup*
*Completed: 2026-03-26*

## Self-Check: PASSED
- src/renderer/src/PrintApp.tsx: FOUND
- src/main/handlers/export.ts: FOUND
- src/renderer/src/components/SnapshotViewer.tsx: FOUND
- src/renderer/src/components/ProfessionalLayout.tsx: CONFIRMED DELETED
- Commit d7ab928: FOUND
- Commit eaa030c: FOUND
