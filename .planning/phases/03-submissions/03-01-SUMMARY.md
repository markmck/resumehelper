---
phase: 03-submissions
plan: "01"
subsystem: submissions-backend
tags: [sqlite, drizzle, ipc, preload, schema-migration]
dependency_graph:
  requires: []
  provides: [submissions-ipc-handlers, submissions-preload-bridge, url-notes-schema-columns]
  affects: [src/main/handlers/submissions.ts, src/preload/index.ts, src/preload/index.d.ts]
tech_stack:
  added: []
  patterns: [drizzle-leftjoin, snapshot-capture-on-insert, ipc-crud-pattern]
key_files:
  created:
    - src/main/handlers/submissions.ts
    - drizzle/0001_breezy_the_leader.sql
    - drizzle/meta/0001_snapshot.json
  modified:
    - src/main/db/schema.ts
    - src/main/handlers/index.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - drizzle/meta/_journal.json
decisions:
  - "Snapshot captures layoutTemplate alongside jobs+skills so renderer can reconstruct the exact resume layout without the variant"
  - "submissions:update intentionally excludes resumeSnapshot to enforce immutability at the IPC boundary"
  - "buildSnapshotForVariant duplicated from getBuilderData (not extracted) since snapshot version adds layoutTemplate and may diverge"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-14T20:20:50Z"
  tasks: 2
  files_changed: 7
---

# Phase 3 Plan 01: Submission Backend (Schema + IPC + Preload) Summary

Submission data layer with schema migration for url/notes columns, IPC CRUD handlers with frozen snapshot capture on create, and typed preload bridge exposing window.api.submissions.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Schema migration + IPC handlers + handler registration | 7c58cd6 | schema.ts, submissions.ts, index.ts, 0001_breezy_the_leader.sql |
| 2 | Preload bridge + type definitions | 16e0f17 | preload/index.ts, preload/index.d.ts |

## What Was Built

### Schema Migration
Added `url TEXT` and `notes TEXT` (both nullable) to the `submissions` table. Generated migration `0001_breezy_the_leader.sql` containing two `ALTER TABLE submissions ADD COLUMN` statements.

### Submission IPC Handlers (`src/main/handlers/submissions.ts`)
- `submissions:list` — LEFT JOIN on `templateVariants` to include `variantName` (null when variant deleted), ordered by `submittedAt DESC`
- `submissions:create` — Calls `buildSnapshotForVariant(variantId)` when variantId is provided; stores frozen JSON snapshot in `resumeSnapshot`; defaults `submittedAt` to `new Date()`
- `submissions:update` — Accepts company/role/submittedAt/url/notes only; `resumeSnapshot` is deliberately excluded to enforce immutability
- `submissions:delete` — Deletes row by id
- `buildSnapshotForVariant` (private helper) — Replicates `getBuilderData` query logic from templates handler, additionally fetches `layoutTemplate` from `templateVariants`; returns `{ layoutTemplate, jobs, skills }`

### Preload Bridge (`src/preload/index.ts`)
Added `submissions` namespace after `templates`, wiring all four IPC channels.

### Type Definitions (`src/preload/index.d.ts`)
- `SubmissionSnapshot` — `{ layoutTemplate, jobs: BuilderJob[], skills: BuilderSkill[] }`
- `Submission` — All DB columns plus `variantName: string | null` from LEFT JOIN
- `Api.submissions` — Typed signatures for list/create/update/delete

## Verification

- `npm run typecheck` — passes with zero errors
- `src/main/handlers/submissions.ts` exists with exported `registerSubmissionHandlers`
- `src/main/handlers/index.ts` imports and calls `registerSubmissionHandlers()`
- `src/preload/index.d.ts` exports `Submission`, `SubmissionSnapshot`, `Api.submissions`
- `src/preload/index.ts` has `submissions` namespace in api object
- Migration `drizzle/0001_breezy_the_leader.sql` contains two ALTER TABLE ADD COLUMN statements

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
