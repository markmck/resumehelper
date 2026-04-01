---
phase: 13
slug: pipeline-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual smoke tests (no test framework in project) |
| **Config file** | None — Wave 0 creates smoke test checklist |
| **Quick run command** | Manual — open app, verify preview renders Classic template |
| **Full suite command** | Manual smoke checklist (produced as Phase 13 deliverable) |
| **Estimated runtime** | ~2 minutes (manual visual inspection) |

---

## Sampling Rate

- **After every task commit:** Visual inspection in running app (`npm run dev`)
- **After every plan wave:** Full smoke checklist pass
- **Before `/gsd:verify-work`:** Full smoke checklist must be green
- **Max feedback latency:** ~30 seconds (app hot reload)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 1 | TMPL-02 | smoke/manual | Open variant builder, verify Classic renders at paper scale | N/A | ⬜ pending |
| TBD | TBD | 1 | TMPL-03 | smoke/manual | Verify single-column layout, UPPERCASE section headings | N/A | ⬜ pending |
| TBD | TBD | 1 | PREV-03 | smoke/manual | Export PDF, compare side-by-side with preview | N/A | ⬜ pending |
| TBD | TBD | 1 | EXPRT-04 | smoke/manual | Verify fonts render (no fallback) in preview and PDF | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/renderer/public/fonts/` — directory with Inter, Lato, EB Garamond woff2 files
- [ ] Smoke test checklist document — produced as Phase 13 output artifact
- [ ] No automated test framework needed (rendering pipeline is browser-side)

*Existing infrastructure covers build/dev server needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Classic template renders in preview at paper scale | TMPL-02 | Visual rendering — requires browser engine | Open variant builder, select Classic, verify full page layout |
| Single-column ATS layout with standard headings | TMPL-03 | Visual layout check | Verify WORK EXPERIENCE, EDUCATION, SKILLS headings; single column |
| Preview matches PDF export | PREV-03 | Cross-surface comparison — no automated pixel diff | Export PDF, open side-by-side with preview, compare layout/fonts/spacing |
| Fonts load correctly in preview and PDF | EXPRT-04 | Font rendering is visual | Check no fallback fonts in preview; check PDF text is correct typeface |

---

## Validation Sign-Off

- [ ] All tasks have smoke test verification steps
- [ ] Sampling continuity: visual check after every task commit
- [ ] Wave 0 covers font directory and smoke checklist creation
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (hot reload)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
