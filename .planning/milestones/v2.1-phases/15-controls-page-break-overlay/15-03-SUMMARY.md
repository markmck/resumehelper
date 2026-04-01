---
phase: 15-controls-page-break-overlay
plan: 03
subsystem: renderer + export
tags: [react, margin-sliders, docx, pdf, electron, templates, inline-styles]

# Dependency graph
requires:
  - phase: 15-controls-page-break-overlay
    plan: 01
    provides: templateOptions IPC, TEMPLATE_DEFAULTS, summaryExcluded in BuilderData
  - phase: 15-controls-page-break-overlay
    plan: 02
    provides: margin state in VariantEditor, PrintApp templateOptions pipeline
provides:
  - LAYOUT collapsible section in builder pane with 3 margin sliders (0.4–1.2in)
  - showSummary toggle in builder pane content area persisting via sentinel exclusion
  - DOCX export reads per-variant marginTop/Bottom/Sides in twips from templateOptions
  - DOCX falls back to DOCX_MARGIN_DEFAULTS per template when no custom options set
  - PDF routing fixed: all 5 v2.1 templates route through print.html PrintApp path
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Margin collapse summary line: `mt.toFixed(2)" / mb.toFixed(2)" / ms.toFixed(2)"`  when LAYOUT closed
    - marginsDirty flag tracks whether user explicitly set any margin vs relying on template defaults
    - Template switch snaps non-dirty margins to new template defaults (undefined state = use template default)
    - DOCX twip formula: Math.round(inches * 1440)
    - V2_TEMPLATES Set used to route modern/jake/minimal/executive to print.html path instead of legacy themeRegistry

key-files:
  created: []
  modified:
    - src/renderer/src/components/VariantBuilder.tsx
    - src/renderer/src/components/VariantEditor.tsx
    - src/main/handlers/export.ts

key-decisions:
  - "LAYOUT section collapsed by default — shows margin summary inline when collapsed"
  - "marginsDirty tracks explicit user changes; template switch only snaps margins when not dirty"
  - "PDF export routing: V2_TEMPLATES Set replaces old isProfessional string comparison — all 5 new templates use print.html path"
  - "DOCX skillsDisplay inline renders all skills as a single comma-separated paragraph (no group labels)"
  - "accentColor not applied in DOCX — Word docs are black/white; noted in comments only"

patterns-established:
  - "Resolved effective values (marginTop ?? TEMPLATE_DEFAULTS[tpl].top) passed as concrete numbers to VariantBuilder"
  - "onInput (not onChange) for range sliders for continuous real-time preview updates during drag"

requirements-completed: [CTRL-03, CTRL-05, PREV-01, PREV-02]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 15 Plan 03: Builder Pane Margin Sliders and Export Integration Summary

**LAYOUT collapsible section with 3 margin sliders in builder pane + showSummary toggle wired from DB + DOCX/PDF exports applying per-variant margin values**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-26T00:06:43Z
- **Completed:** 2026-03-26T00:10:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added LAYOUT collapsible section (collapsed by default) to builder pane with Top, Bottom, Sides sliders (0.4–1.2in, 0.05in step, monospace display)
- Slider values below 0.5in display in amber (#f59e0b) as a soft warning
- Collapsed LAYOUT shows margin summary line: `0.75" / 0.75" / 0.75"`
- "Reset to template defaults" link appears whenever any margin differs from TEMPLATE_DEFAULTS
- showSummary toggle moved to builder content area as first checkbox; initialized from `builderData.summaryExcluded` on variant mount
- showSummary persists via `setItemExcluded(variantId, 'summary', 0, !shown)` sentinel pattern
- marginsDirty tracking: template switch snaps non-dirty margins to new template defaults; dirty margins preserved
- DOCX export uses DOCX_MARGIN_DEFAULTS (matching TEMPLATE_DEFAULTS) + templateOptions overrides converted to twips
- DOCX skillsDisplay inline mode renders all skills as comma-separated list instead of grouped rows
- Fixed PDF routing: V2_TEMPLATES Set ensures modern/jake/minimal/executive route through print.html/PrintApp (not old themeRegistry)

## Task Commits

1. **Task 1: Add LAYOUT margin sliders and showSummary toggle to builder pane** - `8fb7e73` (feat)
2. **Task 2: Integrate margin values into PDF and DOCX export paths** - `bbce673` (feat)

## Files Modified

- `src/renderer/src/components/VariantBuilder.tsx` - New props interface, showSummary checkbox as first toggle, LAYOUT collapsible section with 3 sliders + reset link
- `src/renderer/src/components/VariantEditor.tsx` - showSummary state from DB, marginsDirty tracking, template-switch margin snap, handleShowSummaryChange/handleMarginChange/handleMarginsReset callbacks, effectiveMargin values, VariantBuilder prop wiring
- `src/main/handlers/export.ts` - DOCX_MARGIN_DEFAULTS constant, templateOptions JSON parse, dynamic twip margins, skillsDisplay inline support, V2_TEMPLATES routing fix for PDF

## Decisions Made

- LAYOUT section collapsed by default (users find it when needed, not cluttering the default view)
- marginsDirty flag: undefined margin state = use template default; explicit value = dirty. Template switch resets non-dirty to undefined.
- PDF routing was incorrectly limiting to only 'classic' in the `isProfessional` branch — fixed to use V2_TEMPLATES Set covering all 5 new templates
- DOCX inline skillsDisplay renders a single paragraph (no group bold labels); grouped renders with "Category: skills" format
- accentColor not applied to DOCX output (Word docs black/white) — noted in code comment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PDF routing — modern/jake/minimal/executive templates were excluded from print.html path**
- **Found during:** Task 2 verification
- **Issue:** `isProfessional` check only included `'classic'` from v2.1 templates; modern/jake/minimal/executive fell through to old themeRegistry path which cannot read templateOptions
- **Fix:** Replaced string comparison with `V2_TEMPLATES = new Set(['classic', 'modern', 'jake', 'minimal', 'executive'])` — all 5 route through print.html/PrintApp
- **Files modified:** `src/main/handlers/export.ts`
- **Commit:** `bbce673`

## Issues Encountered

None beyond the auto-fixed routing bug above.

## Self-Check

Files exist:
- src/renderer/src/components/VariantBuilder.tsx: FOUND
- src/renderer/src/components/VariantEditor.tsx: FOUND
- src/main/handlers/export.ts: FOUND

Commits exist:
- 8fb7e73: FOUND
- bbce673: FOUND

## Self-Check: PASSED

---
*Phase: 15-controls-page-break-overlay*
*Completed: 2026-03-26*
