# Requirements: ResumeHelper

**Defined:** 2026-03-23
**Core Value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands in the pipeline.

## v2.0 Requirements

Requirements for AI Analysis Integration milestone. Each maps to roadmap phases.

### AI Infrastructure

- [ ] **AI-01**: User can select an AI provider (Claude, OpenAI) from a settings page
- [ ] **AI-02**: User can enter and save their API key with masked display
- [x] **AI-03**: API keys are stored using OS-level encryption (Electron safeStorage) and never exposed to the renderer process
- [ ] **AI-04**: User can test their API key connection and see success/failure feedback
- [x] **AI-05**: All LLM calls are routed through the main process via IPC handlers

### Job Analysis

- [ ] **ANLYS-01**: User can paste job posting text into a textarea and trigger analysis
- [x] **ANLYS-02**: Analysis returns a match score (0-100) for a specific variant + job posting pair
- [x] **ANLYS-03**: Analysis returns keyword coverage split into exact matches, semantic matches, and missing keywords
- [x] **ANLYS-04**: Analysis returns gap analysis with critical (required) and moderate (preferred) severity tiers
- [ ] **ANLYS-05**: User must select a variant before analysis runs — score reflects the specific variant, not the full resume DB
- [x] **ANLYS-06**: Analysis results are stored in the database with links to the job posting and variant
- [x] **ANLYS-07**: User sees a loading state during LLM analysis with progress indication

### Bullet Suggestions

- [ ] **SUGG-01**: Analysis returns per-bullet rewrite suggestions that incorporate job posting language
- [ ] **SUGG-02**: User can accept or dismiss each suggestion individually
- [ ] **SUGG-03**: Accepted suggestions update the bullet text in the database
- [ ] **SUGG-04**: Original vs suggested text is displayed side-by-side for comparison
- [ ] **SUGG-05**: AI suggestions never fabricate experience — no added technologies, metrics, or scope claims not in the original bullet

### Submission Tracking

- [ ] **SUB-01**: Each submission has a status from fixed stages: Applied, Phone Screen, Technical, Offer, Rejected
- [ ] **SUB-02**: User can change submission status via dropdown or status badge interaction
- [ ] **SUB-03**: User can add/edit notes on each submission (recruiter name, dates, follow-ups)
- [ ] **SUB-04**: Submission record stores the variant ID and analysis score at time of submission
- [ ] **SUB-05**: Submissions list shows status badges, variant tag, and match score columns
- [ ] **SUB-06**: User can filter submissions by status and search by company name

### UI Redesign

- [x] **UI-01**: App uses a dark theme design system with CSS custom properties (token-based colors, spacing, typography)
- [x] **UI-02**: Navigation uses sidebar with Experience, Variants, Analysis, Submissions, and Settings tabs
- [ ] **UI-03**: Experience page has collapsible job cards with inline editing and drag reorder
- [ ] **UI-04**: Variant builder uses split pane layout (builder on left, live preview on right)
- [ ] **UI-05**: Analysis dashboard shows 4 metric cards (match score, keyword coverage, skill gaps, ATS compatibility)
- [ ] **UI-06**: Analysis dashboard has two-column layout: keyword analysis + gap details on left, suggested rewrites on right
- [ ] **UI-07**: Submissions tracker shows metric cards (total, in progress, interviews, response rate) with filter pills and searchable table
- [ ] **UI-08**: All components follow the design system tokens (4px grid, border radius scale, consistent button/input heights)

## v2.1 Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Automated Tailoring

- **AUTO-01**: AI auto-generates a variant from job posting analysis (pre-selected bullets + reworded)
- **AUTO-02**: Automated pipeline: paste job → analyze → generate variant → user reviews → export → log submission

### Analysis Enhancements

- **ENH-01**: Analysis history per job posting with score progression and delta display
- **ENH-02**: ATS compatibility check as distinct signal (multi-column detection, table usage, non-standard headers)
- **ENH-03**: Analysis run linked to submission export for full traceability

## v2.2+ Requirements

### Analytics

- **ANLY-01**: Submission analytics showing which variant styles get more callbacks
- **ANLY-02**: Pattern insights across submission history (role types, score correlations)

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-generated resume text from scratch | Core app constraint — AI never fabricates experience |
| Accept-all suggestions button | Bypasses per-bullet review; undermines AI boundary |
| URL scraping of job postings | Fragile, maintenance burden; text paste takes 3 seconds |
| Custom pipeline stages | Fixed stages cover 95% of cases; notes field handles rest |
| Real-time score updates while editing | LLM calls too slow/expensive for keystroke polling; explicit re-analyze button |
| Cover letter generation | Different document type, explicitly out of scope |
| Mobile app | Desktop-first via Electron |
| Job board integration/scraping | Manual entry only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 8 | Pending |
| AI-02 | Phase 8 | Pending |
| AI-03 | Phase 8 | Complete |
| AI-04 | Phase 8 | Pending |
| AI-05 | Phase 8 | Complete |
| ANLYS-01 | Phase 9 | Pending |
| ANLYS-02 | Phase 9 | Complete |
| ANLYS-03 | Phase 9 | Complete |
| ANLYS-04 | Phase 9 | Complete |
| ANLYS-05 | Phase 9 | Pending |
| ANLYS-06 | Phase 9 | Complete |
| ANLYS-07 | Phase 9 | Complete |
| SUGG-01 | Phase 10 | Pending |
| SUGG-02 | Phase 10 | Pending |
| SUGG-03 | Phase 10 | Pending |
| SUGG-04 | Phase 10 | Pending |
| SUGG-05 | Phase 10 | Pending |
| SUB-01 | Phase 11 | Pending |
| SUB-02 | Phase 11 | Pending |
| SUB-03 | Phase 11 | Pending |
| SUB-04 | Phase 11 | Pending |
| SUB-05 | Phase 11 | Pending |
| SUB-06 | Phase 11 | Pending |
| UI-01 | Phase 8 | Complete |
| UI-02 | Phase 8 | Complete |
| UI-03 | Phase 12 | Pending |
| UI-04 | Phase 12 | Pending |
| UI-05 | Phase 12 | Pending |
| UI-06 | Phase 12 | Pending |
| UI-07 | Phase 12 | Pending |
| UI-08 | Phase 12 | Pending |

**Coverage:**
- v2.0 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation (all 31 requirements mapped)*
