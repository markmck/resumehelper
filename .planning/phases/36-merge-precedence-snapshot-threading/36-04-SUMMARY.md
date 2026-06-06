---
phase: 36-merge-precedence-snapshot-threading
plan: 04
subsystem: main-process handlers (snapshot / scoring / export)
tags: [overrides, snapshot, scoring, docx, merge-threading, OVR-03, D-05]
requires:
  - "Plan 36-02: MergedBuilderData.summaryOverride field"
  - "buildMergedBuilderData() Layer 2.5 variant-tier overrides"
provides:
  - "Snapshot freeze of variant-tier summary override (frozenProfile.summary)"
  - "Initial-run scoring builds resumeJson from effectiveProfile carrying summaryOverride"
  - "Live DOCX export honors summaryOverride"
affects:
  - "src/main/handlers/submissions.ts"
  - "src/main/handlers/ai.ts"
  - "src/main/handlers/export.ts"
tech-stack:
  added: []
  patterns:
    - "effectiveProfile splice: profileRow && summaryOverride ? { ...profileRow, summary: summaryOverride } : profileRow"
    - "summary precedence at consumer: summaryOverride ?? profileRow.summary ?? undefined"
key-files:
  created: []
  modified:
    - "src/main/handlers/submissions.ts (buildSnapshotForVariant — destructure + frozenProfile.summary)"
    - "src/main/handlers/ai.ts (runAnalysis scoring — effectiveProfile → buildResumeJson)"
    - "src/main/handlers/export.ts (live DOCX — effectiveProfile → buildResumeDocx)"
decisions:
  - "Snapshot-render DOCX path left untouched — frozenProfile already carries the override via submissions.ts freeze (no double-apply)."
  - "Scoring threading is forward-compat: buildResumeTextForLlm omits basics.summary today, so no assertion that scorer text contains the summary (Pitfall 4)."
metrics:
  duration: "~6 min"
  completed: "2026-06-06"
  tasks: 2
  files: 3
---

# Phase 36 Plan 04: Summary Override Threading Summary

Thread `merged.summaryOverride` into the three single-merge-path consumers that read
`profileRow.summary` directly — snapshot freeze (OVR-03), initial-run scoring (D-05,
forward-compat), and the live DOCX export — closing the override-propagation gaps.

## What Was Built

- **Task 1 — Snapshot freeze (OVR-03):** `buildSnapshotForVariant` now destructures
  `summaryOverride` from `merged` and freezes `frozenProfile.summary` as
  `summaryOverride ?? profileRow.summary ?? undefined`. Bullet/project-title overrides
  already freeze via the `builderArrays` spread, so no extra code was needed for them.
  Turned the last RED case — `OVR-03 (a): snapshot.profile.summary equals a variant-tier
  summary override` — GREEN.

- **Task 2 — Scoring (D-05) + live DOCX:** `runAnalysis` builds
  `effectiveProfile = profileRow && summaryOverride ? { ...profileRow, summary: summaryOverride } : profileRow`
  and passes it to `buildResumeJson`. The live DOCX export path mirrors this and passes
  `effectiveProfile` to `buildResumeDocx`. The snapshot-render DOCX path (lines 147-227)
  was correctly left untouched — its `frozenProfile` already carries the override from
  the Task 1 snapshot freeze.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Splice summaryOverride into snapshot freeze (OVR-03) | 0bd406e | src/main/handlers/submissions.ts |
| 2 | Thread summaryOverride into scoring (D-05) + live DOCX | 77b4e77 | src/main/handlers/ai.ts, src/main/handlers/export.ts |

## Verification

- `npx vitest run tests/unit/main/handlers/submissions.snapshot.test.ts` — 5/5 pass
  (OVR-03 (a) summary-override, bullet-frozen, baseline cases all green).
- `npx vitest run tests/unit/main/handlers/ai.runAnalysis.test.ts` — 3/3 pass (D-05;
  runAnalysis returns analysisId; no assertion on summary in scorer text).
- `npx vitest run tests/unit/main/handlers/` — 14/14 pass (full plan-targeted suite).
- `npx vitest run` (full suite) — 275 pass / 4 fail. The 4 failures are PRE-EXISTING
  and unrelated to this plan (see Deviations).

## TDD Gate Compliance

This was the final GREEN plan of a phase-level TDD cycle. The RED cases were authored
in prior plans (test files not modified here). After the Task 1 splice, the previously
RED `OVR-03 (a)` case turned GREEN; the existing snapshot/runAnalysis cases stayed green.
Implementation commits are `feat(...)` (GREEN), with the `test(...)` RED commits in
earlier plans of the phase.

## Deviations from Plan

### Out-of-scope pre-existing failures (NOT auto-fixed)

The full-suite phase-gate run surfaced 4 failing tests in the older `tests/unit/handlers/`
directory (distinct from the plan-targeted `tests/unit/main/handlers/`, which is fully
green). They were verified PRE-EXISTING by re-running the suite with this plan's
ai.ts/export.ts edits stashed — the identical 4 failures occur with zero 36-04 changes
applied. Per the executor SCOPE BOUNDARY rule, these were NOT fixed (not caused by this
task's changes) and were logged to `deferred-items.md`:

- `tests/unit/handlers/jobs.test.ts > deleteJob removes job and cascades to bullets (FK cascade)`
- `tests/unit/handlers/templates.test.ts > deleteVariant removes variant and its items`
- `tests/unit/handlers/templates.test.ts > three-layer integration (D-07) > merges variant exclusions (layer 2) and analysis overrides (layer 3) correctly`
- `tests/unit/handlers/submissions.test.ts > merges analysis bullet overrides into snapshot when analysisId provided`

These look like a stale duplicate test tree relative to the current `createTestDb()`
schema / merge behavior; a follow-up cleanup task is recommended. No code change was
made to address them in this plan.

Otherwise: plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/main/handlers/submissions.ts (modified)
- FOUND: src/main/handlers/ai.ts (modified)
- FOUND: src/main/handlers/export.ts (modified)
- FOUND commit: 0bd406e (Task 1)
- FOUND commit: 77b4e77 (Task 2)
