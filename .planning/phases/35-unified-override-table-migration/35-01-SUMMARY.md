---
phase: 35-unified-override-table-migration
plan: 01
subsystem: data-layer
tags: [schema, drizzle, sqlite, ddl, migration-foundation]
dependency_graph:
  requires: []
  provides: [entity_overrides-table, entity_overrides-drizzle-type, createTestDb-mirror]
  affects: [src/main/db/schema.ts, src/main/db/index.ts, tests/helpers/db.ts]
tech_stack:
  added: []
  patterns: [polymorphic-nullable-FK, partial-unique-index, DDL-mirror-lockstep]
key_files:
  created: []
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - tests/helpers/db.ts
decisions:
  - "Per-entity nullable FK columns (bullet_id, project_id, job_id, project_bullet_id) chosen over generic entity_id — consistent with templateVariantItems precedent"
  - "Two partial unique indexes (WHERE analysis_id IS NULL / IS NOT NULL) enforce one-override-per-scope+entity+field — plain UNIQUE useless because SQLite treats NULLs as distinct"
  - "analysisBulletOverrides retained read-only in all three locations per D-07"
  - "source defaults to 'user' (not 'ai_suggestion') — migrated rows carry their own source value; new variant rewrites default to user-authored"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 35 Plan 01: Unified Override Table — DDL Foundation Summary

**One-liner:** Polymorphic `entity_overrides` table with per-entity nullable FK columns, two partial unique indexes, and character-for-character test fixture mirror across schema.ts, ensureSchema(), and createTestDb().

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add entityOverrides Drizzle table to schema.ts | 66aa9f9 | src/main/db/schema.ts |
| 2 | Add raw CREATE TABLE + partial unique indexes to ensureSchema() | 7392e99 | src/main/db/index.ts |
| 3 | Mirror entity_overrides DDL into createTestDb() | 9c7fa78 | tests/helpers/db.ts |

## What Was Built

### entityOverrides Drizzle table (schema.ts)

Added `entityOverrides = sqliteTable('entity_overrides', {...})` immediately after `analysisSkillAdditions`. Columns:

- `id` — integer PK autoincrement
- `variantId` — nullable integer FK → template_variants (cascade) per D-03
- `analysisId` — nullable integer FK → analysis_results (cascade) per D-03
- `entityType` — text NOT NULL discriminator
- `bulletId` / `projectId` / `jobId` / `projectBulletId` — four nullable FK columns per D-04 (forward-looking; only bullet FK used in v2.6)
- `field` — text NOT NULL (e.g. `'text'`, `'title'`)
- `overrideText` — text NOT NULL
- `source` — text NOT NULL default `'user'`
- `createdAt` — integer timestamp with `$defaultFn(() => new Date())`

`analysisBulletOverrides` retained unchanged (D-07).

### Raw DDL + partial indexes (index.ts ensureSchema())

`CREATE TABLE IF NOT EXISTS entity_overrides` appended after `analysis_skill_additions` in the single `sqlite.exec(...)` template literal. Six trailing `FOREIGN KEY ... ON DELETE cascade` clauses. Two partial unique indexes follow the table:

- `entity_overrides_variant_tier_uidx` — keyed on `(variant_id, entity_type, bullet_id, project_id, job_id, project_bullet_id, field)` WHERE `analysis_id IS NULL`
- `entity_overrides_analysis_tier_uidx` — keyed on `(analysis_id, entity_type, bullet_id, project_id, job_id, project_bullet_id, field)` WHERE `analysis_id IS NOT NULL`

### Test fixture mirror (tests/helpers/db.ts)

Identical CREATE TABLE + both CREATE UNIQUE INDEX statements copied character-for-character from index.ts into `createTestDb()`. The "Keep this in sync" header comment already captures this contract.

## Verification

- `npx tsc --noEmit -p tsconfig.node.json` → exits 0 (all three tasks)
- `npm run build` → succeeds
- `npm test` → **247 tests passing, 0 failures** (zero regressions)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan delivers DDL only; no write/read paths touched.

## Threat Flags

None — all new surface is static DDL with no user input reaching CREATE statements. All six FK columns declared ON DELETE cascade (T-35-01 mitigated).

## Self-Check: PASSED

- [x] src/main/db/schema.ts modified and committed (66aa9f9)
- [x] src/main/db/index.ts modified and committed (7392e99)
- [x] tests/helpers/db.ts modified and committed (9c7fa78)
- [x] All commits exist in git log
- [x] `entity_overrides` DDL in index.ts and db.ts match character-for-character
- [x] 247 tests pass
