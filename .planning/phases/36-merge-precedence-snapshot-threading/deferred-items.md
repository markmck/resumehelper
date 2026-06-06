# Phase 36 — Deferred / Out-of-Scope Items

## Discovered during Plan 03 execution

- **submissions.snapshot.test.ts — OVR-03 (a)** is RED (`expected 'Base profile summary' to be 'Variant summary override'`).
  - Verified PRE-EXISTING and independent of Plan 03 changes (fails identically with Plan 03's `tests/helpers/db.ts` change stashed).
  - This is OVR-03 / Plan 04 (snapshot freezing) territory, not OVR-02 / Plan 03. Expected RED until Plan 04 wires variant-tier summary overrides into `buildSnapshotForVariant`.
  - Action: leave for Plan 04. Do NOT fix in Plan 03 (scope boundary — different file, different requirement).
  - RESOLVED in Plan 04: snapshot now freezes `summaryOverride ?? profileRow.summary`; OVR-03 (a) GREEN.

## Pre-existing test failures discovered during Plan 04 phase-gate

Discovered during the 36-04 full-suite (`npx vitest run`) phase-gate run. Verified
PRE-EXISTING by running the suite with Plan 04's ai.ts/export.ts edits stashed — the
same 4 failures occur without any 36-04 change. These live in the older
`tests/unit/handlers/` directory (distinct from the plan-targeted
`tests/unit/main/handlers/` suite, which is fully green: 14/14). Out of scope per the
executor SCOPE BOUNDARY rule (only auto-fix issues directly caused by this task).

- `tests/unit/handlers/jobs.test.ts > deleteJob removes job and cascades to bullets (FK cascade)`
- `tests/unit/handlers/templates.test.ts > deleteVariant removes variant and its items`
- `tests/unit/handlers/templates.test.ts > three-layer integration (D-07) > merges variant exclusions (layer 2) and analysis overrides (layer 3) correctly`
- `tests/unit/handlers/submissions.test.ts > merges analysis bullet overrides into snapshot when analysisId provided`

These appear to be a stale duplicate test tree relative to the current `createTestDb()`
schema / merge behavior. Recommend a follow-up cleanup task to reconcile or retire
`tests/unit/handlers/` against `tests/unit/main/handlers/`.
