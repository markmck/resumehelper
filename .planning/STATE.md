---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: Portability & Debt Cleanup
status: planning
stopped_at: Roadmap created — ready to plan Phase 30
last_updated: "2026-04-23"
last_activity: 2026-04-23
progress:
  total_phases: 5
  target_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-23)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** v2.5 Portability & Debt Cleanup — roadmap created, ready to plan Phase 30

## Current Position

Phase: 30 — Merge-Helper Reconciliation + DOCX showSummary Fix (not started)
Plan: —
Status: Roadmap created — ready to plan Phase 30
Last activity: 2026-04-23 — v2.5 roadmap created with 5 phases, 29 requirements mapped

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

Last session: 2026-04-23
Stopped at: Roadmap created — ready to plan Phase 30
Resume file: None
