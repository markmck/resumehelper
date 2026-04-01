# Phase 15: Controls + Page Break Overlay - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can customize accent color, margins (top/bottom/sides), and skills display mode per variant. Preview pane shows visible page boundaries with real-time updates when any control changes. Template dropdown and showSummary checkbox already exist from Phase 14. Requirements: CTRL-01 through CTRL-06, PREV-01, PREV-02.

</domain>

<decisions>
## Implementation Decisions

### Accent Color Picker (CTRL-02)
- Swatches + custom hex input in a popover
- 6 preset professional swatches: Black (#000000), Navy (#1e3a5f), Blue (#2563EB), Teal (#0d9488), Forest (#166534), Burgundy (#7f1d1d)
- Hex input below swatches for exact brand colors
- "Reset to template default" link at bottom of popover (clears custom, reverts to template's built-in default accent)
- Trigger: small 20px color circle in preview header filled with current accent color, click to open popover
- Use react-colorful (~2KB) or custom hex input — Claude's discretion on library choice

### Margin Sliders (replaces CTRL-03 compact toggle AND CTRL-05 page break margin)
- Three sliders: Top, Bottom, Sides (left+right linked — asymmetric sides look unprofessional and confuse ATS)
- Range: 0.4" to 1.2", step 0.05", displayed as inches with 2 decimal places
- Per-template defaults:
  - Classic: 1.00" / 1.00" / 1.00"
  - Modern: 0.75" / 0.75" / 0.75"
  - Jake: 0.60" / 0.60" / 0.50"
  - Minimal: 1.00" / 1.00" / 1.00"
  - Executive: 0.80" / 0.80" / 0.80"
- UI lives in builder pane (left side), bottom, inside collapsible "LAYOUT" section
  - Collapsed by default, remembers open/closed per session
  - When collapsed: single-line summary "Margins: 1.0" / 0.75" / 1.0""
  - Section label: "LAYOUT" — 11px, weight 500, uppercase, letter-spacing 0.05em, text-muted
  - Each slider row: flex row, label (left, 12px, 48px min-width) + native range input (accent-color #8b5cf6, 4px track) + value (right, 12px, mono, 40px min-width)
  - Row height 28px, vertical gap 8px
- "Reset to template defaults" link — only visible when at least one slider differs from template default
- Hard floor: 0.4" (slider physically stops). Soft warning: below 0.5" value text turns amber
- Template switch behavior: if margins are at previous template's defaults, snap to new template's defaults; if customized, keep custom values and show reset link
- Real-time preview: updates on `input` event (not `change`) — continuous as user drags
- Page break recalculation: contentHeight = 11" - topMargin - bottomMargin; contentWidth = 8.5" - (2 × sideMargin)
- Page break rules:
  - Never break mid-bullet (orphaned text)
  - Never place job heading at page bottom with no bullets following (widowed heading)
  - Keep-together: entire job entry moves to next page if it doesn't fit
  - Section headings must have at least one entry below them on same page
- Side margin changes reflow bullet text which can indirectly change page breaks — recalculate everything together

### Skills Display Mode (CTRL-04)
- Dropdown in preview header: "Grouped" / "Inline"
- Each template has a default mode (Classic: grouped, Modern: inline, Jake: grouped, Minimal: inline, Executive: grouped)
- User override persists per variant

### showSummary Toggle — Move to Builder Pane
- showSummary checkbox currently lives in the preview header (added Phase 14) — MOVE it to the builder pane with the rest of the content toggles (jobs, skills, education, etc.)
- Remove the showSummary checkbox from the preview header entirely — one location only, no duplication
- Reuse existing toggle logic (it already works), just relocate it to the content area
- Persist via `template_variant_items` excluded items pattern (`itemType: 'summary'`, `excluded: true` = hidden, no row = shown)
- Executive defaults summary to shown (no excluded row on creation); other templates default to hidden (excluded row on creation)

### Controls Layout
- Preview header: TWO rows
  - Row 1: "Preview" label + spacer + [PDF] [DOCX] export buttons
  - Row 2: [Template ▼] [● color dot] [Skills: Grouped ▼]
- Builder pane: content toggles (jobs, skills, education, summary, etc.) + collapsible LAYOUT section at bottom with 3 margin sliders
- Template dropdown (CTRL-01) already exists from Phase 14 — no changes needed

### DB Persistence (CTRL-06)
- Single `templateOptions TEXT` column on `templateVariants` table (ALTER TABLE ADD COLUMN, try/catch pattern)
- Stores JSON: `{ accentColor, skillsDisplay, marginTop, marginBottom, marginSides }`
- Null means all template defaults apply
- showSummary is NOT in templateOptions — it uses the existing `template_variant_items` excluded items pattern (see "showSummary Toggle" section above)

### Page Boundaries (PREV-01)
- PagedContent already renders discrete page boxes with gaps — built in Phase 13
- Margin sliders now control the content area within each page
- No additional page boundary visualization needed beyond what exists

### Real-time Preview (PREV-02)
- All controls (accent color, margins, skills mode, summary toggle) trigger preview re-render
- Margin sliders fire on `input` for continuous updates while dragging
- Existing ~200ms debounce pattern from Phase 13 applies to checkbox/dropdown changes

### Claude's Discretion
- Whether to use react-colorful or custom hex input implementation
- Exact popover positioning and dismissal behavior for color picker
- How to pass margin values through postMessage to PrintApp (extend existing message format)
- Slider styling details beyond the spec (thumb size, track colors in dark theme)
- How PagedContent adapts to variable margins (currently hardcoded PAGE_HEIGHT = 1056)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VariantEditor.tsx`: Preview header with existing template dropdown — add color dot + skills dropdown to row 2, REMOVE showSummary checkbox from here
- `VariantBuilder.tsx`: Builder pane with excluded item checkboxes — add Summary toggle to content area + LAYOUT section at bottom
- `PagedContent` in `PrintApp.tsx`: Page rendering with 1056px height and 16px gaps — needs to accept dynamic margins
- `template_variant_items` table: Excluded items pattern — reuse for showSummary persistence
- `ResumeTemplateProps` in `types.ts`: Already has `accentColor`, `compact`, `skillsDisplay`, `showSummary` props
- All 5 templates already accept accentColor, skillsDisplay, showSummary props with defaults

### Established Patterns
- postMessage bridge: VariantPreview → PrintApp iframe (extend message with new options)
- `setItemExcluded` IPC handler: Toggle excluded items — reuse for showSummary
- ALTER TABLE ADD COLUMN in try/catch at startup for new columns
- Inline styles for all UI (Tailwind unreliable constraint)
- Native HTML elements styled with design system tokens (no component library)

### Integration Points
- `VariantPreview.tsx`: Extend postMessage payload with accentColor, skillsDisplay, margins
- `PrintApp.tsx`: Extract new fields from postMessage, pass to template + PagedContent
- `schema.ts`: Add `templateOptions TEXT` column to `templateVariants`
- `templates.ts` handlers: Add IPC handler to read/write templateOptions
- `export.ts`: Apply margin values to printToPDF call and DOCX margins

</code_context>

<specifics>
## Specific Ideas

- User provided a complete Margin Slider Controls Spec with exact UI specs, behavior rules, page break logic, and per-template defaults
- Slider accent color: purple (#8b5cf6) per design system
- Color picker presets are curated professional resume colors — no bright/neon colors
- Margins apply to both PDF export (printToPDF margins parameter) and DOCX export
- Margins are included in submission snapshots (frozen with the variant)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-controls-page-break-overlay*
*Context gathered: 2026-03-25*
