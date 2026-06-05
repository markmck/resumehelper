---
gsd_state_version: 1.0
milestone: v2.6
milestone_name: Per-Variant Text Overrides
status: verifying
stopped_at: Phase 35 context gathered
last_updated: "2026-06-05T20:26:08.559Z"
last_activity: 2026-06-05
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-05)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Phase 35 — unified-override-table-migration

## Current Position

Phase: 35 (unified-override-table-migration) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-06-05

Progress: [██████████] 100%

## Performance Metrics

- Total phases in milestone: 4 (Phases 35–38)
- Completed phases: 0
- Completed plans: 0
- Completion percent: 0%
- Test suite at milestone start: 247 tests passing

## Accumulated Context

### Decisions

Key decisions scoped for v2.6 (from research):

- Per-entity nullable FK columns chosen over generic `entity_id` — consistent with `template_variant_items` precedent; CASCADE delete fires correctly per entity type
- `analysisBulletOverrides` kept read-only post-migration, not dropped — drop deferred to v2.7 cleanup
- `ResumeScorerSchema` new `excluded_bullet_suggestions` field uses `.default([])` for backward compat with all existing MockLanguageModelV3 fixtures
- `summaryOverride` threads through `buildMergedBuilderData` → `buildSnapshotForVariant` — snapshot must freeze override, not base text
- `projects.description` column and project-description reword explicitly deferred (out of scope for v2.6)
- `createTestDb()` in `tests/helpers/db.ts` must be updated in lockstep with every `ensureSchema()` table addition

Phase 35 decisions (Plans 01-03):

- Manual delete+insert upsert for `acceptSuggestion` — SQLite partial unique indexes with nullable FK columns do not fire ON CONFLICT when all nullable FK columns are NULL (NULLs are distinct per SQLite UNIQUE semantics); `onConflictDoUpdate` with `targetWhere` generates correct SQL but constraint never trips
- `getOverrides` accesses raw sqlite via `db.session.client.prepare(...)` for testability with `createTestDb()` — falls back to module-level `sqlite` singleton in production
- D-01 recorded in PROJECT.md Key Decisions — satisfies ROADMAP #5 and clears Phase 35 blocker

### Pending Todos

- [x] Phase 35: Unified override table + migration — COMPLETE
- [ ] Phase 36: Merge precedence + snapshot threading
- [ ] Phase 37: Variant reword UI
- [ ] Phase 38: Excluded-bullet suggestions

### Blockers/Concerns

- Phases 37 and 38 are parallelizable once Phase 36 ships — plan-phase should note this
- Phase 35 blocker (D-01 not recorded) is now RESOLVED — D-01 committed in PROJECT.md Key Decisions

## Session Continuity

Last session: 2026-06-05T20:26:08.554Z
Stopped at: Phase 35 context gathered
Resume file: None

**Completed Milestone:** v2.5 Portability & Debt Cleanup — 5 phases, 19 plans — shipped 2026-06-05
**Phase 35 complete:** entity_overrides table + migration + acceptSuggestion cutover + mergeHelper Layer 3 redirect + D-01 decision recorded. 264 tests passing.
**Next:** `/gsd:transition` or `/gsd:plan-phase 36`
