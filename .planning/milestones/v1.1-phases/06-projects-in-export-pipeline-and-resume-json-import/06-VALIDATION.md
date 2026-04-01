---
phase: 06
slug: projects-in-export-pipeline-and-resume-json-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — no test infrastructure in repository |
| **Config file** | None — Wave 0 gap |
| **Quick run command** | N/A |
| **Full suite command** | N/A |
| **Estimated runtime** | N/A |

---

## Sampling Rate

- **After every task commit:** Manual smoke test (verify affected feature works)
- **After every plan wave:** Manual verification of wave deliverables
- **Before `/gsd:verify-work`:** All success criteria checked manually
- **Max feedback latency:** N/A (manual only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | PROJ-03 | manual | N/A | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | PROJ-04 | manual | N/A | N/A | ⬜ pending |
| 06-02-01 | 02 | 1 | IMP-01 | manual | N/A | N/A | ⬜ pending |
| 06-02-02 | 02 | 1 | IMP-02 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Sample `resume.json` test fixture file for manual import testing

*No test framework installed — consistent with prior phases. All validation is manual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Project toggle persists in builder | PROJ-03 | No test framework | Toggle project in builder, reload, verify state |
| Projects appear in PDF/DOCX/preview | PROJ-04 | Visual verification | Export PDF + DOCX, check Projects section present |
| resume.json import maps all fields | IMP-01 | End-to-end data flow | Import fixture, check all sections in Experience tab |
| Confirmation dialog shows counts | IMP-02 | UI interaction | Trigger import, verify dialog shows correct summary |

---

## Validation Sign-Off

- [ ] All tasks have manual verification steps
- [ ] Sample resume.json fixture created for testing
- [ ] No automated test infrastructure (consistent with project)
- [ ] nyquist_compliant: false (no automated tests)

**Approval:** pending
