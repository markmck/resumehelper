---
phase: 14
slug: templates-complete
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual smoke tests (consistent with Phase 13) |
| **Config file** | None |
| **Quick run command** | Manual — open each template in preview, verify renders |
| **Full suite command** | Manual smoke checklist (export PDF + DOCX per template) |
| **Estimated runtime** | ~5 minutes (manual visual inspection across 5 templates) |

---

## Sampling Rate

- **After every task commit:** Open template in Electron preview — confirm renders without blank screen
- **After every plan wave:** Export PDF + DOCX for each completed template, verify fonts and layout
- **Before `/gsd:verify-work`:** All 5 templates visible and distinct, PDF/DOCX exports clean
- **Max feedback latency:** ~30 seconds (hot reload)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 1 | TMPL-01 | smoke/manual | Open each template in preview | N/A | ⬜ pending |
| TBD | TBD | 1 | TMPL-04 | smoke/manual | Toggle summary on/off in preview | N/A | ⬜ pending |
| TBD | TBD | 1 | TMPL-05 | smoke/manual | Check grouped + inline skills modes | N/A | ⬜ pending |
| TBD | TBD | 2 | EXPRT-01 | smoke/manual | Export PDF, compare to preview | N/A | ⬜ pending |
| TBD | TBD | 2 | EXPRT-02 | smoke/manual | Open DOCX, check Heading 1 in Navigation pane | N/A | ⬜ pending |
| TBD | TBD | 2 | EXPRT-03 | smoke/manual | Open DOCX, verify font name per template | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No test infrastructure needed (manual smoke testing, consistent with Phase 13)

*Existing infrastructure covers build/dev server needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 5 templates render with distinct styles | TMPL-01 | Visual rendering check | Open preview, switch between all 5 templates |
| Summary toggles on/off | TMPL-04 | Visual check | Set showSummary, verify summary appears/disappears |
| Skills display modes | TMPL-05 | Visual check | Check grouped and inline modes in each template |
| PDF matches preview | EXPRT-01 | Cross-surface comparison | Export PDF, compare to preview side-by-side |
| DOCX heading styles | EXPRT-02 | Requires Word | Open DOCX, check Navigation pane shows headings |
| DOCX per-template fonts | EXPRT-03 | Requires Word | Open DOCX, verify font family matches template |

---

## Validation Sign-Off

- [ ] All tasks have smoke test verification steps
- [ ] Sampling continuity: visual check after every task commit
- [ ] Wave 0: no infrastructure needed
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (hot reload)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
