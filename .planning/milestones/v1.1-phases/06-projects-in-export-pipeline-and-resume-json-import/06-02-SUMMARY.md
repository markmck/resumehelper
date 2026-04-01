---
phase: 06-projects-in-export-pipeline-and-resume-json-import
plan: 02
subsystem: database
tags: [drizzle, sqlite, ipc, electron, better-sqlite3, resume-json]

# Dependency graph
requires:
  - phase: 05-projects-and-tag-autocomplete
    provides: Projects table + templateVariantItems FK column pattern via ALTER TABLE
provides:
  - SQLite tables for education, volunteer, awards, publications, languages, interests, references
  - Drizzle schema definitions for all 7 new entities + FK columns on templateVariantItems
  - IPC handlers with CRUD operations for all 7 entities
  - Preload bridge exposing window.api.{entity}.{action}() for all 7 entities
  - TypeScript interfaces for all 7 entities in preload/index.d.ts
affects:
  - 06-03 (UI components for new entities)
  - 06-04 (builder/preview/export integration)
  - 06-05 (resume.json import)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - JSON.stringify/parse for array fields stored as TEXT columns (courses, highlights, keywords)
    - referenceEntries as JS variable name for `references` SQLite table (avoids reserved word confusion)

key-files:
  created:
    - src/main/handlers/education.ts
    - src/main/handlers/volunteer.ts
    - src/main/handlers/awards.ts
    - src/main/handlers/publications.ts
    - src/main/handlers/languages.ts
    - src/main/handlers/interests.ts
    - src/main/handlers/references.ts
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - src/main/handlers/index.ts
    - src/preload/index.ts
    - src/preload/index.d.ts

key-decisions:
  - "referenceEntries used as JS variable name for the `references` SQLite table — avoids confusion with JS reserved words"
  - "Array fields (courses, highlights, keywords) stored as JSON TEXT strings, parsed on read, serialized on write"
  - "ALTER TABLE pattern used for FK columns on templateVariantItems — same pattern as projects FK columns for existing DB compatibility"

patterns-established:
  - "JSON array fields: store via JSON.stringify(data.field ?? []), return via JSON.parse(row.field)"
  - "Handler files: one file per entity, exports register{Entity}Handlers(), 4 IPC handlers each"
  - "Preload bridge: entity namespace object with list/create/update/delete calling ipcRenderer.invoke()"

requirements-completed: [IMP-01]

# Metrics
duration: 15min
completed: 2026-03-22
---

# Phase 6 Plan 02: Resume Entity DB Layer Summary

**SQLite CRUD layer for 7 resume.json entities (education, volunteer, awards, publications, languages, interests, references) with Drizzle schema, IPC handlers, and preload bridge**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-22T00:00:00Z
- **Completed:** 2026-03-22T00:15:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- 7 new SQLite tables created via `CREATE TABLE IF NOT EXISTS` in ensureSchema — work on both fresh install and existing DBs
- 7 FK columns added to `template_variant_items` via ALTER TABLE try/catch pattern for existing DB compatibility
- 7 handler files created with full CRUD IPC handlers, each following established projects.ts pattern
- Preload bridge exposes `window.api.{entity}.{action}()` for all 7 entities with matching TypeScript types

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Drizzle schema tables and ensureSchema DDL** - `a1879c7` (feat)
2. **Task 2: Create IPC handlers and preload bridge** - `5eccb7b` (feat)

## Files Created/Modified

- `src/main/db/schema.ts` - Added 7 table definitions + 7 FK columns on templateVariantItems
- `src/main/db/index.ts` - Added 7 CREATE TABLE IF NOT EXISTS blocks + 7 ALTER TABLE statements
- `src/main/handlers/education.ts` - registerEducationHandlers() with list/create/update/delete; JSON parse for courses
- `src/main/handlers/volunteer.ts` - registerVolunteerHandlers(); JSON parse for highlights
- `src/main/handlers/awards.ts` - registerAwardHandlers(); simple CRUD
- `src/main/handlers/publications.ts` - registerPublicationHandlers(); simple CRUD
- `src/main/handlers/languages.ts` - registerLanguageHandlers(); simple CRUD
- `src/main/handlers/interests.ts` - registerInterestHandlers(); JSON parse for keywords
- `src/main/handlers/references.ts` - registerReferenceHandlers(); simple CRUD using referenceEntries table
- `src/main/handlers/index.ts` - Imports and calls all 7 new register functions
- `src/preload/index.d.ts` - 7 new interfaces + 7 Api namespace entries
- `src/preload/index.ts` - 7 new namespace objects bridging to IPC

## Decisions Made

- `referenceEntries` used as the JS/Drizzle variable name for the `references` table — the SQLite table is still named `references` but the JS variable avoids any reserved word confusion
- Array fields (courses, highlights, keywords) stored as JSON TEXT in SQLite, serialized on write and parsed on read in list/create/update handlers
- ALTER TABLE statements for FK columns placed in the existing alterStatements array (same try/catch pattern), ensuring existing databases get the new columns on next app startup

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DB layer for all 7 resume.json entities is fully operational
- `window.api.education.list()`, `window.api.education.create({...})`, etc. are all wired end-to-end
- Ready for Plan 03 (UI components) and Plan 04 (builder/export integration)
- Existing jobs, skills, projects, templates, submissions, and export functionality unaffected

---
*Phase: 06-projects-in-export-pipeline-and-resume-json-import*
*Completed: 2026-03-22*

## Self-Check: PASSED

- All 12 files created/modified confirmed present on disk
- Task commits a1879c7 and 5eccb7b confirmed in git log
- TypeScript compilation passes with no errors
