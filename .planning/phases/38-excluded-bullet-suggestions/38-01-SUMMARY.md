---
phase: 38-excluded-bullet-suggestions
plan: "01"
subsystem: db-schema + test-infrastructure
tags: [schema, tdd, red-baseline, sqlite, drizzle]
dependency_graph:
  requires: []
  provides:
    - analysisExcludedBulletSuggestions Drizzle table definition
    - analysis_excluded_bullet_suggestions DDL in ensureSchema
    - analysis_excluded_bullet_suggestions DDL in createTestDb
    - failing test suite for ensure/accept/dismiss/get handlers (Tests 1-8)
    - integration assertion for accept->merge->excluded:false (Test 9)
  affects:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - tests/helpers/db.ts
    - tests/data/excludedBulletSuggestions.test.ts
    - tests/unit/integration/mergedSurfaces.test.ts
tech_stack:
  added: []
  patterns:
    - Drizzle sqliteTable definition with integer FK (analysisSkillAdditions analog)
    - CREATE TABLE IF NOT EXISTS DDL lockstep (v2.6 rule)
    - TDD RED baseline — handlers imported before implementation (Nyquist)
    - seedPrerequisites with templateVariantItems excluded:true for D-07 tests
key_files:
  created:
    - tests/data/excludedBulletSuggestions.test.ts
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - tests/helpers/db.ts
    - tests/unit/integration/mergedSurfaces.test.ts
decisions:
  - analysisExcludedBulletSuggestions uses bulletId integer FK instead of skillName text — bullets have stable DB IDs suitable for FK constraint
  - matchedKeywords stored as text NOT NULL DEFAULT '[]' (JSON string[]) — same pattern as other JSON array columns in schema
  - DDL added in lockstep to both ensureSchema and createTestDb in same commit — v2.6 lockstep rule
  - Test 9 imports ensureExcludedBulletSuggestions and acceptExcludedBulletSuggestion — mergedSurfaces test owns integration assertion
metrics:
  duration: ~10 min
  completed: "2026-06-08"
  tasks: 2
  files: 5
---

# Phase 38 Plan 01: Schema + RED Test Baseline Summary

Schema foundation for excluded-bullet suggestions: Drizzle table definition + identical DDL in both production schema (ensureSchema) and test helper (createTestDb) in lockstep, plus 8 failing handler tests and 1 integration assertion that serve as the GREEN target for Plan 02.

## What Was Built

**Task 1 — analysisExcludedBulletSuggestions table + DDL in lockstep**

Added the `analysisExcludedBulletSuggestions` Drizzle table to `src/main/db/schema.ts` immediately after the `analysisSkillAdditions` block. The table follows the exact same shape with substitutions:
- `bulletId` integer FK (references `jobBullets.id`, ON DELETE cascade) replaces `skillName` text
- `matchedKeywords` text NOT NULL DEFAULT `'[]'` added for JSON-serialized keyword array
- `category` column dropped (bullets are already scoped to jobs)
- `analysisId` FK, `reason`, `status`, `createdAt` pattern identical to analog

The corresponding `CREATE TABLE IF NOT EXISTS` DDL block was appended to `ensureSchema` in `src/main/db/index.ts` and to `createTestDb` in `tests/helpers/db.ts` — both with two FOREIGN KEY clauses (analysis_id → analysis_results, bullet_id → job_bullets, both ON DELETE cascade). TypeScript compilation exits 0.

**Task 2 — Failing handler test suite (RED baseline)**

Created `tests/data/excludedBulletSuggestions.test.ts` with 8 `it()` cases across 4 `describe` blocks, modeled on `acceptSuggestion.test.ts`. The `seedPrerequisites` helper inserts jobPostings, templateVariants, analysisResults, jobs, jobBullets, AND a `templateVariantItems` row with `excluded: true` so D-07 validation has the required exclusion data. Tests import the four handlers from `../../src/main/handlers/ai` — they do not exist yet — causing all 8 tests to fail RED as required by the Nyquist rule.

Extended `tests/unit/integration/mergedSurfaces.test.ts` with a new `describe` block containing Test 9: after `acceptExcludedBulletSuggestion` writes the inclusion row, `buildMergedBuilderData(db, variantId, analysisId)` yields that bullet with `excluded:false`; `buildMergedBuilderData(db, variantId)` (no analysisId) yields `excluded:true` (variant unchanged — SUG-02 boundary).

## Verification

- `npx tsc --noEmit -p tsconfig.node.json` exits 0
- `analysis_excluded_bullet_suggestions` DDL confirmed in both `src/main/db/index.ts` and `tests/helpers/db.ts`
- `npm test -- excludedBulletSuggestions` runs and fails RED (8 tests failing) — expected Nyquist baseline

## Deviations from Plan

None — plan executed exactly as written.

## Threat Coverage

- T-38-01 mitigated: `bullet_id` declared as NOT NULL FK referencing `job_bullets` with ON DELETE cascade in both DDL sites. Application-layer drop (D-07 validation) belongs to Plan 02 handlers.
- T-38-02 mitigated: Identical DDL added to both `ensureSchema` and `createTestDb` in the same commit (94f9731). Grep confirms both contain the table.

## Self-Check: PASSED

- `src/main/db/schema.ts` contains `analysisExcludedBulletSuggestions`: FOUND
- `src/main/db/index.ts` contains `analysis_excluded_bullet_suggestions`: FOUND
- `tests/helpers/db.ts` contains `analysis_excluded_bullet_suggestions`: FOUND
- `tests/data/excludedBulletSuggestions.test.ts` exists: FOUND
- `tests/unit/integration/mergedSurfaces.test.ts` contains `excluded`: FOUND
- Commit 94f9731 (Task 1): FOUND
- Commit 090d82b (Task 2): FOUND
