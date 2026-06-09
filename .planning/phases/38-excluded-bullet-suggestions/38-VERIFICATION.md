---
phase: 38-excluded-bullet-suggestions
verified: 2026-06-08T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Panel placement, Re-include/Dismiss/Revert, preview refresh, score nudge, and hide-when-empty"
    expected: "Panel appears directly below Bullet Rewrites and above Missing Skills; Re-include triggers preview refresh with bullet appearing and score ring nudging; Dismiss fades/removes the card; Revert removes bullet from preview; panel is absent when no excluded bullets match; variant's inclusion set is unchanged after Re-include."
    why_human: "Visual placement, Electron IPC round-trip behavior, preview refresh timing, and score-ring delta are UI behaviors that grep cannot verify."
---

# Phase 38: Excluded-Bullet Suggestions — Verification Report

**Phase Goal:** When running job analysis, the AI surfaces relevant base bullets the active variant excludes, users can accept a suggestion to include it for the current analysis only (without changing the variant), and accepted bullets appear in preview/export/snapshot.
**Verified:** 2026-06-08
**Status:** human_needed (all automated checks pass; one human checkpoint required per Plan 03)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The `analysis_excluded_bullet_suggestions` table exists in both `ensureSchema` (production) and `createTestDb` (test), in lockstep | VERIFIED | `src/main/db/index.ts` line 286, `tests/helpers/db.ts` line 236 — identical DDL with two FK clauses (analysis_id → analysis_results, bullet_id → job_bullets, both ON DELETE cascade) |
| 2 | The Drizzle table definition `analysisExcludedBulletSuggestions` is exported from `schema.ts` | VERIFIED | `src/main/db/schema.ts` line 251 — proper column set: id, analysisId FK, bulletId FK, reason, matchedKeywords (JSON default '[]'), status (default 'pending'), createdAt |
| 3 | `ResumeScorerSchema` emits `excluded_bullet_suggestions` with `.default([])` so fixtures that omit the field still parse | VERIFIED | `src/main/lib/aiProvider.ts` lines 45-58 — field present with `.default([])`. bulletId uses `.refine()` (not `.int().positive()`) confirming the Anthropic structured-output API fix: `exclusiveMinimum` is NOT emitted in the JSON schema |
| 4 | `runAnalysis` injects excluded bullets into the scorer prompt and seeds validated suggestions after analysis row creation | VERIFIED | `src/main/handlers/ai.ts` lines 97-145 — builds `excludedBulletIds` set + `excludedBulletsText` from merged builder data, passes to `callResumeScorer`, calls `ensureExcludedBulletSuggestions` after insert |
| 5 | `acceptExcludedBulletSuggestion` validates bulletId exists in `job_bullets` AND is excluded from the active variant before writing a `source='inclusion'` entityOverrides row (D-07) | VERIFIED | `src/main/handlers/ai.ts` lines 374-452 — Guard 1 (job_bullets existence), Guard 2 (templateVariantItems excluded=true), then `field: 'inclusion'` / `source: 'inclusion'` / `overrideText: ''` upsert; Tests 4-6 prove both error paths write 0 entityOverrides rows |
| 6 | The three renderer-facing handlers are exposed via `window.api.ai` in the preload bridge; `ensureExcludedBulletSuggestions` is NOT bridged | VERIFIED | `src/preload/index.ts` lines 288-293 — three `ipcRenderer.invoke` entries; grep of `ensureExcludedBulletSuggestion` in preload returns 0 matches |
| 7 | `src/preload/index.d.ts` has correct type signatures for all three bridged methods | VERIFIED | `src/preload/index.d.ts` lines 604-612 — `getExcludedBulletSuggestions` returns `Promise<Array<{bulletId, bulletText, reason, matchedKeywords, status}>>`, accept/dismiss return `Promise<{success} \| {error}>` |
| 8 | OptimizeVariant renders the "Bullets you excluded that match this job" panel below Bullet Rewrites / above Missing Skills with accept/dismiss/revert wired to IPC | VERIFIED | `src/renderer/src/components/OptimizeVariant.tsx` lines 1053-1246 — panel guarded by `status !== 'dismissed'` filter; `acceptBullet` calls IPC + flips state + calls `setPreviewRefreshKey`; `dismissBullet` + `revertBullet` present; placement comment at line 1053 confirms D-03 position |
| 9 | The `computedScore` useMemo folds accepted stagedBullets matchedKeywords into `resolvedCount` with no second score-delta label (D-06) | VERIFIED | `src/renderer/src/components/OptimizeVariant.tsx` lines 310-338 — second loop over `stagedBullets` where `status === 'accepted'`, `stagedBullets` in dep array; no additional "+N pts" label added |
| 10 | All 308 automated tests pass including Tests 1-9 (handler suite + integration assertion) | VERIFIED | SUMMARYs report 308/308; test file `tests/data/excludedBulletSuggestions.test.ts` contains all 8 handler tests with proper assertions; `tests/unit/integration/mergedSurfaces.test.ts` contains Test 9 at line 222 asserting `excluded:false` with analysisId and `excluded:true` without |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main/db/schema.ts` | `analysisExcludedBulletSuggestions` Drizzle table | VERIFIED | Line 251; all required columns present |
| `src/main/db/index.ts` | `analysis_excluded_bullet_suggestions` DDL in `ensureSchema` | VERIFIED | Line 286; two FK clauses present |
| `tests/helpers/db.ts` | Same DDL in `createTestDb` | VERIFIED | Line 236; byte-identical to production DDL |
| `tests/data/excludedBulletSuggestions.test.ts` | 8 handler tests (Tests 1-8) | VERIFIED | 229 lines; 8 `it()` cases across 4 `describe` blocks; `seedPrerequisites` inserts `templateVariantItems` row with `excluded: true` |
| `tests/unit/integration/mergedSurfaces.test.ts` | Test 9 integration assertion | VERIFIED | Lines 222-263; asserts both the excluded:false (with analysisId) and excluded:true (without) paths |
| `src/main/lib/aiProvider.ts` | `excluded_bullet_suggestions` field with `.default([])` | VERIFIED | Lines 45-58; `.refine()` used instead of `.int().positive()` (API fix confirmed) |
| `src/main/lib/analysisPrompts.ts` | `buildScorerPrompt` optional `excludedBulletsText?` param | VERIFIED | Line 28; conditional section appended at line 66 |
| `src/main/handlers/ai.ts` | Four handlers + IPC registrations + `runAnalysis` wiring | VERIFIED | All four functions exported; three IPC handles registered (lines 541-550); ensure NOT registered as IPC |
| `src/preload/index.ts` | Three bridge entries | VERIFIED | Lines 288-293; `ensure` deliberately absent |
| `src/preload/index.d.ts` | Three type signatures | VERIFIED | Lines 604-612 |
| `src/renderer/src/components/OptimizeVariant.tsx` | Panel + state + computedScore + handlers | VERIFIED | 8+ occurrences of `stagedBullets`; panel heading at line 1073; handlers at lines 466-493; score extension at lines 310-338 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `runAnalysis` (ai.ts) | `buildScorerPrompt` / `callResumeScorer` | `excludedBulletsText` built from merged bullets where `excluded` | WIRED | Lines 97-114; `excludedBulletsText` passed to `callResumeScorer` as 4th arg |
| `runAnalysis` (ai.ts) | `ensureExcludedBulletSuggestions` | Called after analysis row insert with `scoreResult.excluded_bullet_suggestions` + `excludedBulletIds` | WIRED | Line 145 |
| `acceptExcludedBulletSuggestion` | `entityOverrides` table | `source='inclusion'` / `field='inclusion'` upsert in `sqlite.transaction` | WIRED | Lines 415-437; correct fields confirmed |
| `acceptExcludedBulletSuggestion` | `job_bullets` + `template_variant_items` | D-07 existence + exclusion validation before write | WIRED | Lines 386-408; both guards present |
| `OptimizeVariant.tsx acceptBullet` | `VariantPreview` (via `previewRefreshKey`) | `setPreviewRefreshKey((k) => k + 1)` after IPC success | WIRED | Line 473; `VariantPreview` already receives `analysisId={analysis.id}` (line 1549 confirmed in research) |
| `OptimizeVariant.tsx computedScore` | score ring + below-target callout | `stagedBullets` folded into `resolvedCount` + `pendingExcludedBulletCount` in callout | WIRED | Lines 310-338 (computedScore), lines 1599-1637 (callout) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `OptimizeVariant.tsx` | `stagedBullets` | `window.api.ai.getExcludedBulletSuggestions(analysis.id)` → IPC → `getExcludedBulletSuggestions` handler → raw-SQL JOIN on `analysis_excluded_bullet_suggestions` + `job_bullets` | Yes — Drizzle/raw SQL query with real FK joins; JSON.parse on matchedKeywords | FLOWING |
| `ai.ts ensureExcludedBulletSuggestions` | `suggestions` | `scoreResult.excluded_bullet_suggestions` from LLM response parsed by `ResumeScorerSchema` | Yes — LLM structured output, validated by Zod `.refine()` before any DB write | FLOWING |
| `entityOverrides` rows | Written by `acceptExcludedBulletSuggestion` | Drizzle delete+insert in `sqlite.transaction` | Yes — real DB write with FK-validated bulletId | FLOWING |
| `buildMergedBuilderData` | `bullet.excluded` flag | Reads `entityOverrides` where `source='inclusion'` (Phase 36 merge mechanism) | Yes — proven by Test 9 integration assertion | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — Phase produces Electron/React renderer code and requires the running app for behavioral verification. Tests cover the handler logic; UI behavior goes to human checkpoint.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| SUG-01 | Plans 01, 02, 03 | During job analysis, app surfaces excluded base bullets that match job gaps | SATISFIED | `runAnalysis` injects excluded bullets into scorer prompt; AI returns suggestions; `ensureExcludedBulletSuggestions` seeds them; OptimizeVariant panel renders them |
| SUG-02 | Plans 01, 02, 03 | User can accept a suggestion to include it for current analysis only (variant unchanged) | SATISFIED | `acceptExcludedBulletSuggestion` writes `source='inclusion'` entityOverrides row scoped to `analysisId`; variant's `template_variant_items` not modified; Test 9 proves merge reads inclusion with analysisId but not without |
| SUG-03 | Plans 01, 02, 03 | User can dismiss a suggested excluded bullet | SATISFIED | `dismissExcludedBulletSuggestion` flips status to 'dismissed', writes 0 entityOverrides rows; Test 7 proves it; `dismissBullet` handler in OptimizeVariant |
| SUG-04 | Plans 01, 02 | Accepted excluded bullets appear in preview/export/snapshot for that analysis | SATISFIED | `acceptExcludedBulletSuggestion` writes `source='inclusion'` entityOverrides row; Phase 36 merge reads this row and sets `excluded:false` when `analysisId` is passed; `VariantPreview` already receives `analysisId={analysis.id}`; `setPreviewRefreshKey` triggers re-fetch on accept |

All four requirements mapped. No orphaned requirements for Phase 38.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No TBD/FIXME/XXX markers; no stub returns; no empty implementations in phase-modified files |

---

### Human Verification Required

#### 1. Panel Placement and Full User Flow

**Test:** Run `npm run dev`, open a variant that excludes at least one base bullet relevant to a job posting, run an analysis.
**Expected:**
- The "Bullets you excluded that match this job" panel appears DIRECTLY below "Bullet Rewrites" and ABOVE "Missing Skills" in the left pane.
- Each card shows bullet text, AI reason, matched keyword chips, and a "{N} pending" accent badge on the heading.
- "Re-include" click: bullet appears in the right-pane preview, card enters green "Re-included" state with a "Revert" button, score ring nudges upward (no second "+N pts" label — the existing one moves).
- "Revert" click on accepted card: bullet leaves preview, card returns to pending.
- "Dismiss" click: card is removed from the panel (filtered out, not dimmed at 50% — per the Plan 03 deviation from UI-SPEC, dismissed cards are absent from DOM rather than shown dimmed).
- On a variant with no excluded job-relevant bullets: panel is entirely absent (not an empty box).
- Variant Builder: the bullet is still excluded there — re-inclusion was analysis-scoped only.

**Why human:** Visual placement, Electron IPC latency, preview refresh timing, score-ring delta, and the "variant unchanged" assertion all require the running Electron application.

---

### Deviation Note

Plan 03 documented one intentional deviation: UI-SPEC §6 specifies opacity 0.5 for dismissed cards, but the panel guard (`.filter(b => b.status !== 'dismissed')`) removes them from the DOM entirely instead. The Plan 03 SUMMARY argues D-04 (hide-when-empty) takes precedence over §6, and the behavior is more correct. **Human checkpoint should confirm this is acceptable UX** (dismissed cards simply disappear rather than linger dimmed).

---

### Gaps Summary

No gaps. All ten must-haves are VERIFIED against actual codebase artifacts (not SUMMARY claims). The only outstanding item is the Plan 03 human checkpoint — a deliberate gate built into the plan itself, not a defect.

---

_Verified: 2026-06-08_
_Verifier: Claude (gsd-verifier)_
