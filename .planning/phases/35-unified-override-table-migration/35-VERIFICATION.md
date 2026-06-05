---
phase: 35-unified-override-table-migration
verified: 2026-06-05T15:36:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 35: Unified Override Table Migration — Verification Report

**Phase Goal:** The new `entityOverrides` table exists, all existing analysis bullet overrides are migrated in with no data loss, and the `acceptSuggestion` write path uses the unified table — unblocking every subsequent phase.
**Verified:** 2026-06-05T15:36:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every `analysisBulletOverrides` row is present in `entityOverrides` after startup, verified by a post-migration row-count assertion that never hard-blocks launch | ✓ VERIFIED | `migrateBulletOverrides()` + `assertOverrideRowCounts()` wired in `ensureSchema()` (index.ts:374-385). `assertOverrideRowCounts` returns `{ok, srcCount, dstCount, skippedNullVariant}`, logs `console.error` + `console.warn` on mismatch, never throws (D-05). `migrateBulletOverrides` uses a per-row `NOT EXISTS` guard in the INSERT-SELECT for idempotency (migrateOverrides.ts:86-92). |
| 2 | `analysisBulletOverrides` remains intact and read-only — not dropped | ✓ VERIFIED | `CREATE TABLE IF NOT EXISTS \`analysis_bullet_overrides\`` present in index.ts:262-273, db.ts:206-217, and schema.ts:221-235. No DROP or write to it anywhere in the cutover code. Requirement "Dropping the old table" explicitly listed in REQUIREMENTS.md Out of Scope. |
| 3 | Accepting a bullet rewrite writes to `entityOverrides` (not the old table); accepted text appears in preview via mergeHelper Layer 3 | ✓ VERIFIED | `acceptSuggestion` in ai.ts:134-183 writes only to `entityOverrides` via a `sqlite.transaction()` delete+insert (atomic upsert — commit b478964 CR-01). Zero `analysisBulletOverrides` references in ai.ts. `mergeHelper.ts` Layer 3 (lines 276-308) reads from `entityOverrides` filtered to `eq(entityType, 'job_bullet')`. 265 tests pass including `acceptSuggestion.test.ts` (6 tests) and `mergeOverrides.test.ts` (3 tests). |
| 4 | `createTestDb()` in `tests/helpers/db.ts` includes the `entity_overrides` table and both partial unique indexes; all existing tests continue to pass | ✓ VERIFIED | db.ts:230-257 contains character-for-character copy of `CREATE TABLE IF NOT EXISTS \`entity_overrides\`` plus both `entity_overrides_variant_tier_uidx` and `entity_overrides_analysis_tier_uidx` partial indexes, matching index.ts:286-313. Full suite: **265 tests passing, 0 failures**. |
| 5 | The per-entity nullable FK schema decision (D-01) is committed and recorded in PROJECT.md | ✓ VERIFIED | PROJECT.md line 196: `entity_overrides uses per-entity nullable FK columns (bullet_id, project_id, job_id, project_bullet_id) + entity_type/field discriminators, NOT a generic entity_id` with full rationale row in Key Decisions table. Commit e872d4f. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main/db/schema.ts` | `entityOverrides` Drizzle table with 12 columns, all four nullable FK columns, `source` default `'user'` | ✓ VERIFIED | Lines 251-266: all required columns present, `variantId`/`analysisId` nullable (no `.notNull()`), all four FK columns with `onDelete: 'cascade'`, `source` defaults to `'user'`. `analysisBulletOverrides` retained at lines 221-235. |
| `src/main/db/index.ts` | `CREATE TABLE IF NOT EXISTS \`entity_overrides\`` + two partial unique indexes in `ensureSchema()`, plus `migrateBulletOverrides` + `assertOverrideRowCounts` calls | ✓ VERIFIED | DDL at lines 286-313. Migration calls at lines 374-385. Import at line 8. `analysis_bullet_overrides` CREATE retained at lines 262-273. |
| `src/main/db/migrateOverrides.ts` | Exports `migrateBulletOverrides` and `assertOverrideRowCounts`; transaction-wrapped; per-row NOT EXISTS guard; `assertOverrideRowCounts` never throws | ✓ VERIFIED | Both functions exported. `sqlite.transaction()` wraps INSERT-SELECT (line 70). Per-row `NOT EXISTS` guard in both COUNT query (lines 36-41) and INSERT-SELECT (lines 86-92) — commit b478964 CR-02. `assertOverrideRowCounts` contains no `throw` statement. |
| `src/main/handlers/ai.ts` | `acceptSuggestion`/`dismissSuggestion`/`getOverrides` use `entityOverrides` only; `acceptSuggestion` delete+insert wrapped in `sqlite.transaction()` | ✓ VERIFIED | Zero `analysisBulletOverrides` references in file. `acceptSuggestion` wraps delete+insert in `sqlite.transaction(() => { ... })()` at line 154 — commit b478964 CR-01. `getOverrides` uses parameterized SQL via `db.session.client.prepare(...)`. |
| `src/main/lib/mergeHelper.ts` | Layer 3 reads `entityOverrides` filtered to `entityType='job_bullet'` and `analysisId`; `applyOverrides` call site unchanged | ✓ VERIFIED | Lines 280-306: `db.select(...).from(entityOverrides).where(and(eq(entityOverrides.analysisId, analysisId), eq(entityOverrides.entityType, 'job_bullet')))`. Block still gates on `analysisId != null`. No Phase 36 scope creep. |
| `tests/helpers/db.ts` | `entity_overrides` CREATE + both partial indexes in `createTestDb()` | ✓ VERIFIED | Lines 230-257. DDL matches production `ensureSchema()` character-for-character. |
| `.planning/PROJECT.md` | D-01 row in Key Decisions table | ✓ VERIFIED | Line 196. Contains "per-entity nullable FK" and "NOT a generic entity_id" with ON DELETE CASCADE rationale. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ensureSchema()` (index.ts) | `migrateBulletOverrides` / `assertOverrideRowCounts` | import + function call after entity_overrides CREATE | ✓ WIRED | Import at line 8; calls at lines 376-384, after the CREATE block ending at line 314. |
| `acceptSuggestion` (ai.ts) | `entity_overrides` (analysis-tier) | `sqlite.transaction()` wrapping `db.delete + db.insert` | ✓ WIRED | Lines 154-176. Transaction ensures atomicity. No write to `analysisBulletOverrides`. |
| `mergeHelper.ts` Layer 3 | `entity_overrides` | `db.select().from(entityOverrides).where(analysisId + entityType)` | ✓ WIRED | Lines 280-308. `applyOverrides` call at line 306 unchanged. |
| `analysis_bullet_overrides.bullet_id` | `entity_overrides.bullet_id` | INSERT-SELECT `abo.bullet_id` → `bullet_id` column | ✓ WIRED | migrateOverrides.ts line 80: `abo.bullet_id` positional in INSERT column list. Pitfall 1 guarded by Test 1 in migrateOverrides.test.ts asserting `bullet_id=3 != analysisId=2`. |
| `createTestDb()` DDL | production `ensureSchema()` DDL | character-for-character mirror | ✓ WIRED | Both contain identical `entity_overrides` CREATE and both partial index statements. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `mergeHelper.ts` Layer 3 | `overrideRows` / `bulletOverrides` | `db.select().from(entityOverrides)` — real DB query | Yes — queries live `entity_overrides` rows seeded by `acceptSuggestion` or migration | ✓ FLOWING |
| `getOverrides` (ai.ts) | rows array | `db.session.client.prepare(...).all(analysisId)` — parameterized query | Yes — queries `entity_overrides` + LEFT JOINs `job_bullets` for `isOrphaned` | ✓ FLOWING |
| `assertOverrideRowCounts` | `srcCount`, `dstCount`, `skippedNullVariant` | Three `COUNT(*)` queries against `analysis_bullet_overrides` and `entity_overrides` | Yes — reads live table counts | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| 265 tests pass (including 6 acceptSuggestion + 3 mergeOverrides + 8 migrateOverrides) | `npm test` | 265 passed, 0 failed, 29 test files | ✓ PASS |
| Transaction wrapping present in `acceptSuggestion` | Source inspection ai.ts:154 | `sqlite.transaction(() => { db.delete... db.insert... })()` | ✓ PASS |
| Per-row NOT EXISTS guard in migration | Source inspection migrateOverrides.ts:86-92 | `WHERE ar.variant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM entity_overrides eo WHERE eo.analysis_id = abo.analysis_id AND eo.bullet_id = abo.bullet_id AND eo.entity_type = 'job_bullet')` | ✓ PASS |
| No `analysisBulletOverrides` write in ai.ts | `grep analysisBulletOverrides src/main/handlers/ai.ts` | No matches | ✓ PASS |
| `assertOverrideRowCounts` never throws | `grep throw src/main/db/migrateOverrides.ts` | No throw statements in executable code | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| OVR-01 | 35-01, 35-02, 35-03 | Existing analysis bullet overrides migrate into the unified override table with no data loss | ✓ SATISFIED | `migrateBulletOverrides` transactionally migrates all rows with resolvable `variant_id`; `assertOverrideRowCounts` validates parity at startup; 8 unit tests cover mapping/idempotency/NULL-variant skip. REQUIREMENTS.md traceability table shows OVR-01 Phase 35 Complete. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No TBD/FIXME/XXX markers or stub implementations found in modified files |

Scanned files: `src/main/db/schema.ts`, `src/main/db/index.ts`, `src/main/db/migrateOverrides.ts`, `src/main/handlers/ai.ts`, `src/main/lib/mergeHelper.ts`, `tests/helpers/db.ts`.

---

### Human Verification Required

None. All success criteria are verifiable programmatically and confirmed by the test suite.

---

### Gaps Summary

No gaps. All five must-haves are verified:

1. Migration with startup assertion — implemented, wired, tested (8 tests).
2. `analysisBulletOverrides` retained read-only — confirmed in all three locations.
3. `acceptSuggestion` writes to `entityOverrides` exclusively with atomic transaction; mergeHelper Layer 3 reads from same table — confirmed by source inspection and 9 tests.
4. `createTestDb()` mirrors production DDL including both partial indexes — confirmed character-for-character.
5. D-01 schema decision recorded in PROJECT.md Key Decisions — confirmed at line 196.

**Post-code-review fixes verified (commit b478964):**
- CR-01: `acceptSuggestion` delete+insert is wrapped in `sqlite.transaction()` — confirmed at ai.ts:154.
- CR-02: Migration has a per-row `NOT EXISTS` guard in the INSERT-SELECT — confirmed at migrateOverrides.ts:86-92.

**Test suite:** 265 passing, 0 failures across 29 test files.

---

_Verified: 2026-06-05T15:36:00Z_
_Verifier: Claude (gsd-verifier)_
