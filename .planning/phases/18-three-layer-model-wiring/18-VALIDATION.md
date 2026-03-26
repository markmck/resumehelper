---
phase: 18
slug: three-layer-model-wiring
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test runner in project |
| **Config file** | none |
| **Quick run command** | `npm run typecheck` |
| **Full suite command** | `npm run typecheck && npm run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck`
- **After every plan wave:** Run `npm run typecheck && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | DATA-02 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 18-01-02 | 01 | 1 | DATA-06 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 18-02-01 | 02 | 1 | DATA-03 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 18-02-02 | 02 | 1 | DATA-04 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 18-02-03 | 02 | 1 | DATA-05 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 18-03-01 | 03 | 2 | DATA-07 | manual | `npm run typecheck` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — validation is via `npm run typecheck` (static analysis) and manual verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Accept writes to override table, not base bullet | DATA-02 | No test runner; requires app launch | Accept suggestion in OptimizeVariant, check base Experience tab unchanged |
| Preview merges overrides correctly | DATA-03 | Requires visual inspection of rendered preview | Accept suggestion, verify OptimizeVariant preview shows override text |
| Base tab shows base text without analysisId | DATA-04 | Requires navigating between views | Navigate to Experience tab after accepting in optimize screen |
| Two analyses produce independent overrides | DATA-05 | Requires multiple analysis workflow | Create 2 analyses on same variant, accept different suggestions in each |
| Dismiss reverts; revert removes override | DATA-06 | Requires UI interaction sequence | Accept then revert, verify preview shows base text |
| Submission snapshot captures merged result | DATA-07 | Requires end-to-end submission flow | Accept suggestion, log submission, inspect snapshot JSON |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
