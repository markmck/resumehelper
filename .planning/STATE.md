---
gsd_state_version: 1.0
milestone: v2.6
milestone_name: Per-Variant Text Overrides
status: milestone_complete
stopped_at: Milestone complete (Phase 38 was final phase)
last_updated: 2026-06-09T02:33:31.771Z
last_activity: 2026-06-08
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 13
  completed_plans: 13
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-05)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Milestone complete

## Current Position

Phase: 38
Plan: Not started
Status: Milestone complete
Last activity: 2026-06-09

Progress: [█████████░] 90%

## Performance Metrics

- Total phases in milestone: 4 (Phases 35–38)
- Completed phases: 3 (35, 36, 37)
- Completed plans: 12
- Completion percent: 90%
- Test suite at milestone start: 247 tests passing
- Test suite after Phase 36: 281 tests passing
- Test suite after Phase 37 Plan 01: 284 tests passing
- Test suite after Phase 37 Plan 03: 292 tests passing

| Phase | Plan | Duration | Tasks | Files |
| ----- | ---- | -------- | ----- | ----- |
| 37    | 01   | ~8 min   | 3     | 5     |
| Phase 37 P02 | 6min | 2 tasks | 3 files |
| Phase 37 P03 | 7min | 3 tasks | 2 files |

## Accumulated Context

### Decisions

Key decisions scoped for v2.6 (from research):

- Per-entity nullable FK columns chosen over generic `entity_id` — consistent with `template_variant_items` precedent; CASCADE delete fires correctly per entity type
- `analysisBulletOverrides` kept read-only post-migration, not dropped — drop deferred to v2.7 cleanup
- `ResumeScorerSchema` new `excluded_bullet_suggestions` field uses `.default([])` for backward compat with all existing MockLanguageModelV3 fixtures
- `summaryOverride` threads through `buildMergedBuilderData` → `buildSnapshotForVariant` — snapshot must freeze override, not base text
- `projects.description` column and project-description reword explicitly deferred (out of scope for v2.6)
- `createTestDb()` in `tests/helpers/db.ts` must be updated in lockstep with every `ensureSchema()` table addition
- `acceptExcludedBulletSuggestion` re-validates bulletId at accept time (not only at seed time) — variant may change between seeding and user action
- `field='inclusion'` / `source='inclusion'` for re-inclusion entityOverrides row — `field='text'` with empty `overrideText` would blank the bullet text (Pitfall 1)

Phase 37 decisions (Plan 01):

- Variant-override preload bridge passes NO analysisId (T-37-01) — renderer can only write variant-tier overrides; main handler still hardcodes `analysisId: null`
- `duplicateVariant` override-copy filters with `isNull(entityOverrides.analysisId)` (never `eq(col, null)`) and copies FK + text/source columns verbatim, omitting DB-generated id/createdAt; function stays synchronous
- vitest requires `npm rebuild better-sqlite3` (Node ABI 137); dev/start need `electron-rebuild` (Electron ABI 147) — restore the Electron build after running tests

Phase 35 decisions (Plans 01-03):

- Manual delete+insert upsert for `acceptSuggestion` — SQLite partial unique indexes with nullable FK columns do not fire ON CONFLICT when all nullable FK columns are NULL (NULLs are distinct per SQLite UNIQUE semantics); `onConflictDoUpdate` with `targetWhere` generates correct SQL but constraint never trips
- `getOverrides` accesses raw sqlite via `db.session.client.prepare(...)` for testability with `createTestDb()` — falls back to module-level `sqlite` singleton in production
- D-01 recorded in PROJECT.md Key Decisions — satisfies ROADMAP #5 and clears Phase 35 blocker
- [Phase 37]: deriveOverrideSet extracted as pure helper (RWD-04 unit-testable; null-FK rows skipped, any summary row = hasSummary)
- [Phase ?]: [Phase 37 P03]: Variant reword UI wired — hover pencil + InlineEdit for bullets/project-titles/summary; left accent border orthogonal to excluded (D-01a) via deriveOverrideSet; revert icon clears override; D-04 summary authorable from scratch; onReword bumps previewVersion (no save button, SC#2); locked tokens only, no analysisId

### Pending Todos

- [x] Phase 35: Unified override table + migration — COMPLETE
- [x] Phase 36: Merge precedence + snapshot threading — COMPLETE
- [ ] Phase 37: Variant reword UI
- [ ] Phase 38: Excluded-bullet suggestions

### Blockers/Concerns

- Phases 37 and 38 are parallelizable once Phase 36 ships — plan-phase should note this
- Phase 35 blocker (D-01 not recorded) is now RESOLVED — D-01 committed in PROJECT.md Key Decisions

## Session Continuity

Last session: 2026-06-08T17:33:02.904Z
Stopped at: Phase 38 Plan 02 complete — handlers + GREEN tests
Resume file: None

**Completed Milestone:** v2.5 Portability & Debt Cleanup — 5 phases, 19 plans — shipped 2026-06-05
**Phase 35 complete:** entity_overrides table + migration + acceptSuggestion cutover + mergeHelper Layer 3 redirect + D-01 decision recorded. 264 tests passing.
**Phase 36 complete:** two-pass override map (analysis→variant→base precedence), variant-override IPC handlers, summaryOverride threaded into snapshot/scoring/DOCX/resume.json, D-01 inclusion mechanism. Verified + code-reviewed. 281 tests passing. Two integration regressions caught & fixed during post-merge gate (analysis-tier match-by-analysisId; FK-on test posture); resume.json summary gap closed; WR-01 cross-variant guard added.
**Next:** `/gsd:plan-phase 37` (Variant reword UI) or `/gsd:plan-phase 38` (Excluded-bullet suggestions) — parallelizable now that Phase 36 ships.

### Phase 36 follow-ups (advisory code-review findings, non-blocking)

- WR-02: getVariantOverrides read path returns all entity_types (writes are allowlisted) — minor asymmetry.
- WR-03: getVariantOverrides uses the (db as any).session raw-prepare shim though it needs no raw SQL.
- WR-04: ai.ts getOverrides surfaces only analysis-tier rows (unaware of two-tier precedence).
- WR-05: tests/helpers/db.ts relies on the better-sqlite3 FK-default-ON; consider asserting the pragma at startup so test+prod can't silently lose cascades together.
- Pre-existing test flake: parallel in-memory SQLite + WAL occasionally reports a transient failure (e.g. acceptSuggestion.test.ts); passes in isolation and on rerun.
