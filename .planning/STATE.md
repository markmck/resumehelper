---
gsd_state_version: 1.0
milestone: v2.6
milestone_name: Per-Variant Text Overrides
status: executing
stopped_at: Phase 35 context gathered
last_updated: "2026-06-05T20:14:20.381Z"
last_activity: 2026-06-05
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 3
  completed_plans: 2
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-05)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Phase 35 — unified-override-table-migration

## Current Position

Phase: 35 (unified-override-table-migration) — EXECUTING
Plan: 3 of 3
Status: Ready to execute
Last activity: 2026-06-05

Progress: [███████░░░] 67%

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

### Pending Todos

- [ ] Phase 35: Unified override table + migration
- [ ] Phase 36: Merge precedence + snapshot threading
- [ ] Phase 37: Variant reword UI
- [ ] Phase 38: Excluded-bullet suggestions

### Blockers/Concerns

- Phase 35 must commit the FK design decision (per-entity nullable FK columns) before any DDL is written — research resolves this in favor of per-entity columns but it must be recorded in PROJECT.md Key Decisions at end of Phase 35
- Phases 37 and 38 are parallelizable once Phase 36 ships — plan-phase should note this

## Session Continuity

Last session: 2026-06-05T20:14:20.376Z
Stopped at: Phase 35 context gathered
Resume file: None

**Completed Milestone:** v2.5 Portability & Debt Cleanup — 5 phases, 19 plans — shipped 2026-06-05
**Next:** `/gsd:plan-phase 35`
