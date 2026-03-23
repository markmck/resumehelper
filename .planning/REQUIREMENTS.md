# Requirements: ResumeHelper v1.1

**Defined:** 2026-03-14
**Core Value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands.

## v1.1 Requirements

Requirements for milestone v1.1. Each maps to roadmap phases.

### Projects Section

- [x] **PROJ-01**: User can add projects with name and toggleable bullet points
- [x] **PROJ-02**: User can edit and delete projects
- [x] **PROJ-03**: User can toggle projects in/out of template variants (checkbox builder)
- [x] **PROJ-04**: Projects appear in resume preview and PDF/DOCX export

### Tag Autocomplete

- [x] **TAG-01**: Tag input suggests existing tags as user types (autocomplete dropdown)

### resume.json Import

- [x] **IMP-01**: User can import resume data from a resume.json file (maps to jobs, skills, projects, profile)
- [ ] **IMP-02**: Import shows a confirmation before overwriting existing data

### resume.json Themes

- [x] **THM-01**: User can select from bundled resume.json themes for preview and export
- [ ] **THM-02**: Theme-rendered preview shows in the Preview sub-tab
- [ ] **THM-03**: PDF export uses the selected theme's HTML rendering

## v1.0 Validated Requirements

Previously shipped and confirmed valuable.

- ✓ **EXP-01..04**: Experience database (work history + skills CRUD) — v1.0
- ✓ **TMPL-01..04**: Template variants with checkbox builder — v1.0
- ✓ **SUB-01..02, SUB-05**: Submission tracking with frozen snapshots — v1.0
- ✓ **EXPRT-01..02**: PDF and DOCX export — v1.0

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-generated resume text | AI only matches existing experience — never writes or embellishes |
| Pipeline status tracking | Deferred from v1.0, not in v1.1 scope |
| Runtime theme installation | Bundle curated themes only — no npm install at runtime |
| Cover letter generation | Separate concern |
| Job board integration | Manual entry |
| Mobile app | Desktop-first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROJ-01 | Phase 5 | Complete |
| PROJ-02 | Phase 5 | Complete |
| PROJ-03 | Phase 6 | Complete |
| PROJ-04 | Phase 6 | Complete |
| TAG-01 | Phase 5 | Complete |
| IMP-01 | Phase 6 | Complete |
| IMP-02 | Phase 6 | Pending |
| THM-01 | Phase 7 | Complete |
| THM-02 | Phase 7 | Pending |
| THM-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after v1.1 roadmap creation*
