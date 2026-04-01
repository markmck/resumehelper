---
phase: 16
slug: cleanup
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — Electron app with no automated test suite |
| **Config file** | None |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` + manual smoke test |
| **Estimated runtime** | ~30 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` (TypeScript compile check — catches broken imports immediately)
- **After every plan wave:** Full build + manual smoke test of snapshot view and export
- **Before `/gsd:verify-work`:** All 3 requirements verified manually
- **Max feedback latency:** 30 seconds (build time)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | CLEAN-01 | smoke | `npm run build` | N/A — build | ⬜ pending |
| 16-01-02 | 01 | 1 | CLEAN-01 | manual | Launch app, check no theme refs | ❌ manual | ⬜ pending |
| 16-02-01 | 02 | 1 | CLEAN-02, CLEAN-03 | smoke | `npm run build` | N/A — build | ⬜ pending |
| 16-02-02 | 02 | 1 | CLEAN-02 | manual | Open submission snapshot viewer | ❌ manual | ⬜ pending |
| 16-02-03 | 02 | 1 | CLEAN-03 | manual | Export snapshot PDF | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — validation is build compilation + manual smoke testing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Old theme packages removed | CLEAN-01 | Package removal verified by build success | `npm run build` succeeds with no theme import errors |
| window.api.themes gone | CLEAN-01 | Runtime preload check | Launch app, open DevTools, verify `window.api.themes` is undefined |
| SnapshotViewer renders via iframe | CLEAN-02 | Visual UI verification | Open submission with snapshot, click View Snapshot, confirm renders in iframe |
| Snapshot PDF exports cleanly | CLEAN-03 | End-to-end file I/O | Open submission, export snapshot as PDF, verify file saves without error |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
