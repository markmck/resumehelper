---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Enhancements
status: planning
stopped_at: Completed 07-01-PLAN.md
last_updated: "2026-03-23T13:03:12.738Z"
last_activity: 2026-03-14 — Roadmap created for v1.1 (phases 5-7)
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 18
  completed_plans: 14
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Milestone v1.1 — Phase 5: Projects and Tag Autocomplete

## Current Position

Phase: 5 of 7 (Projects and Tag Autocomplete)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-03-14 — Roadmap created for v1.1 (phases 5-7)

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.0]: CREATE TABLE IF NOT EXISTS for schema management — new columns need ALTER TABLE ADD COLUMN in try/catch
- [v1.0]: Inline styles for spacing (Tailwind v4 unreliable)
- [v1.0]: better-sqlite3 transactions must be synchronous
- [v1.1]: Projects have toggleable bullets like jobs — mirror jobs/bullets pattern exactly
- [v1.1]: resume.json themes for importable templates — leverage existing ecosystem
- [v1.1]: Import uses replace strategy (not merge) — confirm with user, delete existing, re-import in transaction
- [Phase 05-projects-and-tag-autocomplete]: createPortal to document.body for dropdown to avoid overflow clipping
- [Phase 05-projects-and-tag-autocomplete]: onMouseDown preventDefault on dropdown items prevents blur-before-click race condition
- [Phase 05-projects-and-tag-autocomplete]: allTags computed at SkillList level via Set deduplication, threaded through SkillItem as suggestions prop
- [Phase 05-projects-and-tag-autocomplete]: ProjectBulletList is a copy of BulletList (not generalized) — avoids coupling and keeps pattern explicit
- [Phase 05-projects-and-tag-autocomplete]: templateVariantItems FK columns for projects added via ALTER TABLE migration (not ensureSchema) for existing DB compatibility
- [Phase 06-projects-in-export-pipeline-and-resume-json-import]: referenceEntries used as JS variable name for references SQLite table to avoid reserved word confusion
- [Phase 06-projects-in-export-pipeline-and-resume-json-import]: Array fields (courses, highlights, keywords) stored as JSON TEXT strings in SQLite, parsed on read
- [Phase 06-projects-in-export-pipeline-and-resume-json-import]: Projects section renders after Skills in ProfessionalLayout; projects prop is optional for backward compatibility with old snapshots
- [Phase 07-resume-json-theme-rendering]: externalizeDeps.exclude for ESM theme packages — @jsonresume/jsonresume-theme-class and jsonresume-theme-even must be bundled into main process CJS output, not left as external requires
- [Phase 07-resume-json-theme-rendering]: Treat both 'traditional' and 'professional' layoutTemplate values as the built-in ProfessionalLayout — DB default is 'traditional' from earlier phase

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 5]: Must test ALTER TABLE ADD COLUMN (projectId on templateVariantItems) against a v1.0 database, not just fresh install
- [Phase 7]: jsonresume-theme-class module format (ESM vs CJS) unconfirmed — verify with require() test immediately after install
- [Phase 7]: Theme packages must be asarUnpack'd in electron-builder config — test packaged binary early, not at the end

## Session Continuity

Last session: 2026-03-23T13:03:12.735Z
Stopped at: Completed 07-01-PLAN.md
Resume file: None
