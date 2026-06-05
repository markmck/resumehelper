---
phase: 35-unified-override-table-migration
plan: 02
subsystem: data-layer
tags: [migration, sqlite, transaction, idempotent, test]
dependency_graph:
  requires: [entity_overrides-table, entity_overrides-drizzle-type, createTestDb-mirror]
  provides: [migrateBulletOverrides-fn, assertOverrideRowCounts-fn, ensureSchema-migration-wiring]
  affects: [src/main/db/migrateOverrides.ts, src/main/db/index.ts, tests/data/migrateOverrides.test.ts]
tech_stack:
  added: []
  patterns: [pure-function-extraction, sqlite.transaction-all-or-nothing, INSERT-OR-IGNORE-idempotency, warn-but-allow-assertion]
key_files:
  created:
    - src/main/db/migrateOverrides.ts
    - tests/data/migrateOverrides.test.ts
  modified:
    - src/main/db/index.ts
decisions:
  - "migrateBulletOverrides extracted as pure function taking raw sqlite instance — testable without launching Electron"
  - "INSERT OR IGNORE used with COUNT(*) guard — two-layer idempotency (COUNT guards the transaction, IGNORE guards the individual row insert on re-run)"
  - "assertOverrideRowCounts never throws (D-05) — returns result object, caller logs and continues"
  - "Test 1 uses dummy rows to ensure bulletId != analysisId — prevents autoincrement collision masking Pitfall 1"
metrics:
  duration: "~12 minutes"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 35 Plan 02: Bullet Override Migration + Startup Assertion Summary

**One-liner:** Transactional all-or-nothing migration of analysis_bullet_overrides into entity_overrides with COUNT-guard idempotency, NULL-variant skip-with-warn, and a startup row-count assertion that warns-but-allows (D-05).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract migrateBulletOverrides + assertOverrideRowCounts pure functions with tests | 4f7c342 | src/main/db/migrateOverrides.ts, tests/data/migrateOverrides.test.ts |
| 2 | Wire migrateBulletOverrides + assertOverrideRowCounts into ensureSchema() | 1931fd0 | src/main/db/index.ts |

## What Was Built

### migrateBulletOverrides (migrateOverrides.ts)

Pure function taking a raw `Database.Database` instance. On each call:

1. Counts un-migrated rows (analysis_bullet_overrides rows not yet in entity_overrides for the same analysis_id+bullet_id+entity_type='job_bullet') — the COUNT(*) guard.
2. Counts and warns about rows where `ar.variant_id IS NULL` (skip-with-warn, D-07).
3. If unmigrated count > 0, runs a single `sqlite.transaction(() => INSERT OR IGNORE ...)()`.
4. INSERT-SELECT maps: `abo.bullet_id → entity_overrides.bullet_id` (Pitfall 1 guarded), `abo.analysis_id`, `'job_bullet'` literal, `'text'` literal, `abo.override_text`, `abo.source` (verbatim), `abo.created_at`.
5. `WHERE ar.variant_id IS NOT NULL` in the SELECT — NULL rows never enter entity_overrides.
6. Returns `{ migrated, skippedNullVariant }`. Outer try/catch swallows failures (mirrors skill-tags precedent).

### assertOverrideRowCounts (migrateOverrides.ts)

Pure assertion function. Computes:
- `srcCount` = COUNT(*) from analysis_bullet_overrides
- `dstCount` = COUNT(*) from entity_overrides WHERE entity_type='job_bullet'
- `skippedNullVariant` = COUNT of abo rows where ar.variant_id IS NULL or no matching ar

Contract: `dstCount + skippedNullVariant === srcCount`. On mismatch: `console.error` + returns `{ ok: false, ... }`. Never throws. Returns `{ ok, srcCount, dstCount, skippedNullVariant }`.

### ensureSchema() wiring (index.ts)

Import added at the top. After the skill-tags migration block, two calls are added:
1. `migrateBulletOverrides(sqlite)` — fills entity_overrides
2. `assertOverrideRowCounts(sqlite)` — validates row counts; result drives a `console.warn` only, never throws or aborts launch (D-05)

### Tests (tests/data/migrateOverrides.test.ts)

8 tests across 2 describe blocks:

| Test | Description |
|------|-------------|
| Test 1 | Column mapping: bullet_id=3 != analysisId=2 — verifies Pitfall 1 is guarded |
| Test 2 | Row-count parity: N=3 source rows → N destination rows |
| Test 3 | Idempotency: calling twice produces same row count |
| Test 4 | NULL variant skip: 0 rows in entity_overrides; skippedNullVariant=1 |
| Test 5 | Source verbatim: 'manual_edit' preserved, not overwritten |
| Test 6 | Assertion warn-not-throw: mismatch returns ok:false, does not throw |
| + 2 | assertOverrideRowCounts ok:true and NULL-variant accounting tests |

## Verification

- `npx tsc --noEmit -p tsconfig.node.json` → exits 0
- `npm test -- tests/data/migrateOverrides.test.ts` → 8/8 tests pass
- Full suite: **255 tests passing, 0 failures** (8 new tests, no regressions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test 1 autoincrement collision masking Pitfall 1**
- **Found during:** Task 1 GREEN phase
- **Issue:** In the initial test setup, all autoincrement sequences start at 1, so bulletId=1 === analysisId=1 — the `expect(row!.bullet_id).not.toBe(analysisId)` assertion always failed even with a correct column mapping, making the guard useless.
- **Fix:** Added dummy rows before the test's key entity (dummy analysis + 2 dummy bullets) so that analysisId=2 and bulletId=3 are guaranteed distinct. The mapping guard is now meaningful.
- **Files modified:** tests/data/migrateOverrides.test.ts
- **Commit:** 4f7c342

## Known Stubs

None — this plan delivers migration logic only; no UI or read paths touched.

## Threat Flags

None — all SQL is static (no string interpolation). Transaction wrapping (T-35-03), NULL-variant skip-with-warn (T-35-06), and warn-but-allow assertion (T-35-05) all implemented per threat register. analysis_bullet_overrides untouched (T-35-SC / D-07).

## Self-Check: PASSED

- [x] src/main/db/migrateOverrides.ts created and committed (4f7c342)
- [x] tests/data/migrateOverrides.test.ts created and committed (4f7c342)
- [x] src/main/db/index.ts modified and committed (1931fd0)
- [x] migrateBulletOverrides(sqlite) called once in ensureSchema()
- [x] assertOverrideRowCounts(sqlite) called once in ensureSchema()
- [x] No throw statement in assertOverrideRowCounts executable code (only in JSDoc comment)
- [x] migration runs inside sqlite.transaction() (all-or-nothing)
- [x] analysis_bullet_overrides untouched (D-07)
- [x] 255 tests pass (8 new)
