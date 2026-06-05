---
phase: 35-unified-override-table-migration
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/main/db/schema.ts
  - src/main/db/index.ts
  - src/main/db/migrateOverrides.ts
  - src/main/handlers/ai.ts
  - src/main/lib/mergeHelper.ts
  - tests/helpers/db.ts
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: partially_resolved
resolved_in: b478964
resolved:
  - CR-01
  - CR-02
  - WR-01
remaining_advisory:
  - WR-02
  - WR-03
  - WR-04
  - WR-05
  - WR-06
  - INFO (4)
---

> **Resolution note (2026-06-05):** Both criticals (CR-01 atomic upsert, CR-02
> per-row idempotent migration) and WR-01 were fixed in commit `b478964`, with a
> new partial-migration regression test (Test 3b). 265 tests pass. The remaining
> warnings/info are advisory — WR-05/WR-06 are forward-looking Phase 36 concerns
> (variant scoping + field generalization) and are intentionally deferred there.


# Phase 35: Code Review Report

**Reviewed:** 2026-06-05
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

This phase introduces a unified `entity_overrides` table, a startup migration from `analysis_bullet_overrides`, and cuts `acceptSuggestion` / `dismissSuggestion` / `getOverrides` plus mergeHelper Layer 3 over to the new table.

**Good news on the explicitly-flagged concerns:**
- **SQL injection:** No injection vectors found. The raw-SQL paths (`getOverrides`, migration, assertion) all use parameter binding (`.all(analysisId)`) or string literals — no user data is concatenated into SQL. The Drizzle paths are fully parameterized.
- **DDL mirror:** `ensureSchema()` (index.ts) and `createTestDb()` (tests/helpers/db.ts) are a character-for-character match for the `entity_overrides` table and both partial unique indexes. This is correct.
- **Migration idempotency on the happy path:** verified by Test 3 — the `unmigrated.cnt` NOT-EXISTS guard short-circuits before the INSERT on a clean re-run.

**Key concerns:** The delete+insert upsert in `acceptSuggestion` is not atomic and can lose an existing override on partial failure (CR-01). The migration's `INSERT OR IGNORE` relies on a partial unique index that SQLite cannot enforce because every keyed column except `analysis_id` is NULL — so the only thing preventing duplicates is the coarse early-return guard, which fails open under any partial-migration state (CR-02). Several robustness and consistency warnings follow.

## Critical Issues

### CR-01: Non-atomic delete+insert in `acceptSuggestion` can permanently lose an existing override

**File:** `src/main/handlers/ai.ts:151-171`
**Issue:** The upsert replaces `onConflictDoUpdate` with an unconditional `DELETE` followed by a separate `INSERT`, but the two statements are **not wrapped in a transaction**. If the process crashes, the DB throws, or any error occurs between the `.delete().run()` and the `.insert().run()` (e.g. a constraint/disk error on insert), the previously-accepted override is gone and no replacement is written — silent data loss of user-accepted suggestion text. The catch block reports the error but cannot recover the deleted row.

This is strictly worse than the `onConflictDoUpdate` it replaced, which was atomic by construction.

**Fix:** Wrap the delete+insert in a single transaction so it is all-or-nothing:
```ts
db.transaction((tx) => {
  tx.delete(entityOverrides)
    .where(and(
      eq(entityOverrides.analysisId, analysisId),
      eq(entityOverrides.entityType, 'job_bullet'),
      eq(entityOverrides.bulletId, bulletId),
    ))
    .run()
  tx.insert(entityOverrides)
    .values({ variantId, analysisId, entityType: 'job_bullet', field: 'text', bulletId, overrideText: text, source: 'ai_suggestion' })
    .run()
})
```

### CR-02: Migration `INSERT OR IGNORE` cannot dedupe — partial-migration re-run silently duplicates rows

**File:** `src/main/db/migrateOverrides.ts:65-84` (insert), `src/main/db/index.ts:307-313` (index)
**Issue:** The migration's only per-row dedupe mechanism is `INSERT OR IGNORE` leaning on `entity_overrides_analysis_tier_uidx`. That index covers `(analysis_id, entity_type, bullet_id, project_id, job_id, project_bullet_id, field)`. For every migrated `job_bullet` row, `project_id`, `job_id`, and `project_bullet_id` are all NULL. **SQLite treats NULLs as distinct in UNIQUE indexes**, so this index never reports a conflict for these rows — `INSERT OR IGNORE` degrades to a plain `INSERT`.

The migration's actual safety net is the coarse `unmigrated.cnt` early-return guard (lines 32-63). That guard is binary over the whole table: if *any* source row is unmigrated, the INSERT runs over **all** source rows. So in any partial-migration state — e.g. a prior crash mid-transaction left some but not all rows migrated, or a row was hand-edited — re-running on launch re-inserts the already-migrated rows as duplicates. `entity_overrides` then has two job_bullet rows for the same `(analysis_id, bullet_id)`, and `getOverrides` / mergeHelper Layer 3 will return/apply a non-deterministic one. The comment at lines 23-24 ("INSERT OR IGNORE prevent duplicates") is therefore inaccurate.

