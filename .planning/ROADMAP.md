# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-13)
- ✅ **v1.1 Enhancements** - Phase 7 (shipped 2026-03-23)
- ✅ **v2.0 AI Analysis Integration** - Phases 8-12 (shipped 2026-03-24)
- ✅ **v2.1 Resume Templates** - Phases 13-16 (shipped 2026-03-26)
- ✅ **v2.2 Three Layer Data** - Phases 17-21 (shipped 2026-04-01)
- ✅ **v2.3 Job Hunt Accelerator** - Phases 22-24 (shipped 2026-04-03)
- 🚧 **v2.4 Polish & Reliability** - Phases 25-29 (in progress)

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

### v2.4 Polish & Reliability (In Progress)

**Milestone Goal:** Make the app installable via a proper Windows NSIS installer and establish test coverage across the core data layer, AI integration, and export pipeline.

## Phase Details

### Phase 25: Windows Installer
**Goal**: Users can install ResumeHelper on Windows via a professional setup wizard with correct metadata and no broken auto-update plumbing
**Depends on**: Phase 24
**Requirements**: INST-01, INST-02, INST-03
**Success Criteria** (what must be TRUE):
  1. Running the .exe launches a wizard where the user can choose install directory and confirm installation
  2. After install, ResumeHelper appears in Start Menu and Add/Remove Programs with correct product name and version
  3. Uninstalling via Add/Remove Programs fully removes the app without leftover artifacts
  4. The app launches successfully after installer completes (runAfterFinish works)
  5. `electron-builder.yml` contains no dead asarUnpack entries for removed jsonresume theme packages
**Plans:** 1/1 plans complete
Plans:
- [x] 25-01-PLAN.md — Apply installer config/metadata corrections and build verified installer

### Phase 26: Test Infrastructure
**Goal**: The Vitest test runner is configured and operational with an Electron module mock and in-memory SQLite helper that all subsequent test phases can depend on
**Depends on**: Phase 25
**Requirements**: TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. Running `npm test` exits with zero failures (no test files produce errors)
  2. Running `npm run test:coverage` generates a coverage report without crashing
  3. The `electron` module resolves to a static mock in test context — no import errors for any file that imports from `electron`
  4. `createTestDb()` returns an in-memory Drizzle instance with the full schema applied, ready for use in any test file
**Plans:** 1/1 plans complete
Plans:
- [x] 26-01-PLAN.md — Install Vitest, create electron mock + createTestDb helper, smoke tests

### Phase 27: Data Layer Tests
**Goal**: The three-layer merge logic and core IPC handler business logic have verified test coverage against real in-memory SQLite behavior
**Depends on**: Phase 26
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. `applyOverrides()` tests pass for base-only, variant-only, and full three-layer merge scenarios
  2. IPC handler tests for experience, variants, and submissions pass against an in-memory SQLite DB with seeded data
  3. Handler business logic that required extraction (e.g., from `handlers/templates.ts`, `handlers/ai.ts`) is exported as named pure functions and covered by unit tests
**Plans:** 3/3 plans complete
Plans:
- [ ] 27-01-PLAN.md — Factories, applyOverrides extension, extract+test jobs/bullets/profile
- [ ] 27-02-PLAN.md — Batch extract 15 remaining handler files
- [ ] 27-03-PLAN.md — Extract+test templates.ts and submissions.ts with three-layer integration

### Phase 28: AI Integration Tests
**Goal**: Zod schemas for all AI flows validate correctly and score derivation produces verified weighted results, with AI provider calls mocked for deterministic testing
**Depends on**: Phase 26
**Requirements**: AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. `JobParserSchema`, `ResumeScorerSchema`, and `ResumeJsonSchema` each have tests for valid parse and rejection of invalid input
  2. `deriveOverallScore()` tests cover correct weighted output, edge cases (0-100 clamping), and all weighted fields
  3. `callJobParser()` and related AI provider functions have tests that use a mock LLM provider and never call a real API
**Plans:** 2/4 plans executed
Plans:
- [x] 28-01-PLAN.md — Refactor aiProvider signatures + relocate JobUrlExtractionSchema + extract extractJsonFromText + extend electron safeStorage mock
- [x] 28-02-PLAN.md — Unit tests: all four Zod schemas, deriveOverallScore, extractJsonFromText
- [ ] 28-03-PLAN.md — MockLanguageModelV3 tests for callJobParser, callResumeScorer, callResumeExtractor
- [ ] 28-04-PLAN.md — runAnalysis integration tests: cache-miss and cache-hit paths

### Phase 29: Export Pipeline Tests
**Goal**: DOCX generation, submission snapshot shape, and template component rendering each have verified test coverage
**Depends on**: Phase 26
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03
**Success Criteria** (what must be TRUE):
  1. DOCX generation tests assert correct paragraph structure, heading styles, and per-template font names for at least one template
  2. Submission snapshot tests confirm that profile, content, and templateOptions are all present and correctly shaped in a frozen snapshot
  3. Template component render tests (via jsdom) confirm expected HTML structure is produced for at least one template without crashing on minimal props
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 + v1.1 | - | Complete | 2026-03-23 |
| 8-12 | v2.0 | 14/14 | Complete | 2026-03-24 |
| 13-16 | v2.1 | 12/12 | Complete | 2026-03-26 |
| 17-21 | v2.2 | 13/13 | Complete | 2026-04-01 |
| 22-24 | v2.3 | 7/7 | Complete | 2026-04-03 |
| 25. Windows Installer | v2.4 | 1/1 | Complete    | 2026-04-03 |
| 26. Test Infrastructure | v2.4 | 1/1 | Complete    | 2026-04-04 |
| 27. Data Layer Tests | v2.4 | 0/3 | Complete    | 2026-04-06 |
| 28. AI Integration Tests | v2.4 | 2/4 | In Progress|  |
| 29. Export Pipeline Tests | v2.4 | 0/? | Not started | - |

## Future (v3.0+)

- **Answer Bank for Application Questions** — Leverage the structured experience DB as an answer bank beyond resumes — feed interview prep, LinkedIn summaries, or common application form answers from existing bullet data

## Backlog

(Empty — all items promoted to v2.4)
