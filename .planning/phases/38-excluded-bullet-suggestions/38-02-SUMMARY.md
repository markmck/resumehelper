---
phase: 38-excluded-bullet-suggestions
plan: "02"
subsystem: ai-handlers + schema + prompts
tags: [tdd, green, handlers, ipc, validation, llm-boundary]
dependency_graph:
  requires:
    - analysisExcludedBulletSuggestions table (Plan 01)
    - failing test suite (Plan 01)
  provides:
    - ensureExcludedBulletSuggestions handler with D-07 seed-time guards
    - acceptExcludedBulletSuggestion handler with D-07 accept-time re-validation + entityOverrides upsert
    - dismissExcludedBulletSuggestion handler
    - getExcludedBulletSuggestions handler with raw-SQL JOIN + JSON.parse
    - IPC registrations for get/accept/dismiss (ensure is server-side only)
    - runAnalysis excludedBulletsText injection + ensureExcludedBulletSuggestions seeding
    - ResumeScorerSchema.excluded_bullet_suggestions with .default([])
    - buildScorerPrompt optional excludedBulletsText param + system guidelines
  affects:
    - src/main/lib/aiProvider.ts
    - src/main/lib/analysisPrompts.ts
    - src/main/handlers/ai.ts
    - tests/unit/main/lib/aiProvider.schema.test.ts
tech_stack:
  added: []
  patterns:
    - D-07 LLM-to-DB validation gate (existence + exclusion check before write)
    - Manual delete+insert upsert in sqlite.transaction (nullable FK UNIQUE quirk)
    - field='inclusion' / source='inclusion' entityOverrides row for re-inclusion
    - Raw sqlite session shim for testability in getExcludedBulletSuggestions
    - Zod .default([]) for backward-compat LLM schema extension
key_files:
  created: []
  modified:
    - src/main/lib/aiProvider.ts
    - src/main/lib/analysisPrompts.ts
    - src/main/handlers/ai.ts
    - tests/unit/main/lib/aiProvider.schema.test.ts
decisions:
  - acceptExcludedBulletSuggestion re-validates at accept time (not only at seed time) because the variant may change between seeding and user accepting
  - field='inclusion' / source='inclusion' NOT field='text' — writing field='text' with overrideText='' would blank the bullet text (Pitfall 1 from PATTERNS.md)
  - ensureExcludedBulletSuggestions not registered as IPC handler — server-side only, called from runAnalysis
  - excludedBulletsText built from builderData.jobs (already merged/excluded-aware) not from raw DB query
metrics:
  duration: ~8 min
  completed: "2026-06-08"
  tasks: 2
  files: 4
---

# Phase 38 Plan 02: Handlers + Schema Extension + GREEN Tests Summary

Main-process surface for excluded-bullet suggestions: ResumeScorerSchema extended, buildScorerPrompt wired, four handlers implemented with D-07 validation gates, IPC registered, runAnalysis seeding wired — all Plan 01 RED tests now GREEN.

## What Was Built

**Task 1 — ResumeScorerSchema extension + buildScorerPrompt optional param**

Extended `ResumeScorerSchema` in `src/main/lib/aiProvider.ts` with `excluded_bullet_suggestions` immediately after `rewrite_suggestions`. The field uses `.default([])` (unlike `rewrite_suggestions` which has no default) so all existing `MockLanguageModelV3` cannedScore fixtures — which omit the field — continue to parse without change. The `bulletId` subfield uses `z.number().int().positive()` to reject 0 and negative IDs at parse time.

Extended `callResumeScorer` with an optional `excludedBulletsText?: string` fourth parameter, threaded to `buildScorerPrompt`.

Extended `buildScorerPrompt` in `src/main/lib/analysisPrompts.ts` with an optional third `excludedBulletsText?: string` parameter. Added the excluded-bullet system-prompt guidelines block (cap 3, [B{id}] marker, empty-rather-than-guess policy) after the existing rewrite-suggestion guidelines. The user prompt conditionally appends `## Excluded Bullets (base experience not on your variant)` only when `excludedBulletsText` is non-empty. `buildResumeTextForLlm` was not touched.

Extended `tests/unit/main/lib/aiProvider.schema.test.ts` with 7 new cases: `.default([])` backward compat, round-trip with valid data, bulletId=0 rejection, negative bulletId rejection, and three `buildScorerPrompt` cases (no arg, empty string, non-empty arg).

