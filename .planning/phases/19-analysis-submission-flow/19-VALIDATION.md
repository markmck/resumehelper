---
phase: 19
slug: analysis-submission-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 19 — Validation Strategy

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
| 19-01-01 | 01 | 1 | ANLYS-04 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 19-01-02 | 01 | 1 | ANLYS-05 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 19-02-01 | 02 | 2 | ANLYS-01 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 19-02-02 | 02 | 2 | ANLYS-02 | manual | `npm run typecheck` | N/A | ⬜ pending |
| 19-02-03 | 02 | 2 | ANLYS-03 | manual | `npm run typecheck` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Log Submission from OptimizeVariant pre-fills form | ANLYS-01 | Requires running app and navigating optimize → submission flow | Accept suggestion, click Log Submission, verify form pre-filled |
| Company/role auto-extracted on paste | ANLYS-02 | Requires pasting job posting text and observing form fields | Paste a job posting, verify company/role fields auto-fill |
| Inline edit company/role on existing analysis | ANLYS-03 | Requires clicking metadata fields and editing | Open analysis results, click company name, edit, verify persists |
| Stale analysis warning appears | ANLYS-04 | Requires editing bullet after analysis then viewing analysis | Run analysis, edit a bullet, reopen analysis, verify warning banner |
| Orphaned override shows graceful notice | ANLYS-05 | Requires deleting a bullet that has an accepted override | Accept suggestion, delete base bullet, view analysis, verify notice |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
