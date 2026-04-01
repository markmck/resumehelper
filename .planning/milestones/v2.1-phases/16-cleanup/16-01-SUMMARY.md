---
phase: 16-cleanup
plan: 01
subsystem: ui
tags: [electron, ipc, cleanup, dead-code]

# Dependency graph
requires:
  - phase: 15-controls-page-break-overlay
    provides: V2_TEMPLATES Set routes all 5 new templates through print.html path
provides:
  - themeRegistry.ts contains only buildResumeJson (no renderThemeHtml, no THEMES array)
  - themes.ts IPC handler deleted (themes:list, themes:renderHtml, themes:renderSnapshotHtml gone)
  - preload bridge has no themes namespace
  - export:pdf uses single print.html path, no dead theme branch
affects: [16-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "export:pdf now has a single code path through print.html BrowserWindow"
    - "themeRegistry.ts is a minimal utility exporting only buildResumeJson for ai.ts"

key-files:
  created: []
  modified:
    - src/main/handlers/index.ts
    - src/main/lib/themeRegistry.ts
    - src/main/handlers/export.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/components/VariantEditor.tsx
    - src/renderer/src/components/SnapshotViewer.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "SnapshotViewer stubbed to ProfessionalLayout only — full v2.1 template-aware rewrite deferred to Plan 02"
  - "snapshotPdf handler stubbed with TODO comment — rewrites in Plan 02"
  - "buildResumeJson import removed from export.ts (DOCX builds data directly, PDF uses print.html)"

patterns-established:
  - "All PDF export goes through print.html BrowserWindow path — no legacy theme HTML fallback"

requirements-completed: [CLEAN-01]

# Metrics
duration: 12min
completed: 2026-03-26
---

# Phase 16 Plan 01: Cleanup Summary

**Removed all v1.0 theme infrastructure: 3 npm packages uninstalled, themes.ts deleted, preload themes bridge removed, export:pdf simplified to single print.html path**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-26T12:30:00Z
- **Completed:** 2026-03-26T12:42:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Uninstalled jsonresume-theme-even, @jsonresume/jsonresume-theme-class, jsonresume-theme-elegant (133 packages removed)
- Deleted themes.ts handler (themes:list, themes:renderHtml, themes:renderSnapshotHtml IPC handlers)
- Cleaned themeRegistry.ts to contain only buildResumeJson (removed renderThemeHtml, sanitizeDates, THEMES, THEME_KEYS, ThemeEntry)
- Removed themes namespace from preload bridge (index.ts and index.d.ts)
- Removed themes state, useEffect, dropdown JSX, and handleThemeChange from VariantEditor.tsx
- Simplified export:pdf to single print.html BrowserWindow path (removed unreachable legacy theme else branch)
- Stubbed SnapshotViewer and snapshotPdf handler for Plan 02 rewrite

## Task Commits

Each task was committed atomically:

1. **Task 1: Uninstall theme packages and delete themes.ts handler** - `5450a32` (chore)
2. **Task 2: Remove themes preload bridge, VariantEditor themes code, and export:pdf dead branch** - `b188483` (chore)

## Files Created/Modified
- `src/main/handlers/themes.ts` - DELETED
- `src/main/lib/themeRegistry.ts` - Stripped to buildResumeJson only
- `src/main/handlers/index.ts` - Removed registerThemeHandlers import and call
- `src/main/handlers/export.ts` - Single print.html path, removed renderThemeHtml import and legacy else branch, stubbed snapshotPdf
- `src/preload/index.ts` - Removed themes namespace (renderHtml, renderSnapshotHtml, list)
- `src/preload/index.d.ts` - Removed themes type declaration block
- `src/renderer/src/components/VariantEditor.tsx` - Removed themes state, useEffect, dropdown JSX, handleThemeChange
- `src/renderer/src/components/SnapshotViewer.tsx` - Stubbed to ProfessionalLayout only pending Plan 02 rewrite
- `package.json` / `package-lock.json` - 3 theme packages removed (133 packages total)

## Decisions Made
- SnapshotViewer stubbed to ProfessionalLayout for all snapshots rather than leaving a broken window.api.themes call — Plan 02 will fully rewrite with v2.1 template-aware rendering
- snapshotPdf IPC handler returns `{ canceled: true, error: '...' }` stub — Plan 02 rewrites with print.html routing
- buildResumeJson import removed from export.ts entirely (DOCX handler builds data inline, PDF delegates to print.html renderer)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed SnapshotViewer window.api.themes call**
- **Found during:** Task 2 (Remove themes preload bridge)
- **Issue:** Plan noted SnapshotViewer might have a themes reference — it did (renderSnapshotHtml call on line 31), which caused TypeScript error after removing the themes type declaration
- **Fix:** Rewrote SnapshotViewer to use ProfessionalLayout for all snapshots with TODO comment for Plan 02 full rewrite
- **Files modified:** src/renderer/src/components/SnapshotViewer.tsx
- **Verification:** Build passes with zero TypeScript errors
- **Committed in:** b188483 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical to unblock build)
**Impact on plan:** SnapshotViewer fix was necessary for build to pass. Scope-minimal: renders all snapshots via ProfessionalLayout until Plan 02 implements proper v2.1 template-aware snapshot rendering.

## Issues Encountered
- SnapshotViewer.tsx had an active `window.api.themes.renderSnapshotHtml` call that caused TypeScript error after removing the themes type. Resolved by stubbing to ProfessionalLayout as noted in the plan for Plan 02 rewrite scope.

## Next Phase Readiness
- Dead theme infrastructure fully removed; codebase compiles cleanly
- Plan 02 can now implement snapshotPdf and SnapshotViewer with v2.1 template-aware rendering
- No blockers for Plan 02

---
*Phase: 16-cleanup*
*Completed: 2026-03-26*
