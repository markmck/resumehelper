# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.1 — Resume Templates

**Shipped:** 2026-03-26
**Phases:** 4 | **Plans:** 12 | **Timeline:** 2 days (2026-03-25 → 2026-03-26)

### What Was Built
- Unified print.html rendering pipeline — single surface for preview, PDF export, and snapshot viewing
- 5 purpose-built templates (Classic, Modern, Jake, Minimal, Executive) with distinct typography and fonts
- Template controls: accent color picker, margin sliders, skills display mode, showSummary toggle — all persisted per variant
- Page break visualization with discrete page boundaries in the preview pane
- Immutable submission snapshots — profile, content, and template options frozen at submit time
- Full cleanup of old resume.json theme infrastructure (3 packages, 500+ lines removed)

### What Worked
- **Unified pipeline architecture** — building the print.html surface first (Phase 13) meant every subsequent phase benefited from a single rendering path. No layout drift bugs between preview and export.
- **Phase sequencing** — Pipeline → Templates → Controls → Cleanup was the right order. Each phase built cleanly on the prior one.
- **UAT-driven bug fixing** — Phase 16 UAT caught 3 real issues (deleted template dropdown, snapshot margin mismatch, missing snapshot immutability) that automated verification missed. Manual testing by the user was essential.
- **Incremental gap closure** — Plan 16-03 fixed UAT gaps surgically without replanning the entire phase.

