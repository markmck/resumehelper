---
phase: 30-merge-helper-reconciliation-docx-showsummary-fix
plan: "04"
subsystem: integration
tags: [merge-helper, rewire, callsites, legacy-deletion, builder-data-type-flip]
---

## Plan 30-04: Rewire Callsites + Delete Legacy Merge Paths — SUMMARY

**Status:** Complete
**Plan:** `30-04-PLAN.md`
**Phase:** 30 (Merge-Helper Reconciliation + DOCX showSummary Fix)
**Wave:** 2
**Requirements addressed:** MERGE-01, DOCX-01

## What was built

The integration plan that ties Wave 1 together. All three IPC merge paths and the AI analysis path now feed from the single `buildMergedBuilderData` helper. The `BuilderData` interface in `src/preload/index.d.ts` flipped to positive-semantic `showSummary?: boolean` and renderer consumers were updated.

**Files modified (7):**

1. `src/main/handlers/export.ts` — deleted `getBuilderDataForVariant` (193 lines), rewired `export:docx` to call `buildMergedBuilderData` and pass `showSummary` as the 5th arg to `buildResumeDocx`. `export:pdf` and `export:snapshotPdf` paths preserved unchanged.

2. `src/main/handlers/templates.ts` — deleted `getBuilderData` (208 lines), rerouted `templates:getBuilderData` IPC to call `buildMergedBuilderData(db, variantId, analysisId)`. Channel name preserved per D-04. `setItemExcluded` and `createVariant` (sentinel writers) untouched.

3. `src/main/handlers/submissions.ts` — collapsed `buildSnapshotForVariant` (~250 lines) to a thin wrapper (~35 lines): variant metadata + helper call + frozen profile + frozen `showSummary` in `templateOptions` for snapshot immutability (D-06, D-07).

4. `src/preload/index.d.ts` — `BuilderData.summaryExcluded?: boolean` → `BuilderData.showSummary?: boolean`.

5. `src/renderer/src/PrintApp.tsx` — line 171 derivation flipped: `setShowSummary(builderData.showSummary ?? true)`.

6. `src/renderer/src/components/VariantEditor.tsx` — lines 110-113 derivation flipped: `setShowSummary(bd.showSummary ?? true)`. `setItemExcluded` write path unchanged (DB sentinel column still named `excluded`).

7. `src/main/handlers/ai.ts` — repointed from deleted `getBuilderDataForVariant` to `buildMergedBuilderData`. `_showSummary` discarded in destructure since the AI scoring path doesn't write summary toggles.

**Test fixup:** `tests/unit/handlers/templates.test.ts` — re-imported the merge helper as `getBuilderData` alias to keep all 15 existing test cases green without rewriting them. The behavior is identical; only the function moved.

## Verification

- ✓ `grep -E "function getBuilderData(ForVariant)?\\b" src/main/` returns 0 matches (function definitions deleted)
- ✓ `grep -rE "summaryExcluded" src/` returns 0 matches
- ✓ `grep -c "buildMergedBuilderData" src/main/handlers/{export,templates,submissions,ai}.ts` returns ≥ 2 in each
- ✓ `excludedJobIds = new Set` appears only in `src/main/lib/mergeHelper.ts:114` (Success Criterion #3 satisfied)
- ✓ `npx tsc --noEmit` exits clean
- ✓ `npm test` — 147/147 tests pass across 16 files

**Note on Success Criterion #3 literal grep:** The plan's literal `grep -rE "getBuilderDataForVariant|getBuilderData\\b|excludedJobIds = new Set" src/main/handlers/ src/main/lib/ | grep -v mergeHelper.ts` returns one match — the IPC channel name `'templates:getBuilderData'` in `templates.ts:450`. This match is the **channel name string literal**, not a parallel merge implementation. Per Plan §Task 2 Step 4 + PATTERNS.md Claude's Discretion bullet 1, the channel name was intentionally preserved. The intent of the success criterion (parallel merge implementations gone) is fully satisfied — `function getBuilderData(ForVariant)?\b` returns zero.

## Commits (4)

- `131d65c`: feat(30-04): rewire export:docx through buildMergedBuilderData and delete getBuilderDataForVariant
- `6475b55`: feat(30-04): route templates:getBuilderData IPC through buildMergedBuilderData and delete getBuilderData
- `04f9f89`: feat(30-04): collapse buildSnapshotForVariant to thin wrapper around buildMergedBuilderData
- `6e8e73e`: feat(30-04): flip BuilderData to showSummary, update renderer consumers, repoint ai.ts and tests to mergeHelper

## Deviations from plan

1. **Plan listed 6 files; actually modified 7** — `src/main/handlers/ai.ts` was not in `files_modified` but `runAnalysis` called the deleted `getBuilderDataForVariant`. Repointed to `buildMergedBuilderData` in the same commit as the BuilderData type flip. The AI path doesn't use `showSummary` for scoring so `_showSummary` is discarded.

2. **Plan listed 6 files; actually 1 test file also touched** — `tests/unit/handlers/templates.test.ts` imported the deleted `getBuilderData` for 4 test cases. Aliased the import to `buildMergedBuilderData` (`import { buildMergedBuilderData as getBuilderData }`) to preserve 15 existing test cases unchanged.

3. **Channel-name string match in Success Criterion #3 grep** — see verification note above. Channel preserved deliberately; the grep is a heuristic, the criterion intent (no parallel merge logic) holds.

## Self-Check: PASSED

- All three legacy merge implementations deleted
- All four call sites (export.ts, templates.ts, submissions.ts, ai.ts) feed from `buildMergedBuilderData`
- `buildResumeDocx` invoked with 5-arg signature in export.ts
- BuilderData uses `showSummary?: boolean` (positive-semantic)
- Renderers consume the positive flag directly
- `setItemExcluded` write path unchanged (DB column still `excluded`)
- Snapshot immutability preserved (`showSummary` frozen into `templateOptions`)
- Full typecheck and 147-test suite green
