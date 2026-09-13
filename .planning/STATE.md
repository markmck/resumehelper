---
gsd_state_version: 1.0
milestone: v2.7
milestone_name: Optimization Layout Controls
status: executing
stopped_at: Completed 42-05-PLAN.md
last_updated: "2026-08-18T20:41:40.566Z"
last_activity: 2026-08-18
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 21
  completed_plans: 20
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-09)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Phase 42 — cover-letter-generator-on-job-submission

## Current Position

Phase: 42 (cover-letter-generator-on-job-submission) — EXECUTING
Plan: 6 of 6
Status: Ready to execute
Last activity: 2026-08-18

## Performance Metrics

- Total phases in milestone: 3 (Phases 39–41)
- Completed phases: 0
- Completed plans: 0
- Completion percent: 0%
- Test suite at milestone start: 292 tests passing (carried from v2.6)

## Accumulated Context

### Roadmap Evolution

- Phase 42 added: Cover Letter Generator on Job Submission

### Decisions

Phase 42 decisions (Plan 01):

- `cover_letters` table mirrors `analysis_layout_overrides` structurally: `analysis_id` NOT NULL UNIQUE FK ON DELETE cascade, no `submissionId` column — letter is analysis-scoped since generation happens in the log form before a `submissions` row exists (D-09/D-11)
- Wave 0 blocking-scaffold pattern: schema/migration/test-helper landed in lockstep with three test files carrying `test.todo` placeholders named per D-ID, so Waves 1-3 fill in real assertions against a stable file layout

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
- [Phase ?]: Cover-letter prompt (buildCoverLetterPrompt/resolveLetterTone) and provider call (callCoverLetterGenerator) added with D-01/D-02/D-03/D-05/D-06/D-07/D-08 all asserted by passing tests
- [Phase ?]: PROJECT.md AI boundary narrowed (not discarded): Out of Scope, Constraints, and Key Decisions rows updated to state AI may compose grounded prose (summaries, cover letters) but never fabricates
- [Phase 42]: coverLetterPdf preload signature mirrors snapshotPdf (payload-based, not id-based) since the renderer already holds the letter text/profile in memory
- [Phase 42]: createSubmission explicit coverLetter always wins on the returned snapshot regardless of analysisId/variantId presence
- [Phase ?]: 42-05: export:coverLetterPdf handler is payload-keyed (mirrors export:snapshotPdf), has no code path to cover_letters, and never resolves a template — D-11/D-15 enforced structurally.

### Pending Todos

- [x] Phase 39: Analysis margin override data layer (storage + merge + snapshot freeze)
- [x] Phase 40: Margin controls + live preview in Optimize (+ expand-to-modal preview)
- [ ] Phase 41: Auto-fit orphan-page removal
- [ ] Backlog: Save optimized variant as a new variant (promote analysis-tier optimizations into a standalone variant)
- [ ] Backlog: Suggest summary for job in optimization (AI-proposed tailored summary via summaryOverride, accept/edit/dismiss)
- [ ] Todo (ai): Add cover letter generator on job submission — generate tailored cover letter from resume experience + job description

### Blockers/Concerns

- Phase 39 storage decision is open: extend the polymorphic `entityOverrides` table with a `templateOptions` entity type vs. a dedicated analysis-layout store — resolve during plan-phase 39
- Margins are presentation, not content — the first non-content override at the analysis tier; confirm `buildMergedBuilderData` resolves an effective-margins object distinct from text/inclusion overrides
- Auto-fit (Phase 41) depends on the page-count measurement that drives the existing page-break visualization — reuse it, do not reinvent pagination
- `createTestDb()` must be updated in lockstep if Phase 39 adds/changes a table

## Session Continuity

Last session: 2026-08-18T20:41:40.561Z
Stopped at: Completed 42-05-PLAN.md
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

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
