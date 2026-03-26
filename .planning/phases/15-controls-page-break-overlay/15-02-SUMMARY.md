---
phase: 15-controls-page-break-overlay
plan: 02
subsystem: renderer
tags: [react, templates, ui-controls, postMessage, electron]

# Dependency graph
requires:
  - phase: 15-controls-page-break-overlay
    plan: 01
    provides: TemplateOptions interface, getOptions/setOptions IPC handlers, TEMPLATE_DEFAULTS
provides:
  - Two-row preview header with accent color picker popover and skills dropdown
  - Extended postMessage pipeline carrying accentColor/skillsDisplay/marginTop/marginBottom/marginSides
  - PrintApp extracts new fields from both postMessage (iframe) and DB (PDF export path)
  - All 5 templates with dynamic margin props replacing hardcoded padding strings
affects: [15-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Color picker implemented as custom popover with preset swatches + hex input — no external library
    - Debounced save (300ms) with useCallback + useRef timeout for template options persistence
    - Close-on-outside-click implemented via mousedown listener checking ref containment
    - Margin computation: (marginProp ?? templateDefault) * 96 converts inches to CSS pixels at 96dpi

key-files:
  created: []
  modified:
    - src/renderer/src/components/VariantEditor.tsx
    - src/renderer/src/components/VariantPreview.tsx
    - src/renderer/src/PrintApp.tsx
    - src/renderer/src/components/templates/ClassicTemplate.tsx
    - src/renderer/src/components/templates/ModernTemplate.tsx
    - src/renderer/src/components/templates/JakeTemplate.tsx
    - src/renderer/src/components/templates/MinimalTemplate.tsx
    - src/renderer/src/components/templates/ExecutiveTemplate.tsx

key-decisions:
  - "Custom color picker popover — no react-colorful — project uses 100% inline styles, external CSS breaks in file:// context"
  - "Undefined vs defined option state: undefined means use template default, explicit value overrides; reset link clears back to undefined"
  - "Margin pixels = inches * 96 (96dpi CSS standard) computed at render time in each template"
  - "PDF export path loads templateOptions via getOptions IPC in the same Promise.all as profile/builderData"
  - "showSummary removed from preview header — will be added to builder pane in Plan 03"

# Metrics
duration: 10min
completed: 2026-03-25
---

# Phase 15 Plan 02: Preview Header Controls and Rendering Pipeline Summary

**Two-row preview header with accent color picker popover and skills dropdown wired through VariantEditor -> VariantPreview postMessage -> PrintApp -> all 5 templates with dynamic margin props**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-03-25
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Restructured preview header into two rows: Row 1 holds Preview label + PDF/DOCX export buttons; Row 2 holds template dropdown, accent color dot trigger, and skills display dropdown
- Built custom color picker popover with 6 preset swatches (Black, Navy, Blue, Teal, Forest, Burgundy), hex text input with validation, and "Reset to template default" link
- Close-on-click-outside using mousedown listener checking two refs (dot and popover)
- Template options (accentColor, skillsDisplay, marginTop, marginBottom, marginSides) loaded from variant.templateOptions on mount, persisted via debounced setOptions call
- Removed showSummary checkbox from preview header (Plan 03 scope)
- Extended VariantPreview postMessage payload with all 5 new fields, added to useCallback dependency array
- PrintApp now handles all 5 new fields from postMessage (iframe path) and from getOptions IPC (PDF export path)
- All 5 templates import TEMPLATE_DEFAULTS and compute outermost padding from props with per-template inch defaults converted to CSS pixels at 96dpi

## Task Commits

1. **Task 1: Two-row preview header, color picker, skills dropdown, VariantPreview extension** - `8ba5405`
2. **Task 2: PrintApp pipeline + all 5 template margin props** - `28926b5`

## Files Modified

- `src/renderer/src/components/VariantEditor.tsx` - Two-row header, color picker popover, skills dropdown, option state, debounced persist, new props passed to VariantPreview
- `src/renderer/src/components/VariantPreview.tsx` - Extended props interface + postMessage payload + dependency array
- `src/renderer/src/PrintApp.tsx` - New option state, extraction from postMessage and from getOptions IPC, passed to TemplateComponent
- `src/renderer/src/components/templates/ClassicTemplate.tsx` - Dynamic margin padding (1.00in defaults)
- `src/renderer/src/components/templates/ModernTemplate.tsx` - Dynamic margin padding (0.75in defaults)
- `src/renderer/src/components/templates/JakeTemplate.tsx` - Dynamic margin padding (0.60/0.50in defaults)
- `src/renderer/src/components/templates/MinimalTemplate.tsx` - Dynamic margin padding (1.00in defaults)
- `src/renderer/src/components/templates/ExecutiveTemplate.tsx` - Dynamic margin padding (0.80in defaults)

## Decisions Made

- Custom color picker: no react-colorful because project uses 100% inline styles; external CSS breaks in Electron file:// context
- Undefined option state means "use template default" — explicit value persisted; reset link sets back to undefined
- Margin formula: `(prop ?? templateDefault) * 96` at each template's render time
- PDF export path uses `Promise.all([profile, builderData, getOptions])` to apply templateOptions before signaling print:ready
- showSummary removed from preview header — moves to builder pane in Plan 03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Self-Check

Files exist:
- src/renderer/src/components/VariantEditor.tsx: FOUND
- src/renderer/src/components/VariantPreview.tsx: FOUND
- src/renderer/src/PrintApp.tsx: FOUND
- All 5 template files: FOUND

Commits exist:
- 8ba5405: FOUND
- 28926b5: FOUND

## Self-Check: PASSED

---
*Phase: 15-controls-page-break-overlay*
*Completed: 2026-03-25*
