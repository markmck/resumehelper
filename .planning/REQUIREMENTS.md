# Requirements: ResumeHelper

**Defined:** 2026-03-13
**Core Value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Experience Database

- [x] **EXP-01**: User can add work history entries (company, role, dates, description bullets)
- [x] **EXP-02**: User can edit and delete work history entries
- [x] **EXP-03**: User can add skills with category tags (e.g., "frontend", "backend", "C#")
- [x] **EXP-04**: User can edit and delete skills

### Template Variants

- [x] **TMPL-01**: User can create named template variants (e.g., "Frontend Focus", "Fullstack")
- [x] **TMPL-02**: User can toggle experience items in/out per variant
- [x] **TMPL-03**: User can duplicate a variant as a starting point for a new application
- [x] **TMPL-04**: User can delete template variants

### Export

- [ ] **EXPRT-01**: User can export a template variant as PDF
- [ ] **EXPRT-02**: User can export a template variant as Word/DOCX

### Submissions

- [x] **SUB-01**: User can log a submission (company, role, date, linked resume variant)
- [x] **SUB-02**: User can view all submissions in a list

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Submission Tracking

- **SUB-03**: User can track submission status through a pipeline (Applied, Interview, Offer, Rejected)
- **SUB-04**: User can view submissions in a dashboard with pipeline status at a glance
- **SUB-05**: Frozen snapshot of exact resume content stored at submission time

### Experience Database

- **EXP-05**: User can store education and certifications
- **EXP-06**: User can tag any experience item for cross-category filtering

### Template Builder

- **TMPL-05**: User can see live preview of resume layout while toggling items

### AI Matching

- **AI-01**: User can paste a job description and get relevant experience items suggested
- **AI-02**: AI suggests only — never writes or modifies text

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-generated resume text | AI only matches existing experience — never writes, rephrases, or embellishes |
| Cover letter generation | Separate concern, not part of resume management |
| Job board scraping/integration | Manual entry keeps user in control |
| Cloud sync | Local-first desktop app; privacy advantage |
| Mobile app | Desktop-first via Electron |
| resume.json format conformance | Custom schema designed for this app's workflow |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXP-01 | Phase 1 | Complete |
| EXP-02 | Phase 1 | Complete |
| EXP-03 | Phase 1 | Complete |
| EXP-04 | Phase 1 | Complete |
| TMPL-01 | Phase 2 | Complete |
| TMPL-02 | Phase 2 | Complete |
| TMPL-03 | Phase 2 | Complete |
| TMPL-04 | Phase 2 | Complete |
| SUB-01 | Phase 3 | Complete |
| SUB-02 | Phase 3 | Complete |
| EXPRT-01 | Phase 4 | Pending |
| EXPRT-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation — all 12 v1 requirements mapped*
