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
  - postMessage data bridge pattern for Electron iframes (preload does not inject into iframes)
  - PagedContent component that splits resume into discrete 1056px page boxes for multi-page preview

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
  - "iframe postMessage replaces window.api in PrintApp — Electron preload does not inject into iframes; VariantPreview fetches data and sends via postMessage"
  - "PagedContent splits resume into 1056px page boxes — single scrolling iframe had no visual page boundaries"

patterns-established:
  - "iframe-only preview: all templates render through print.html iframe, no direct React component rendering in preview"
  - "URL-driven template selection: template key passed as query param through entire pipeline"
  - "postMessage data bridge: parent renderer fetches data and posts into iframe; PrintApp listens via window.addEventListener('message')"
  - "PagedContent pattern: content split into discrete page boxes rather than single scrollable surface"

requirements-completed: [PREV-03, TMPL-02]

# Metrics
duration: ~35min
completed: 2026-03-25
---

# Phase 13 Plan 03: Unified Rendering Pipeline Summary

**Eliminated bifurcated preview/PDF code paths — unified print.html surface with postMessage data bridge (Electron iframe preload restriction) and PagedContent multi-page rendering**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-25T17:40:00Z
- **Completed:** 2026-03-25T18:15:00Z
- **Tasks:** 3 (including human-verify checkpoint — approved)
- **Files modified:** 4 (+ 2 in post-checkpoint fixes)

## Accomplishments
- PrintApp reads template URL param and dispatches to resolveTemplate(key), removing hardcoded ProfessionalLayout dependency
- VariantPreview stripped down to single iframe src path — removed isBuiltIn, themeHtml, themeLoading, builderData, profileData, ProfessionalLayout import
- export.ts now routes 'classic' through print.html path (same as professional/traditional), with template query param passed in both dev and prod
- themeRegistry THEMES array includes { key: 'classic', displayName: 'Classic' }
- Post-checkpoint: fixed Electron preload restriction with postMessage data bridge (VariantPreview sends data into iframe)
- Post-checkpoint: fixed single-page display with PagedContent that splits resume into 1056px discrete page boxes

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire PrintApp template param and update export.ts + themeRegistry** - `e0dcce4` (feat)
2. **Task 2: Unify VariantPreview to iframe-only path with zoom-to-fit** - `e55a8c4` (feat)
3. **Task 3: Human verify unified rendering pipeline** - approved by user
4. **Post-checkpoint fixes: iframe postMessage + multi-page preview** - `a5b90de` (fix)

**Plan metadata (pre-checkpoint):** `a300898` (docs: complete unified rendering pipeline plan)

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

**2. [Rule 1 - Bug] iframe cannot access window.api — fixed with postMessage data flow**
- **Found during:** Task 3 (human-verify — preview was blank)
- **Issue:** PrintApp called window.api.getBuilderData() inside an iframe; Electron preload does not inject into iframes so window.api was undefined
- **Fix:** VariantPreview fetches resume data and posts it into the iframe via postMessage; PrintApp listens with window.addEventListener('message') and uses received data
- **Files modified:** src/renderer/src/components/VariantPreview.tsx, src/renderer/src/PrintApp.tsx
- **Verification:** User confirmed preview rendered Classic template correctly after fix
- **Committed in:** a5b90de

**3. [Rule 1 - Bug] Preview showed single continuous page without separation — fixed with PagedContent**
- **Found during:** Task 3 (human-verify — no visible page boundaries)
- **Issue:** Rendering the full resume in a single 1056px iframe with overflow:auto produced a continuous scroll with no visual page breaks
- **Fix:** Added PagedContent component that splits resume content into discrete 1056px page boxes with visible gray gaps between pages
- **Files modified:** src/renderer/src/PrintApp.tsx, new PagedContent component
- **Verification:** User confirmed multi-page preview shows page separations
- **Committed in:** a5b90de

---

**Total deviations:** 3 auto-fixed (1 wrong CSS token name, 1 Electron iframe preload restriction, 1 single-page display)
**Impact on plan:** CSS token fix was cosmetic. postMessage and PagedContent fixes were necessary for the preview to function and display correctly. No scope creep.

## Issues Encountered
- Electron preload restriction on iframes was not anticipated in planning; postMessage bridge is now the established pattern for future plans that use iframes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Unified pipeline complete: preview and PDF export use identical print.html surface
- Layout drift between preview and PDF is now structurally impossible
- postMessage data bridge is established and documented for reuse in any future iframe work
- PagedContent page boundary visualization in place; Phase 15 can add color/accent customization on top
- Ready for Phase 14 (template expansion) — new templates will render identically in preview and PDF
- Phase 16 can remove the old theme path (else branch) from export.ts when old themes are retired

---
*Phase: 13-pipeline-foundation*
*Completed: 2026-03-25*
