# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-13)
- ✅ **v1.1 Enhancements** - Phase 7 (shipped 2026-03-23)
- ✅ **v2.0 AI Analysis Integration** - Phases 8-12 (shipped 2026-03-24)
- 🚧 **v2.1 Resume Templates** - Phases 13-16 (in progress)

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

### 🚧 v2.1 Resume Templates (In Progress)

**Milestone Goal:** Replace bundled resume.json themes with 5 purpose-built HTML/CSS templates (Classic, Modern, Jake, Minimal, Executive) with proper page break handling, margin controls, accent color customization, and matching PDF/DOCX export — preview matches export exactly.

- [ ] **Phase 13: Pipeline Foundation** - Unified print.html rendering path with Classic template end-to-end
- [ ] **Phase 14: Templates Complete** - All 5 templates with per-template fonts and DOCX support
- [ ] **Phase 15: Controls + Page Break Overlay** - Accent color, margin toggle, skills mode, page boundary visualization
- [ ] **Phase 16: Cleanup** - Remove old resume.json themes, migrate snapshot PDF path

## Phase Details

### Phase 13: Pipeline Foundation
**Goal**: A single unified rendering path (PrintApp + VariantPreview + export.ts) proven end-to-end with the Classic template — no bifurcated preview/PDF branches
**Depends on**: Nothing (first phase of v2.1)
**Requirements**: TMPL-02, TMPL-03, PREV-03, EXPRT-04
**Success Criteria** (what must be TRUE):
  1. Classic template renders inside the variant builder preview pane as a full HTML/CSS page at paper scale
  2. Exporting to PDF produces output that matches the preview — same layout, same fonts, same spacing
  3. Preview iframe and PDF export use the exact same rendering surface (print.html BrowserWindow) — no separate code path
  4. Font files (Inter, Lato, EB Garamond) are bundled as woff2 and load correctly in both preview and PDF export
**Plans**: 3 plans
Plans:
- [ ] 13-01-PLAN.md — Template types, filterResumeData, ClassicTemplate, resolveTemplate registry
- [ ] 13-02-PLAN.md — Font bundling (woff2), print.html @font-face + CSP, __printBase preload global
- [ ] 13-03-PLAN.md — Wire PrintApp + VariantPreview + export.ts unified pipeline

### Phase 14: Templates Complete
**Goal**: All 5 resume templates (Classic, Modern, Jake, Minimal, Executive) are available, each with distinct visual style, and DOCX export uses the correct font per template
**Depends on**: Phase 13
**Requirements**: TMPL-01, TMPL-04, TMPL-05, EXPRT-01, EXPRT-02, EXPRT-03
**Success Criteria** (what must be TRUE):
  1. User can select any of 5 templates (Classic, Modern, Jake, Minimal, Executive) — each has visually distinct typography, spacing, and style
  2. All 5 templates produce PDF output matching their preview — no layout drift for any template
  3. DOCX export for each template uses the appropriate font family (serif for Classic/Executive, sans-serif for Modern/Jake/Minimal) with proper Word heading styles
  4. Professional summary section renders in templates when present and is skipped cleanly when not included
  5. Skills section renders in both inline comma-separated and grouped-by-category modes
**Plans**: TBD

### Phase 15: Controls + Page Break Overlay
**Goal**: Users can customize accent color, margins, and skills display mode per variant, and the preview pane shows visible page boundaries
**Depends on**: Phase 14
**Requirements**: CTRL-01, CTRL-02, CTRL-03, CTRL-04, CTRL-05, CTRL-06, PREV-01, PREV-02
**Success Criteria** (what must be TRUE):
  1. User can switch templates from a dropdown in the variant builder — preview re-renders immediately
  2. User can pick an accent color from preset swatches — color applies to the template and persists per variant
  3. User can toggle compact margins — layout tightens and persists per variant
  4. User can switch skills display mode between inline and grouped — change reflects in preview and persists per variant
  5. Preview pane shows page boundaries (page 1, gap, page 2) — jobs are never split across pages
  6. Preview updates in real-time when any checkbox or template control changes
**Plans**: TBD

### Phase 16: Cleanup
**Goal**: Old resume.json themes (Even, Class, Elegant) are fully removed and the submission snapshot PDF path works cleanly with the new template system
**Depends on**: Phase 15
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. Even, Class, and Elegant theme npm packages are uninstalled and all theme registry wiring is gone — no dead code paths remain
  2. ProfessionalLayout component is deleted — Classic template is the replacement and works identically for existing variants
  3. Exporting a PDF from a submission snapshot (old or new) completes without error
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 + v1.1 | - | Complete | 2026-03-23 |
| 8-12 | v2.0 | 14/14 | Complete | 2026-03-24 |
| 13. Pipeline Foundation | v2.1 | 0/3 | Planned | - |
| 14. Templates Complete | v2.1 | 0/? | Not started | - |
| 15. Controls + Page Break Overlay | v2.1 | 0/? | Not started | - |
| 16. Cleanup | v2.1 | 0/? | Not started | - |
