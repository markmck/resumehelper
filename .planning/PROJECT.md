# ResumeHelper

## What This Is

A desktop application (Electron) for managing, versioning, and submitting tailored resumes with AI-powered job analysis. It stores all professional experience in a SQLite database (full resume.json spec coverage), lets users create template variants with 5 purpose-built resume templates, and tracks every job submission with full pipeline visibility — including immutable snapshots of the exact resume sent. Users paste job postings for LLM-powered analysis — match scoring, keyword coverage, gap identification, and bullet rewrite suggestions — turning resume tailoring from a 30-minute manual process into a few minutes of guided review.

## Core Value

Full visibility into job applications — which resume version was sent to which company, when, and where each application stands in the pipeline. The tracking system is the foundation; fast resume tailoring builds on top of it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ User can store work history with toggleable bullet points — v1.0
- ✓ User can store skills with freeform tags — v1.0
- ✓ User can create and manage template variants with checkbox builder — v1.0
- ✓ User can export resume as PDF and DOCX — v1.0
- ✓ User can log submissions with frozen resume snapshots — v1.0
- ✓ User can view all submissions in a list — v1.0
- ✓ Profile/contact info for resume headers — v1.0
- ✓ User can add projects with toggleable bullet points — v1.1
- ✓ Tag autocomplete suggests existing tags as user types — v1.1
- ✓ Projects toggleable in template variants and appear in preview/export — v1.1
- ✓ Full resume.json entity coverage (education, volunteer, awards, publications, languages, interests, references) — v1.1
- ✓ Collapsible sections in Experience tab — v1.1
- ✓ Import resume data from resume.json file with confirmation — v1.1
- ✓ Bundled resume.json themes (Even, Class, Elegant) with preview and PDF export — v1.1 (replaced by v2.1 templates)
- ✓ AI provider selection (Claude, OpenAI) with API key management and test connection — v2.0
- ✓ Job posting analysis with match scoring, keyword coverage, and gap analysis — v2.0
- ✓ Per-bullet rewrite suggestions with accept/dismiss and fabrication prevention — v2.0
- ✓ Submission pipeline tracking (Applied → Screening → Interview → Offer → Result + Withdrawn) — v2.0
- ✓ Dark-theme design system with CSS custom properties and Inter font — v2.0
- ✓ Experience page with collapsible cards, drag-to-reorder, inline editing — v2.0
- ✓ Variant Builder split-pane with live preview and export controls — v2.0
- ✓ Analysis dashboard with metric cards and two-column layout — v2.0
- ✓ Submissions tracker with metric cards, filter pills, and pipeline dots — v2.0
- ✓ 5 purpose-built templates (Classic, Modern, Jake, Minimal, Executive) with distinct typography — v2.1
- ✓ Unified print.html rendering pipeline — preview matches PDF export exactly — v2.1
- ✓ Template controls (accent color, margin sliders, skills display, showSummary) persisted per variant — v2.1
- ✓ Page break visualization with discrete page boundaries in preview — v2.1
- ✓ DOCX export with per-template fonts and ATS heading styles — v2.1
- ✓ Template fonts bundled as woff2 (Inter, Lato, EB Garamond) — v2.1
- ✓ Immutable submission snapshots (profile + content + template options frozen at submit time) — v2.1
- ✓ Old resume.json themes removed, single rendering pipeline — v2.1
- ✓ Three-layer data model (base → variant → analysis overrides) — v2.2

- ✓ Per-click accept/dismiss with analysis-scoped overrides — v2.2
- ✓ Preview/export merges all three layers, snapshots freeze merged result — v2.2
- ✓ Log submission from analysis/optimize screens with pre-fill — v2.2
- ✓ Company/role auto-extraction from job posting text — v2.2
- ✓ Inline edit company/role on existing analyses — v2.2
- ✓ Stale analysis detection with warning banner — v2.2
- ✓ Orphaned override graceful handling — v2.2
- ✓ Skills chip grid with @dnd-kit drag-and-drop between categories — v2.2
- ✓ Skill category inline rename and reorder — v2.2
- ✓ Job-level toggle in variant builder — v2.2
- ✓ Variant card timestamps corrected — v2.2
- ✓ Modern template inline skills overflow fixed — v2.2
- ✓ Stale "coming soon" messages cleaned up — v2.2
- ✓ ATS score threshold with slider, target arc, and threshold-relative color bands — v2.3
- ✓ Below-target callout in OptimizeVariant listing pending rewrites and missing keywords — v2.3
- ✓ Soft warning in SubmissionLogForm when score below threshold — v2.3
- ✓ PDF resume import with AI extraction (pdf-parse + generateObject/Zod) — v2.3
- ✓ Append-mode import preserving existing data (INSERT-only) — v2.3
- ✓ Job posting URL scraping via net.fetch + AI extraction — v2.3
- ✓ Active URL tab in NewAnalysisForm with auto-populate of text/company/role — v2.3
- ✓ Windows installer (NSIS) with install wizard, Start Menu shortcut, and uninstaller — v2.4
- ✓ Test infrastructure: Vitest with electron mock and in-memory SQLite helper — v2.4
- ✓ Data layer test coverage: handler extraction to pure functions, applyOverrides, three-layer merge — v2.4
- ✓ AI integration test coverage: Zod schemas, score derivation, MockLanguageModelV3, runAnalysis — v2.4
- ✓ Export pipeline test coverage: DOCX XML assertions, snapshot shape, template rendering — v2.4

