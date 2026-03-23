# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-13)
- ✅ **v1.1 Enhancements** - Phase 7 (shipped 2026-03-23)
- 🚧 **v2.0 AI Analysis Integration** - Phases 8-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP + v1.1 Enhancements (Phases 1-7) - SHIPPED 2026-03-23</summary>

Phases 1-7 covered: Experience DB, Template Variants, Submissions with snapshots, PDF/DOCX Export, Projects, full resume.json entity support, resume.json import, 3 bundled themes, tag autocomplete, collapsible Experience tab.

</details>

### 🚧 v2.0 AI Analysis Integration (In Progress)

**Milestone Goal:** Add AI-powered job posting analysis, match scoring, bullet rewrite suggestions, submission pipeline stages, and a full dark-theme UI redesign.

## Phase Details

### Phase 8: Foundation
**Goal**: Users can configure their AI provider and the app has the design system and navigation shell in place to support all subsequent v2.0 work
**Depends on**: Phase 7 (v1.1 complete)
**Requirements**: UI-01, UI-02, AI-01, AI-02, AI-03, AI-04, AI-05
**Success Criteria** (what must be TRUE):
  1. User can open Settings tab, select a provider (Claude or OpenAI), enter their API key, and see a masked display with a test button
  2. Clicking "Test Connection" shows a clear success or failure message without exposing the raw key to any UI element
  3. The app navigation sidebar shows Experience, Variants, Analysis, Submissions, and Settings tabs and routes between them
  4. CSS custom property tokens (colors, spacing, typography) are active in the app and all new components use them
  5. All LLM-bound IPC channels are registered in the main process and return a structured error if the provider is not yet configured
**Plans:** 2/3 plans executed
Plans:
- [ ] 08-01-PLAN.md — Design system tokens (tokens.css, Inter font) and collapsible sidebar navigation shell
- [ ] 08-02-PLAN.md — DB schema (ai_settings, job_postings, analysis_results), IPC handlers, AI SDK install
- [ ] 08-03-PLAN.md — Settings tab UI with AI provider config, key management, and test connection

### Phase 9: Analysis Core
**Goal**: Users can paste a job posting, trigger analysis against a specific variant, and see match score, keyword coverage, and gap details — with results persisted to the database
**Depends on**: Phase 8
**Requirements**: ANLYS-01, ANLYS-02, ANLYS-03, ANLYS-04, ANLYS-05, ANLYS-06, ANLYS-07
**Success Criteria** (what must be TRUE):
  1. User can paste job posting text, select a variant, and click Analyze — a loading state with progress indication appears during the LLM call
  2. Analysis returns a 0-100 match score that is the same every time the same inputs are submitted (deterministic, temperature 0)
  3. Keyword results are split into three labeled groups: exact matches, semantic matches, and missing keywords
  4. Gap analysis lists items with critical (required) and moderate (preferred) severity tiers sourced from posting language
  5. Analysis results are saved to the database linked to the job posting and the specific variant used
**Plans:** 2/3 plans executed
Plans:
- [ ] 09-01-PLAN.md — Backend: DB schema extension, Zod schemas, LLM two-call pipeline, job postings CRUD
- [ ] 09-02-PLAN.md — UI: Analysis list (Screen 1) and New Analysis form (Screen 2) with variant selection
- [ ] 09-03-PLAN.md — UI: Analyzing progress stepper (Screen 3) and Results dashboard (Screen 4), full wiring

### Phase 10: Bullet Suggestions
**Goal**: Users can review per-bullet rewrite suggestions from the analysis, compare original and proposed text side by side, and accept or dismiss each suggestion individually — accepted suggestions write back to the database
**Depends on**: Phase 9
**Requirements**: SUGG-01, SUGG-02, SUGG-03, SUGG-04, SUGG-05
**Success Criteria** (what must be TRUE):
  1. Analysis results include per-bullet rewrite suggestions that incorporate job posting language
  2. User sees original bullet text and suggested rewrite displayed side by side for each suggestion
  3. User can accept or dismiss each suggestion independently — no bulk accept button exists
  4. Accepting a suggestion permanently updates the bullet text in the database
  5. Suggestions never add technologies, metrics, or scope claims not present in the original bullet text
**Plans**: TBD

### Phase 11: Submission Pipeline
**Goal**: Users can track each job application through fixed pipeline stages, add notes per submission, and filter and search the submissions list — with variant and match score stored at submission time
**Depends on**: Phase 8
**Requirements**: SUB-01, SUB-02, SUB-03, SUB-04, SUB-05, SUB-06
**Success Criteria** (what must be TRUE):
  1. Every submission shows a status badge from fixed stages: Applied, Phone Screen, Technical, Offer, Rejected
  2. User can change a submission's status via dropdown or badge interaction and the change persists
  3. User can add and edit notes on a submission (recruiter name, dates, follow-up reminders)
  4. Submissions list columns include status badge, variant tag, and match score (if analysis was run at submission)
  5. User can filter submissions by status and search by company name
**Plans**: TBD

### Phase 12: UI Redesign
**Goal**: All pages reflect the v2.0 dark-theme design system with the redesigned layouts — Experience uses collapsible cards with drag reorder, Variant Builder uses a split pane, and the Analysis and Submissions views match their HTML mockup layouts — without breaking any existing export or snapshot functionality
**Depends on**: Phase 11
**Requirements**: UI-03, UI-04, UI-05, UI-06, UI-07, UI-08
**Success Criteria** (what must be TRUE):
  1. Experience page shows collapsible job cards with inline editing and drag-to-reorder, all using design system tokens
  2. Variant Builder shows a split-pane layout with the builder on the left and a live preview on the right
  3. Analysis dashboard shows 4 metric cards and a two-column layout (keyword analysis + gap details on left, suggested rewrites on right)
  4. Submissions tracker shows metric cards (total, in progress, interviews, response rate) above a filter-pill + searchable table layout
  5. PDF export, DOCX export, snapshot viewer, and variant builder preview all function correctly after the redesign
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in order: 8 → 9 → 10 → 11 → 12
Note: Phase 11 depends only on Phase 8 (no AI dependency) — can begin after Phase 8 completes, in parallel with Phases 9-10 if desired.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. Foundation | 2/3 | In Progress|  | - |
| 9. Analysis Core | 2/3 | In Progress|  | - |
| 10. Bullet Suggestions | v2.0 | 0/TBD | Not started | - |
| 11. Submission Pipeline | v2.0 | 0/TBD | Not started | - |
| 12. UI Redesign | v2.0 | 0/TBD | Not started | - |
