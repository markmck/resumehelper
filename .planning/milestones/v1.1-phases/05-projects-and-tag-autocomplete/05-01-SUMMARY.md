---
phase: 05-projects-and-tag-autocomplete
plan: 01
subsystem: ui, database
tags: [drizzle, sqlite, electron, react, dnd-kit, ipc]

# Dependency graph
requires:
  - phase: prior v1.0 phases
    provides: jobs/bullets pattern, InlineEdit, BulletList, BulletItem, ensureSchema pattern
provides:
  - projects table with CREATE TABLE IF NOT EXISTS in ensureSchema
  - project_bullets table with cascade delete
  - registerProjectHandlers with full CRUD + reorder IPC handlers
  - projects/projectBullets preload API bridge
  - ProjectList, ProjectItem, ProjectAddForm, ProjectBulletList components
  - Projects section in ExperienceTab below Skills
  - templateVariantItems FK columns: project_id, project_bullet_id (for Phase 6)
affects: [06-template-builder, phase-6]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Projects mirror jobs/bullets pattern exactly — same IPC structure, same UI components"
    - "ProjectBulletList is a direct copy of BulletList, not a generalization"
    - "CREATE TABLE IF NOT EXISTS in ensureSchema + ALTER TABLE in migration SQL for new columns"

key-files:
  created:
    - src/main/handlers/projects.ts
    - src/renderer/src/components/ProjectList.tsx
    - src/renderer/src/components/ProjectItem.tsx
    - src/renderer/src/components/ProjectAddForm.tsx
    - src/renderer/src/components/ProjectBulletList.tsx
    - drizzle/0003_projects.sql
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - src/main/handlers/index.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - drizzle/meta/_journal.json
    - src/renderer/src/components/ExperienceTab.tsx

key-decisions:
  - "ProjectBulletList is a copy of BulletList (not generalized) — avoids coupling and keeps pattern explicit"
  - "Projects use asc(projects.id) ordering (insertion order) for v1.1; sort_order column reserved for drag-reorder in future"
  - "templateVariantItems FK columns added via ALTER TABLE migration (not ensureSchema) for existing DB compatibility"

patterns-established:
  - "New entity pattern: schema table + ensureSchema block + handler file + preload bridge + type defs + UI components"

requirements-completed: [PROJ-01, PROJ-02]

# Metrics
duration: 15min
completed: 2026-03-14
---

# Phase 5 Plan 01: Projects and Bullets Summary

**Full projects CRUD with drag-sortable bullets wired from SQLite through IPC to React UI, integrated into ExperienceTab below Skills**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-14T00:00:00Z
- **Completed:** 2026-03-14T00:15:00Z
- **Tasks:** 2
- **Files modified:** 13 (7 created, 6 modified)

## Accomplishments

- Projects table and project_bullets table added to schema and ensureSchema (CREATE TABLE IF NOT EXISTS)
- Full IPC handler layer: projects:list/create/update/delete + projectBullets:create/update/delete/reorder
- React components: ProjectList (state management), ProjectItem (inline edit + delete), ProjectAddForm (single input + auto-focus), ProjectBulletList (DnD reorder)
- ExperienceTab updated with Projects section below Skills

## Task Commits

1. **Task 1: Projects schema, migration, handlers, and preload bridge** - `8ef0bf0` (feat)
2. **Task 2: Project UI components and ExperienceTab integration** - `20293d3` (feat)

## Files Created/Modified

- `src/main/db/schema.ts` - Added projects, projectBullets tables; added projectId/projectBulletId FK columns to templateVariantItems
- `src/main/db/index.ts` - Added CREATE TABLE IF NOT EXISTS for projects and project_bullets
- `src/main/handlers/projects.ts` - New file: registerProjectHandlers with all 8 IPC channels
- `src/main/handlers/index.ts` - Imported and called registerProjectHandlers
- `src/preload/index.ts` - Added projects and projectBullets namespaces to api object
- `src/preload/index.d.ts` - Added Project, ProjectBullet, ProjectWithBullets types and Api interface entries
- `drizzle/0003_projects.sql` - Migration: ALTER TABLE template_variant_items ADD project_id and project_bullet_id
- `drizzle/meta/_journal.json` - Added entry for 0003_projects migration
- `src/renderer/src/components/ProjectList.tsx` - New: list with add/edit/delete/loading/empty state
- `src/renderer/src/components/ProjectItem.tsx` - New: inline edit name, hover delete, bullet list
- `src/renderer/src/components/ProjectAddForm.tsx` - New: single name input form with auto-focus
- `src/renderer/src/components/ProjectBulletList.tsx` - New: DnD sortable bullet list for projects
- `src/renderer/src/components/ExperienceTab.tsx` - Added Projects section with marginBottom on Skills

## Decisions Made

- ProjectBulletList is a direct copy of BulletList (not a generalization) per plan instructions — avoids coupling
- Projects ordered by asc(id) for v1.1 insertion order; sort_order column exists for future drag-to-reorder of projects
- templateVariantItems FK columns done via ALTER TABLE migration SQL (not ensureSchema) so existing databases get the columns without breaking on re-run

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Projects CRUD fully functional, ready for Phase 6 template builder integration
- projectId and projectBulletId columns on templateVariantItems are ready for Phase 6 to use
- Concern: ALTER TABLE migration must be tested against a v1.0 database (not just fresh install) before release

---
*Phase: 05-projects-and-tag-autocomplete*
*Completed: 2026-03-14*
