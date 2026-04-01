---
phase: 07-resume-json-theme-rendering
verified: 2026-03-23T18:00:00Z
status: human_needed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Open a variant, switch to Preview sub-tab, confirm theme dropdown shows 4 options: Professional (built-in), Even, Class, Elegant"
    expected: "Dropdown is visible and populated immediately after switching to Preview sub-tab"
    why_human: "Requires running the app — dropdown population depends on async IPC themes:list response"
  - test: "Select 'Even' from the dropdown, wait for preview to update"
    expected: "Preview area replaces ProfessionalLayout with an iframe rendering the Even theme HTML"
    why_human: "Visual rendering quality and iframe population cannot be verified statically"
  - test: "Select 'Class' and 'Elegant' in turn"
    expected: "Each produces a distinct visual layout in the iframe, no theme render error is shown"
    why_human: "Rendering correctness of each theme package depends on runtime behavior"
  - test: "Select 'Professional (built-in)' after selecting a themed option"
    expected: "Preview returns to the ProfessionalLayout React component with no iframe visible"
    why_human: "Conditional branch switch-back requires runtime observation"
  - test: "Close and reopen a variant after selecting 'Even'"
    expected: "The dropdown still shows 'Even' — selection is persisted to DB and reloaded"
    why_human: "Persistence verification requires DB write + reload cycle"
  - test: "With 'Even' selected, click Export PDF, save the file, open it"
    expected: "PDF visually matches the Even theme layout, not the Professional layout"
    why_human: "PDF output quality requires human inspection of the generated file"
  - test: "With 'Professional (built-in)' selected, click Export PDF"
    expected: "PDF matches the standard Professional layout — regression check"
    why_human: "Regression confirmation requires human comparison of output"
  - test: "Create a submission with an 'Even'-themed variant, then click 'View Snapshot'"
    expected: "Snapshot modal renders the Even theme in an iframe using frozen snapshot data"
    why_human: "Snapshot rendering requires end-to-end flow and visual confirmation"
  - test: "View a pre-existing snapshot that was created with Professional layout"
    expected: "Snapshot renders via ProfessionalLayout (no iframe) — no regression"
    why_human: "Regression check on legacy snapshots requires runtime observation"
---

# Phase 7: Resume JSON Theme Rendering — Verification Report

