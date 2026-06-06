# Phase 36 — Deferred / Out-of-Scope Items

## Discovered during Plan 03 execution

- **submissions.snapshot.test.ts — OVR-03 (a)** is RED (`expected 'Base profile summary' to be 'Variant summary override'`).
  - Verified PRE-EXISTING and independent of Plan 03 changes (fails identically with Plan 03's `tests/helpers/db.ts` change stashed).
  - This is OVR-03 / Plan 04 (snapshot freezing) territory, not OVR-02 / Plan 03. Expected RED until Plan 04 wires variant-tier summary overrides into `buildSnapshotForVariant`.
  - Action: leave for Plan 04. Do NOT fix in Plan 03 (scope boundary — different file, different requirement).