Note the inline comment in `acceptSuggestion` (ai.ts:144-148) already documents exactly this SQLite NULL-distinctness behavior — but the migration relies on the very index that limitation defeats.

**Fix:** Make the INSERT genuinely per-row idempotent with an explicit `WHERE NOT EXISTS` so it does not depend on the unenforceable index:
```sql
INSERT INTO entity_overrides (variant_id, analysis_id, entity_type, bullet_id, field, override_text, source, created_at)
SELECT ar.variant_id, abo.analysis_id, 'job_bullet', abo.bullet_id, 'text', abo.override_text, abo.source, abo.created_at
FROM analysis_bullet_overrides abo
JOIN analysis_results ar ON ar.id = abo.analysis_id
WHERE ar.variant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM entity_overrides eo
    WHERE eo.analysis_id = abo.analysis_id
      AND eo.bullet_id   = abo.bullet_id
      AND eo.entity_type = 'job_bullet'
  )
```
(Same correlated condition already used for the `unmigrated` count — reuse it per-row.)

## Warnings

### WR-01: `migrated` return value reports total table count, not rows actually inserted

**File:** `src/main/db/migrateOverrides.ts:86-91`
**Issue:** After the transaction, `migrated` is computed as `SELECT COUNT(*) FROM entity_overrides WHERE entity_type = 'job_bullet'` — the **total** job_bullet rows, including any pre-existing ones from prior runs or from `acceptSuggestion`. The field name and JSDoc (`@returns { migrated, ... }`) imply it is the number migrated this invocation. A caller logging or asserting on `migrated` will get a misleading number once the table contains any non-migration rows.

**Fix:** Capture `info.changes` from the prepared statement's `.run()` result, which returns the actual rows inserted:
```ts
const info = stmt.run()
return { migrated: info.changes, skippedNullVariant }
```

### WR-02: Assertion `srcCount` includes orphan-analysis rows that can never migrate, masking real loss

**File:** `src/main/db/migrateOverrides.ts:111-145`
**Issue:** `srcCount` counts **all** `analysis_bullet_overrides` rows (line 112-114). The `skippedRow` count (line 121-126) uses a `LEFT JOIN` and counts rows where `ar.variant_id IS NULL OR ar.id IS NULL`. But the migration INSERT uses an **inner** `JOIN analysis_results` (line 79), so rows whose `analysis_id` has no matching `analysis_results` row are never inserted — and they are correctly bucketed into `skipped` here. That part is internally consistent.

However, this means the assertion's notion of "skipped" silently absorbs orphaned-FK rows into the "expected to be skipped" bucket. If a genuine migration bug dropped a *valid* (variant-resolvable) row, but an unrelated orphan row also exists, the arithmetic `dstCount + skippedNullVariant === srcCount` can coincidentally still balance, hiding the loss. The two failure modes (legitimately-skippable vs. lost) are conflated into one number.

**Fix:** Split the counts: assert `dstCount === (count of abo rows with resolvable non-null variant)` independently, and report orphan/null-variant rows as a separate informational figure rather than folding them into the equality check.

### WR-03: Migration result is discarded; `migrated`/`skippedNullVariant` never surfaced at the call site

**File:** `src/main/db/index.ts:376`
**Issue:** `migrateBulletOverrides(sqlite)` is called but its return value (`migrated`, `skippedNullVariant`) is thrown away. Only `assertOverrideRowCounts` is consumed. If the migration silently fails its internal try/catch (returns `{ migrated: 0, skippedNullVariant: 0 }` at line 94), the only signal is the assertion mismatch — and even that "warns but allows." There is no positive confirmation in logs of how many rows migrated on a normal run.

**Fix:** Log the migration result on success, e.g. `console.info('[ensureSchema] migrated N overrides, skipped M null-variant rows')`, so a failed/empty migration is distinguishable from a clean no-op.

### WR-04: `migrate()` file-based migrator runs *after* the data migration and may operate on a different DB handle

**File:** `src/main/db/index.ts:374-398`
**Issue:** Ordering: `ensureSchema` runs the raw DDL exec, then `migrateBulletOverrides(sqlite)` on the raw handle, then `assertOverrideRowCounts`, then finally `migrate(getDb(), ...)`. `getDb()` lazily constructs the Drizzle wrapper over `getSqlite()`. Because `getSqlite()` calls `ensureSchema` only on first open, and `ensureSchema` itself calls `getDb()` here re-entrantly, the wrapping is fine in practice — but the file-based `migrate()` (drizzle journal) running *last*, after the table is already fully built by `ensureSchema`, means its outcome is intentionally ignored (catch swallows all errors, lines 395-397). This makes the file-based migration path effectively dead/decorative for these tables, and any real schema drift it was meant to catch is silenced. The drizzle journal (`_journal.json`) has no entry for `entity_overrides`, confirming the file migrator is not the source of truth here.

