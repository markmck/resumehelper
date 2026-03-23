---
phase: 07-resume-json-theme-rendering
plan: 01
subsystem: ui
tags: [jsonresume, theme, electron-vite, ipc, iframe, resume-json]

# Dependency graph
requires:
  - phase: 06-projects-in-export-pipeline-and-resume-json-import
    provides: getBuilderDataForVariant function in export.ts, BuilderData interface with all 11 entity types
provides:
  - themeRegistry.ts with THEMES array, buildResumeJson mapper, renderThemeHtml function
  - themes:renderHtml and themes:list IPC handlers
  - window.api.themes preload bridge
  - Theme dropdown in VariantEditor Preview sub-tab
  - VariantPreview iframe branch for non-professional themes
affects: [07-02, 07-03]

# Tech tracking
tech-stack:
  added: [jsonresume-theme-even@0.26.1, @jsonresume/jsonresume-theme-class@0.6.0, jsonresume-theme-elegant@1.16.1]
  patterns: [theme-registry-pattern, buildResumeJson-mapper, externalizeDeps-exclude-for-ESM, iframe-srcdoc-isolation]

key-files:
  created:
    - src/main/lib/themeRegistry.ts
    - src/main/handlers/themes.ts
  modified:
    - src/main/handlers/export.ts
    - src/main/handlers/index.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/components/VariantEditor.tsx
    - src/renderer/src/components/VariantPreview.tsx
    - electron.vite.config.ts
    - electron-builder.yml

key-decisions:
  - "externalizeDeps.exclude for @jsonresume/jsonresume-theme-class and jsonresume-theme-even — both are ESM packages that must be bundled into main process CJS output"
  - "All three theme packages added to asarUnpack — they read templates/CSS from disk, can't be inside ASAR"
  - "Treat both 'traditional' and 'professional' as built-in — DB default is 'traditional' from earlier phase, must handle both"
  - "Use Record<string, any> for buildResumeJson return type — each theme package uses its own generated ResumeSchema type, incompatible with each other"
  - "VariantPreview accepts layoutTemplate prop from VariantEditor — avoids extra IPC call to read DB, uses data already in TemplateVariant object"
  - "sandbox='allow-same-origin allow-scripts' on iframe — some themes require script execution for interactive elements"

patterns-established:
  - "Theme registry pattern: THEMES array as single source of truth, renderThemeHtml switch on key, addable with one entry"
  - "buildResumeJson maps all 11 entity types from BuilderData to resume.json schema — filter excluded, group skills by first tag"
  - "IPC handler wraps theme render in try/catch, returns { error: string } on failure so renderer shows fallback"

requirements-completed: [THM-01]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 7 Plan 01: Theme Infrastructure and Dropdown Summary

**Three jsonresume theme packages installed and wired end-to-end: registry, buildResumeJson mapper for all 11 entity types, themes:renderHtml IPC handler, preload bridge, and theme selector dropdown in VariantEditor with iframe preview branching**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-23T00:38:06Z
- **Completed:** 2026-03-23T00:41:49Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Installed jsonresume-theme-even, @jsonresume/jsonresume-theme-class, jsonresume-theme-elegant as production dependencies
- Created themeRegistry.ts with THEMES array, THEME_KEYS, buildResumeJson mapper covering all 11 resume.json entity types, and renderThemeHtml async renderer
- Created themes:renderHtml and themes:list IPC handlers with try/catch error handling
- Added themes namespace to preload bridge (window.api.themes.renderHtml, window.api.themes.list)
- Updated VariantEditor with theme dropdown that persists selection via setLayoutTemplate IPC
- Updated VariantPreview to branch on layoutTemplate: ProfessionalLayout for built-in, iframe with srcdoc for theme packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Install theme packages and configure bundling** - `878124f` (chore)
2. **Task 2: Create themeRegistry, IPC handler, preload bridge, and theme dropdown** - `05c34ad` (feat)
3. **Deviation fix: TypeScript errors in themeRegistry.ts** - `9c01d86` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/main/lib/themeRegistry.ts` - Theme registry with THEMES array, buildResumeJson mapper, renderThemeHtml function
- `src/main/handlers/themes.ts` - IPC handlers for themes:renderHtml and themes:list
- `src/main/handlers/export.ts` - Added export keyword to getBuilderDataForVariant
- `src/main/handlers/index.ts` - Register theme handlers in registerAllHandlers
- `src/preload/index.ts` - Added themes namespace to api object
- `src/preload/index.d.ts` - Added themes to Api interface with proper return types
- `src/renderer/src/components/VariantEditor.tsx` - Theme dropdown in Preview sub-tab header, layoutTemplate state management
- `src/renderer/src/components/VariantPreview.tsx` - layoutTemplate prop, iframe branch for non-built-in themes
- `electron.vite.config.ts` - externalizeDeps.exclude for ESM-only theme packages
- `electron-builder.yml` - All three theme packages added to asarUnpack

## Decisions Made
- Used `externalizeDeps.exclude` for `@jsonresume/jsonresume-theme-class` and `jsonresume-theme-even` since both are ESM-only and would cause ERR_REQUIRE_ESM if left as external requires in the CJS main process bundle
- Treat `'traditional'` and `'professional'` both as the built-in layout since the DB default from an earlier phase is `'traditional'`
- Return `{ error: string }` from IPC handler on theme render failure so the renderer can show a graceful error in the iframe rather than crashing
- Pass `layoutTemplate` as a prop from VariantEditor to VariantPreview — TemplateVariant already has it, no extra IPC call needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type errors in themeRegistry.ts**
- **Found during:** Overall verification (npm run build)
- **Issue:** Two TS errors: (1) `profiles` array inferred as `never[]` causing push type error, (2) `buildResumeJson` returning `object` was incompatible with theme `render()` functions that expect their own generated `ResumeSchema` types
- **Fix:** Typed `profiles` as `Array<{ network: string; username: string; url: string }>`, changed return type of `buildResumeJson` to `Record<string, any>`, cast `resumeJson` to `any` in theme render calls
- **Files modified:** src/main/lib/themeRegistry.ts
- **Verification:** `npm run build` succeeds, `npx tsc --noEmit` passes
- **Committed in:** 9c01d86

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was necessary for TypeScript compilation correctness. Theme packages each define their own generated schema types that are not interoperable; `any` cast at render call site is the appropriate boundary.

## Issues Encountered
- `@jsonresume/jsonresume-theme-class` package exports use its own generated `ResumeSchema` type from json-schema-to-typescript, which is not the same as `object`. Using `Record<string, any>` as the intermediate type cleanly bridges the app's `BuilderData` to each theme's expected schema shape.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Theme infrastructure complete: packages bundled, IPC wired, dropdown visible
- VariantPreview already has iframe branch — Plan 02 can immediately test iframe rendering
- PDF export with themes (Plan 02/03) needs themes:renderHtml + temp file approach — handler is now available
- SnapshotViewer (Plan 03) needs same layoutTemplate branching as VariantPreview — pattern is established

---
*Phase: 07-resume-json-theme-rendering*
*Completed: 2026-03-23*
