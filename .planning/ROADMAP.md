# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-13)
- ✅ **v1.1 Enhancements** - Phase 7 (shipped 2026-03-23)
- ✅ **v2.0 AI Analysis Integration** - Phases 8-12 (shipped 2026-03-24)
- ✅ **v2.1 Resume Templates** - Phases 13-16 (shipped 2026-03-26)
- ✅ **v2.2 Three Layer Data** - Phases 17-21 (shipped 2026-04-01)
- ✅ **v2.3 Job Hunt Accelerator** - Phases 22-24 (shipped 2026-04-03)
- ✅ **v2.4 Polish & Reliability** - Phases 25-29 (shipped 2026-04-21)
- 🚧 **v2.5 Portability & Debt Cleanup** - Phases 30-34 (in progress)

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

### v2.5 Portability & Debt Cleanup (Phases 30-34)

- [ ] **Phase 30: Merge-Helper Reconciliation + DOCX showSummary Fix** - Unify three parallel merge paths and honor showSummary in DOCX export
- [ ] **Phase 31: Base Resume.json Export** - Export full experience DB as valid resume.json from Experience tab
- [ ] **Phase 32: Variant-Merged Resume.json Export** - Export a variant's fully-merged view as resume.json from VariantEditor
- [ ] **Phase 33: Tech Debt Cleanup** - Remove orphan TEMPLATE_LIST export, vestigial compact prop, dead tests/setup.ts, and fix jobs.test.ts race
- [ ] **Phase 34: Configurable SQLite DB Location** - User can relocate the SQLite DB via Settings with copy → verify → switch → restart migration

## Phase Details

### Phase 30: Merge-Helper Reconciliation + DOCX showSummary Fix
**Goal**: A single authoritative merge path feeds HTML, PDF, and DOCX — and the user's showSummary toggle is honored consistently across all three
**Depends on**: Nothing (first phase of v2.5)
**Requirements**: MERGE-01, MERGE-02, MERGE-03, DOCX-01
**Success Criteria** (what must be TRUE):
  1. User toggles `showSummary` off on a variant and the summary paragraph is omitted from DOCX export (matching PDF/HTML behavior)
  2. HTML preview, PDF export, and DOCX export of the same variant produce identical bullet sets, skill additions, and summary/job inclusions
  3. `buildMergedBuilderData(db, variantId, analysisId?)` is the single function called by PDF/DOCX/snapshot/preview paths — grep shows no remaining parallel merge implementations
  4. A parameterized test suite exercises HTML + PDF + DOCX × summary on/off × all 5 templates and fails loudly if any surface drifts
  5. `ResumeJson` interface lives at `src/shared/resumeJson.ts` and is imported by both import.ts and (eventually) the new export builders
**Plans**: TBD
**UI hint**: yes

### Phase 31: Base Resume.json Export
**Goal**: User can export the full experience DB as a valid resume.json file that downstream JSON Resume validators accept
**Depends on**: Phase 30 (ResumeJson interface lifted to shared)
**Requirements**: JSON-01, JSON-02, JSON-03, JSON-04, JSON-05, JSON-06
**Success Criteria** (what must be TRUE):
  1. User clicks "Export JSON" in the Experience tab header, picks a location, and saves `${profileName}_Resume.json` containing their full experience DB
  2. Exported file passes `ResumeJsonSchema.parse` (Zod) and is accepted by strict JSON Resume validators — null/empty optional fields are omitted, not emitted as `null` or `""`
  3. When validation fails the user sees a user-actionable error (not a silent write of bad data, not a stack trace)
  4. User re-opens the save dialog and it defaults to the last-used export directory; filename auto-populates using existing sanitization rules
  5. ImportConfirmModal copy and `buildBaseResumeJson` source both clearly communicate the "lossy-faithful" semantics (append-only on re-import, documented field subset)
**Plans**: TBD
**UI hint**: yes

### Phase 32: Variant-Merged Resume.json Export
**Goal**: User can export any variant's fully-rendered, three-layer-merged view as resume.json matching its PDF/DOCX output
**Depends on**: Phase 30 (unified merge helper), Phase 31 (validated ResumeJson shape and writer)
**Requirements**: JSON-07, JSON-08, JSON-09, JSON-10, JSON-11
**Success Criteria** (what must be TRUE):
  1. User clicks the "JSON" button (peer of PDF / DOCX) in the VariantEditor preview toolbar and saves `${profileName}_Resume_${variantName}.json`
  2. The exported JSON reflects the full three-layer merge — base + variant selection + accepted skill additions + bullet overrides — matching what the same variant's PDF/DOCX produce
  3. Excluded items (summary off, excluded jobs, excluded bullets) do not appear in the exported JSON
  4. Exported JSON contains no `meta` sidecar field — it is pure resume.json output only
  5. Hovering the JSON button reveals a tooltip explaining export-only semantics: re-importing creates new base entries, it will not recreate this variant
**Plans**: TBD
**UI hint**: yes

### Phase 33: Tech Debt Cleanup
**Goal**: Four long-standing debt items are removed without breaking tests, types, or rendered output
**Depends on**: Phase 30 (merge reconciliation lands first to avoid touching the same files twice)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. `TEMPLATE_LIST` export is gone from `resolveTemplate.ts` and a full-workspace grep (including `.claude/`, `dist/`, `scripts/`) finds no remaining readers
  2. The vestigial `compact` prop is removed from `ResumeTemplateProps` and all 5 template components — `tsc` and `vitest` both pass, and a manual render of all 5 templates shows no regressions
  3. `tests/setup.ts` is deleted; the full test suite runs 3× consecutively before and after deletion with identical pass counts
  4. `jobs.test.ts` no longer contains `.where(undefined as any)` (replaced with a correct filter or removed with documented intent), and the full suite runs 10× consecutively under the default thread pool with zero race failures
**Plans**: TBD

### Phase 34: Configurable SQLite DB Location
**Goal**: User can safely relocate the SQLite database to any folder they choose, with integrity verification, rollback on failure, and a cloud-storage warning
**Depends on**: Phases 30, 31, 32, 33 (last — touches module-level DB singletons imported by 20+ handlers)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10
**Success Criteria** (what must be TRUE):
  1. User opens Settings, sees a `Database Location` card with the current DB path, "Reveal in Explorer" button, and "Change location" button
  2. User picks a folder, confirms the 5-step plan modal, and the DB is checkpoint-closed, copied, integrity-verified, bootstrap-written, and renamed `.bak` — then prompted to restart (Restart now / Later)
  3. On restart, the app resolves the DB via `userData/db-location.json` bootstrap override before opening the database — the new location is in use
  4. When the user picks a UNC path or a well-known cloud folder (OneDrive / Dropbox / iCloud Drive), a non-blocking warning modal explains the WAL-over-network risk and lets them proceed
  5. Any failure during the change sequence rolls back cleanly — the source DB remains accessible, no partial state is left on disk, and the error is surfaced to the user
  6. After a successful relocation, a "Delete old backup" button appears in the Database Location card and only deletes the `.bak` file on explicit user click
**Plans**: TBD
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
| 30-34 | v2.5 | 0/0 | Not started | - |

## Future (v3.0+)

- **Answer Bank for Application Questions** — Leverage the structured experience DB as an answer bank beyond resumes — feed interview prep, LinkedIn summaries, or common application form answers from existing bullet data

## Backlog

(Empty — all tech debt items promoted to v2.5)
