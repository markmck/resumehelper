# Requirements: ResumeHelper

**Defined:** 2026-03-26
**Core Value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands

## v2.2 Requirements

Requirements for milestone v2.2 Three Layer Data. Each maps to roadmap phases.

### Three-Layer Data Model

- [x] **DATA-01**: Analysis bullet overrides stored in dedicated table with (analysisId, bulletId) key
- [x] **DATA-02**: Accepting an AI suggestion writes override to analysis, not to base bullet or variant
- [x] **DATA-03**: Preview/export merges base text → variant selection → analysis overrides with correct precedence
- [x] **DATA-04**: Variant preview without analysis context shows base text only (no overrides)
- [x] **DATA-05**: Same variant analyzed against two jobs produces independent override sets
- [x] **DATA-06**: Dismissing a suggestion creates no override; undoing acceptance removes override and reverts to base
- [x] **DATA-07**: Submission snapshot captures fully merged three-layer result, immutable after creation
- [x] **DATA-08**: AI skill suggestions stored on analysis only, not added to variant or base

### Analysis UX

- [x] **ANLYS-01**: User can log submission directly from the optimize screen
- [x] **ANLYS-02**: Company and role auto-extracted from job posting text when not manually entered
- [x] **ANLYS-03**: User can edit company and role after analysis is created
- [x] **ANLYS-04**: Stale indicator shown when base bullet or variant changes after analysis
- [x] **ANLYS-05**: Orphaned overrides (deleted base bullets) handled gracefully with UI notice

### Variant & Experience UX

- [x] **VARNT-01**: User can toggle entire job on/off in variant builder (all bullets at once)
- [x] **VARNT-02**: Skills displayed as chip grid with drag-and-drop between categories
- [x] **VARNT-03**: User can rename skill categories inline
- [x] **VARNT-04**: User can add new skill categories and drag skills into them
- [x] **VARNT-05**: Variant cards show correct "last edited" timestamp

### Template Fixes

- [x] **TMPL-01**: Modern template renders skills inline correctly

### Cleanup

- [x] **CLNP-01**: All stale "coming soon" messages removed for shipped features

## v2.3 Requirements

Requirements for milestone v2.3 Job Hunt Accelerator.

### ATS Score Threshold

- [x] **ATS-01**: score_threshold integer column on templateVariants with default 80, persisted in DB
- [x] **ATS-02**: IPC handlers (get/set) for reading and writing a variant's score threshold
- [x] **ATS-03**: Threshold slider (0-100, step 5) on OptimizeVariant with debounced auto-save
- [x] **ATS-04**: Score ring and label on OptimizeVariant use threshold-relative color bands (green at/above, yellow within 15, red below)
- [x] **ATS-05**: Score display shows "72 (+6)" format with target arc tick on SVG ring
- [x] **ATS-06**: Below-target callout on OptimizeVariant listing pending rewrites, missing keywords, skill suggestions — updates live
- [x] **ATS-07**: Soft warning in SubmissionLogForm when score < threshold — informational only, non-blocking

### PDF Resume Import

- [ ] **PDF-01**: pdf-parse installed as dependency for PDF text extraction in main process
- [ ] **PDF-02**: Zod ResumeJsonSchema matching full ResumeJson interface (all 11 sections) for structured AI output
- [ ] **PDF-03**: AI-powered extraction via callResumeExtractor using existing getModel/generateObject infrastructure
- [ ] **PDF-04**: parseResumePdf IPC handler: file dialog -> PDF extraction -> AI call -> return counts + data
- [ ] **PDF-05**: confirmAppend IPC handler: INSERT-only transaction, no DELETE statements, additive import
- [ ] **PDF-06**: Preload bindings (parsePdf, confirmAppend) with TypeScript types in index.d.ts
- [ ] **PDF-07**: ImportConfirmModal supports append mode with blue styling, "Import Data" button, additive messaging
- [ ] **PDF-08**: ExperienceTab has "Import PDF" button alongside "Import JSON" with loading indicator during AI extraction

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Variant Enhancements

- **VARNT-F01**: Section reordering in templates
- **VARNT-F02**: Skills pills/chips display mode in rendered templates (requires DOCX degradation logic)

### AI Automation

- **AI-F01**: AI-powered auto-variant generation
- **AI-F02**: Automated tailoring pipeline (paste → analyze → generate → export)

### Analytics

- **ANLT-F01**: Submission analytics/pattern insights (needs history data)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI-generated resume text from scratch | AI suggests rewording only — never fabricates experience |
| Mobile app | Desktop-first via Electron |
| Cover letter generation | Separate concern |
| Job board integration/scraping | Manual entry |
| Runtime theme installation | Bundle curated templates only |
| Configurable DB location | Future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 17 | Complete |
| DATA-08 | Phase 17 | Complete |
| DATA-02 | Phase 18 | Complete |
| DATA-03 | Phase 18 | Complete |
| DATA-04 | Phase 18 | Complete |
| DATA-05 | Phase 18 | Complete |
| DATA-06 | Phase 18 | Complete |
| DATA-07 | Phase 18 | Complete |
| ANLYS-01 | Phase 19 | Complete |
| ANLYS-02 | Phase 19 | Complete |
| ANLYS-03 | Phase 19 | Complete |
| ANLYS-04 | Phase 19 | Complete |
| ANLYS-05 | Phase 19 | Complete |
| VARNT-02 | Phase 20 | Complete |
| VARNT-03 | Phase 20 | Complete |
| VARNT-04 | Phase 20 | Complete |
| VARNT-01 | Phase 21 | Complete |
| VARNT-05 | Phase 21 | Complete |
| TMPL-01 | Phase 21 | Complete |
| CLNP-01 | Phase 21 | Complete |
| ATS-01 | Phase 22 | Planned |
| ATS-02 | Phase 22 | Planned |
| ATS-03 | Phase 22 | Planned |
| ATS-04 | Phase 22 | Planned |
| ATS-05 | Phase 22 | Planned |
| ATS-06 | Phase 22 | Planned |
| ATS-07 | Phase 22 | Planned |
| PDF-01 | Phase 23 | Planned |
| PDF-02 | Phase 23 | Planned |
| PDF-03 | Phase 23 | Planned |
| PDF-04 | Phase 23 | Planned |
| PDF-05 | Phase 23 | Planned |
| PDF-06 | Phase 23 | Planned |
| PDF-07 | Phase 23 | Planned |
| PDF-08 | Phase 23 | Planned |

**Coverage:**
- v2.2 requirements: 20 total — 20 complete
- v2.3 requirements: 15 total — 7 complete
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-04-01 — v2.3 PDF import requirements added for Phase 23*
