---
phase: 06-projects-in-export-pipeline-and-resume-json-import
plan: 01
subsystem: ui
tags: [react, electron, drizzle-orm, docx, typescript]

# Dependency graph
requires:
  - phase: 05-projects-and-tag-autocomplete
    provides: projects and projectBullets tables, project FK columns on templateVariantItems
provides:
  - BuilderProject type in preload/index.d.ts
  - Projects in getBuilderData, setItemExcluded (with cascade), and duplicate handlers
  - Projects in DOCX export (PROJECTS section with bold name + bullets)
  - Projects in submission snapshots
  - Projects section in VariantBuilder (checkbox toggles with cascade)
  - Projects section in ProfessionalLayout (after Skills)
  - Projects threaded through VariantPreview, SnapshotViewer, PrintApp
affects: [07-resume-json-import]

# Tech tracking
tech-stack:
  added: []
  patterns: [mirror jobs/bullets pattern for projects, optimistic updates for project toggles]

key-files:
  created: []
  modified:
    - src/preload/index.d.ts
    - src/main/handlers/templates.ts
    - src/main/handlers/export.ts
    - src/main/handlers/submissions.ts
    - src/renderer/src/components/VariantBuilder.tsx
    - src/renderer/src/components/ProfessionalLayout.tsx
    - src/renderer/src/components/VariantPreview.tsx
    - src/renderer/src/components/SnapshotViewer.tsx
    - src/renderer/src/PrintApp.tsx

key-decisions:
  - "Projects section renders after Skills in ProfessionalLayout (heading: Projects)"
  - "SnapshotViewer uses projects ?? [] for backward compat with old snapshots lacking projects field"

patterns-established:
  - "Mirror jobs/bullets pattern exactly for projects/projectBullets in all handler files"
  - "projects prop is optional on ProfessionalLayout for backward compatibility"

requirements-completed: [PROJ-03, PROJ-04]

# Metrics
duration: 4min
completed: 2026-03-22
---

# Phase 6 Plan 01: Projects in Export Pipeline Summary

**Projects wired end-to-end: BuilderProject type, checkbox toggles in VariantBuilder, Projects section in ProfessionalLayout, DOCX export, and submission snapshots — mirroring the jobs pattern exactly**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-22T19:45:19Z
- **Completed:** 2026-03-22T19:49:15Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Added `BuilderProject` interface and extended `BuilderData`/`SubmissionSnapshot` with `projects` field
- Wired project exclusion logic (fetch, exclusion sets, cascade) into all three backend handlers (templates, export, submissions)
- Added PROJECTS section to DOCX export with bold project name header and bulleted highlights
- Added Projects section to VariantBuilder with project-level + bullet-level checkbox toggles and cascade-disable behavior
- Projects render in ProfessionalLayout after Skills with correct styling; empty state updated to include projects
- Projects threaded through VariantPreview, SnapshotViewer (with `?? []` for old snapshots), and PrintApp

## Task Commits

Each task was committed atomically:

1. **Task 1: Add BuilderProject type and extend backend handlers** - `618f04d` (feat)
2. **Task 2: Add projects to frontend components and print pipeline** - `146c654` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/preload/index.d.ts` - Added BuilderProject interface; extended BuilderData and SubmissionSnapshot
- `src/main/handlers/templates.ts` - Added projects to getBuilderData, project/projectBullet branches in setItemExcluded with cascade, projectId/projectBulletId in duplicate
- `src/main/handlers/export.ts` - Added projects to getBuilderDataForVariant and DOCX PROJECTS section
- `src/main/handlers/submissions.ts` - Added projects to buildSnapshotForVariant and default empty snapshot
- `src/renderer/src/components/VariantBuilder.tsx` - handleProjectToggle, handleProjectBulletToggle, Projects section UI
- `src/renderer/src/components/ProfessionalLayout.tsx` - Added projects prop (optional), includedProjects filter, Projects section render, updated empty state
- `src/renderer/src/components/VariantPreview.tsx` - Pass projects={builderData.projects} to ProfessionalLayout
- `src/renderer/src/components/SnapshotViewer.tsx` - Pass projects={snapshot.projects ?? []} to ProfessionalLayout
- `src/renderer/src/PrintApp.tsx` - Add projects to PrintData interface, set in useEffect, pass to ProfessionalLayout

## Decisions Made
- Projects section heading is "Projects" (not "PROJECTS") in ProfessionalLayout to match existing "Work Experience" / "Skills" heading style
- `projects` prop is optional on ProfessionalLayout for backward compatibility with old snapshots and any callers not yet updated
- Old submission snapshots without `projects` field handled via `snapshot.projects ?? []` in SnapshotViewer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Projects are now first-class citizens in the entire export pipeline
- Phase 6 Plan 02 (resume.json import) can proceed — the BuilderProject type and all handler patterns are established
- No blockers

---
*Phase: 06-projects-in-export-pipeline-and-resume-json-import*
*Completed: 2026-03-22*
