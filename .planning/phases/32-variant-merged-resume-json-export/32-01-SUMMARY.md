---
phase: 32-variant-merged-resume-json-export
plan: 01
subsystem: main/lib/baseResumeBuilder
tags: [refactor, exports, resume-json]
requires: []
provides:
  - "src/main/lib/baseResumeBuilder.ts: promoted helpers (opt, trimStr, isEmpty, parseJsonArray, nonEmpty)"
  - "src/main/lib/baseResumeBuilder.ts: promoted per-entry mappers (toWorkEntry, toEducationEntry, toProjectEntry, toVolunteerEntry, toAwardEntry, toPublicationEntry, toLanguageEntry, toInterestEntry, toReferenceEntry)"
  - "src/main/lib/baseResumeBuilder.ts: promoted row-type aliases (JobRow, JobBulletRow, ProjectRow, ProjectBulletRow, EducationRow, VolunteerRow, AwardRow, PublicationRow, LanguageRow, InterestRow, ReferenceRow)"
affects: []
tech-stack:
  added: []
  patterns:
    - "Module-level named exports for shared per-entry mappers"
key-files:
  created: []
  modified:
    - src/main/lib/baseResumeBuilder.ts
decisions:
  - "Promoted helpers in-place per D-02 (no separate resumeJsonHelpers.ts extraction); duplication pressure not yet warranting a split"
  - "Kept toSkillEntries, SkillRow, SkillCategoryRow private — variant builder will implement its own categoryName-based grouping per D-08"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-04"
requirements: [JSON-08]
---

# Phase 32 Plan 01: Promote baseResumeBuilder Helpers to Module Exports Summary

One-liner: Promoted 25 declarations in `src/main/lib/baseResumeBuilder.ts` from private to module-level `export` so Plan 02's `variantResumeBuilder.ts` can reuse the per-entry mappers and primitive helpers verbatim — no behavior change, all existing tests pass unmodified.

## What Was Built

Pure refactor in a single file. The `export` keyword was prepended to declarations across three groups:

**Primitive helpers** (5)
- `export const isEmpty`
- `export const opt`
- `export function trimStr`
- `export const parseJsonArray`
- `export const nonEmpty`

**Row-type aliases** (11)
- `export type JobRow`
- `export type JobBulletRow`
- `export type ProjectRow`
- `export type ProjectBulletRow`
- `export type EducationRow`
- `export type VolunteerRow`
- `export type AwardRow`
- `export type PublicationRow`
- `export type LanguageRow`
- `export type InterestRow`
- `export type ReferenceRow`

**Per-entry mapper functions** (9)
- `export function toWorkEntry`
- `export function toEducationEntry`
- `export function toProjectEntry`
- `export function toVolunteerEntry`
- `export function toAwardEntry`
- `export function toPublicationEntry`
- `export function toLanguageEntry`
- `export function toInterestEntry`
- `export function toReferenceEntry`

**Intentionally left private** (per D-08): `function toSkillEntries`, `type SkillRow`, `type SkillCategoryRow` — variant builder will implement its own grouping by `categoryName`.

`ExportValidationError` and `buildBaseResumeJson` were already exported; not modified.

## Verification

- `npx vitest run tests/unit/main/lib/baseResumeBuilder.test.ts` — 5/5 passed unmodified
- `npx tsc --noEmit -p .` — exit 0, no new errors
- `grep -c "^export " src/main/lib/baseResumeBuilder.ts` — 27 (≥16 required)
- Targeted identifier grep — 27 matches across the listed identifiers (5 primitives + 11 row types + 9 mappers + 2 pre-existing = 27)
- Private-items grep — 3 matches (`toSkillEntries`, `SkillRow`, `SkillCategoryRow`), no `export` prefix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt better-sqlite3 native module**
- **Found during:** Task 1 verification
- **Issue:** Vitest run failed with `NODE_MODULE_VERSION 140 vs 137` mismatch on `better-sqlite3` — unrelated to the refactor (pre-existing environment drift after a Node upgrade)
- **Fix:** `npm rebuild better-sqlite3`
- **Files modified:** none in repo (rebuild affects only `node_modules/better-sqlite3/build/`)
- **Commit:** not committed (no source change)

## Decisions Made

- Kept helper promotion in `baseResumeBuilder.ts` rather than extracting a sibling `resumeJsonHelpers.ts` — the file remains legible at its current size and a future Plan 02 review can revisit if duplication pressure grows.

## Self-Check: PASSED

- FOUND: src/main/lib/baseResumeBuilder.ts (modified)
- FOUND: commit 44b1a1a `refactor(32-01): promote baseResumeBuilder helpers to module exports`
- FOUND: .planning/phases/32-variant-merged-resume-json-export/32-01-SUMMARY.md (this file)
