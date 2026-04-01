---
phase: 13-pipeline-foundation
plan: 02
subsystem: ui
tags: [fonts, woff2, print, csp, preload, contextBridge, electron, inter, lato, eb-garamond]

# Dependency graph
requires: []
provides:
  - 7 woff2 font files bundled in src/renderer/public/fonts/ (Inter 400/700, Lato 300/400/700, EB Garamond regular/italic)
  - print.html @font-face declarations for all bundled fonts
  - print.html CSP updated with font-src 'self'
  - window.__printBase preload global for iframe URL construction in dev and prod
affects: [13-03-variant-preview, 13-04-pdf-export, 14-template-classic, 15-template-modern]

# Tech tracking
tech-stack:
  added: ["@fontsource/inter (devDep)", "@fontsource/lato (devDep)", "@fontsource/eb-garamond (devDep)"]
  patterns: ["@font-face in print.html references /fonts/*.woff2 (public dir, served by Vite)", "preload exposes build-context-aware URL via ELECTRON_RENDERER_URL env var with file:// fallback"]

key-files:
  created:
    - src/renderer/public/fonts/inter-regular.woff2
    - src/renderer/public/fonts/inter-bold.woff2
    - src/renderer/public/fonts/lato-light.woff2
    - src/renderer/public/fonts/lato-regular.woff2
    - src/renderer/public/fonts/lato-bold.woff2
    - src/renderer/public/fonts/eb-garamond-regular.woff2
    - src/renderer/public/fonts/eb-garamond-italic.woff2
  modified:
    - src/renderer/print.html
    - src/preload/index.ts
    - src/preload/index.d.ts

key-decisions:
  - "Used @fontsource npm packages as font source instead of Google Fonts CDN — separate per-weight woff2 files, reproducible, offline-friendly"
  - "__printBase resolves via ELECTRON_RENDERER_URL (set by electron-vite in dev) with require('path') file:// fallback in prod"
  - "window.__printBase declared as optional string (?) in Window interface — safe for components that check before using"

patterns-established:
  - "Font bundling pattern: @fontsource latin subset woff2 -> public/fonts/ -> @font-face in print.html"
  - "Preload global pattern: env-var-with-iife-fallback for build-context URL construction"

requirements-completed: [EXPRT-04]

# Metrics
duration: 10min
completed: 2026-03-25
---

# Phase 13 Plan 02: Font Bundling and Preload Global Summary

**7 woff2 fonts (Inter, Lato, EB Garamond) bundled locally with @font-face in print.html; window.__printBase preload global resolves dev/prod iframe URL**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-25T17:22:00Z
- **Completed:** 2026-03-25T17:32:44Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- 7 woff2 font files (latin subset) copied from @fontsource packages into src/renderer/public/fonts/
- print.html updated with 7 @font-face declarations and font-src 'self' in CSP
- preload exposes window.__printBase — resolves to http://localhost:5173 in dev, file:// renderer directory in prod
- Window interface in index.d.ts declares __printBase?: string for type-safe renderer access

## Task Commits

Each task was committed atomically:

1. **Task 1: Bundle woff2 fonts and update print.html** - `cd27856` (feat)
2. **Task 2: Expose __printBase preload global for iframe URL construction** - `3750c9a` (feat)

## Files Created/Modified
- `src/renderer/public/fonts/inter-regular.woff2` - Inter 400 latin
- `src/renderer/public/fonts/inter-bold.woff2` - Inter 700 latin
- `src/renderer/public/fonts/lato-light.woff2` - Lato 300 latin
- `src/renderer/public/fonts/lato-regular.woff2` - Lato 400 latin
- `src/renderer/public/fonts/lato-bold.woff2` - Lato 700 latin
- `src/renderer/public/fonts/eb-garamond-regular.woff2` - EB Garamond 400 normal latin
- `src/renderer/public/fonts/eb-garamond-italic.woff2` - EB Garamond 400 italic latin
- `src/renderer/print.html` - Added font-src 'self' CSP and 7 @font-face declarations
- `src/preload/index.ts` - Added printBase constant and contextBridge exposure as '__printBase'
- `src/preload/index.d.ts` - Added __printBase?: string to Window interface

## Decisions Made
- **@fontsource vs Google Fonts CDN**: Used @fontsource npm packages as devDependencies. Google Fonts CDN returns a variable font file for Inter where 400 and 700 share the same woff2 URL — separate files per weight are needed for proper @font-face declarations. @fontsource provides pre-split per-weight latin subset files.
- **require('path') in prod fallback**: Used `require('path') as typeof import('path')` to keep CJS compatibility in the preload context without introducing import.meta.url
- **__printBase optional type**: Declared as `__printBase?: string` (optional) so renderer components can safely check `window.__printBase` before using it

## Deviations from Plan

None - plan executed exactly as written. @fontsource packages used as the recommended fallback (plan noted this as an alternative if Google Fonts was unreliable — separate weight files confirmed necessary).

## Issues Encountered
- Google Fonts API returns a single woff2 URL for both Inter 400 and 700 (latin subset) in v20, because Inter uses variable font technology where the file contains all weights. Switched to @fontsource packages per plan's recommended fallback to get proper per-weight files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All font assets in place; print.html ready for template rendering
- window.__printBase available for VariantPreview iframe src construction (Plan 13-03)
- Blocker from STATE.md resolved: prod URL construction approach validated (preload global)

## Self-Check: PASSED

All 7 font files confirmed present. Both task commits verified (cd27856, 3750c9a). SUMMARY.md created.

---
*Phase: 13-pipeline-foundation*
*Completed: 2026-03-25*