### Active

<!-- Current scope. Building toward these. -->

- [ ] User can export full experience DB as resume.json (base export)
- [ ] User can export a variant's merged view as resume.json (three-layer merge matches preview/PDF)
- [ ] User can configure SQLite DB location via Settings with copy → verify → switch migration
- [ ] DOCX export honors the variant's showSummary toggle
- [ ] Orphan TEMPLATE_LIST export removed from resolveTemplate.ts
- [ ] Vestigial compact prop removed from ResumeTemplateProps
- [ ] Dead tests/setup.ts deleted (or properly wired into vitest)
- [ ] Race condition in jobs.test.ts under concurrent thread pool fixed

## Current Milestone: v2.5 Portability & Debt Cleanup

**Goal:** Make resume data portable via JSON export and settle all outstanding tech debt.

**Target features:**
- Resume.json export (base) — full experience DB as valid resume.json
- Resume.json export (variant-merged) — per-variant three-layer merge, export-only (no roundtrip guarantee)
- Configurable SQLite DB location with copy → verify → switch migration
- DOCX showSummary toggle honored
- Tech debt cleanup: TEMPLATE_LIST, compact prop, tests/setup.ts, jobs.test.ts race

## Current State

**Latest shipped:** v2.4 Polish & Reliability (2026-04-21)

The app is a fully functional resume management tool with AI analysis, three-layer data model, skills chip grid, submission tracking, 5 professional templates, ATS score thresholds, PDF resume import, and job posting URL scraping. Now installable via Windows NSIS installer with 143 tests across 16 files covering data layer, AI integration, and export pipeline.

### Out of Scope

- AI-generated resume text from scratch — AI suggests rewording of existing bullets but never fabricates experience
- Mobile app — desktop-first via Electron
- Cover letter generation — separate concern
- Runtime theme installation — bundle curated templates only for now
- AI-powered auto-variant generation — future milestone
- Automated tailoring pipeline (paste → analyze → generate → export) — future milestone
- Submission analytics/pattern insights — future milestone (needs history data)
- Section reordering in templates — future milestone

## Context

