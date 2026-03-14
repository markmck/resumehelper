---
phase: 04-export
plan: 02
subsystem: ui
tags: [electron, docx, pdf, react, ipc, export]

# Dependency graph
requires:
  - phase: 04-export/04-01
    provides: ProfessionalLayout component and profile IPC layer used by PDF hidden window renderer and DOCX handler
  - phase: 02-template-variants
    provides: getBuilderData logic and BuilderData shape for fetching variant jobs/skills
provides:
  - PDF export via hidden BrowserWindow + printToPDF() with WYSIWYG output
  - DOCX export via docx library with structured headings, bullets, and skills sections
  - Export buttons (PDF + DOCX) on Preview sub-tab in VariantEditor with loading state
  - Toast notifications on successful export
  - Smart default filenames following {Name}_Resume_{VariantName}.ext pattern
affects: [future export plans, any phase touching VariantEditor Preview sub-tab]

# Tech tracking
tech-stack:
  added: [docx]
  patterns:
    - Hidden BrowserWindow for headless PDF rendering (print:ready IPC handshake pattern)
    - Multi-page Vite renderer config with separate print.html entry point
    - Query duplication for export handlers (consistent with Phase 3 buildSnapshotForVariant pattern)

key-files:
  created:
    - src/main/handlers/export.ts
    - src/renderer/print.html
    - src/renderer/src/PrintApp.tsx
  modified:
    - electron.vite.config.ts
    - package.json
    - src/main/handlers/index.ts
    - src/renderer/src/components/VariantEditor.tsx

key-decisions:
  - "print:ready IPC handshake uses ipcMain.once (one-shot send from renderer) with 3s safety timeout to prevent hanging PDF export"
  - "DOCX query logic duplicated from templates.ts getBuilderData handler, consistent with Phase 3 snapshot duplication pattern"
  - "PDF printToPDF margins set to 0 — ProfessionalLayout already has 0.5in padding via inline styles, double margins would waste space"
  - "Export filename sanitized in renderer before IPC call — replaces whitespace with underscores, strips non-alphanumeric chars"

patterns-established:
  - "Hidden window pattern: BrowserWindow(show:false) + loadURL print.html?variantId=N + await print:ready signal + 200ms settle + printToPDF"
  - "Multi-page renderer: rollupOptions.input with index and print entries in electron.vite.config.ts"

requirements-completed: [EXPRT-01, EXPRT-02]

# Metrics
duration: ~20min
completed: 2026-03-14
---

# Phase 4 Plan 02: PDF and DOCX Export Summary

**PDF export via hidden BrowserWindow + printToPDF() and DOCX export via docx library, wired to Export buttons on the Preview sub-tab with Save As dialogs, smart filenames, and toast notifications**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-14T17:25:00Z
- **Completed:** 2026-03-14T22:45:20Z
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 8

## Accomplishments

- Wired PDF export using a hidden Electron BrowserWindow that loads a dedicated print.html route, renders ProfessionalLayout via PrintApp.tsx, signals readiness over IPC, then calls webContents.printToPDF()
- Wired DOCX export using the docx library in the main process — builds a structured Document with name header, contact line, WORK EXPERIENCE section with per-job bullets, and SKILLS section grouped by tags
- Added Export PDF and Export DOCX buttons to the Preview sub-tab of VariantEditor with disabled/loading state and toast notifications on success

## Task Commits

Each task was committed atomically:

1. **Task 1: Install docx, print.html route, PrintApp, export handlers, vite config, export buttons** - `7811201` (feat)
2. **Task 2: Verify PDF and DOCX export end-to-end** - checkpoint:human-verify (approved by user)

**Post-plan fixes:**
- `997ae6d` (refactor): move Profile from own tab into Experience tab
- `728b7cb` (fix): replace fragile migration with CREATE TABLE IF NOT EXISTS
- `90fae57` (feat+fix): collapsible profile, bullet auto-focus, job sort, editable notes
- `f267093` (fix): delete empty bullets on blur
- `1905eb2` (fix): empty bullet cleanup on blur + job sort by startDate everywhere

## Files Created/Modified

- `src/main/handlers/export.ts` - export:pdf and export:docx IPC handlers; getBuilderDataForExport helper; buildFilename sanitizer
- `src/renderer/print.html` - Hidden window HTML entry (white background, no dark theme classes)
- `src/renderer/src/PrintApp.tsx` - React entry for print route; fetches profile + builder data in parallel, renders ProfessionalLayout, sends print:ready signal
- `electron.vite.config.ts` - Multi-page renderer rollupOptions.input with index and print entries
- `package.json` - Added docx dependency
- `src/main/handlers/index.ts` - Registered registerExportHandlers()
- `src/renderer/src/components/VariantEditor.tsx` - Export PDF and Export DOCX buttons on Preview sub-tab with loading state and toast

## Decisions Made

- `print:ready` IPC handshake uses `ipcMain.once` (not `ipcMain.handle`) because PrintApp sends a fire-and-forget signal, not a request/response. 3-second safety timeout prevents the export from hanging if the signal is never received.
- DOCX query logic duplicated from `templates.ts` `getBuilderData` handler, consistent with the Phase 3 decision to duplicate `buildSnapshotForVariant`. Export and template preview may diverge independently.
- `printToPDF` margins set to 0 — ProfessionalLayout already applies 0.5in padding via inline styles. Adding Electron margins on top would produce excessive whitespace.

## Deviations from Plan

None - plan executed exactly as written.

Post-plan fixes (outside plan scope, committed separately after human verification):
- Profile UI moved from own tab into Experience tab (improves UX flow)
- Migration hardened with `CREATE TABLE IF NOT EXISTS` to prevent restart crashes
- Collapsible profile section, bullet auto-focus, job sort by startDate, editable submission notes
- Empty bullet cleanup on blur

## Issues Encountered

None during plan execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 is complete. All four phases of the v1.0 milestone are now done.
- Export produces WYSIWYG PDF and structured DOCX from the Preview sub-tab.
- No remaining blockers for v1.0.

---
*Phase: 04-export*
*Completed: 2026-03-14*
