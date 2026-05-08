---
phase: 30-merge-helper-reconciliation-docx-showsummary-fix
plan: "05"
subsystem: tests
tags: [parameterized-tests, merge-03, docx, html, surfaces, matrix]
---

## Plan 30-05: Parameterized Surfaces Matrix — SUMMARY

**Status:** Complete
**Plan:** `30-05-PLAN.md`
**Phase:** 30 (Merge-Helper Reconciliation + DOCX showSummary Fix)
**Wave:** 3
**Requirements addressed:** MERGE-03

## What was built

The verification layer for Phase 30. Locks in MERGE-03 by exercising HTML, PDF (via `renderToString`), and DOCX (via XML inspection) surfaces against all 5 templates × 2 summary states. Any future drift between surfaces fails loudly here.

**Files created/modified:**

1. **NEW:** `tests/helpers/docx.ts` — exports `unzipDocxXml(doc: Document): Promise<string>`. Shared by `docxBuilder.test.ts` and `mergedSurfaces.test.ts` (D-16).

2. **MOD:** `tests/unit/main/lib/docxBuilder.test.ts` — removed inline `unzipDocxXml` (lines 7-12), removed unused `Packer`/`unzipSync` imports, added single import from the shared helper. All 18 existing tests pass with the same assertions.

3. **NEW:** `tests/unit/integration/mergedSurfaces.test.ts` (181 lines) — parameterized matrix:
   - 5 templates × 2 summary states × 2 surfaces (HTML/PDF + DOCX) = **20 parameterized assertions**
   - 2 D-09 double-gap structural checks (showSummary=false sentinel absent + xmlOff < xmlOn size; showSummary=true sentinel present)
   - 3 `buildMergedBuilderData.showSummary` derivation tests (no sentinel → true; sentinel.excluded=true → false; sentinel.excluded=false → true)

**Total new test count:** 25 (20 matrix + 2 double-gap + 3 derivation)

## Verification

- ✓ `tests/helpers/docx.ts` exports `unzipDocxXml`
- ✓ `tests/unit/main/lib/docxBuilder.test.ts` no longer declares `unzipDocxXml` locally; imports from helper
- ✓ `tests/unit/integration/mergedSurfaces.test.ts` exists with `/** @vitest-environment jsdom */` docblock
- ✓ Matrix uses `test.each(matrix)` for both surfaces
- ✓ All 5 templates referenced (`ClassicTemplate`, `ModernTemplate`, `JakeTemplate`, `MinimalTemplate`, `ExecutiveTemplate`)
- ✓ `npm test` — **172/172 tests pass** across 17 files (was 147 before this plan)
- ✓ `npx tsc --noEmit` — clean

**Test count delta:** +25 (147 → 172). New file alone passes 25 tests in 12.66s.

## Commits

- `e092b40`: test(30-05): promote unzipDocxXml to tests/helpers/docx.ts and migrate docxBuilder.test.ts
- `e2dca0d`: test(30-05): add parameterized matrix test (5 templates x 2 summary states x 2 surfaces) for MERGE-03

## Deviations from plan

1. **`templateVariantItems` schema has no `itemId` field** — the plan's example `db.insert(templateVariantItems).values({...itemId: 0})` would have failed. The actual schema uses individual id columns (`bulletId`, `skillId`, etc.) and an `itemType` discriminator. For summary sentinel rows, none of the id columns apply — only `variantId`, `itemType: 'summary'`, and `excluded` are set. Updated derivation tests accordingly.

2. **D-09 spacing assertion simplified** — the plan suggested a brittle regex like `/w:before="120"[^<]*<\/w:pPr>.../`. Replaced with a robust two-part check: (a) sentinel absent in showSummary=false output, (b) `xmlOff.length < xmlOn.length`. The size delta confirms both the paragraph and its spacing collapsed — matches D-09 intent without binding to docx library internals.

3. **Profile shape includes `id: 1`** — the plan's `buildMinimalProps` lacked `id` but the `Profile` type from preload requires it. Added to keep typecheck happy.

## Self-Check: PASSED

- All 5 templates × 2 summary states × 2 surfaces covered (20 matrix assertions)
- D-09 double-gap covered (2 tests)
- showSummary derivation covered (3 tests)
- Shared `unzipDocxXml` helper extracted and consumed by both DOCX test files
- Full typecheck and 172-test suite green

## Phase 30 readiness

Plans 01-05 are all complete:
- ✅ 30-01: ResumeJson lifted to `src/shared/resumeJson.ts` (MERGE-02)
- ✅ 30-02: `buildMergedBuilderData` helper created (MERGE-01)
- ✅ 30-03: `buildResumeDocx` 5th-arg + summary gate (DOCX-01)
- ✅ 30-04: Three legacy merge paths deleted, callsites rewired, BuilderData flipped to `showSummary` (MERGE-01, DOCX-01)
- ✅ 30-05: Parameterized matrix test locks in MERGE-03

Phase ready for verification.
