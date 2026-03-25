---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Resume Templates
status: planning
stopped_at: Completed 14-03-PLAN.md
last_updated: "2026-03-25T20:55:59.261Z"
last_activity: 2026-03-25 — v2.1 roadmap created, 21 requirements mapped across 4 phases
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 6
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands
**Current focus:** Milestone v2.1 — Phase 13: Pipeline Foundation

## Current Position

Phase: 13 of 16 (Pipeline Foundation)
Plan: —
Status: Ready to plan
Last activity: 2026-03-25 — v2.1 roadmap created, 21 requirements mapped across 4 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 14 (v2.0)
- Average duration: ~12 min/plan (v2.0)
- Total execution time: ~2.8 hours (v2.0)

**By Phase (v2.0 reference):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 08-foundation | 2 | ~7 min | ~3.5 min |
| 09-analysis-core | 3 | ~32 min | ~11 min |
| 10-bullet-suggestions | 1 | ~4 min | 4 min |
| 11-submission-pipeline | 3 | ~69 min | ~23 min |
| 12-ui-redesign | 3 | ~39 min | ~13 min |

*Updated after each plan completion*
| Phase 13-pipeline-foundation P01 | 8 | 2 tasks | 4 files |
| Phase 13-pipeline-foundation P02 | 10 | 2 tasks | 10 files |
| Phase 13-pipeline-foundation P03 | 12 | 2 tasks | 4 files |
| Phase 13-pipeline-foundation P03 | 35 | 3 tasks | 6 files |
| Phase 14-templates-complete P02 | 2 | 2 tasks | 2 files |
| Phase 14-templates-complete P01 | 3 | 3 tasks | 4 files |
| Phase 14-templates-complete P03 | 2 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.1 research]: Unified print.html path — VariantPreview iframe + PDF export use same URL, layout drift structurally impossible
- [v2.1 research]: Per-template independent React components — no shared base component; shared ResumeTemplateProps type + resolveTemplate registry
- [v2.1 research]: react-colorful@5.6.1 — only new npm dep; fallback is native `<input type="color">` if React 19 compat issue
- [v2.1 research]: templateOptions column via ALTER TABLE ADD COLUMN in try/catch at startup — not Drizzle file migration
- [v2.1 research]: CSS @page rules banned in templates — conflicts with printToPDF margins (Electron issue #8138)
- [v2.1 research]: All template styles use React inline styles — external CSS breaks in prod file:// context
- [Phase 11]: snapshotPdf uses themeRegistry renderThemeHtml — will break when old themes removed; Classic fallback fix in Phase 16
- [v1.0]: CREATE TABLE IF NOT EXISTS — new columns need ALTER TABLE ADD COLUMN in try/catch
- [Phase 13-01]: ClassicTemplate uses Times New Roman instead of Calibri/Segoe UI — ATS-friendly serif font for print/PDF
- [Phase 13-01]: Summary renders as plain paragraph below contact line with no h2 heading — removes visual noise for ATS
- [Phase 13-01]: filterResumeData pre-filters excluded bullets within jobs/projects — templates never receive excluded bullets
- [Phase 13-pipeline-foundation]: Used @fontsource npm packages for font woff2 files (separate per-weight latin subset), not Google Fonts CDN
- [Phase 13-pipeline-foundation]: window.__printBase preload global resolves via ELECTRON_RENDERER_URL in dev, file:// renderer dir in prod
- [Phase 13-pipeline-foundation]: VariantPreview uses --color-bg-raised for gray PDF-viewer background; plan had wrong token name --color-surface-raised
- [Phase 13-pipeline-foundation]: accentColor hardcoded as #cccccc in PrintApp for Phase 13; Phase 15 reads from DB
- [Phase 13-pipeline-foundation]: iframe postMessage replaces window.api in PrintApp — Electron preload does not inject into iframes; VariantPreview fetches data and sends via postMessage
- [Phase 13-pipeline-foundation]: PagedContent splits resume into 1056px discrete page boxes — single scrolling iframe had no visual page boundaries
- [Phase 14-templates-complete]: Profile.label not in preload interface; used (profile as any)?.label for Executive subtitle — label field deferred
- [Phase 14-templates-complete]: ExecutiveTemplate showSummary defaults true — the only template with summary on by default
- [Phase 14-templates-complete]: ClassicTemplate updated: Georgia font, #000000 accent, showSummary guard, skillsDisplay support
- [Phase 14-templates-complete]: ModernTemplate: Calibri, 40px accent underline, #2563EB default, inline skillsDisplay with accent category labels
- [Phase 14-templates-complete]: JakeTemplate: Lato, dense 0.6/0.5in margins, Company em-dash Title single-line entry, #333333 default
- [Phase 14-templates-complete]: DOCX_FONT_MAP: Georgia for Classic, Calibri for Modern/Jake/Minimal, Garamond for Executive — per-template Word fonts
- [Phase 14-templates-complete]: HeadingLevel.HEADING_1 on all 10 DOCX section headings for ATS parsing alongside visual TextRun styling

### Pending Todos

- Configurable DB location (allow user to set SQLite path, e.g. NAS) — future milestone
- Validate print.html production URL construction before VariantPreview change (window.location.origin is null in file:// context)
- Decide snapshot PDF policy before Phase 16: Classic fallback only vs full template-aware snapshot

### Blockers/Concerns

- [v2.1 Phase 13]: print.html prod URL construction needs prototype — three options exist (window.__printBase preload global, relative ./print.html, IPC-provided URL); none tested in this codebase yet

## Session Continuity

Last session: 2026-03-25T20:55:59.259Z
Stopped at: Completed 14-03-PLAN.md
Resume file: None
