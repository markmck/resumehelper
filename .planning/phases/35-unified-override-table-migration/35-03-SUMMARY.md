---
phase: 35-unified-override-table-migration
plan: 03
subsystem: data-layer
tags: [cutover, drizzle, sqlite, handlers, merge, tdd]
dependency_graph:
  requires: [entity_overrides-table, entity_overrides-drizzle-type, createTestDb-mirror, migrateBulletOverrides-fn]
  provides: [acceptSuggestion-entity_overrides, mergeHelper-layer3-entity_overrides, D-01-recorded]
  affects: [src/main/handlers/ai.ts, src/main/lib/mergeHelper.ts, .planning/PROJECT.md]
tech_stack:
  added: []
  patterns: [manual-delete-insert-upsert, drizzle-session-client-prepare, scoped-Layer3-redirect]
key_files:
  created:
    - tests/data/acceptSuggestion.test.ts
    - tests/data/mergeOverrides.test.ts
  modified:
    - src/main/handlers/ai.ts
    - src/main/lib/mergeHelper.ts
    - .planning/PROJECT.md
    - tests/unit/handlers/submissions.test.ts
    - tests/unit/handlers/templates.test.ts
    - tests/unit/main/lib/variantResumeBuilder.test.ts
decisions:
  - "Manual delete+insert upsert for acceptSuggestion — SQLite partial unique indexes with nullable FK columns do not fire ON CONFLICT when NULL values are present (NULLs treated as distinct per SQLite spec). onConflictDoUpdate with targetWhere generates correct SQL but the constraint never triggers for rows where project_id, job_id, project_bullet_id are all NULL."
  - "getOverrides uses drizzle db session client.prepare() with module-level sqlite fallback — enables testability with createTestDb() without hardwiring the production sqlite singleton"
  - "analysisBulletOverrides removed from ai.ts imports — frozen read-only per D-07; no reference remains in the three cut-over functions"
  - "Three pre-existing tests updated to seed entity_overrides instead of analysis_bullet_overrides (Rule 1 fix — they were testing the Layer 3 read path which now reads the new table)"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-05"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 6
---

# Phase 35 Plan 03: Write+Read Cutover to entity_overrides Summary

**One-liner:** acceptSuggestion/dismissSuggestion/getOverrides cut over to entity_overrides with manual delete+insert upsert; mergeHelper Layer 3 redirected to read job_bullet overrides from entity_overrides; D-01 per-entity-FK schema decision recorded in PROJECT.md.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for acceptSuggestion/dismissSuggestion/getOverrides | d013e21 | tests/data/acceptSuggestion.test.ts |
| 1 (GREEN) | Cut acceptSuggestion/dismissSuggestion/getOverrides over to entity_overrides | f1fcb32 | src/main/handlers/ai.ts |
| 2 (RED) | Failing tests for mergeHelper Layer 3 redirect | 1c6f159 | tests/data/mergeOverrides.test.ts |
| 2 (GREEN) | Redirect mergeHelper Layer 3 bullet read to entity_overrides | 734701c | src/main/lib/mergeHelper.ts, 3 test files |
| 3 | Record D-01 in PROJECT.md Key Decisions | e872d4f | .planning/PROJECT.md |

## What Was Built

### acceptSuggestion cutover (ai.ts)

`acceptSuggestion(db, analysisId, bulletId, text)`:
1. Resolves `variantId` from `analysis_results` via drizzle select.
2. Manual upsert: `db.delete(entityOverrides).where(analysisId + entityType + bulletId).run()` then `db.insert(entityOverrides).values({variantId, analysisId, entityType:'job_bullet', field:'text', bulletId, overrideText, source:'ai_suggestion'}).run()`.
3. No write to `analysis_bullet_overrides` — D-06 single source of truth.

`dismissSuggestion(db, analysisId, bulletId)`: deletes from `entityOverrides` filtered to `analysisId + entityType='job_bullet' + bulletId`.

`getOverrides(db, analysisId)`: parameterized SQL via `db.session.client.prepare(...)` (falls back to module-level `sqlite.prepare` in production). LEFT JOINs `job_bullets` for `isOrphaned`. Returns `suggestionId: null` (column does not exist on the new table).

IPC registrations (`ai:acceptSuggestion`, `ai:dismissSuggestion`, `ai:getOverrides`) unchanged.

### mergeHelper Layer 3 redirect (mergeHelper.ts)

Replaced `analysisBulletOverrides` read with `entityOverrides` read filtered to `eq(analysisId) + eq(entityType, 'job_bullet')`. Maps result rows to `BulletOverride[]` shape with `suggestionId: null`. The `applyOverrides(job.bullets, bulletOverrides)` call site is unchanged. The block still gates on `analysisId != null` — no Phase 36 scope creep.

