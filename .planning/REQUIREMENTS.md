# Requirements: ResumeHelper

**Defined:** 2026-03-25
**Core Value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands in the pipeline.

## v2.1 Requirements

Requirements for Resume Templates milestone. Each maps to roadmap phases.

### Template Rendering

- [x] **TMPL-01**: App includes 5 resume templates: Classic, Modern, Jake, Minimal, Executive — each with distinct typography, spacing, and visual style
- [x] **TMPL-02**: Templates render as HTML/CSS inside the preview pane at page scale, showing actual page boundaries
- [x] **TMPL-03**: All templates use single-column ATS-friendly layout with standard section headings (Work Experience, Education, Skills, etc.)
- [x] **TMPL-04**: Templates support professional summary section (optional, user-toggleable)
- [x] **TMPL-05**: Skills section supports two display modes per template: inline comma-separated and grouped by category

### Template Controls

- [x] **CTRL-01**: User can select a template from a dropdown in the variant builder preview header — switching re-renders immediately
- [x] **CTRL-02**: User can override the template accent color via a color picker — saved per variant
- [x] **CTRL-03**: User can toggle between standard and compact margins per template — saved per variant
- [x] **CTRL-04**: User can toggle skills display mode (inline vs grouped) per template — saved per variant
- [x] **CTRL-05**: User can adjust the bottom page break margin to control when content pushes to the next page — jobs are never split across pages
- [x] **CTRL-06**: Template choice, accent color, margins, and skills mode are persisted per variant in the database

### Preview Quality

- [x] **PREV-01**: Preview pane shows a full print preview with actual page boundaries (page 1, gap, page 2) — like a PDF viewer
- [x] **PREV-02**: Preview updates in real-time when builder checkboxes are toggled or template controls are changed
- [x] **PREV-03**: Preview and PDF export render identically — same component, same engine, no layout drift

### Export Quality

- [x] **EXPRT-01**: PDF export matches the preview exactly for all 5 templates — no layout differences
- [x] **EXPRT-02**: DOCX export produces clean ATS-parseable documents with proper Word heading styles (HeadingLevel.HEADING_1 for section headers)
- [x] **EXPRT-03**: DOCX export uses the correct font family per template (serif for Classic/Executive, sans-serif for Modern/Jake/Minimal)
- [x] **EXPRT-04**: Template fonts are bundled as woff2 files for consistent rendering across platforms (Lato, EB Garamond, Inter already bundled)

### Cleanup

- [x] **CLEAN-01**: Old resume.json themes (Even, Class, Elegant) are removed — npm packages uninstalled, theme registry deleted
- [ ] **CLEAN-02**: Old ProfessionalLayout component is replaced by the Classic template
- [ ] **CLEAN-03**: Submission snapshot PDF export works with the new template system (falls back gracefully for old snapshots)

## v2.2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Automated Tailoring

- **AUTO-01**: AI auto-generates a variant from job posting analysis (pre-selected bullets + reworded)
- **AUTO-02**: Automated pipeline: paste job → analyze → generate variant → user reviews → export → log submission

### Template Enhancements

- **TMPL-ENH-01**: User can reorder resume sections (drag sections 2-7 in variant builder)
- **TMPL-ENH-02**: Skills pills/chips display mode for templates (requires DOCX degradation logic)

### Analysis Enhancements

- **ENH-01**: Analysis history per job posting with score progression and delta display
- **ENH-02**: ATS compatibility check as distinct signal
- **ENH-03**: Analysis run linked to submission export for full traceability

## Out of Scope

| Feature | Reason |
|---------|--------|
| Two-column/sidebar template layouts | ATS parsers can't reliably read multi-column content |
| Custom font upload | Bundled ATS-safe fonts cover all professional needs |
| LaTeX template rendering | HTML/CSS pipeline is simpler and matches Electron's printToPDF |
| Section reordering | Fixed order for v2.1; deferred to v2.2 |
| Skills pills/chips in templates | Requires DOCX degradation logic; deferred to v2.2 |
| Cover letter templates | Separate document type, explicitly out of scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMPL-01 | Phase 14 | Complete |
| TMPL-02 | Phase 13 | Complete |
| TMPL-03 | Phase 13 | Complete |
| TMPL-04 | Phase 14 | Complete |
| TMPL-05 | Phase 14 | Complete |
| CTRL-01 | Phase 15 | Complete |
| CTRL-02 | Phase 15 | Complete |
| CTRL-03 | Phase 15 | Complete |
| CTRL-04 | Phase 15 | Complete |
| CTRL-05 | Phase 15 | Complete |
| CTRL-06 | Phase 15 | Complete |
| PREV-01 | Phase 15 | Complete |
| PREV-02 | Phase 15 | Complete |
| PREV-03 | Phase 13 | Complete |
| EXPRT-01 | Phase 14 | Complete |
| EXPRT-02 | Phase 14 | Complete |
| EXPRT-03 | Phase 14 | Complete |
| EXPRT-04 | Phase 13 | Complete |
| CLEAN-01 | Phase 16 | Complete |
| CLEAN-02 | Phase 16 | Pending |
| CLEAN-03 | Phase 16 | Pending |

**Coverage:**
- v2.1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 — traceability mapped to phases 13-16*
