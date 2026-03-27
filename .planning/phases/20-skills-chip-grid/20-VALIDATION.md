---
phase: 20
slug: skills-chip-grid
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 20 — Validation Strategy

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
| 20-01-01 | 01 | 1 | VARNT-02 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 20-02-01 | 02 | 2 | VARNT-02, VARNT-03, VARNT-04 | manual | `npm run typecheck` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skills display as chips grouped by category | VARNT-02 | Requires visual inspection | Open skills page, verify chips in category blocks |
| Drag skill between categories | VARNT-02 | Requires mouse interaction | Drag a skill chip to another category, verify it moves |
| Inline rename category | VARNT-03 | Requires click + type | Click category name, type new name, verify persists |
| Create new category | VARNT-04 | Requires UI interaction | Click "+ Add category", verify empty block appears |
| Migration preserves grouping | VARNT-02 | Requires DB inspection | Check skills retain categories after migration |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
