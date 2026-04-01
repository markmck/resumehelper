# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-13)
- ✅ **v1.1 Enhancements** - Phase 7 (shipped 2026-03-23)
- ✅ **v2.0 AI Analysis Integration** - Phases 8-12 (shipped 2026-03-24)
- ✅ **v2.1 Resume Templates** - Phases 13-16 (shipped 2026-03-26)
- ✅ **v2.2 Three Layer Data** - Phases 17-21 (shipped 2026-04-01)
- **v2.3 Job Hunt Accelerator** - Phases 22-25

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

### v2.3 Job Hunt Accelerator (Phases 22-25)

### Phase 22: ATS Score Threshold Setting
**Goal:** Let users set a minimum match score target so they can focus tailoring effort on high-match postings
**Requirements:** [ATS-01, ATS-02, ATS-03, ATS-04, ATS-05, ATS-06, ATS-07]
**Plans:** 2/3 plans executed

Plans:
- [x] 22-01-PLAN.md — Schema migration, IPC handlers, preload bindings, shared scoreColor utility
- [ ] 22-02-PLAN.md — OptimizeVariant threshold slider, target arc, score display, below-target callout
- [x] 22-03-PLAN.md — SubmissionLogForm warning banner, AnalysisList/AnalysisResults color import migration

### Phase 23: Answer Bank for Application Questions
**Goal:** Leverage the structured experience DB as an answer bank beyond resumes — feed interview prep, LinkedIn summaries, or common application form answers from existing bullet data
**Requirements:** TBD
**Plans:** 0 plans

### Phase 24: Import Resume from Existing PDF
**Goal:** Allow users to import their experience data from an existing PDF resume, parsing jobs, bullets, skills, and education into the structured DB
**Requirements:** TBD
**Plans:** 0 plans

### Phase 25: Job Posting URL Scraping
**Goal:** Scrape job posting content from a URL instead of requiring manual paste — fetch and extract job description, company, and role from job board links (LinkedIn, Indeed, etc.)
**Requirements:** TBD
**Plans:** 0 plans

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 + v1.1 | - | Complete | 2026-03-23 |
| 8-12 | v2.0 | 14/14 | Complete | 2026-03-24 |
| 13-16 | v2.1 | 12/12 | Complete | 2026-03-26 |
| 17-21 | v2.2 | 13/13 | Complete | 2026-04-01 |
| 22-25 | v2.3 | 0/3 | Active | - |

## Backlog

(Empty — all items promoted to v2.3)
