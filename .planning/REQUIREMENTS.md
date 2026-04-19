# Requirements: ResumeHelper

**Defined:** 2026-04-03
**Core Value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands

## v2.4 Requirements

Requirements for v2.4 Polish & Reliability milestone. Each maps to roadmap phases.

### Installer

- [x] **INST-01**: User can install the app via a Windows .exe installer with working appId and productName
- [x] **INST-02**: Installer creates Start Menu shortcut and uninstaller entry
- [x] **INST-03**: Stale asarUnpack entries for removed jsonresume themes are cleaned up

### Test Infrastructure

- [x] **TEST-01**: Vitest is configured with electron module mock and in-memory SQLite helper
- [x] **TEST-02**: Test runner scripts added to package.json

### Data Layer Tests

- [ ] **DATA-01**: Three-layer data merge (applyOverrides) has unit tests covering base, variant, and override scenarios
- [ ] **DATA-02**: Core IPC handlers (experience, variants, submissions) have tests with in-memory SQLite
- [ ] **DATA-03**: Handler business logic extracted to pure functions where needed for testability

### Export Pipeline Tests

- [x] **EXPORT-01**: DOCX generation produces valid document structure with correct template fonts and heading styles
- [ ] **EXPORT-02**: Submission snapshot shape is validated (profile + content + templateOptions frozen correctly)
- [ ] **EXPORT-03**: Template components render expected HTML structure via jsdom

### AI Integration Tests

- [x] **AI-01**: Zod schemas for job analysis, bullet suggestions, and PDF/URL extraction validate correctly
- [x] **AI-02**: Score derivation (deriveOverallScore) produces correct weighted results
- [x] **AI-03**: AI provider calls use MockLanguageModelV3 for deterministic testing of generateObject flows

## Future Requirements

### Distribution Polish

- **DIST-01**: Code signing for SmartScreen bypass
- **DIST-02**: Auto-update via electron-updater
- **DIST-03**: Desktop shortcut opt-in during install

### Test Expansion

- **TEXP-01**: E2E tests with Playwright
- **TEXP-02**: React component tests with Testing Library
- **TEXP-03**: PDF export integration tests (requires Electron binary)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Code signing | Personal tool — SmartScreen "Run anyway" is acceptable for v2.4 |
| Auto-update | Requires hosted update server; defer to future milestone |
| E2E / Playwright tests | High setup cost, low signal for current architecture |
| React component tests | Unit-testing data layer and AI provides more ROI |
| PDF export tests | Requires full Electron binary — integration test only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INST-01 | Phase 25 | Complete |
| INST-02 | Phase 25 | Complete |
| INST-03 | Phase 25 | Complete |
| TEST-01 | Phase 26 | Complete |
| TEST-02 | Phase 26 | Complete |
| DATA-01 | Phase 27 | Pending |
| DATA-02 | Phase 27 | Pending |
| DATA-03 | Phase 27 | Pending |
| EXPORT-01 | Phase 29 | Complete |
| EXPORT-02 | Phase 29 | Pending |
| EXPORT-03 | Phase 29 | Pending |
| AI-01 | Phase 28 | Complete |
| AI-02 | Phase 28 | Complete |
| AI-03 | Phase 28 | Complete |

**Coverage:**
- v2.4 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after roadmap creation*
