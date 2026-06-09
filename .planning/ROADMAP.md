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
- 🚧 **v2.6 Per-Variant Text Overrides** - Phases 35-38 (in progress)

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

### 🚧 v2.6 Per-Variant Text Overrides (In Progress)

**Milestone Goal:** Extend the three-layer data model so users can reword text at the variant tier (not just include/exclude), with a unified `entityOverrides` table replacing the old `analysisBulletOverrides`, correct three-tier merge precedence across all render surfaces, and AI-powered surfacing of excluded bullets that match a job's gaps.

- [x] **Phase 35: Unified Override Table + Migration** - New `entityOverrides` schema, data migration from `analysisBulletOverrides`, `acceptSuggestion` cutover, `createTestDb` sync (completed 2026-06-05)
- [x] **Phase 36: Merge Precedence + Snapshot Threading** - Extend `buildMergedBuilderData` with Layer 2.5 variant-tier overrides, `summaryOverride` through snapshots, variant override handlers, inclusion un-exclusion logic (completed 2026-06-06)
- [x] **Phase 37: Variant Reword UI** - Inline reword (InlineEdit) for bullets/summary/project title, override visual indicator, reset-to-base, duplicate copies overrides (completed 2026-06-07)
- [x] **Phase 38: Excluded-Bullet Suggestions** - Scorer prompt extension, new Zod field, `analysisExcludedBulletSuggestions` table, accept/dismiss handlers with bulletId validation, OptimizeVariant panel (completed 2026-06-09)

## Phase Details

### Phase 35: Unified Override Table + Migration

**Goal**: The new `entityOverrides` table exists, all existing analysis bullet overrides are migrated in with no data loss, and the `acceptSuggestion` write path uses the unified table — unblocking every subsequent phase
**Depends on**: Phase 34 (v2.5 complete)
**Requirements**: OVR-01
**Success Criteria** (what must be TRUE):

  1. Every row previously in `analysisBulletOverrides` is present in `entityOverrides` with correct entity type, field, and override text — verified by a post-migration row-count assertion that runs at app startup
  2. The old `analysisBulletOverrides` table remains intact and read-only — it is not dropped
  3. Accepting a bullet rewrite suggestion in OptimizeVariant writes to `entityOverrides`, not the old table, and the accepted text appears in preview without regression
  4. `createTestDb()` in `tests/helpers/db.ts` includes the new `entityOverrides` table definition, and all existing tests continue to pass
  5. The schema design decision (per-entity nullable FK columns, consistent with `template_variant_items`) is committed and recorded

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 35-01-PLAN.md — entityOverrides schema + raw DDL + partial unique indexes, mirrored in createTestDb()

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 35-02-PLAN.md — no-data-loss migration (transactional, idempotent) + startup row-count assertion, extracted + unit-tested

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 35-03-PLAN.md — acceptSuggestion/dismissSuggestion/getOverrides + mergeHelper Layer 3 cutover to entity_overrides; record D-01 in PROJECT.md

### Phase 36: Merge Precedence + Snapshot Threading

**Goal**: `buildMergedBuilderData()` applies overrides in strict precedence order (analysis tier wins over variant tier wins over base), summary overrides thread into submission snapshots, and the IPC handlers for writing/reading/clearing variant-tier overrides are implemented and tested
**Depends on**: Phase 35
**Requirements**: OVR-02, OVR-03
**Success Criteria** (what must be TRUE):

  1. PDF, DOCX, preview, and resume.json export all display the analysis-tier override text when both a variant-tier and analysis-tier override exist for the same field — the analysis tier always wins
  2. A submission snapshot freezes the variant-tier summary reword (if present) in `frozenProfile.summary` — re-opening the submission shows the overridden summary, not the base text
  3. `getVariantOverrides`, `setVariantOverride`, and `clearVariantOverride` IPC handlers are registered and callable from the renderer — unit tests verify the round-trip and merge correctness
  4. An excluded bullet accepted at the analysis tier is un-excluded in the merged output for that analysis — it appears in preview for that analysis but not for the base variant view

**Plans**: 4 plans
- [x] 36-01-PLAN.md — Wave 0: failing OVR-02/OVR-03 correctness-contract tests (2 new files + 2 extended)
- [x] 36-02-PLAN.md — Two-pass override map in buildMergedBuilderData (precedence analysis → variant → base) + inclusion un-exclusion + summaryOverride
- [x] 36-03-PLAN.md — Variant-tier override IPC handlers (get/set/clear) in templates.ts
- [x] 36-04-PLAN.md — Thread summaryOverride into snapshot freeze (OVR-03), scoring (D-05), and live DOCX export
**UI hint**: yes