### What Was Inefficient
- **Snapshot PDF margins required 3 iterations** — first zeroed (too little), then template defaults (didn't match), then proper DOCX_MARGIN_DEFAULTS. The margin architecture (printToPDF vs template CSS) wasn't fully understood until debugging.
- **Template dropdown accidentally deleted** — Plan 16-01 removed the template dropdown along with the old themes code. The plan didn't account for the new dropdown sharing infrastructure with the old one. Better diff review before committing would have caught this.
- **SUMMARY.md frontmatter gaps** — CTRL-01, CTRL-02, CTRL-04 weren't listed in 15-02-SUMMARY.md requirements-completed, requiring manual cross-referencing during audit. Frontmatter should be verified at plan completion.
- **SnapshotViewer missing postMessage fields** — the original rewrite didn't send margin/accent/skills data because the old ProfessionalLayout didn't have those concepts. Should have compared VariantPreview's postMessage shape during implementation.

### Patterns Established
- **printToPDF handles vertical page margins, template CSS handles side padding** — this is the architectural rule for the rendering pipeline
- **Submission snapshots freeze everything** — profile, templateOptions, showSummary, and all content. Old snapshots fall back gracefully.
- **TEMPLATE_DEFAULTS is the single source of truth** for per-template defaults (margins, accent, skills display)
- **onVariantChanged callback** — parent refreshes variant list when child saves options, preventing stale state

### Key Lessons
1. **Test the deletion path** — when removing code, verify what else depended on the deleted infrastructure. The template dropdown deletion was caught by UAT but should have been caught by plan review.
2. **Match the full postMessage shape** — when rewriting a component to use an existing message protocol, compare against the existing sender's message shape field-by-field.
3. **Understand the margin architecture before changing margins** — printToPDF margins and template CSS serve different roles. Changing one without understanding the other causes hard-to-debug visual mismatches.
4. **Snapshot immutability is non-negotiable** — users expect submissions to be frozen in time. Any data fetched live at render time (like profile) breaks this contract silently.

### Cost Observations
- Model mix: ~40% opus (orchestration, discuss, UAT), ~60% sonnet (research, planning, execution, verification)
- Sessions: ~6 (discuss → plan → execute → UAT → gap fix → audit/complete)
- Notable: Phase 16 execution was fast (~15 min for 2 plans) but UAT + fix cycles added significant time. The verification loop worked as designed — it caught real issues.

---

## Milestone: v2.2 — Three Layer Data

**Shipped:** 2026-04-01
**Phases:** 5 | **Plans:** 13 | **Timeline:** 6 days (2026-03-26 → 2026-04-01)

### What Was Built
- Three-layer data model: base experience → variant selection → analysis-scoped overrides
- Per-click accept/dismiss with immediate IPC persistence (batch save removed)
- Live preview with merged override text in OptimizeVariant
- Submission snapshots freeze all three layers including accepted skill additions
- Analysis submission flow: Log Submission from optimize/dashboard, company/role auto-extraction, inline editing
- Stale analysis detection (amber banner) and orphaned override handling (strikethrough notice)
- Skills chip grid with @dnd-kit drag-and-drop between categories, inline category rename, category reorder
- Job-level toggle in variant builder, variant card timestamp fix, Modern template overflow fix, coming-soon cleanup

### What Worked
- The discuss → plan → execute → verify pipeline ran smoothly across all 5 phases with minimal gap closure (only 1 gap plan needed in Phase 18)
- Phase 17 (schema foundation) cleanly separated from Phase 18 (UI wiring) — dependencies were well-sequenced
- UI-SPEC design contracts caught spacing/typography violations before they reached implementation
- @dnd-kit worked well for cross-container drag — the PointerSensor activationConstraint was the key fix for Electron

### What Was Inefficient
- Phase 18 gap closure plan (18-04) could have been caught in the original plan if the planner had verified VariantPreview was rendered inside OptimizeVariant
- Several bugs found during user testing (DnD not working, skill categories lost) that weren't caught by verification — verification is limited to TypeScript compilation since no test framework exists
- UI-SPEC checker consistently flagged spacing values from user-provided mockups (6px, 5px, 10px) — the 4px grid rule is too strict for pixel-perfect mockup implementation

### Patterns Established
- Three-layer merge pattern: `applyOverrides()` as a shared pure function used by main process and renderer
- Analysis-scoped data: overrides and skill additions belong to analyses, not variants
- On-demand derived state: `isStale` computed at view time, no stored column
- Category-first skill model: `skill_categories` table with sortOrder replaces tags-as-categories

### Key Lessons
1. The "per-click persist" pattern (no batch save) is simpler and more reliable than managing dirty state
2. User-provided HTML mockups are the most efficient design spec — skip UI-SPEC generation when a mockup exists
3. Bug fixes found during manual testing should be addressed immediately, not deferred to gap closure phases
4. @dnd-kit needs `activationConstraint: { distance: 8 }` on PointerSensor for Electron — without it, drag never initiates

### Cost Observations
- Model mix: opus for planning, sonnet for research/execution/verification
- Sessions: ~4 sessions across the milestone
- Notable: 5 phases planned and executed in a single extended session — context window held up well

---

## Milestone: v2.3 — Job Hunt Accelerator

**Shipped:** 2026-04-03
**Phases:** 3 | **Plans:** 7 | **Timeline:** 19 days (2026-03-13 → 2026-04-01)

### What Was Built
- ATS score threshold setting: slider (0-100, step 5) with debounced auto-save, target arc tick on SVG ring, threshold-relative color bands (green/yellow/red), below-target callout listing pending rewrites and missing keywords
- Soft warning banner in SubmissionLogForm when linked analysis score is below variant threshold — informational only, never blocks submit
- Shared scoreColor utility replacing duplicated color logic across AnalysisList, AnalysisResults, and SubmissionLogForm
- PDF resume import: pdf-parse for text extraction, Zod ResumeJsonSchema for structured AI output, callResumeExtractor with generateObject, append-mode ImportConfirmModal
- Job posting URL scraping: net.fetch with browser User-Agent and 15s timeout, HTML strip to plain text, AI extraction via generateObject with isJobPosting guard, auto-populate rawText/company/role

### What Worked
- **Small, focused phases** — 3 phases with 2-3 plans each shipped cleanly with minimal rework
- **Pattern reuse** — generateObject + Zod schema pattern worked identically for PDF extraction and URL extraction, zero learning curve on Phase 24 after Phase 23
- **Phase 24 verification passed 7/7** — well-defined observable truths made verification straightforward
- **INSERT-only append semantics** — confirmAppend with no DELETE statements avoided any risk of data loss during import

### What Was Inefficient
- **ROADMAP traceability table** stale — v2.3 requirements still showed "Planned" status despite all being checked off. Traceability updates should happen at plan completion, not just at roadmap creation.
- **Summary one-liner extraction** failed for most summaries — the CLI tool couldn't reliably extract one-liners from the frontmatter format, requiring manual accomplishment gathering during milestone completion

### Patterns Established
- **generateObject for all AI extraction** — unified pattern: Zod schema → generateObject → type-safe result with auto-retry. Used for job analysis, PDF import, and URL scraping.
- **isJobPosting guard** — boolean flag in extraction schema catches non-content pages without site-specific heuristics
- **Auto-switch tab after async fetch** — switch to paste tab after URL fetch so user sees populated content for review

### Key Lessons
1. Keep AI extraction schemas simple with boolean guards (isJobPosting) rather than trying to detect edge cases procedurally
2. INSERT-only semantics for import operations are safer and easier to reason about than upsert-or-replace
3. The shared scoreColor utility pattern should have been extracted earlier — it was duplicated across 3 components before Phase 22-03 consolidated it
4. Pre-check AI config before opening file dialogs to avoid dialog-then-fail UX

### Cost Observations
- Model mix: opus for orchestration/planning, sonnet for research/execution/verification
- Sessions: ~3 across the milestone
- Notable: All 7 plans averaged ~4 min each — the fastest milestone per-plan execution yet

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.1 | 2 days | 4 | First milestone with discuss-phase context gathering, UAT-driven gap closure |
| v2.2 | 6 days | 5 | UI-SPEC design contracts, @dnd-kit integration, three-layer data model |
| v2.3 | 19 days | 3 | generateObject pattern reuse, fastest per-plan execution (~4 min avg) |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v2.1 | 0 automated | manual only | 0 (no new npm deps) |
| v2.2 | 0 automated | manual only | 0 (@dnd-kit already installed) |
| v2.3 | 0 automated | manual only | 1 (pdf-parse) |

### Top Lessons (Verified Across Milestones)

1. UAT by the actual user catches issues that automated verification misses — especially around state persistence and visual consistency
2. A unified rendering pipeline eliminates entire categories of bugs (layout drift, font mismatch, margin inconsistency)
3. Per-click persist is simpler than batch save — confirmed across two milestones (v2.1 template options, v2.2 override accept/dismiss)
4. @dnd-kit PointerSensor needs activationConstraint for Electron — universal lesson for any drag interaction
5. generateObject + Zod is the universal AI extraction pattern — confirmed across 3 use cases (job analysis, PDF import, URL scraping)
6. Pre-check config/prerequisites before opening file dialogs or starting async operations — avoid dialog-then-fail UX
