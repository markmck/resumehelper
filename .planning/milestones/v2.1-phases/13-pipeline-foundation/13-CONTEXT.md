# Phase 13: Pipeline Foundation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified print.html rendering path (PrintApp + VariantPreview + export.ts) proven end-to-end with the Classic template. No bifurcated preview/PDF branches. Preview iframe and PDF export use the exact same rendering surface. Font files bundled as woff2. Requirements: TMPL-02, TMPL-03, PREV-03, EXPRT-04.

</domain>

<decisions>
## Implementation Decisions

### Classic template visual style
- 1:1 replica of current ProfessionalLayout — same layout, spacing, section styles
- Uppercase section headings (WORK EXPERIENCE, SKILLS, EDUCATION, etc.) — keep current style
- Professional summary renders as plain paragraph below contact line when present, no "SUMMARY" section heading above it
- Skips cleanly when summary is empty
- Wire accentColor prop from day one — defaults to current gray (#cccccc) for section heading borders. No UI to change it yet (Phase 15), but template accepts the prop

### Font strategy
- Already defined in research — Classic uses Times New Roman for PDF, Times New Roman for DOCX
- Fonts bundled as woff2: Inter, Lato, EB Garamond per EXPRT-04
- Per-template font assignments from STACK.md research are locked decisions

### Preview pane behavior
- Zoom-to-fit width: iframe renders at full paper dimensions (816×1056px), CSS transform scales down to fit preview pane width
- Vertical scroll when content exceeds one page
- Gray background behind white paper (dark gray from design system tokens) — PDF viewer feel, clear separation between app chrome and document
- Visible page gaps: gray strip between page 1 and page 2 as you scroll — foundation for Phase 15 page break overlay
- Auto-refresh: iframe reloads when builder checkboxes toggle or template changes, ~200ms debounce to avoid rapid reloads

### Prod URL construction
- Claude's discretion — prototype relative ./print.html, preload global, or IPC-provided URL and pick what works in Electron's file:// context
- All three approaches documented in architecture research; implementation chooses based on testing

### Validation
- Written smoke test checklist output as part of Phase 13 — export PDF, compare to preview, check fonts, check page breaks
- Serves as regression reference for Phases 14-16

### Claude's Discretion
- Prod URL construction approach (see above)
- Exact debounce timing for preview refresh
- Page gap visual implementation details (CSS approach for gap rendering)
- filterResumeData utility implementation details
- resolveTemplate registry implementation details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProfessionalLayout.tsx`: Source for 1:1 Classic template port — inline styles, section rendering, skill grouping logic
- `PrintApp.tsx`: Current print.html entry point — reads variantId from URL params, fetches data via window.api, signals print:ready
- `themeRegistry.ts`: `buildResumeJson()` function and `THEMES` constant — will be modified to include new template keys
- `getBuilderDataForVariant()` in export.ts: Data assembly for variants — unchanged, feeds both preview and export

### Established Patterns
- Inline styles for all layout/visual properties (Tailwind unreliable constraint from PROJECT.md)
- `print:ready` IPC signal from PrintApp after render complete — proven pattern for PDF export timing
- `layoutTemplate` column already exists on templateVariants table — no schema migration needed for template key storage
- `setLayoutTemplate` IPC handler already exists in templates.ts

### Integration Points
- `VariantPreview.tsx`: Currently bifurcated (ProfessionalLayout vs iframe srcDoc) — will be unified to single iframe src path
- `export.ts`: Currently bifurcated (isProfessional vs isTheme) — will be unified to single print.html BrowserWindow path
- `print.html`: Entry point for PrintApp — will gain `template` query param alongside existing `variantId`
- `VariantBuilder.tsx` / `VariantEditor.tsx`: Parent components that pass layoutTemplate and refreshKey to VariantPreview

</code_context>

<specifics>
## Specific Ideas

- Architecture research (ARCHITECTURE.md) has the complete component plan: types.ts, resolveTemplate.ts, filterResumeData.ts, ClassicTemplate.tsx in src/renderer/src/components/templates/
- STACK.md has font bundling approach (woff2 in src/renderer/src/assets/fonts/, @font-face in print.html <style> tag)
- FEATURES.md has template feature matrix and anti-features list
- CSS @page rules banned in templates — conflicts with printToPDF margins (Electron issue #8138)
- All template styles use React inline styles — external CSS breaks in prod file:// context

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-pipeline-foundation*
*Context gathered: 2026-03-25*
