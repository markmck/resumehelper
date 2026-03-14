---
phase: 04-export
plan: 01
subsystem: database, ui
tags: [sqlite, drizzle-orm, react, electron, ipc, resume-layout]

# Dependency graph
requires:
  - phase: 03-submissions
    provides: SubmissionSnapshot type with jobs+skills, SnapshotViewer component
  - phase: 02-template-variants
    provides: BuilderData, VariantPreview, VariantEditor, TemplatesTab with layout selector

provides:
  - Profile table with IPC handlers (profile:get, profile:set with upsert)
  - ProfessionalLayout component with inline styles only (print-safe, white background)
  - ProfileSettings tab for entering contact info
  - Toast notification system (ToastProvider + useToast)
  - exportFile stubs in preload bridge (pdf, docx) ready for Plan 02

affects: [04-export/04-02, 04-export/04-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ProfessionalLayout uses inline styles exclusively — no Tailwind classes, no @media print, safe for printToPDF()"
    - "Profile is single-row table with id=1 upsert pattern (onConflictDoUpdate)"
    - "better-sqlite3 synchronous calls (.all()/.run()) in profile handlers"
    - "ToastProvider context pattern — useToast() hook for fire-and-forget notifications"

key-files:
  created:
    - src/main/handlers/profile.ts
    - src/main/db/schema.ts (profile table added)
    - drizzle/0002_profile.sql
    - src/renderer/src/components/ProfessionalLayout.tsx
    - src/renderer/src/components/Toast.tsx
    - src/renderer/src/components/ProfileSettings.tsx
  modified:
    - src/main/handlers/index.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/components/VariantPreview.tsx
    - src/renderer/src/components/SnapshotViewer.tsx
    - src/renderer/src/components/VariantEditor.tsx
    - src/renderer/src/components/TemplatesTab.tsx
    - src/renderer/src/App.tsx

key-decisions:
  - "ProfessionalLayout uses exclusively inline styles — Tailwind print: variants do not work reliably in Electron printToPDF() hidden window"
  - "exportFile uses computed property name to avoid JS reserved word 'export' conflict in preload bridge"
  - "SnapshotViewer modal changed to white background to match ProfessionalLayout's white resume style"
  - "Profile table seeded with id=1 row in migration — upsert on id=1 is the only write pattern"

patterns-established:
  - "Single-layout pattern: all resume rendering goes through ProfessionalLayout (no layout switching)"
  - "Profile data loaded alongside builder data in VariantPreview via Promise.all"

requirements-completed: [EXPRT-01, EXPRT-02]

# Metrics
duration: 12min
completed: 2026-03-14
---

# Phase 4 Plan 01: Profile Data Layer and ProfessionalLayout Summary

**SQLite profile table with IPC handlers, single ProfessionalLayout component with inline-only styles replacing 3 old layouts, Profile settings tab, and Toast notification system**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-14T22:18:46Z
- **Completed:** 2026-03-14T22:31:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Profile table (id, name, email, phone, location, linkedin) with migration and id=1 seed row
- profile:get and profile:set IPC handlers using synchronous better-sqlite3 with upsert
- ProfessionalLayout renders polished recruiter-ready resume with white background, inline styles only (print-safe)
- All three old layout sub-components (Traditional/Modern/Compact) removed from VariantPreview and SnapshotViewer
- Profile tab in app nav with ProfileSettings form that loads/saves via IPC and shows Toast on save
- exportFile preload stubs (pdf/docx) ready for Plan 02 implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Profile table, IPC handlers, preload types, ProfessionalLayout, Toast** - `8dfaa44` (feat)
2. **Task 2: Refactor layouts, add Profile tab, wire Toast** - `ccfe443` (feat)

**Plan metadata:** (docs commit — next)

## Files Created/Modified

- `src/main/db/schema.ts` — Added profile table definition
- `drizzle/0002_profile.sql` — Migration creating profile table with seed INSERT id=1
- `drizzle/meta/_journal.json` — Journal entry for 0002_profile migration
- `src/main/handlers/profile.ts` — profile:get and profile:set IPC handlers (synchronous)
- `src/main/handlers/index.ts` — Registers profile handlers in registerAllHandlers()
- `src/preload/index.ts` — Added profile and exportFile namespaces to IPC bridge
- `src/preload/index.d.ts` — Added Profile interface and profile/exportFile API types
- `src/renderer/src/components/ProfessionalLayout.tsx` — Shared resume layout, inline styles, white background
- `src/renderer/src/components/Toast.tsx` — ToastProvider context + useToast hook, auto-dismiss 3s
- `src/renderer/src/components/VariantPreview.tsx` — Uses ProfessionalLayout, loads profile data
- `src/renderer/src/components/SnapshotViewer.tsx` — Uses ProfessionalLayout, white modal
- `src/renderer/src/components/VariantEditor.tsx` — Removed layout selector and onLayoutChange prop
- `src/renderer/src/components/TemplatesTab.tsx` — Removed handleLayoutChange and onLayoutChange prop
- `src/renderer/src/components/ProfileSettings.tsx` — Profile form with save toast
- `src/renderer/src/App.tsx` — Profile tab added, ToastProvider wrapping

## Decisions Made

- ProfessionalLayout uses exclusively inline styles — `@media print` and Tailwind `print:` variants are unreliable in Electron's `printToPDF()` hidden window
- `exportFile` used instead of `export` as property name in preload to avoid JS reserved word conflict
- SnapshotViewer modal updated to white background to match the ProfessionalLayout white resume look
- Profile table uses single-row id=1 upsert pattern — no list/create/delete lifecycle needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Profile data layer complete — Plan 02 (PDF export) can immediately read profile for resume headers and default filenames
- ProfessionalLayout available as the single source of truth for resume rendering in PDF hidden window
- exportFile preload stubs are registered, handlers just need main-process implementation in Plan 02
- Toast system ready for export success/error notifications in Plans 02 and 03

---
*Phase: 04-export*
*Completed: 2026-03-14*