### Phase 37: Variant Reword UI

**Goal**: Users can inline-edit bullet text, summary, and project title at the variant tier directly in the Variant Builder, see a visual indicator on overridden fields, reset any field back to its base text, and have overrides copied when duplicating a variant
**Depends on**: Phase 36
**Requirements**: RWD-01, RWD-02, RWD-03, RWD-04, RWD-05, RWD-06
**Success Criteria** (what must be TRUE):

  1. Hovering a bullet row, the summary section, or a project title in the Variant Builder reveals a pencil icon; clicking it opens an inline text editor pre-populated with the current effective text
  2. Saving an inline edit immediately updates the preview pane with the reworded text; no full-page reload or separate save button is required
  3. Overridden fields display an accent visual indicator (left-border or dot) that clearly distinguishes them from base (unmodified) text — strikethrough is NOT used (that means excluded)
  4. A "Reset" affordance on each overridden field clears the override and restores the base text in the preview
  5. Duplicating a variant copies all its variant-tier overrides to the new variant — the duplicate starts with the same rewording as the original

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 37-01-PLAN.md — Preload bridge for variant-override handlers + index.d.ts types (VariantOverrideRow, BuilderData.summaryOverride) + duplicateVariant override-copy (RWD-06); Wave 0 backend tests
- [x] 37-02-PLAN.md — Pure deriveOverrideSet indicator helper + unit test (RWD-04) + mergedSurfaces summary/project_name effective-text coverage (SC#1)

**Wave 2** *(blocked on Wave 1)*

- [x] 37-03-PLAN.md — VariantBuilder reword UI: pencil + InlineEdit + left-border indicator + revert icon for bullets/summary/project title, D-04 author-from-scratch summary, onReword live preview (RWD-01..05)
**UI hint**: yes

### Phase 38: Excluded-Bullet Suggestions

**Goal**: When running job analysis, the AI surfaces relevant base bullets the active variant excludes, users can accept a suggestion to include that bullet for the current analysis only (without changing the variant), and accepted bullets appear in preview/export/snapshot
**Depends on**: Phase 36
**Requirements**: SUG-01, SUG-02, SUG-03, SUG-04
**Success Criteria** (what must be TRUE):

  1. After running analysis, the OptimizeVariant screen shows a "Bullets you excluded that match this job" panel — cards display the bullet text, the AI's reason, and matched JD keywords
  2. Accepting a suggestion re-includes that bullet in the preview and export for the current analysis — it does not change which bullets are included in the variant itself
  3. Dismissing a suggestion removes the card from the panel; the bullet remains excluded from the variant
  4. `acceptExcludedBulletSuggestion` validates that the bullet ID exists in `job_bullets` AND is currently excluded from the active variant before writing to `entityOverrides` — a hallucinated or invalid bullet ID is rejected with a logged error, not silently accepted

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 38-01-PLAN.md — analysisExcludedBulletSuggestions table + DDL (schema/ensureSchema/createTestDb lockstep) + Wave 0 failing handler tests

**Wave 2** *(blocked on Wave 1)*

- [x] 38-02-PLAN.md — ResumeScorerSchema + buildScorerPrompt extension, runAnalysis excluded-bullet injection + seeding, four handlers with D-07 validation gate

**Wave 3** *(blocked on Wave 2)*

- [x] 38-03-PLAN.md — preload bridge + OptimizeVariant 'Bullets you excluded that match this job' panel, accept/dismiss/revert, client-side score nudge
**UI hint**: yes

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
| 35. Unified Override Table + Migration | v2.6 | 3/3 | Complete    | 2026-06-05 |
| 36. Merge Precedence + Snapshot Threading | v2.6 | 4/4 | Complete   | 2026-06-06 |
| 37. Variant Reword UI | v2.6 | 3/3 | Complete    | 2026-06-08 |
| 38. Excluded-Bullet Suggestions | v2.6 | 3/3 | Complete    | 2026-06-09 |

## Future (v3.0+)

- **Answer Bank for Application Questions** — Leverage the structured experience DB as an answer bank beyond resumes — feed interview prep, LinkedIn summaries, or common application form answers from existing bullet data

## Backlog

- **Live re-score-on-accept** — re-run the ATS scorer when an analysis-tier override is accepted/cleared so the displayed score live-updates with accepted rewrites (new LLM call + progress UX). Deferred from Phase 36 (which threads overrides into initial-run scoring only). Its own future phase.