**Task 2 — Four handlers + IPC registration + runAnalysis wiring**

Added four exported functions to `src/main/handlers/ai.ts`:

- `ensureExcludedBulletSuggestions(db, analysisId, suggestions, excludedBulletIds)`: iterates suggestions, skips via `console.error + continue` if bulletId not in `job_bullets` (D-07 guard 1) or not in `excludedBulletIds` set (D-07 guard 2), then inserts a pending row only if `(analysisId, bulletId)` not already present. Tests 1-3 green.

- `acceptExcludedBulletSuggestion(db, analysisId, bulletId)`: resolves variantId from `analysisResults`; re-validates bulletId exists in `job_bullets` (returns `{error}` on miss); re-validates bullet is excluded in `template_variant_items` for the resolved variantId (returns `{error}` on miss); writes `entityOverrides` row using `sqlite.transaction()` manual delete+insert upsert with `field='inclusion'`, `overrideText=''`, `source='inclusion'`; flips suggestion status to 'accepted'. Tests 4-6 green.

- `dismissExcludedBulletSuggestion(db, analysisId, bulletId)`: flips status to 'dismissed', writes zero entityOverrides rows. Test 7 green.

- `getExcludedBulletSuggestions(db, analysisId)`: uses `(db as any).session` raw-prepare shim with sqlite fallback, JOINs `job_bullets` for `bulletText`, `JSON.parse`s `matchedKeywords`. Test 8 green.

Three `ipcMain.handle` registrations added in `registerAiHandlers`: `ai:getExcludedBulletSuggestions`, `ai:acceptExcludedBulletSuggestion`, `ai:dismissExcludedBulletSuggestion`. `ensureExcludedBulletSuggestions` has no IPC handle — server-side only.

`runAnalysis` wired: after `buildMergedBuilderData`, iterates `builderData.jobs[].bullets` to build `excludedBulletIds` set and `excludedBulletsText` string (`[B{id}] {text}` lines). Passes `excludedBulletsText` to `callResumeScorer`. After analysis row inserted, calls `ensureExcludedBulletSuggestions(db, inserted.id, scoreResult.excluded_bullet_suggestions, excludedBulletIds)`.

## Verification

- `npm test -- excludedBulletSuggestions`: 8/8 tests PASS (all Plan 01 RED tests now GREEN)
- `npm test -- mergedSurfaces`: 28/28 tests PASS (including Test 9 — accepted bullet flows through merge)
- `npm test -- aiProvider.schema`: 20/20 tests PASS (7 new cases + 13 existing)
- `npx tsc --noEmit -p tsconfig.node.json`: exits 0

## Deviations from Plan

None — plan executed exactly as written. The Node ABI mismatch (better-sqlite3 compiled for Node 140, test runner needed 137) required `npm rebuild better-sqlite3` before tests could run — this is a known project setup step documented in STATE.md (Phase 37 decisions) and is not a deviation.

## Threat Coverage

- T-38-03 mitigated: `acceptExcludedBulletSuggestion` re-validates bulletId exists in `job_bullets` AND is excluded in `template_variant_items` before any entityOverrides write. Mismatch returns `{error}` with `console.error` and writes 0 rows. Tests 5 and 6 prove it.
- T-38-04 mitigated: `ensureExcludedBulletSuggestions` drops any bulletId not in `job_bullets` or not in `excludedBulletIds` set via `console.error + continue`. Tests 2 and 3 prove it.
- T-38-05 mitigated: All writes use parameterized Drizzle inserts. `matchedKeywords` stored as JSON string, `JSON.parse`'d back. No string concatenation.

## Known Stubs

None — all four handlers are fully wired to real DB state.

## Self-Check: PASSED

- `src/main/lib/aiProvider.ts` contains `excluded_bullet_suggestions`: FOUND
- `src/main/lib/analysisPrompts.ts` contains `excludedBulletsText`: FOUND
- `src/main/handlers/ai.ts` contains `acceptExcludedBulletSuggestion`: FOUND
- `src/main/handlers/ai.ts` contains `ensureExcludedBulletSuggestions`: FOUND
- Commit 3621534 (Task 1): FOUND
- Commit 7b92c76 (Task 2): FOUND
- `npm test -- excludedBulletSuggestions`: 8 passed
- `npm test -- mergedSurfaces`: 28 passed
- `npm test -- aiProvider.schema`: 20 passed
