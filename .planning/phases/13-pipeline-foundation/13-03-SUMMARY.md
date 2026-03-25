---
phase: 13-pipeline-foundation
plan: 03
subsystem: ui
tags: [react, electron, iframe, print, pdf, templates, preview]

# Dependency graph
requires:
  - phase: 13-01
    provides: ClassicTemplate component and resolveTemplate registry
  - phase: 13-02
    provides: window.__printBase preload global for iframe URL construction

provides:
  - Unified rendering pipeline where preview and PDF export use identical print.html surface
  - PrintApp reads template URL param and renders via resolveTemplate(key)
  - VariantPreview is iframe-only with zoom-to-fit scaling (no bifurcation)
  - export.ts routes 'classic' through print.html path with template query param
  - themeRegistry includes 'classic' entry

affects: [14-template-polish, 15-page-breaks, 16-template-switcher]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - iframe key prop for forced reload on variantId/layoutTemplate/refreshKey change
    - ResizeObserver for responsive zoom-to-fit: scale = (containerWidth - padding) / 816
    - __printBase global for environment-agnostic iframe URL construction

key-files:
  created: []
  modified:
    - src/renderer/src/PrintApp.tsx
    - src/renderer/src/components/VariantPreview.tsx
    - src/main/handlers/export.ts
    - src/main/lib/themeRegistry.ts

key-decisions:
  - "VariantPreview uses --color-bg-raised (not --color-surface-raised which does not exist) for gray PDF-viewer background"
  - "accentColor hardcoded as #cccccc in PrintApp for Phase 13; Phase 15 reads from DB"
  - "ResizeObserver subtracts 32px padding (16px each side) before computing scale"

patterns-established:
  - "iframe-only preview: all templates render through print.html iframe, no direct React component rendering in preview"
  - "URL-driven template selection: template key passed as query param through entire pipeline"

requirements-completed: [PREV-03, TMPL-02]

# Metrics
duration: 12min
completed: 2026-03-25
---

# Phase 13 Plan 03: Unified Rendering Pipeline Summary

**Eliminated bifurcated preview/PDF code paths — VariantPreview now uses a single iframe src via print.html for all templates, with zoom-to-fit scaling and gray PDF-viewer background**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-25T17:40:00Z
- **Completed:** 2026-03-25T17:52:00Z
- **Tasks:** 2 of 3 (Task 3 is human verification checkpoint)
- **Files modified:** 4

## Accomplishments
- PrintApp reads template URL param and dispatches to resolveTemplate(key), removing hardcoded ProfessionalLayout dependency
- VariantPreview stripped down to single iframe src path — removed isBuiltIn, themeHtml, themeLoading, builderData, profileData, ProfessionalLayout import
- export.ts now routes 'classic' through print.html path (same as professional/traditional), with template query param passed in both dev and prod
- themeRegistry THEMES array includes { key: 'classic', displayName: 'Classic' }

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire PrintApp template param and update export.ts + themeRegistry** - `e0dcce4` (feat)
2. **Task 2: Unify VariantPreview to iframe-only path with zoom-to-fit** - `e55a8c4` (feat)
3. **Task 3: Human verify unified rendering pipeline** - checkpoint awaiting human verification

## Files Created/Modified
- `src/renderer/src/PrintApp.tsx` - Reads template param, resolves via resolveTemplate, renders TemplateComponent with accentColor
- `src/renderer/src/components/VariantPreview.tsx` - Iframe-only with ResizeObserver zoom-to-fit, gray --color-bg-raised background
- `src/main/handlers/export.ts` - 'classic' added to isProfessional check; template query param passed in PDF export URL
- `src/main/lib/themeRegistry.ts` - Classic entry added after professional in THEMES array

## Decisions Made
- Used `--color-bg-raised` (#1c1c1f) for iframe container background — the plan referenced `--color-surface-raised` which does not exist in tokens.css
- ResizeObserver subtracts 32px (16px padding each side) from container width before computing iframe scale factor
- Scale initialized to 0 as sentinel — shows "Loading..." text before first ResizeObserver measurement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected CSS token name for gray background**
- **Found during:** Task 2 (VariantPreview rewrite)
- **Issue:** Plan specified `var(--color-surface-raised)` which does not exist in tokens.css. Actual token is `--color-bg-raised`
- **Fix:** Used `var(--color-bg-raised)` matching the actual design system token
- **Files modified:** src/renderer/src/components/VariantPreview.tsx
- **Verification:** TypeScript clean, correct dark gray (#1c1c1f) background applied
- **Committed in:** e55a8c4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — wrong CSS token name in plan)
**Impact on plan:** Cosmetic correction only. Behavior identical to intent.

## Issues Encountered
None beyond the CSS token name correction.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Unified pipeline complete: preview and PDF export use identical print.html surface
- Layout drift between preview and PDF is now structurally impossible
- Ready for Phase 14 (template polish) and Phase 15 (page break visualization)
- Phase 16 can remove the old theme path (else branch) from export.ts when old themes are retired

---
*Phase: 13-pipeline-foundation*
*Completed: 2026-03-25*