- Developer has extensive cross-stack experience (C#, React, Angular, frontend, backend) making resume tailoring especially valuable
- Pain point solved: AI tools exaggerate experience when asked to help tailor resumes — this app keeps the human in control
- Pain point solved: hard to track which version was sent where — frozen snapshots + pipeline tracking
- v1.0 shipped: Experience DB, Template Variants, Submissions with snapshots, PDF/DOCX Export
- v1.1 shipped: Projects, full resume.json entity support, resume.json import, 3 bundled themes, tag autocomplete, collapsible Experience tab
- v2.0 shipped: AI analysis, bullet suggestions, submission pipeline, dark-theme UI redesign
- v2.1 shipped: 5 purpose-built templates, unified rendering pipeline, template controls, snapshot immutability, old theme cleanup
- v2.2 shipped: Three-layer data model, skills chip grid, analysis submission flow, variant UX cleanup
- v2.3 shipped: ATS score thresholds, PDF resume import with AI extraction, job posting URL scraping
- v2.4 shipped: Windows installer, Vitest test infrastructure, 143 tests across data layer/AI/export pipeline
- Stack: Electron + React 19 + TypeScript + Drizzle ORM + SQLite + @dnd-kit + Vitest + design system tokens (CSS custom properties)
- 26,816 lines of TypeScript/TSX across 90+ source files (including 16 test files)
- Single rendering pipeline: print.html + PrintApp + postMessage for all preview/export/snapshot paths
- Three-layer data: base experience → variant selection → analysis-scoped overrides (merge at render)

## Constraints

- **Tech stack**: Electron + React + TypeScript + Drizzle ORM + SQLite (established in v1.0)
- **AI boundary**: AI suggests rewording of existing bullets and flags gaps — never fabricates experience or writes from scratch. User accepts/rejects every suggestion.
- **AI provider**: Provider-agnostic — user supplies their own API key (Claude, OpenAI, etc.)
- **Export formats**: PDF and Word/DOCX — both use per-template fonts and margin values
- **Inline styles**: Use inline styles for layout spacing (Tailwind v4 utility classes unreliable)
- **Template rendering**: All templates use React inline styles — external CSS breaks in prod file:// context
- **No CSS @page rules**: Conflicts with Electron printToPDF margins (Chromium issue #8138)

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Template variants over git-like branching | Simpler mental model — few base templates tweaked per job, not full git semantics | ✓ Good |
| AI suggests, never writes | User's #1 complaint is AI exaggeration — trust comes from controlling every word | ✓ Good |
| Custom schema over resume.json | Freedom to design around branching, submissions, and app workflow | ✓ Good |
| Submission pipeline tracking is core value | User prioritized tracking visibility over speed of resume creation | ✓ Good |
| CREATE TABLE IF NOT EXISTS over file migrations | File-based migrations were fragile with partial DB states | ✓ Good |
| Inline styles over Tailwind for spacing | Tailwind v4 utility classes not applying reliably | ✓ Good |
| Full resume.json entity coverage | User wanted all resume.json sections, not just core 4 | ✓ Good |
| AI boundary: suggest rewording, never fabricate | User wants AI help matching job language but still controls every word | ✓ Good |
| Provider-agnostic AI with user-supplied API key | No vendor lock-in; user brings their own key (Claude, OpenAI, etc.) | ✓ Good |
| Fixed pipeline stages | Covers 95% of cases; notes field handles rest | ✓ Good |
| Dark design system with CSS custom properties | Stripe/Vercel-inspired, 4px grid, token-based colors/spacing/typography, Inter font | ✓ Good |
| Score derived in code, not LLM | LLM arithmetic unreliable — deriveOverallScore uses weighted formula | ✓ Good |
| Sidebar fixed 240px, not collapsible | Collapse toggle caused layout issues; fixed width is simpler | ✓ Good |
| Unified print.html rendering pipeline | Single surface for preview, PDF export, snapshot — no bifurcated paths. Layout drift structurally impossible. | ✓ Good |
| Per-template independent React components | No shared base component; shared ResumeTemplateProps type + resolveTemplate registry | ✓ Good |
| templateOptions as JSON text column | ALTER TABLE ADD COLUMN in try/catch; parsed with null fallback. Flexible per-variant settings. | ✓ Good |
| Custom color picker (no react-colorful) | 100% inline styles project — external CSS breaks in file:// context | ✓ Good |
| printToPDF handles top/bottom margins, template CSS handles sides | Chromium physical margins repeat per page; CSS padding only applies once to container | ✓ Good |
| Immutable submission snapshots | Profile + content + templateOptions frozen at submission time; old snapshots fall back to live DB | ✓ Good |
| Three-layer data model (base → variant → override) | Analysis overrides are analysis-scoped, not variant-scoped. Merge at render via applyOverrides(). | ✓ Good |
| Per-click accept/dismiss (no batch save) | Immediate IPC persistence on each accept/dismiss. No save button. Navigate away when done. | ✓ Good |
| Separate skill_categories table | First-class category entities with sortOrder for reordering. Skills get categoryId FK. Tags column vestigial. | ✓ Good |
| @dnd-kit for drag-and-drop | Electron/Windows pointer-event compatibility. PointerSensor with activationConstraint. | ✓ Good |
| On-demand staleness detection | Compare analysis.createdAt against bullet/variant updatedAt at view time. No stored column. | ✓ Good |
| Simple regex for company/role extraction | No extra LLM call at paste-time. Regex patterns parse common job posting formats. LLM extraction during analysis run unchanged. | ✓ Good |
| scoreThreshold optional on TemplateVariant | Pre-existing variants may lack the column until DB migrates. Default 80. | ✓ Good |
| Shared scoreColor utility | Single source of truth for threshold-relative color bands across all analysis components. | ✓ Good |
| generateObject for PDF/URL extraction | Type-safe auto-retry on malformed JSON. Mirrors existing callJobParser pattern. | ✓ Good |
| confirmAppend INSERT-only (no DELETE) | Append semantics preserve existing data — user imports additively. | ✓ Good |
| isJobPosting guard in URL extraction | Catches JS-rendered pages, auth walls, CAPTCHA without site-specific logic. | ✓ Good |
| Auto-switch to paste tab after URL fetch | User sees populated content and can review before running analysis. | ✓ Good |
| Composition-based LLM mocking via MockLanguageModelV3 | Inject LanguageModel through call signatures instead of vi.mock('ai'). Deterministic, no module replacement, prompt-wiring assertable. | ✓ Good |
| Handler extraction pattern (db: Db first param) | Pure functions taking db as first arg; ipcMain.handle is thin wiring. Unlocks direct unit testing without IPC. | ✓ Good |
| DOCX XML assertions over in-memory object tree | docx library internals are unstable across versions; word/document.xml is the contract Word consumes. fflate unzip + string assertions. | ✓ Good |
| Per-file jsdom via vitest docblock | Global env stays node; .tsx test files opt in with `/** @vitest-environment jsdom */`. No global DOM pollution. | ✓ Good |
| renderToString over Testing Library for template tests | No @testing-library/react dependency; pure string assertions on HTML output. Sufficient for structure verification. | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-23 after v2.5 milestone started*
