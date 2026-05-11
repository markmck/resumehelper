---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: Portability & Debt Cleanup
status: executing
stopped_at: Phase 31 context gathered
last_updated: "2026-05-11T18:55:15.952Z"
last_activity: 2026-05-11 -- Phase 31 execution started
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 8
  completed_plans: 5
  percent: 63
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-23)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Phase 31 — base-resume-json-export

## Current Position

Phase: 31 (base-resume-json-export) — EXECUTING
Plan: 1 of 3
Status: Executing Phase 31
Last activity: 2026-05-11 -- Phase 31 execution started

## Performance Metrics

- Total phases in milestone: 5
- Completed phases: 0
- Completed plans: 0
- Completion percent: 0%

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions from v2.4:

- Handler extraction pattern (db: Db first param) for testability
- Composition-based LLM mocking via MockLanguageModelV3
- DOCX XML assertions over in-memory object tree
- Per-file jsdom via vitest docblock
- renderToString over Testing Library for template tests

Key decisions already scoped for v2.5 (from research):

- `app.relaunch(); app.exit(0)` chosen over in-process Proxy DB swap (out of scope for debt cleanup)
- DB path bootstrap lives at `userData/db-location.json` — outside the SQLite DB (chicken-and-egg)
- Unified `buildMergedBuilderData(db, variantId, analysisId?)` reconciles the three parallel merge paths
- Variant JSON export is export-only (no roundtrip) — contains no `meta` sidecar
- Network/cloud path heuristic is warn-but-allow, not hard-block

### Pending Todos

- Phase 30: Merge reconciliation + DOCX showSummary fix
- Phase 31: Base resume.json export
- Phase 32: Variant-merged resume.json export
- Phase 33: Tech debt cleanup (TEMPLATE_LIST, compact prop, tests/setup.ts, jobs.test.ts race)
- Phase 34: Configurable DB location

### Blockers/Concerns

(None — roadmap established, coverage validated)

## Session Continuity

Last session: --stopped-at
Stopped at: Phase 31 context gathered
Resume file: --resume-file

**Planned Phase:** 31 (base-resume-json-export) — 3 plans — 2026-05-11T18:23:19.349Z
