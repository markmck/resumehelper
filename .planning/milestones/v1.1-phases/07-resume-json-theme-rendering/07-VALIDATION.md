---
phase: 07
slug: resume-json-theme-rendering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 07 — Validation Strategy

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

- **After every task commit:** Manual smoke test + `npx tsc --noEmit`
- **After every plan wave:** Manual verification of wave deliverables
- **Before `/gsd:verify-work`:** All success criteria checked manually
- **Max feedback latency:** N/A (manual only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | THM-01 | manual | N/A | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | THM-01 | manual | N/A | N/A | ⬜ pending |
| 07-02-01 | 02 | 2 | THM-02 | manual | N/A | N/A | ⬜ pending |
| 07-02-02 | 02 | 2 | THM-03 | manual | N/A | N/A | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Verify theme packages install without errors
- [ ] Verify ESM/CJS compatibility at runtime

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Theme selector dropdown works | THM-01 | UI interaction | Select each theme, verify dropdown saves and persists |
| Theme preview renders in iframe | THM-02 | Visual verification | Switch to each theme, verify resume renders correctly in preview |
| Theme PDF export produces correct file | THM-03 | File output verification | Export PDF with theme active, open and verify formatting |

---

## Validation Sign-Off

- [ ] All tasks have manual verification steps
- [ ] Theme packages verified for ESM/CJS compatibility
- [ ] nyquist_compliant: false (no automated tests)

**Approval:** pending
