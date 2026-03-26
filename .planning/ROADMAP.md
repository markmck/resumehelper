# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-13)
- ✅ **v1.1 Enhancements** - Phase 7 (shipped 2026-03-23)
- ✅ **v2.0 AI Analysis Integration** - Phases 8-12 (shipped 2026-03-24)
- ✅ **v2.1 Resume Templates** - Phases 13-16 (shipped 2026-03-26)
- 🚧 **v2.2 Three Layer Data** - Phases 17-21 (in progress)

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

### 🚧 v2.2 Three Layer Data (In Progress)

**Milestone Goal:** Restructure data model so AI rewrites live on analyses (not variants), redesign skills management, and fix analysis/variant UX gaps.

## Phase Details

### Phase 17: Schema + Override IPC Foundation
**Goal**: The analysis_bullet_overrides table and IPC layer exist and are ready to receive writes
**Depends on**: Phase 16
**Requirements**: DATA-01, DATA-08
**Success Criteria** (what must be TRUE):
  1. The analysis_bullet_overrides table exists in the database on both fresh install and upgrade from v2.1
  2. IPC handlers ai:acceptSuggestion, ai:dismissSuggestion, and ai:getOverrides are callable from the renderer with correct types
  3. The applyOverrides() utility accepts a bullet list and override rows and returns merged text without mutating the input
  4. AI skill suggestions returned from analysis are not written to the skills table or variant
**Plans**: 2 plans
Plans:
- [ ] 17-01-PLAN.md — Schema tables, Drizzle definitions, shared applyOverrides utility, module boundary config
- [ ] 17-02-PLAN.md — IPC handler implementations (accept, dismiss, getOverrides) and preload bridge

### Phase 18: Three-Layer Model Wiring
**Goal**: Accepting an AI suggestion writes to the override table (not base bullets), preview/export merges all three layers, and submissions capture the correct merged result
**Depends on**: Phase 17
**Requirements**: DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07
**Success Criteria** (what must be TRUE):
  1. Accepting a bullet suggestion in OptimizeVariant no longer changes the bullet text visible in the base Experience tab
  2. The preview in OptimizeVariant shows the overridden text for the current analysis and the base text when viewed outside analysis context
  3. Two analyses on the same variant show independent rewrite text — accepting in one does not affect the other
  4. Dismissing a suggestion leaves the bullet unchanged; undoing an accepted suggestion reverts the bullet to base text
  5. A submission created from analysis context freezes the merged (overridden) bullet text in the snapshot, not the base text
**Plans**: 3 plans
Plans:
- [x] 18-01-PLAN.md — Thread analysisId through main-process handlers, add skill IPC handlers, update preload bridge and PrintApp
- [ ] 18-02-PLAN.md — Rewire OptimizeVariant to per-click IPC, add revert flow, wire skills, thread analysisId to VariantPreview
- [x] 18-03-PLAN.md — Extend buildSnapshotForVariant with override and skill addition merging

### Phase 19: Analysis Submission Flow
**Goal**: Users can log a submission directly from the analysis screen with company and role pre-filled, and stale or orphaned analysis states are surfaced clearly
**Depends on**: Phase 18
**Requirements**: ANLYS-01, ANLYS-02, ANLYS-03, ANLYS-04, ANLYS-05
**Success Criteria** (what must be TRUE):
  1. A "Log Submission" button on the optimize screen and analysis list pre-populates the submission form with company, role, and the current analysis's merged resume content
  2. Pasting a job posting into the analysis form auto-fills company and role fields without manual typing
  3. Company and role on an existing analysis can be edited inline after creation
  4. An analysis that becomes stale (base bullet or variant changed after analysis ran) shows a visible stale indicator
  5. If a bullet referenced by an override has been deleted, the analysis view shows a graceful notice rather than crashing or silently rendering stale text
**Plans**: TBD

### Phase 20: Skills Chip Grid
**Goal**: Skills are displayed and managed as a chip grid with drag-and-drop between categories and inline rename
**Depends on**: Phase 16
**Requirements**: VARNT-02, VARNT-03, VARNT-04
**Success Criteria** (what must be TRUE):
  1. Skills page displays all skills as chips grouped by category, replacing the flat tag list
  2. A skill chip can be dragged from one category column and dropped into another, updating its category
  3. A category name can be renamed inline by clicking it
  4. A new empty category can be created and skills dragged into it
  5. All existing skill category assignments from v2.1 tags data are preserved after the migration — no skills lose their grouping
**Plans**: TBD

### Phase 21: Variant UX + Cleanup
**Goal**: Users can toggle entire jobs off in the variant builder, variant cards show accurate timestamps, the Modern template renders skills correctly, and all stale UI copy is removed
**Depends on**: Phase 16
**Requirements**: VARNT-01, VARNT-05, TMPL-01, CLNP-01
**Success Criteria** (what must be TRUE):
  1. A single toggle on a job header in the variant builder includes or excludes all bullets for that job at once
  2. Variant cards display the correct last-edited timestamp, not a stale or wrong value
  3. Modern template renders skills inline without layout breakage
  4. No "coming soon" placeholder text appears anywhere in the app for features that have shipped
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 + v1.1 | - | Complete | 2026-03-23 |
| 8-12 | v2.0 | 14/14 | Complete | 2026-03-24 |
| 13-16 | v2.1 | 12/12 | Complete | 2026-03-26 |
| 17. Schema + Override IPC Foundation | 2/2 | Complete    | 2026-03-26 | - |
| 18. Three-Layer Model Wiring | v2.2 | 2/3 | In Progress|  |
| 19. Analysis Submission Flow | v2.2 | 0/? | Not started | - |
| 20. Skills Chip Grid | v2.2 | 0/? | Not started | - |
| 21. Variant UX + Cleanup | v2.2 | 0/? | Not started | - |