**Fix:** Either remove the now-redundant `migrate()` call for tables fully managed by `ensureSchema`, or narrow the catch so genuine migration errors are logged rather than uniformly swallowed. At minimum document that file-based migrations are decorative for ensureSchema-managed tables.

### WR-05: mergeHelper Layer 3 override query is not scoped by `variantId`

**File:** `src/main/lib/mergeHelper.ts:279-308`
**Issue:** The Layer 3 override fetch filters only on `analysisId` and `entityType = 'job_bullet'` (lines 287-292), ignoring the `variantId` argument the function received. This relies on the invariant "one analysis maps to exactly one variant." That invariant holds today, but `entity_overrides.variant_id` is nullable and `acceptSuggestion` writes whatever `analysisRow.variantId` resolves to (which may be NULL). If an analysis ever has overrides whose stored `variant_id` differs from the `variantId` passed to `buildMergedBuilderData`, the wrong override text is applied with no guard. The function silently trusts cross-column consistency it does not verify.

**Fix:** If the analysis-tier override is meant to be variant-agnostic, document that explicitly. Otherwise add `eq(entityOverrides.variantId, variantId)` (or assert the resolved variant matches) so a mismatch surfaces instead of producing wrong output.

### WR-06: `dismissSuggestion` deletes only the analysis-tier row but `getOverrides` reads any `analysis_id`-matching row

**File:** `src/main/handlers/ai.ts:180-196`, `src/main/handlers/ai.ts:208-216`
**Issue:** `dismissSuggestion` deletes rows matching `analysisId + entityType='job_bullet' + bulletId`. `getOverrides` selects rows matching `analysis_id = ? AND entity_type = 'job_bullet'` with no `field` filter. Because the schema permits multiple `field` values per `(analysis_id, bullet_id)` (the unique index includes `field`), once Phase 36 adds non-`text` fields, dismiss will leave sibling-field rows that `getOverrides` still returns. Today only `field='text'` exists so behavior is correct, but the asymmetry (delete ignores `field`, read ignores `field`, insert always sets `field='text'`) is a latent inconsistency that will break when the table is generalized as the comments promise.

**Fix:** Make all three operations consistently scope (or consistently ignore) `field` now, while only one value exists, so the contract is explicit before generalization.

## Info

### IN-01: Stale comment references the retired `analysisBulletOverrides` source

**File:** `src/main/lib/mergeHelper.ts:7`
**Issue:** The module header still lists `analysis-level overrides (analysisBulletOverrides)` as the Layer 3 source, but Layer 3 was cut over to `entityOverrides` (lines 276-308). The comment now contradicts the code.

**Fix:** Update line 7 to reference `entity_overrides (job_bullet entity type)`.

### IN-02: `entity_overrides` has no index on the common `(analysis_id, entity_type)` read path

**File:** `src/main/db/index.ts:286-313`
**Issue:** The only indexes on `entity_overrides` are the two partial UNIQUE indexes whose leading columns are `variant_id` and `analysis_id` respectively. The hottest read (`getOverrides`, mergeHelper Layer 3) filters on `analysis_id = ? AND entity_type = 'job_bullet'`. The analysis-tier partial index leads with `analysis_id` so it is usable here, so this is informational rather than a correctness issue — flagging only so the partial-index dependency for reads is a conscious choice. (Performance is out of scope for v1; noted for completeness.)

**Fix:** None required for correctness. Confirm the partial index is acceptable as the read path's covering index.

### IN-03: Empty/normalizing catch blocks swallow all errors uniformly

**File:** `src/main/db/index.ts:344` (`catch { }`), `src/main/db/index.ts:372`, `src/main/db/index.ts:395-397`
**Issue:** Several `catch { /* ... */ }` blocks discard the error object entirely. For `ALTER TABLE` "column already exists" this is intentional and fine. But the skill-tag migration catch (line 372) and the file-migrator catch (lines 395-397) swallow *any* error — including genuine corruption — with only a comment. A real failure here is indistinguishable from the expected no-op.

**Fix:** Inspect the caught error and only swallow the known-benign cases (e.g. message includes "duplicate column" / "already exists"); log anything else.

### IN-04: Test helper `createTestSqlite()` duplicates DDL a third time, outside the two-way mirror

**File:** `tests/data/migrateOverrides.test.ts:19-126` (cross-reference)
**Issue:** The phase carefully keeps `ensureSchema()` and `createTestDb()` in lock-step, but the migration test maintains a *third*, hand-trimmed copy of the same DDL (`createTestSqlite`). It currently matches for the relevant tables, but it is a separate drift surface that the "keep in sync" comment in `tests/helpers/db.ts:9-10` does not cover. A future column add to `entity_overrides` must be applied in three places, not two.

**Fix:** Have the migration test reuse `createTestDb()` (and expose the underlying sqlite handle) instead of re-declaring DDL, eliminating the third copy.

---

_Reviewed: 2026-06-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
