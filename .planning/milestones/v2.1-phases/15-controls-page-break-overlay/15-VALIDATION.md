---
phase: 15
slug: controls-page-break-overlay
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-25
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — project has no automated test infrastructure |
| **Config file** | None |
| **Quick run command** | `npm run build` (TypeScript compilation) |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` (type-check catches interface mismatches)
- **After every plan wave:** Manual smoke test per checklist below
- **Before `/gsd:verify-work`:** Full manual checklist must pass
- **Max feedback latency:** 15 seconds (build time)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | CTRL-06 | build | `npm run build` | N/A | ⬜ pending |
| 15-01-02 | 01 | 1 | CTRL-06 | build | `npm run build` | N/A | ⬜ pending |
| 15-02-01 | 02 | 1 | CTRL-02 | manual | — | N/A | ⬜ pending |
| 15-02-02 | 02 | 1 | CTRL-04 | manual | — | N/A | ⬜ pending |
| 15-02-03 | 02 | 1 | CTRL-01 | manual | — | N/A | ⬜ pending |
| 15-03-01 | 03 | 2 | CTRL-03, CTRL-05 | manual | — | N/A | ⬜ pending |
| 15-03-02 | 03 | 2 | PREV-01, PREV-02 | manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework introduction needed — project pattern is manual smoke testing with TypeScript build checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Template dropdown triggers re-render | CTRL-01 | UI interaction | Switch template in dropdown, verify preview updates immediately |
| Color picker saves and applies accent | CTRL-02 | Visual verification | Pick swatch, verify color in preview; pick hex, verify; close/reopen variant, verify persistence |
| Margin sliders update layout | CTRL-03, CTRL-05 | Visual + layout | Drag each slider, verify preview reflows in real-time; verify page break position changes with bottom margin |
| Skills mode dropdown toggles | CTRL-04 | Visual verification | Switch Grouped↔Inline, verify preview reflects change; close/reopen variant, verify persistence |
| templateOptions persists | CTRL-06 | Data persistence | Set accent+margins+skills, close variant, reopen, verify all values restored |
| Page boundaries visible | PREV-01 | Visual verification | Add enough content for 2 pages, verify page gap visible between pages |
| Real-time preview update | PREV-02 | Interaction timing | Toggle any checkbox/control, verify preview updates without manual refresh |
| showSummary in builder pane | CTRL-04 | UI placement | Verify Summary toggle is in builder content area (not preview header); toggle it, verify preview updates |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: TypeScript build after every task catches interface errors
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
