# Phase 7: resume.json Theme Rendering - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can select bundled resume.json themes (Even, Class, Elegant) to preview and export their resume with alternative HTML/CSS layouts. Themes render in an iframe for preview and via hidden BrowserWindow for PDF export. The built-in ProfessionalLayout remains the default.

</domain>

<decisions>
## Implementation Decisions

### Theme Selection UX
- Dropdown at the top of the Preview sub-tab: "Professional (built-in)" | "Even" | "Class" | "Elegant"
- Switching immediately re-renders the preview
- Selected theme persists per variant (saved to `layoutTemplate` column in DB — already exists)
- Default theme for existing and new variants: "Professional" (built-in)
- Submission snapshots capture the active theme — snapshot viewer renders with the theme that was active at submission time (`layoutTemplate` already in SubmissionSnapshot)

### Theme Preview Rendering
- iframe with `srcdoc` — render theme's HTML output into an iframe for complete CSS isolation from app styles
- When "Professional" is selected, use the existing ProfessionalLayout React component (no iframe)
- When a theme is selected, generate resume.json data, call theme's render function, put HTML into iframe srcdoc

### PDF Export with Themes
- Hidden BrowserWindow loads the theme's HTML (same pattern as existing PDF export)
- Theme HTML written to temp file or passed as data URL, then `printToPDF`
- DOCX export stays built-in only — resume.json themes are HTML/CSS, they can't produce DOCX
- DOCX button remains available regardless of theme (always uses built-in format)

### Bundled Themes
- 3 themes: Even (clean/minimal), Class (traditional), Elegant (modern)
- npm packages: `jsonresume-theme-even`, `jsonresume-theme-class`, `jsonresume-theme-elegant`
- System designed so adding a theme is just npm install + config entry (extensible for future)

### Data Mapping (BuilderData → resume.json)
- `buildResumeJson()` mapper function converts app's BuilderData to official resume.json schema format
- Filter out excluded items before mapping (unchecked items don't appear in theme output)
- Skills re-grouped by tag: individual skills grouped back into resume.json format `{ name: "Frontend", keywords: ["React", "TypeScript"] }`
- All 11 entity types mapped to their resume.json equivalents (basics, work, skills, projects, education, volunteer, awards, publications, languages, interests, references)
- Profile data maps to `basics` section

### Claude's Discretion
- ESM/CJS handling for theme packages (may need dynamic import or require)
- `asarUnpack` configuration for theme packages in electron-builder
- Temp file vs data URL approach for PDF rendering with themes
- Exact dropdown styling and positioning
- How to handle themes that don't support certain sections (graceful degradation)
- Theme render error handling (fallback to Professional if theme crashes)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `layoutTemplate` column on `template_variants` table — already stores theme selection
- `setLayoutTemplate` IPC handler — already wired for saving theme choice
- `VariantPreview.tsx` — currently renders ProfessionalLayout directly, needs conditional iframe path
- `export.ts` PDF handler — hidden BrowserWindow + `printToPDF` pattern to reuse
- `PrintApp.tsx` — print route that renders ProfessionalLayout, needs theme-aware path
- `SnapshotViewer.tsx` — reads `layoutTemplate` from snapshot, needs theme rendering
- All entity data already flows through `BuilderData` interface with exclusion flags

### Established Patterns
- `webContents.printToPDF()` with hidden BrowserWindow for PDF generation
- `dialog.showSaveDialog` for file export
- Inline styles for layout (Tailwind unreliable)
- IPC handler + preload bridge pattern

### Integration Points
- `VariantPreview.tsx` — branch on `layoutTemplate`: "professional" → ProfessionalLayout, else → iframe with theme HTML
- `export.ts` PDF handler — branch on `layoutTemplate`: "professional" → existing print.html route, else → load theme HTML into BrowserWindow
- `VariantEditor.tsx` — add dropdown for theme selection, call `setLayoutTemplate` on change
- Theme packages need to be accessible from main process (require/import the package, call render function)
- `buildResumeJson()` mapper needed in main process to convert BuilderData → resume.json schema

</code_context>

<specifics>
## Specific Ideas

- User wants the system to be extensible — ability to import custom resume.json themes in the future
- Design the theme registry so adding a new theme is minimal config change
- Themes should "just work" with the full resume data without any theme-specific workarounds

</specifics>

<deferred>
## Deferred Ideas

- User-importable resume.json themes (runtime theme installation from npm or local files)
- Theme thumbnail previews in the selector dropdown
- Theme-specific options/configuration (some themes have color settings)

</deferred>

---

*Phase: 07-resume-json-theme-rendering*
*Context gathered: 2026-03-22*
