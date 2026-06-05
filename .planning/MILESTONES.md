# Milestones

## v2.5 Portability & Debt Cleanup (Shipped: 2026-06-05)

**Phases completed:** 5 phases, 19 plans
**Git range:** feat(30-01) → phase-34 complete | 79 files changed, +8,838 / -1,819
**Test suite:** 247 tests, all passing

**Key accomplishments:**

- Unified merge pipeline: a single `buildMergedBuilderData()` feeds HTML preview, PDF, DOCX, and snapshot — eliminating 3 parallel merge paths — and DOCX export now honors the per-variant `showSummary` toggle, matching PDF/HTML
- Base resume.json export: full experience DB → Zod-validated resume.json with validation-first error handling (`ExportValidationError`), a shared `ResumeJson` schema in `src/shared/`, and null/empty-field omission accepted by strict JSON Resume validators
- Variant-merged resume.json export: a variant's full three-layer merge (base + selection + accepted skill additions + bullet overrides) exported as resume.json matching its PDF/DOCX output — export-only, no `meta` sidecar, with a tooltip clarifying re-import semantics
- Configurable SQLite DB location: Settings card with a safe relocate flow (WAL checkpoint → copy → integrity-verify → bootstrap JSON → backup → restart), clean rollback on failure, UNC/cloud-path warning, and delete-old-backup; `db/index.ts` refactored to a lazy bootstrap-resolved Proxy singleton without touching any of the 20 handler call-sites
- Tech debt cleanup: removed orphan `TEMPLATE_LIST` export, vestigial `compact` prop (all 5 templates), and dead `tests/setup.ts`; fixed the `jobs.test.ts` `.where(undefined as any)` race
- Cross-surface `lastExportDir` persistence shared across all 5 export surfaces (PDF / DOCX / snapshotPdf / base JSON / variant JSON)

**Known deferred items at close:** 0 — all 8 open artifacts were reconciled during close (3 diagnosis-only debug sessions marked resolved, 1 todo moved to done, 7 human-smoke UAT/verification scenarios across Phases 32 & 34 confirmed passing by the user).

---

## v2.4 Polish & Reliability (Shipped: 2026-04-21)

**Phases completed:** 5 phases, 12 plans, 26 tasks
**Git range:** 70 files changed, +10,270 / -4,129
**Test suite:** 143 tests across 16 files, all passing

**Key accomplishments:**

- Windows installer (NSIS) with setup wizard, Start Menu shortcut, uninstaller entry, and clean metadata
- Test infrastructure: Vitest with electron mock, in-memory SQLite/Drizzle factory (`createTestDb()`), reusable test helpers and factories
- Data layer test coverage: 57 tests covering handler extraction to pure functions (db: Db pattern), applyOverrides edge cases, three-layer merge integration, variant selection cascade
- AI integration test coverage: 44 tests with composition-based MockLanguageModelV3, Zod schema validation, deriveOverallScore, extractJsonFromText, full runAnalysis cache-miss/hit paths
- Export pipeline test coverage: 42 tests — buildResumeDocx extracted as pure function, DOCX XML assertions for all 5 templates, submission snapshot shape + JSON round-trip, template component rendering via renderToString
- Full test suite: 143 tests across 16 files in ~1.4s

---

## v2.3 Job Hunt Accelerator (Shipped: 2026-04-03)

**Phases completed:** 3 phases, 7 plans
**Git range:** feat(22-01) → feat(24-02) | 212 files changed, +35,747 / -3,908

**Key accomplishments:**

- ATS score threshold setting with slider, target arc, threshold-relative color bands, and below-target callout in OptimizeVariant
- Soft warning in SubmissionLogForm when linked analysis score is below variant threshold — informational only, non-blocking
- Shared scoreColor utility consumed across AnalysisList, AnalysisResults, and SubmissionLogForm (no local duplicates)
- PDF resume import: pdf-parse + AI extraction via generateObject/Zod, file dialog → parse → confirm append flow
- Append-mode ImportConfirmModal with INSERT-only semantics preserving existing data
- Job posting URL scraping: net.fetch + HTML strip + AI extraction via generateObject with isJobPosting guard
- Active URL tab in NewAnalysisForm with fetch button, loading/error/warning states, auto-populate of rawText/company/role

---

## v2.2 Three Layer Data (Shipped: 2026-04-01)

**Phases completed:** 10 phases, 13 plans, 17 tasks

**Key accomplishments:**

- One-liner:
- Three working IPC handlers (acceptSuggestion upsert, dismissSuggestion hard-delete, getOverrides read) wired to analysis_bullet_overrides table via Drizzle ORM, completing the override IPC layer for Phase 18 UI integration.
- 1. [Rule 1 - Bug] Cast Drizzle query result for source column union type
- Removed (batch save):
- buildSnapshotForVariant now accepts optional analysisId and bakes bullet overrides and accepted skill additions into the frozen submission snapshot
- One-liner:
- updated_at schema columns, jobPostings:update IPC handler, isStale staleness detection in getAnalysis, and isOrphaned orphan detection in getOverrides — complete backend plumbing for Phase 19 UI
- Inline company/role editing with IPC persist, stale analysis amber banner, Log Submission button in OptimizeVariant, orphaned override strikethrough cards, and regex auto-extraction of company/role from pasted job text
- skill_categories table, categoryId FK on skills, idempotent tag migration, and full CRUD IPC with preload bridge
- One-liner:
- LEFT JOIN skill_categories in getBuilderData and replace tags[0] grouping with categoryName across all four downstream integration surfaces
- Job-level checkbox in VariantBuilder toggles all bullets via setItemExcluded with type 'job'; variant cards now show updatedAt with createdAt fallback
- Word-wrap CSS on Modern template skills columns, Submit button wired to existing Log Submission flow, and "Coming in Phase 11" placeholder removed entirely.

---

## v2.1 Resume Templates (Shipped: 2026-03-26)

**Phases completed:** 4 phases, 12 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---

## v2.0 AI Analysis Integration (Shipped: 2026-03-24)

**Phases completed:** 5 phases, 14 plans, 4 tasks

**Key accomplishments:**

- (none recorded)

---

## v1.1 Enhancements (Shipped: 2026-03-23)

**Phases completed:** 7 phases, 18 plans, 0 tasks

**Key accomplishments:**

- (none recorded)

---
