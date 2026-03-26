---
phase: 18-three-layer-model-wiring
plan: "01"
subsystem: main-process-ipc
tags: [analysisId, overrides, skill-additions, preload, ipc]
dependency_graph:
  requires: [17-schema-override-ipc-foundation]
  provides: [analysisId-plumbing, skill-addition-ipc, preload-bridge-v2]
  affects: [templates-handler, export-handler, ai-handler, preload, PrintApp]
tech_stack:
  added: []
  patterns: [select-then-insert for idempotent seeding, cast-to-union for Drizzle source columns]
key_files:
  created: []
  modified:
    - src/main/handlers/templates.ts
    - src/main/handlers/export.ts
    - src/main/handlers/ai.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/PrintApp.tsx
decisions:
  - "Cast .all() result to union type for source column — Drizzle infers text, not 'ai_suggestion'|'manual_edit'"
  - "Use select-then-insert (not onConflictDoNothing) for ensureSkillAdditions — analysis_skill_additions has no unique constraint on (analysisId, skillName)"
metrics:
  duration: 3 min
  completed: 2026-03-26
  tasks_completed: 2
  files_modified: 6
---

# Phase 18 Plan 01: Main-Process IPC Wiring Summary

Backend plumbing for three-layer model: analysisId threaded through data handlers, override merge-at-load via applyOverrides, three skill addition IPC handlers, preload bridge and type declarations updated, PrintApp reads analysisId from URL.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Thread analysisId through main-process handlers and add skill IPC handlers | f1aedc2 | templates.ts, export.ts, ai.ts |
| 2 | Update preload bridge, type declarations, and PrintApp | 58f0866 | index.ts, index.d.ts, PrintApp.tsx |

## What Was Built

### templates.ts
- `getBuilderData` handler signature changed from `(_, variantId)` to `(_, variantId, analysisId?: number)`
- Added imports: `analysisBulletOverrides` from schema, `applyOverrides` from shared/overrides
- After `jobsWithBullets` is assembled, if `analysisId != null`: queries overrides for that analysis and calls `applyOverrides` on each job's bullets
- Drizzle `.all()` result cast to `Array<{..., source: 'ai_suggestion' | 'manual_edit', ...}>` to satisfy `BulletOverride[]` type

### export.ts
- `getBuilderDataForVariant` signature extended with `analysisId?: number`
- Same override merge block added before the return statement (identical pattern to templates.ts)
- `export:pdf` handler accepts `analysisId?: number` — appended to print URL in both dev and prod paths
- `export:docx` handler accepts `analysisId?: number` — passed through to `getBuilderDataForVariant`

### ai.ts
- Imported `analysisSkillAdditions` from schema
- Three new handlers added after `ai:getOverrides`:
  - `ai:acceptSkillAddition(analysisId, skillName)` — updates status to 'accepted'
  - `ai:dismissSkillAddition(analysisId, skillName)` — updates status to 'dismissed'
  - `ai:ensureSkillAdditions(analysisId, skills[])` — idempotent seed via select-then-insert

### preload/index.ts
- `templates.getBuilderData` accepts optional `analysisId`
- `exportFile.pdf` and `exportFile.docx` accept optional `analysisId`
- `ai` object gains `acceptSkillAddition`, `dismissSkillAddition`, `ensureSkillAdditions`

### preload/index.d.ts
- Updated `Api` interface declarations to match all new/changed signatures
- Three new skill addition method declarations added to `ai` section

### PrintApp.tsx
- Reads `analysisId` from URL query params after `variantId`
- Passes `analysisId` to `getBuilderData(variantId, analysisId)` call

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cast Drizzle query result for source column union type**
- **Found during:** Task 1 typecheck
- **Issue:** Drizzle `.select({ source: analysisBulletOverrides.source })` returns `string`, not `'ai_suggestion' | 'manual_edit'`, causing type mismatch with `BulletOverride[]` parameter of `applyOverrides`
- **Fix:** Added `as Array<{ bulletId: number; overrideText: string; source: 'ai_suggestion' | 'manual_edit'; suggestionId: string | null }>` cast after `.all()` in both templates.ts and export.ts
- **Files modified:** src/main/handlers/templates.ts, src/main/handlers/export.ts
- **Commit:** f1aedc2

**2. [Rule 2 - Missing constraint check] Used select-then-insert for ensureSkillAdditions**
- **Found during:** Task 1 implementation
- **Issue:** Plan suggested `onConflictDoNothing()` but noted to check for unique constraint — `analysis_skill_additions` table has no UNIQUE(analysis_id, skill_name) constraint in db/index.ts CREATE TABLE statement
- **Fix:** Used select-then-insert pattern as specified in plan's fallback block
- **Files modified:** src/main/handlers/ai.ts
- **Commit:** f1aedc2

## Known Stubs

None — all IPC handlers are fully wired. Renderer usage of the new handlers is handled in Plan 02.

## Self-Check: PASSED

Files exist:
- src/main/handlers/templates.ts — FOUND
- src/main/handlers/export.ts — FOUND
- src/main/handlers/ai.ts — FOUND
- src/preload/index.ts — FOUND
- src/preload/index.d.ts — FOUND
- src/renderer/src/PrintApp.tsx — FOUND

Commits verified:
- f1aedc2 — feat(18-01): thread analysisId through main-process handlers
- 58f0866 — feat(18-01): update preload bridge, type declarations, and PrintApp
