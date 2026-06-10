---
gsd_state_version: 1.0
milestone: v2.7
milestone_name: Optimization Layout Controls
status: executing
stopped_at: Phase 40 UI-SPEC approved
last_updated: "2026-06-10T17:43:30.919Z"
last_activity: 2026-06-10
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 6
  completed_plans: 5
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-09)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Phase 40 — Margin Controls + Live Preview in Optimize

## Current Position

Phase: 40 (Margin Controls + Live Preview in Optimize) — EXECUTING
Plan: 3 of 3
Status: Ready to execute
Last activity: 2026-06-10

## Performance Metrics

- Total phases in milestone: 3 (Phases 39–41)
- Completed phases: 0
- Completed plans: 0
- Completion percent: 0%
- Test suite at milestone start: 292 tests passing (carried from v2.6)

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

- [ ] Phase 39: Analysis margin override data layer (storage + merge + snapshot freeze)
- [ ] Phase 40: Margin controls + live preview in Optimize
- [ ] Phase 41: Auto-fit orphan-page removal

### Blockers/Concerns

- Phase 39 storage decision is open: extend the polymorphic `entityOverrides` table with a `templateOptions` entity type vs. a dedicated analysis-layout store — resolve during plan-phase 39
- Margins are presentation, not content — the first non-content override at the analysis tier; confirm `buildMergedBuilderData` resolves an effective-margins object distinct from text/inclusion overrides
- Auto-fit (Phase 41) depends on the page-count measurement that drives the existing page-break visualization — reuse it, do not reinvent pagination
- `createTestDb()` must be updated in lockstep if Phase 39 adds/changes a table

## Session Continuity

Last session: 2026-06-10T17:43:30.914Z
Stopped at: Phase 40 UI-SPEC approved
Resume file: None

**Completed Milestone:** v2.6 Per-Variant Text Overrides — 4 phases (35–38), 13 plans — shipped 2026-06-08, 292 tests passing.
**New Milestone:** v2.7 Optimization Layout Controls — analysis-tier margin overrides + live preview in Optimize + auto-fit orphan-page removal.
**Next:** `/gsd:discuss-phase 39` (gather context) or `/gsd:plan-phase 39` (plan directly) — Analysis Margin Override Data Layer.

### Phase 36 follow-ups (advisory code-review findings, non-blocking)

- WR-02: getVariantOverrides read path returns all entity_types (writes are allowlisted) — minor asymmetry.
- WR-03: getVariantOverrides uses the (db as any).session raw-prepare shim though it needs no raw SQL.
- WR-04: ai.ts getOverrides surfaces only analysis-tier rows (unaware of two-tier precedence).
- WR-05: tests/helpers/db.ts relies on the better-sqlite3 FK-default-ON; consider asserting the pragma at startup so test+prod can't silently lose cascades together.
- Pre-existing test flake: parallel in-memory SQLite + WAL occasionally reports a transient failure (e.g. acceptSuggestion.test.ts); passes in isolation and on rerun.
