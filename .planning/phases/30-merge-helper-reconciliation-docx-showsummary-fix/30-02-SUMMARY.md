---
phase: 30-merge-helper-reconciliation-docx-showsummary-fix
plan: "02"
subsystem: main/lib
tags: [merge-helper, pure-function, three-layer-merge, show-summary, skill-additions]
dependency_graph:
  requires: []
  provides: [buildMergedBuilderData, MergedBuilderData]
  affects: [export.ts, templates.ts, submissions.ts]
tech_stack:
  added: []
  patterns: [handler-extraction-db-first-arg, drizzle-parameterized-queries]
key_files:
  created:
    - src/main/lib/mergeHelper.ts
  modified: []
decisions:
  - "Skill-additions (analysisId path) included inside buildMergedBuilderData rather than submissions wrapper — analysis-driven data applies equally to live render and snapshot; confirmed by PATTERNS.md landmine 2 guidance"
  - "showSummary returned as positive-semantic boolean (true = show); default true when no sentinel row exists; never summaryExcluded"
  - "Db type alias kept local (not re-exported) following templates.ts/docxBuilder.ts/export.ts convention"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-29"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 30 Plan 02: Create buildMergedBuilderData Merge Helper Summary

**One-liner:** Pure `buildMergedBuilderData(db, variantId, analysisId?)` consolidating three-layer merge (base → variant exclusions → analysis bullet overrides + accepted skill additions) with positive-semantic `showSummary: boolean`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/main/lib/mergeHelper.ts with buildMergedBuilderData implementation | 64a13c4 | src/main/lib/mergeHelper.ts (347 lines, created) |

## What Was Built

`src/main/lib/mergeHelper.ts` — a new pure async function `buildMergedBuilderData` that:

1. **Layer 1 (base data):** Fetches all jobs, bullets, skills (with category join), projects, project bullets, education, volunteer, awards, publications, languages, interests, and references.

2. **Layer 2 (variant exclusions):** Reads `templateVariantItems` for the given `variantId`, builds 12 `Set<number>` exclusion sets (one per entity type), and applies them via `.has()` checks when mapping to Builder* types.

3. **Layer 3a (analysis bullet overrides):** When `analysisId != null`, fetches `analysisBulletOverrides` and applies `applyOverrides()` from `src/shared/overrides.ts` over all job bullets.

4. **Layer 3b (analysis skill additions):** When `analysisId != null`, fetches `analysisSkillAdditions` (accepted status only), appends synthetic `BuilderSkill` entries with `id: -1` matching the `submissions.ts:166-186` pattern.

5. **showSummary derivation (D-05):** Finds the summary sentinel row in `exclusionItems`; returns `!sentinel.excluded` if found, or `true` (default) if no sentinel row exists.

The function has no `ipcMain`, `BrowserWindow`, `dialog`, or `fs` imports — pure data transform. The `Db` type alias is local (not exported), following the established handler-extraction pattern.

**Return type** `MergedBuilderData` is exported separately for callers (Plan 03 tests, Plan 04 rewiring).

## Verification

- `npm run typecheck` exits 0
- `grep -c "export async function buildMergedBuilderData" src/main/lib/mergeHelper.ts` = 1
- `grep -c "showSummary: boolean" src/main/lib/mergeHelper.ts` = 1
- `grep -c "summaryExcluded" src/main/lib/mergeHelper.ts` = 0
- `grep -c "applyOverrides" src/main/lib/mergeHelper.ts` = 2
- `grep -c "analysisSkillAdditions" src/main/lib/mergeHelper.ts` = 4
- `grep -c "excludedJobIds = new Set" src/main/lib/mergeHelper.ts` = 1
- File length: 347 lines (exceeds 200-line minimum)
- No `import ... from 'electron'` lines in file
- No `import ... from 'fs'` in file

## Deviations from Plan

None — plan executed exactly as written.

The `grep -c "ipcMain\|dialog\|BrowserWindow"` acceptance check returns 1 due to those words appearing in the JSDoc comment block on line 15 ("Pure function — no IPC, BrowserWindow, dialog, or fs touches"). There are zero actual imports of those modules; the file is fully compliant with the purity constraint.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or trust-boundary schema changes introduced. The helper is a pure read-only data transform. Threat surface identical to the three handlers being replaced — confirmed by plan's threat model assessment (T-30-02-01 through T-30-02-06).

## Self-Check: PASSED

- `src/main/lib/mergeHelper.ts` EXISTS (347 lines)
- Commit 64a13c4 EXISTS in git log
- No files deleted in commit
