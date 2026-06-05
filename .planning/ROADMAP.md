# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-13)
- ✅ **v1.1 Enhancements** - Phase 7 (shipped 2026-03-23)
- ✅ **v2.0 AI Analysis Integration** - Phases 8-12 (shipped 2026-03-24)
- ✅ **v2.1 Resume Templates** - Phases 13-16 (shipped 2026-03-26)
- ✅ **v2.2 Three Layer Data** - Phases 17-21 (shipped 2026-04-01)
- ✅ **v2.3 Job Hunt Accelerator** - Phases 22-24 (shipped 2026-04-03)
- ✅ **v2.4 Polish & Reliability** - Phases 25-29 (shipped 2026-04-21)
- ✅ **v2.5 Portability & Debt Cleanup** - Phases 30-34 (shipped 2026-06-05)

## Phases

<details>
<summary>✅ v1.0 MVP + v1.1 Enhancements (Phases 1-7) - SHIPPED 2026-03-23</summary>

Phases 1-7 covered: Experience DB, Template Variants, Submissions with snapshots, PDF/DOCX Export, Projects, full resume.json entity support, resume.json import, 3 bundled themes, tag autocomplete, collapsible Experience tab.

</details>

<details>
<summary>✅ v2.0 AI Analysis Integration (Phases 8-12) - SHIPPED 2026-03-24</summary>

Phases 8-12 covered: Design system + sidebar navigation, AI provider settings, job posting analysis with match scoring and keyword coverage, per-bullet rewrite suggestions, submission pipeline tracking with activity timeline, Experience page redesign with collapsible cards and drag reorder, Variant Builder split-pane with live preview.

5 phases, 14 plans, 31 requirements. Full details in `.planning/milestones/v2.0-ROADMAP.md`.

</details>

<details>
<summary>✅ v2.1 Resume Templates (Phases 13-16) - SHIPPED 2026-03-26</summary>

Phases 13-16 covered: Unified print.html rendering pipeline, 5 purpose-built templates (Classic, Modern, Jake, Minimal, Executive), template controls (accent color, margin sliders, skills display mode), page break visualization, snapshot PDF migration, old theme cleanup.

4 phases, 12 plans, 21 requirements. Full details in `.planning/milestones/v2.1-ROADMAP.md`.

</details>

<details>
<summary>✅ v2.2 Three Layer Data (Phases 17-21) - SHIPPED 2026-04-01</summary>

Phases 17-21 covered: Three-layer data model (base → variant → analysis overrides), per-click accept/dismiss, preview/export merge, submission snapshots with merged result, analysis submission flow with company/role auto-extraction, stale/orphan detection, skills chip grid with @dnd-kit DnD and category management, job-level toggle, variant card timestamps, Modern template fix, coming-soon cleanup.

5 phases, 13 plans, 20 requirements. Full details in `.planning/milestones/v2.2-ROADMAP.md`.

</details>

<details>
<summary>✅ v2.3 Job Hunt Accelerator (Phases 22-24) - SHIPPED 2026-04-03</summary>

Phases 22-24 covered: ATS score threshold with slider/target arc/color bands, PDF resume import with AI extraction and append mode, job posting URL scraping with auto-populate of text/company/role fields.

3 phases, 7 plans, 22 requirements. Full details in `.planning/milestones/v2.3-ROADMAP.md`.

</details>

<details>
<summary>✅ v2.4 Polish & Reliability (Phases 25-29) - SHIPPED 2026-04-21</summary>

Phases 25-29 covered: Windows NSIS installer with setup wizard, Vitest test infrastructure with electron mock and in-memory SQLite, data layer tests (57 tests — handler extraction, applyOverrides, three-layer merge), AI integration tests (44 tests — MockLanguageModelV3, Zod schemas, score derivation, runAnalysis), export pipeline tests (42 tests — DOCX XML assertions, snapshot shape, template rendering).

5 phases, 12 plans, 14 requirements. Full details in `.planning/milestones/v2.4-ROADMAP.md`.

</details>

<details>
<summary>✅ v2.5 Portability & Debt Cleanup (Phases 30-34) - SHIPPED 2026-06-05</summary>

Phases 30-34 covered: unified `buildMergedBuilderData()` merge path feeding HTML/PDF/DOCX/snapshot with DOCX showSummary honored; base resume.json export (Zod-validated, validation-first errors, shared `ResumeJson` schema in `src/shared/`); variant-merged resume.json export (full three-layer merge, export-only, no `meta` sidecar, re-import tooltip); configurable SQLite DB location (checkpoint → copy → integrity-verify → bootstrap → backup → restart, with clean rollback, UNC/cloud-path warning, and delete-old-backup); tech debt cleanup (TEMPLATE_LIST, compact prop, dead tests/setup.ts, jobs.test.ts race). Cross-surface lastExportDir shared across all 5 export surfaces.

5 phases, 19 plans, 29 requirements. Full details in `.planning/milestones/v2.5-ROADMAP.md`.

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 + v1.1 | - | Complete | 2026-03-23 |
| 8-12 | v2.0 | 14/14 | Complete | 2026-03-24 |
| 13-16 | v2.1 | 12/12 | Complete | 2026-03-26 |
| 17-21 | v2.2 | 13/13 | Complete | 2026-04-01 |
| 22-24 | v2.3 | 7/7 | Complete | 2026-04-03 |
| 25-29 | v2.4 | 12/12 | Complete | 2026-04-21 |
| 30-34 | v2.5 | 19/19 | Complete | 2026-06-05 |

## Future (v3.0+)

- **Answer Bank for Application Questions** — Leverage the structured experience DB as an answer bank beyond resumes — feed interview prep, LinkedIn summaries, or common application form answers from existing bullet data

## Backlog

(Empty — all tech debt items promoted to v2.5)