**Phase Goal:** Users can select from bundled resume.json themes (Even, Class, Elegant) to preview and export their resume with alternative layouts.
**Verified:** 2026-03-23
**Status:** human_needed (all automated checks pass; visual/runtime behavior requires human testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | User can select a theme from a dropdown on the Preview sub-tab | VERIFIED | `VariantEditor.tsx` lines 108-121: `<select>` conditionally rendered when `activeSubTab === 'preview'`, populated from `themes.list()` IPC |
| 2  | Theme selection persists to the database via setLayoutTemplate | VERIFIED | `handleThemeChange` calls `window.api.templates.setLayoutTemplate(variant.id, newTheme)` and updates local state |
| 3  | buildResumeJson() correctly maps all 11 entity types | VERIFIED | `themeRegistry.ts` lines 22-99 map: basics (profile), work (jobs), skills, projects, education, volunteer, awards, publications, languages, interests, references — all 11 covered with exclusion filtering |
| 4  | themes:renderHtml IPC handler returns valid HTML string from a theme package | VERIFIED | `themes.ts` lines 11-22: handler fetches profile + builder data, calls `buildResumeJson` + `renderThemeHtml`, returns string or `{error}` |
| 5  | Non-professional theme renders in an iframe in the Preview sub-tab | VERIFIED | `VariantPreview.tsx` lines 53-69: `isBuiltIn()` check routes to `<iframe srcDoc={themeHtml}>` for theme keys |
| 6  | Professional layout renders via ProfessionalLayout React component (no iframe) | VERIFIED | `VariantPreview.tsx` lines 71-96: falls through to `ProfessionalLayout` component when `isBuiltIn(layoutTemplate)` is true |
| 7  | PDF export uses theme HTML via temp file + hidden BrowserWindow when a theme is active | VERIFIED | `export.ts` lines 260-301: theme branch fetches profile+builder data, calls `renderThemeHtml`, writes temp file, loads via `win.loadFile`, then `printToPDF` |
| 8  | PDF export uses existing print.html route when Professional is active | VERIFIED | `export.ts` lines 220-259: professional branch unchanged — loads print.html, waits for `print:ready` signal |
| 9  | Snapshot viewer renders with the theme that was active at submission time | VERIFIED | `SnapshotViewer.tsx` lines 29-43: calls `window.api.themes.renderSnapshotHtml(snapshot.layoutTemplate, snapshot)`, renders iframe with frozen data; professional snapshots render via ProfessionalLayout |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main/lib/themeRegistry.ts` | Theme registry, buildResumeJson mapper, renderThemeHtml function | VERIFIED | Exports `THEMES`, `THEME_KEYS`, `buildResumeJson`, `renderThemeHtml`. 146 lines, substantive implementation with `sanitizeDates` helper. |
| `src/main/handlers/themes.ts` | IPC handler for themes:renderHtml, themes:list, themes:renderSnapshotHtml | VERIFIED | 47 lines, registers all 3 IPC handlers with try/catch error handling |
| `src/renderer/src/components/VariantEditor.tsx` | Theme dropdown in Preview sub-tab header | VERIFIED | Contains `layoutTemplate` state, `handleThemeChange`, `<select>` for themes, passes `layoutTemplate` prop to `VariantPreview` |
| `src/renderer/src/components/VariantPreview.tsx` | Conditional rendering: ProfessionalLayout vs iframe for themes | VERIFIED | Contains `iframe` element, `isBuiltIn()` helper, `themeHtml` state, dual useEffect pattern |
| `src/main/handlers/export.ts` | Themed PDF export via temp file + did-finish-load | VERIFIED | Imports `renderThemeHtml` from themeRegistry, implements `isProfessional` branch with temp file path |
| `src/renderer/src/components/SnapshotViewer.tsx` | Theme-aware snapshot rendering | VERIFIED | Contains `layoutTemplate` check, `renderSnapshotHtml` IPC call, iframe for themed snapshots |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `VariantEditor.tsx` | `preload/index.ts` | `window.api.themes.list()` and `window.api.templates.setLayoutTemplate()` | WIRED | `window.api.themes.list().then(setThemes)` in useEffect; `setLayoutTemplate(variant.id, newTheme)` in handleThemeChange |
| `VariantPreview.tsx` | `preload/index.ts` | `window.api.themes.renderHtml(variantId, layoutTemplate)` | WIRED | Line 40: `window.api.themes.renderHtml(variantId, layoutTemplate!).then(...)` — result fed directly to `setThemeHtml` |
| `themes.ts` | `themeRegistry.ts` | `import buildResumeJson and renderThemeHtml` | WIRED | Line 5: `import { THEMES, buildResumeJson, renderThemeHtml } from '../lib/themeRegistry'` |
| `export.ts` | `themeRegistry.ts` | `import renderThemeHtml and buildResumeJson for PDF generation` | WIRED | Line 19: `import { buildResumeJson, renderThemeHtml } from '../lib/themeRegistry'` — both used in theme PDF branch |
| `SnapshotViewer.tsx` | `preload/index.ts` | `window.api.themes.renderSnapshotHtml` | WIRED | Line 32: `window.api.themes.renderSnapshotHtml(snapshot.layoutTemplate, snapshot).then(...)` |
| `themes.ts` (renderSnapshotHtml) | `preload/index.ts` | bridge registered | WIRED | `preload/index.ts` line 210: `renderSnapshotHtml: (themeKey, snapshotData) => ipcRenderer.invoke('themes:renderSnapshotHtml', ...)` |
| `handlers/index.ts` | `themes.ts` | `registerThemeHandlers()` | WIRED | `index.ts` line 17-18: imports and calls `registerThemeHandlers()` in `registerAllHandlers()` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| THM-01 | 07-01-PLAN | User can select from bundled resume.json themes for preview and export | SATISFIED | Theme dropdown in VariantEditor with 4 options; selection persists via setLayoutTemplate IPC; REQUIREMENTS.md already marks [x] |
| THM-02 | 07-02-PLAN | Theme-rendered preview shows in the Preview sub-tab | SATISFIED | `VariantPreview.tsx` renders iframe with `srcDoc={themeHtml}` when non-professional theme selected |
| THM-03 | 07-02-PLAN | PDF export uses the selected theme's HTML rendering | SATISFIED | `export.ts` theme branch: `renderThemeHtml` → temp file → `win.loadFile` → `printToPDF` |

All 3 phase requirements claimed across plans are accounted for. No orphaned requirements found.

---

### Notable Deviations (Non-Blocking)

**`@jsonresume/jsonresume-theme-class` removed from `externalizeDeps.exclude`**

The plan specified both `@jsonresume/jsonresume-theme-class` and `jsonresume-theme-even` should be in `externalizeDeps.exclude`. The actual `electron.vite.config.ts` only includes `jsonresume-theme-even`.

This was an intentional fix committed at `01c0cba`:

> "Class theme reads Handlebars templates from disk at runtime — bundling it inline broke relative path resolution. Keep it external with dynamic import."

The class theme package has `"type": "module"` and reads `.hbs` template files from disk paths at runtime. Being in `asarUnpack` (confirmed in `electron-builder.yml`) with a dynamic `import()` call in `renderThemeHtml` is the correct runtime configuration. The `externalizeDeps.exclude` approach would have inlined the package into the bundle and broken the relative file paths. The deviation is a necessary fix, not a gap.

**07-02-SUMMARY.md not created**

Plan 02 specified `After completion, create .planning/phases/07-resume-json-theme-rendering/07-02-SUMMARY.md`. This file is absent. The 07-01-SUMMARY.md exists and covers both plans' work (it was extended to include Plan 02 accomplishments). This is an administrative documentation gap only — it does not block goal achievement.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `VariantEditor.tsx` | 84 | `placeholder="Untitled Variant"` | Info | HTML input placeholder attribute — not a code placeholder, benign |

No code stubs, empty implementations, or TODO/FIXME markers found in phase-modified files.

---

### Human Verification Required

#### 1. Theme Dropdown Visibility and Population

**Test:** Run `npm run dev`, open a variant, switch to the Preview sub-tab.
**Expected:** A `<select>` dropdown appears in the header with 4 options: "Professional (built-in)", "Even", "Class", "Elegant".
**Why human:** Dropdown population depends on async `themes:list` IPC response succeeding at runtime.

#### 2. Even Theme Preview Rendering

**Test:** Select "Even" from the dropdown and wait for the preview to update.
**Expected:** The preview area shows an iframe with the Even theme's HTML layout (modern, two-column style).
**Why human:** iframe `srcDoc` rendering and visual quality require runtime observation.

#### 3. Class and Elegant Theme Preview Rendering

**Test:** Select "Class" then "Elegant" in sequence.
**Expected:** Each shows a distinct visual layout without a "Theme render error" message.
**Why human:** Class theme uses Handlebars templates read from disk — the `asarUnpack` + external module approach must be confirmed working.

#### 4. Professional Layout Regression

**Test:** After selecting a theme, switch back to "Professional (built-in)".
**Expected:** Preview returns to the ProfessionalLayout React component (no iframe visible).
**Why human:** Conditional branch switch-back requires runtime observation.

#### 5. Theme Persistence Across Variant Reopen

**Test:** Select "Even", close the variant panel, reopen it.
**Expected:** Dropdown still shows "Even" — the selection was written to the DB and reloaded.
**Why human:** Persistence requires DB write + app-state reload cycle.

#### 6. Themed PDF Export Quality

**Test:** With "Even" selected, click "Export PDF", save and open the file.
**Expected:** PDF visually matches the Even theme layout, not the Professional layout.
**Why human:** PDF visual quality requires human inspection of the generated file.

#### 7. Professional PDF Export Regression

**Test:** With "Professional (built-in)" selected, click "Export PDF".
**Expected:** PDF matches the standard professional two-column layout.
**Why human:** Regression confirmation requires comparison of actual PDF output.

#### 8. Themed Snapshot Rendering

**Test:** Submit a job application with an "Even"-themed variant, then click "View Snapshot" on that submission.
**Expected:** The snapshot modal shows an iframe rendering the Even theme using the frozen snapshot data.
**Why human:** End-to-end snapshot creation + theme rendering requires full app flow.

#### 9. Legacy Snapshot Regression

**Test:** View a snapshot created before Phase 7 (with a 'traditional' or null layoutTemplate).
**Expected:** Snapshot renders via ProfessionalLayout component — the `isBuiltIn` check correctly handles 'traditional' and empty strings.
**Why human:** Legacy snapshot handling requires actual snapshot data in the DB.

---

### Gaps Summary

No automated gaps found. All 9 observable truths are verified by static code analysis:
- All 6 required artifacts exist, are substantive, and are wired
- All 7 key links are connected
- All 3 requirements (THM-01, THM-02, THM-03) are covered
- TypeScript compiles cleanly (tsc --noEmit passes)
- No blocker anti-patterns

The `@jsonresume/jsonresume-theme-class` deviation from `externalizeDeps.exclude` is a legitimate runtime fix. The missing `07-02-SUMMARY.md` is an administrative gap only.

9 human verification items remain to confirm visual rendering, PDF quality, and runtime behavior across all themes and scenarios.

---

_Verified: 2026-03-23T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