### D-01 recorded (PROJECT.md)

New row in Key Decisions table: `entity_overrides uses per-entity nullable FK columns... NOT a generic entity_id` with ON DELETE CASCADE rationale.

### Tests

- `tests/data/acceptSuggestion.test.ts` — 6 tests (accept writes correct columns, upsert, dismiss, getOverrides correct shape, isOrphaned:true orphan case, error contract)
- `tests/data/mergeOverrides.test.ts` — 3 tests (accepted suggestion renders in preview, no analysisId = no override, migrated row renders)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SQLite partial unique index NULLs prevent onConflictDoUpdate from firing**
- **Found during:** Task 1 GREEN phase
- **Issue:** The plan specified `onConflictDoUpdate` with `targetWhere: sql\`analysis_id IS NOT NULL\`` to match the partial unique index. But for `job_bullet` overrides, `project_id`, `job_id`, and `project_bullet_id` are all NULL. SQLite treats NULLs as distinct in UNIQUE constraints, so the partial index never fires a conflict — each insert creates a duplicate row instead of updating.
- **Fix:** Replaced `onConflictDoUpdate` with an explicit delete+insert upsert: delete any existing `entity_overrides` row for `(analysisId, 'job_bullet', bulletId)` first, then insert fresh. This is semantically correct (at most one job_bullet override per analysis+bullet) and avoids the NULL uniqueness issue entirely.
- **Files modified:** src/main/handlers/ai.ts
- **Commit:** f1fcb32

**2. [Rule 1 - Bug] getOverrides used module-level sqlite singleton — not testable with createTestDb()**
- **Found during:** Task 1 GREEN phase
- **Issue:** The original `getOverrides` used `_db: Db` (underscore prefix) and called `sqlite.prepare(...)` from the module-level import. Tests pass their own in-memory `createTestDb()` instance, but `sqlite.prepare(...)` queries the production DB — returns 0 rows in tests.
- **Fix:** Renamed parameter to `db: Db` and access the raw sqlite connection via `db.session.client.prepare(...)` (drizzle's internal session client), falling back to the module-level `sqlite` singleton if the session client isn't accessible. Tests pass and production path continues working.
- **Files modified:** src/main/handlers/ai.ts
- **Commit:** f1fcb32

**3. [Rule 1 - Bug] Three pre-existing tests seeded analysis_bullet_overrides for Layer 3 test**
- **Found during:** Task 2 GREEN phase — full suite run
- **Issue:** After redirecting Layer 3 to read `entity_overrides`, three existing tests that verified Layer 3 override behavior (`submissions.test.ts`, `templates.test.ts`, `variantResumeBuilder.test.ts`) seeded data into `analysis_bullet_overrides`. With the redirect, those rows are invisible to Layer 3 — tests failed.
- **Fix:** Updated each test to use `acceptSuggestion(db, ...)` or direct `entity_overrides` insert instead of `seedBulletOverride`/`analysisBulletOverrides.insert`.
- **Files modified:** 3 test files
- **Commit:** 734701c

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. All writes use parameterized Drizzle queries or parameterized `prepare(...).all(analysisId)` (T-35-07 mitigated). No string-interpolated SQL. analysis_bullet_overrides untouched (D-07 / T-35-SC).

## Known Stubs

None — all three write/read paths are fully wired end-to-end. Accepted suggestion text renders in preview (Test 1 in mergeOverrides.test.ts validates this).

## Verification

- `npm test -- tests/data/acceptSuggestion.test.ts` → 6/6 tests pass
- `npm test -- tests/data/mergeOverrides.test.ts` → 3/3 tests pass
- Full suite: **264 tests passing, 0 failures** (9 new tests, no regressions)
- `npx tsc --noEmit -p tsconfig.node.json` → exits 0
- `grep -c "per-entity nullable FK" .planning/PROJECT.md` → 1

## Self-Check: PASSED

- [x] tests/data/acceptSuggestion.test.ts created and committed (d013e21)
- [x] src/main/handlers/ai.ts modified and committed (f1fcb32)
- [x] tests/data/mergeOverrides.test.ts created and committed (1c6f159)
- [x] src/main/lib/mergeHelper.ts modified and committed (734701c)
- [x] .planning/PROJECT.md modified and committed (e872d4f)
- [x] acceptSuggestion writes only to entity_overrides (no analysis_bullet_overrides reference in ai.ts)
- [x] Layer 3 reads from entityOverrides filtered to entityType='job_bullet'
- [x] D-01 row in PROJECT.md Key Decisions
- [x] 264 tests pass (9 new)
