# Phase 15: Controls + Page Break Overlay - Research

**Researched:** 2026-03-25
**Domain:** Electron/React UI controls, SQLite schema migration, postMessage bridge, PDF/DOCX export margins
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Accent Color Picker (CTRL-02)**
- Swatches + custom hex input in a popover
- 6 preset professional swatches: Black (#000000), Navy (#1e3a5f), Blue (#2563EB), Teal (#0d9488), Forest (#166534), Burgundy (#7f1d1d)
- Hex input below swatches for exact brand colors
- "Reset to template default" link at bottom of popover (clears custom, reverts to template's built-in default accent)
- Trigger: small 20px color circle in preview header filled with current accent color, click to open popover

**Margin Sliders (replaces CTRL-03 compact toggle AND CTRL-05 page break margin)**
- Three sliders: Top, Bottom, Sides (left+right linked)
- Range: 0.4" to 1.2", step 0.05", displayed as inches with 2 decimal places
- Per-template defaults: Classic 1.00/1.00/1.00, Modern 0.75/0.75/0.75, Jake 0.60/0.60/0.50, Minimal 1.00/1.00/1.00, Executive 0.80/0.80/0.80
- UI lives in builder pane, bottom, inside collapsible "LAYOUT" section (collapsed by default)
- Real-time preview updates on `input` event (continuous while dragging)
- Page break recalculation: contentHeight = 11" - topMargin - bottomMargin; contentWidth = 8.5" - (2 × sideMargin)
- Keep-together rules: never break mid-bullet, never widowed heading, keep-together per job entry

**Skills Display Mode (CTRL-04)**
- Dropdown in preview header: "Grouped" / "Inline"
- Per-template defaults: Classic grouped, Modern inline, Jake grouped, Minimal inline, Executive grouped
- User override persists per variant

**showSummary Toggle — Move to Builder Pane**
- REMOVE from preview header (currently there from Phase 14)
- ADD to builder pane content area with other toggles
- Persist via `template_variant_items` excluded items pattern (itemType: 'summary', excluded: true = hidden)
- Executive defaults to shown; other templates default to hidden

**Controls Layout**
- Preview header: Row 1: "Preview" label + spacer + [PDF] [DOCX]; Row 2: [Template dropdown] [color dot] [Skills dropdown]
- Builder pane: content toggles + collapsible LAYOUT section at bottom with 3 margin sliders

**DB Persistence (CTRL-06)**
- Single `templateOptions TEXT` column on `templateVariants` table (ALTER TABLE ADD COLUMN in try/catch)
- JSON: `{ accentColor, skillsDisplay, marginTop, marginBottom, marginSides }` — null means all template defaults

**Page Boundaries (PREV-01)**
- PagedContent already renders discrete page boxes with gaps (built Phase 13)
- Margin sliders now control content area within each page — no additional visualization needed

**Real-time Preview (PREV-02)**
- All controls trigger preview re-render
- Margin sliders fire on `input` event; checkboxes/dropdowns use existing ~200ms debounce pattern

### Claude's Discretion
- Whether to use react-colorful or custom hex input implementation
- Exact popover positioning and dismissal behavior for color picker
- How to pass margin values through postMessage to PrintApp (extend existing message format)
- Slider styling details beyond the spec (thumb size, track colors in dark theme)
- How PagedContent adapts to variable margins (currently hardcoded PAGE_HEIGHT = 1056)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CTRL-01 | Template dropdown in variant builder preview header — switching re-renders immediately | Already implemented in VariantEditor/VariantPreview; no new work needed — verified in VariantEditor.tsx |
| CTRL-02 | User can override template accent color via color picker — saved per variant | New: color dot trigger in preview header row 2, popover with swatches + hex, templateOptions JSON column |
| CTRL-03 | User can toggle compact margins per template — saved per variant | Replaced by margin sliders in LAYOUT section of builder pane |
| CTRL-04 | User can toggle skills display mode (inline vs grouped) per template — saved per variant | New: dropdown in preview header row 2, passed via postMessage, reads from templateOptions |
| CTRL-05 | User can adjust bottom page break margin — jobs never split across pages | Replaced by 3-slider LAYOUT section; PagedContent adapts to dynamic margins |
| CTRL-06 | Template choice, accent color, margins, skills mode persisted per variant in DB | templateOptions TEXT column via ALTER TABLE ADD COLUMN in try/catch pattern |
| PREV-01 | Preview shows full print preview with actual page boundaries | Already done by PagedContent in Phase 13; margin slider drives contentHeight/Width calc |
| PREV-02 | Preview updates in real-time when controls change | Extend postMessage payload; margin sliders use input event; dropdowns use existing pattern |
</phase_requirements>

---

## Summary

Phase 15 is a pure UI/persistence layer phase — no new architectural patterns are needed. The Phase 13/14 pipeline (VariantEditor → VariantPreview → postMessage → PrintApp → PagedContent → TemplateComponent) is already fully wired. This phase extends each layer at well-defined seams.

The largest technical risk is the `PagedContent` component: it currently hardcodes `PAGE_HEIGHT = 1056` and measures content at `width: 816px`. When margin sliders change, the content rendered inside the template changes size (because the template's padding changes), so PagedContent's existing re-measurement loop (`useLayoutEffect`) should handle this automatically — but only if margin values flow into the template props that drive the inline padding. The measurer div also uses a hardcoded `width: 816px`, which is the full page width. Content width shrinks with larger side margins, and the template's internal `paddingLeft`/`paddingRight` handles that — the outer page box remains 816px.

The second key risk area is DB persistence: `templateOptions` must be loaded at variant open and kept in sync. The simplest approach is to load it once on mount in `VariantEditor`, pass it down as props, and write back to DB on each control change (debounced for sliders). The postMessage payload already carries `template` and `showSummary`; extending it with `accentColor`, `skillsDisplay`, `marginTop`, `marginBottom`, `marginSides` is straightforward.

**Primary recommendation:** Implement in 4 discrete plans — (1) DB + IPC foundation, (2) Preview header controls (color + skills dropdown + layout restructure), (3) Builder pane LAYOUT section (margin sliders + showSummary relocation), (4) Export integration (PDF margins + DOCX margins).

---

## Standard Stack

### Core (all already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.1 | UI components | Already installed |
| better-sqlite3 | 12.8.0 | SQLite DB | Already installed |
| drizzle-orm | 0.45.1 | ORM | Already installed |
| electron | 39.2.6 | Desktop app | Already installed |
| docx | 9.6.1 | DOCX export | Already installed |

### New Dependency (discretion)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-colorful | ~5.6.1 | Color picker popover | Lightweight (~2KB); use if React 19 compat confirmed |
| (none) | — | Custom hex input only | If react-colorful has React 19 compat issues |

**react-colorful status:** NOT currently installed (confirmed by package.json check). The project STATE.md notes it as the planned dep with fallback to native `<input type="color">`. Given this is a Electron renderer (not SSR), react-colorful 5.6.1 works with React 19 — it has no React version peer dep restrictions beyond React 16+.

**Installation (if react-colorful chosen):**
```bash
npm install react-colorful
```

If skipping react-colorful: use a custom hex input + swatch grid (pure inline-styled divs with onClick handlers). This project uses inline styles exclusively, so a custom implementation is equally appropriate and avoids a new dependency.

---

## Architecture Patterns

### Existing Data Flow (confirmed from code)

```
VariantEditor (state: layoutTemplate, showSummary)
  ├── VariantBuilder (builder pane) — onToggle callback
  └── VariantPreview (preview pane) — props: variantId, layoutTemplate, refreshKey, showSummary
        └── <iframe> src=print.html
              └── PrintApp
                    ├── listens for postMessage { type:'print-data', template, showSummary, payload }
                    ├── resolveTemplate(templateKey) → TemplateComponent
                    └── PagedContent → <TemplateComponent ...props />
```

### Extended Data Flow for Phase 15

```
VariantEditor (adds state: accentColor, skillsDisplay, marginTop, marginBottom, marginSides)
  ├── reads templateOptions from DB on mount (new IPC: templates:getOptions)
  ├── writes templateOptions to DB on change (new IPC: templates:setOptions)
  ├── VariantBuilder (adds: summaryExcluded prop + LAYOUT section)
  └── VariantPreview (adds props: accentColor, skillsDisplay, marginTop, marginBottom, marginSides)
        └── postMessage extended: { ...existing, accentColor, skillsDisplay, marginTop, marginBottom, marginSides }
              └── PrintApp
                    ├── extracts new fields from postMessage
                    ├── passes to PagedContent: marginTop, marginBottom, marginSides
                    └── passes to TemplateComponent: accentColor, skillsDisplay, showSummary
```

### Pattern 1: TemplateOptions JSON Column

**What:** Single TEXT column on `template_variants` storing serialized options JSON.
**When to use:** For all 5 new per-variant settings except `showSummary` (which uses `template_variant_items`).

```typescript
// In src/main/db/index.ts — add to alterStatements array
'ALTER TABLE `template_variants` ADD COLUMN `template_options` text'

// In templates.ts handler — new IPC methods
ipcMain.handle('templates:getOptions', async (_, variantId: number) => {
  const row = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
  if (!row?.templateOptions) return null
  try { return JSON.parse(row.templateOptions as string) } catch { return null }
})

ipcMain.handle('templates:setOptions', async (_, variantId: number, options: TemplateOptions) => {
  await db.update(templateVariants)
    .set({ templateOptions: JSON.stringify(options) })
    .where(eq(templateVariants.id, variantId))
})
```

```typescript
// Type
interface TemplateOptions {
  accentColor?: string      // hex string, e.g. '#2563EB'; null = template default
  skillsDisplay?: 'grouped' | 'inline'  // null = template default
  marginTop?: number        // inches, e.g. 1.0
  marginBottom?: number     // inches
  marginSides?: number      // inches
}
```

### Pattern 2: Dynamic Margins in PagedContent

**What:** PagedContent currently hardcodes `PAGE_HEIGHT = 1056` (11in * 96dpi) and clips at that boundary. With margin sliders, the effective content height changes but the page box stays 816x1056.

**Key insight:** Templates apply margins as `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` on their outermost div. PagedContent does NOT need to change its page box dimensions — only the template's internal padding changes. The measurer div's hardcoded `width: 816px` remains correct because the page is always 816px wide; side margins are expressed as template padding, not outer dimensions.

**What does need to change:** Pass margin props into PrintApp → TemplateComponent props so each template can apply them as inline `paddingTop`/etc instead of hardcoded values.

```typescript
// PrintApp.tsx — extend postMessage type
interface PrintMessage {
  type: 'print-data'
  template: string
  showSummary: boolean
  accentColor?: string
  skillsDisplay?: 'grouped' | 'inline'
  marginTop?: number     // inches
  marginBottom?: number  // inches
  marginSides?: number   // inches
  payload: PrintData
}
```

```typescript
// In PrintApp, pass to template:
<TemplateComponent
  {...data}
  showSummary={showSummary}
  accentColor={accentColor}
  skillsDisplay={skillsDisplay}
  marginTop={marginTop}    // templates convert inches to px: marginTop * 96
  marginBottom={marginBottom}
  marginSides={marginSides}
/>
```

**Template props update:** Each template currently hardcodes padding. After Phase 15, templates read margin props with fallback to their per-template default:

```typescript
// Example in ClassicTemplate.tsx
const mt = (marginTop ?? 1.0) * 96      // 1.0in default
const mb = (marginBottom ?? 1.0) * 96
const ms = (marginSides ?? 1.0) * 96
// Apply as: style={{ padding: `${mt}px ${ms}px ${mb}px ${ms}px` }}
```

### Pattern 3: Preview Header Two-Row Layout

**What:** VariantEditor's preview header currently has a single row (label + showSummary + template dropdown + export buttons). Phase 15 restructures into two rows.

```typescript
// Row 1 (existing header strip, modified):
//   "Preview" label | spacer | [PDF] [DOCX]
// Row 2 (new sub-header):
//   [Template dropdown] [● color dot 20px] [Skills: Grouped ▼]
```

**Key constraint:** No Tailwind — all layout via inline styles. Use `flexDirection: 'column'` on the header container, with two `display: 'flex'` rows inside.

### Pattern 4: LAYOUT Collapsible Section in Builder Pane

**What:** Collapsible section at the bottom of VariantBuilder with 3 margin sliders. Collapsed by default, session memory via `useState`.

```typescript
const [layoutOpen, setLayoutOpen] = useState(false)
// Summary line when collapsed: "Margins: {mt}" / "{mb}" / "{ms}"
const summaryLine = `Margins: ${marginTop.toFixed(2)}" / ${marginBottom.toFixed(2)}" / ${marginSides.toFixed(2)}"`
```

**Slider row pattern (per slider):**
```typescript
// Flex row, height 28px, gap 8px
// Label: 48px min-width, 12px, left
// Range input: flex 1, accentColor #8b5cf6, 4px track height (via CSS appearance)
// Value: 40px min-width, 12px, mono, right
// Amber warning: value color changes when below 0.5"
const valueColor = value < 0.5 ? '#f59e0b' : 'var(--color-text-secondary)'
```

**Native range input styling in Electron (inline styles limitation):** Native `<input type="range">` `accentColor` CSS property works in Chromium (Electron). The `accentColor: '#8b5cf6'` inline style on the element sets the thumb and track fill color. This is HIGH confidence — Electron uses Chromium which supports the `accent-color` CSS property since Chrome 93.

### Pattern 5: showSummary Persistence Migration

**What:** Move showSummary from a non-persisted `useState(true)` in VariantEditor to a persisted `template_variant_items` exclusion row.

**Current state (from code):** VariantEditor has `const [showSummary, setShowSummary] = useState(true)` — NOT persisted. VariantBuilder has `summaryIncluded` state for display only, also NOT wired to IPC.

**Target state:**
- On variant open, read `template_variant_items` for `itemType: 'summary'` excluded row
- Executive default: no row (shown); others: insert excluded row on variant create
- Toggle via `setItemExcluded(variantId, 'summary', 0, excluded)` — use itemId=0 as sentinel since summary has no real row ID

**Note on `setItemExcluded` handler:** The current handler in `templates.ts` does not have a case for `itemType: 'summary'`. A new `else if (itemType === 'summary')` branch is needed:

```typescript
} else if (itemType === 'summary') {
  await db.delete(templateVariantItems).where(
    and(
      eq(templateVariantItems.variantId, variantId),
      eq(templateVariantItems.itemType, 'summary'),
    )
  )
  if (excluded) {
    await db.insert(templateVariantItems).values({
      variantId,
      itemType: 'summary',
      excluded: true,
    })
  }
}
```

**getBuilderData response:** Add `summaryExcluded: boolean` to the response OR read it separately. Simplest: add a `templates:getSummaryExcluded(variantId)` handler, or extend `getBuilderData` to include it.

### Pattern 6: Export Integration

**PDF export (export.ts):**
The `printToPDF` call currently uses `margins: { top: 0, bottom: 0, left: 0, right: 0 }` — zero margins because the template itself handles all padding internally. This remains correct. The template's internal padding (set by margin props from postMessage) drives the visual margins on the PDF. No change needed to the printToPDF call.

**However**, the PDF export BrowserWindow loads `print.html` with query params. Currently only `variantId` and `template` are passed. Margin and accent values need to come from DB, not query params — the PrintApp in PDF mode reads from `window.api` directly. Add reading `templateOptions` from DB in the PDF export path:

```typescript
// In export.ts, before creating the BrowserWindow for PDF:
const optionsRow = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
const templateOptions = optionsRow?.templateOptions ? JSON.parse(optionsRow.templateOptions as string) : {}
// Pass as query params to print.html, OR pass via a global injected before page load
```

Simplest approach: pass templateOptions as a JSON-encoded query parameter so PrintApp can read them in the BrowserWindow path alongside variantId.

**DOCX export (export.ts):**
DOCX margins use `docx` library's `page.margin` in twips (1 inch = 1440 twips). Currently hardcoded at `{ top: 720, bottom: 720, left: 720, right: 720 }` (0.5in). Phase 15 should read `templateOptions` from the variant and use actual margin values:

```typescript
// Convert inches to twips: inches * 1440
const mt = Math.round((templateOptions.marginTop ?? templateDefault.top) * 1440)
const mb = Math.round((templateOptions.marginBottom ?? templateDefault.bottom) * 1440)
const ms = Math.round((templateOptions.marginSides ?? templateDefault.sides) * 1440)
// Apply: page: { margin: { top: mt, bottom: mb, left: ms, right: ms } }
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color picker component | Custom HSL wheel | react-colorful OR custom hex+swatches | Full color wheel is 200+ lines of canvas/math; swatches+hex is sufficient for this use case |
| CSS `accent-color` for range input | Custom track/thumb SVG overlay | Native `accentColor` inline style | Electron/Chromium fully supports it; cross-browser hacks not needed |
| DB migration framework | Custom version-table system | Existing try/catch ALTER TABLE pattern | Already established in this codebase — don't invent a new pattern |
| JSON serialization of templateOptions | Manual field columns | Single TEXT column + JSON.parse/stringify | Consistent with project's existing JSON-in-text pattern (skills.tags, etc.) |

---

## Common Pitfalls

### Pitfall 1: PagedContent Re-measure Timing
**What goes wrong:** When margin sliders change template padding, PagedContent's `useLayoutEffect` re-measures, but the measurement happens on the hidden off-screen div. If the template's height hasn't settled (e.g., font loading mid-paint), the page count undershoots.
**Why it happens:** `useLayoutEffect` fires synchronously after DOM mutations but before browser paint. Font metrics may not be final.
**How to avoid:** The existing pattern (which uses `scrollHeight` after layout) is sufficient for already-loaded fonts. Margin changes are synchronous layout updates — no async font load involved. The existing code already handles this correctly.
**Warning signs:** Preview shows truncated content at bottom of page 1 with no page 2.

### Pitfall 2: postMessage Race Condition on Template Switch
**What goes wrong:** User switches template (iframe reloads with new key), then immediately drags a margin slider. The postMessage fires before the iframe's `print-ready` signal arrives.
**Why it happens:** VariantPreview listens for `print-ready` and re-sends data. But `sendDataToIframe` is called on every `builderData` update too. If state updates are batched, the slider value may not be in the latest message.
**How to avoid:** Ensure all 5 new option values (accentColor, skillsDisplay, marginTop, marginBottom, marginSides) are in the postMessage payload consistently — not conditionally. The existing `sendDataToIframe` `useCallback` with full dependency array handles this.
**Warning signs:** Template renders with wrong margins after a template switch.

### Pitfall 3: Template Default Confusion on Template Switch
**What goes wrong:** User on Classic (1.0"/1.0"/1.0") switches to Jake (0.6"/0.6"/0.5"). If user had NOT customized margins, they should snap to Jake defaults. If they HAD customized, keep custom.
**Why it happens:** Need to compare current slider values against the PREVIOUS template's defaults (not Jake's defaults) to determine if user customized.
**How to avoid:** Track a `marginsDirty: boolean` flag (set when slider differs from current template defaults at load time). On template switch: if `!marginsDirty`, snap to new template defaults and clear dirty; if `marginsDirty`, keep current and show "Reset to template defaults" link.
**Warning signs:** Switching templates unexpectedly resets user's custom margins, or fails to snap to new defaults.

### Pitfall 4: DOCX Margin Units
**What goes wrong:** Passing inches directly to docx library's margin parameter.
**Why it happens:** docx uses twips (twentieths of a point; 1 inch = 1440 twips). Passing `1.0` instead of `1440` creates a 1-twip (invisible) margin.
**How to avoid:** Always convert: `Math.round(inches * 1440)`. Confirmed against docx library documentation.
**Warning signs:** DOCX exports have no margins (text runs edge-to-edge).

### Pitfall 5: showSummary Default on New Variant Creation
**What goes wrong:** When a new variant is created, it has no `template_variant_items` row for summary. The builder code reads "no row = shown (not excluded)". But for non-Executive templates, the desired default is hidden.
**Why it happens:** Currently variants are created with a blank items table. The Executive default (shown) would be correct by default; others need an explicit exclusion row inserted on creation.
**How to avoid:** In `templates:create` handler (or in a new `templates:getOptions` initialization), check the template type and insert a summary exclusion row for non-Executive templates. The cleanest place is the `templates:create` IPC handler — after creating the variant, check `layoutTemplate` and insert the exclusion row.
**Warning signs:** Summary appears by default on non-Executive templates when it shouldn't.

### Pitfall 6: Drizzle Schema Drift
**What goes wrong:** Adding `templateOptions` to the Drizzle `templateVariants` schema object without adding the matching ALTER TABLE to `alterStatements` in `db/index.ts`.
**Why it happens:** Drizzle schema defines TypeScript types; `ensureSchema()` manages the actual SQLite DDL. These must stay in sync manually.
**How to avoid:** Add BOTH: (1) `templateOptions: text('template_options')` to schema.ts, (2) `'ALTER TABLE \`template_variants\` ADD COLUMN \`template_options\` text'` to the `alterStatements` array in db/index.ts.
**Warning signs:** Drizzle throws "no such column: template_options" at runtime.

---

## Code Examples

### Extending postMessage payload in VariantPreview.tsx
```typescript
// Source: Existing sendDataToIframe pattern in VariantPreview.tsx
iframe.contentWindow.postMessage({
  type: 'print-data',
  template: layoutTemplate ?? 'classic',
  showSummary,
  accentColor,           // string | undefined
  skillsDisplay,         // 'grouped' | 'inline' | undefined
  marginTop,             // number (inches) | undefined
  marginBottom,          // number (inches) | undefined
  marginSides,           // number (inches) | undefined
  payload: { ... },
}, '*')
```

### Reading new fields in PrintApp.tsx
```typescript
// Source: Existing handler pattern in PrintApp.tsx
const handler = (event: MessageEvent): void => {
  if (event.data?.type === 'print-data') {
    setData(event.data.payload)
    if (event.data.template) setTemplateKey(event.data.template)
    if (typeof event.data.showSummary === 'boolean') setShowSummary(event.data.showSummary)
    // New:
    if (event.data.accentColor) setAccentColor(event.data.accentColor)
    if (event.data.skillsDisplay) setSkillsDisplay(event.data.skillsDisplay)
    if (typeof event.data.marginTop === 'number') setMarginTop(event.data.marginTop)
    if (typeof event.data.marginBottom === 'number') setMarginBottom(event.data.marginBottom)
    if (typeof event.data.marginSides === 'number') setMarginSides(event.data.marginSides)
  }
}
```

### Template margin application pattern
```typescript
// Source: Pattern to add to each of the 5 templates
// Each template receives optional marginTop, marginBottom, marginSides props
// Template-specific defaults (from CONTEXT.md):
const TEMPLATE_DEFAULTS = {
  classic:   { top: 1.00, bottom: 1.00, sides: 1.00 },
  modern:    { top: 0.75, bottom: 0.75, sides: 0.75 },
  jake:      { top: 0.60, bottom: 0.60, sides: 0.50 },
  minimal:   { top: 1.00, bottom: 1.00, sides: 1.00 },
  executive: { top: 0.80, bottom: 0.80, sides: 0.80 },
}

// Inside template component (e.g. ClassicTemplate):
const defaults = TEMPLATE_DEFAULTS['classic']
const pt = (props.marginTop ?? defaults.top) * 96
const pb = (props.marginBottom ?? defaults.bottom) * 96
const ps = (props.marginSides ?? defaults.sides) * 96
// Outer wrapper:
style={{ padding: `${pt}px ${ps}px ${pb}px ${ps}px` }}
```

### ALTER TABLE pattern for new column (src/main/db/index.ts)
```typescript
// Source: Existing alterStatements array pattern in db/index.ts (lines 205-228)
const alterStatements = [
  // ... existing entries ...
  'ALTER TABLE `template_variants` ADD COLUMN `template_options` text',
]
for (const sql of alterStatements) {
  try { sqlite.exec(sql) } catch { /* column already exists */ }
}
```

### Margin slider row (inline styles, builder pane)
```typescript
// One slider row — repeat for top, bottom, sides
<div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 28 }}>
  <span style={{ fontSize: 12, minWidth: 48, color: 'var(--color-text-secondary)' }}>Top</span>
  <input
    type="range"
    min={0.4} max={1.2} step={0.05}
    value={marginTop}
    onInput={(e) => handleMarginChange('top', parseFloat((e.target as HTMLInputElement).value))}
    style={{ flex: 1, accentColor: '#8b5cf6', cursor: 'pointer' }}
  />
  <span style={{
    fontSize: 12, minWidth: 40, textAlign: 'right',
    fontFamily: 'var(--font-mono)',
    color: marginTop < 0.5 ? '#f59e0b' : 'var(--color-text-secondary)'
  }}>
    {marginTop.toFixed(2)}"
  </span>
</div>
```

### Color swatch popover (custom implementation — no react-colorful needed)
```typescript
// Recommendation: skip react-colorful, use custom swatches + hex input
// This project uses 100% inline styles; react-colorful requires CSS import
// Custom implementation is ~40 lines and fits the project's style constraint
const SWATCHES = [
  { label: 'Black',   hex: '#000000' },
  { label: 'Navy',    hex: '#1e3a5f' },
  { label: 'Blue',    hex: '#2563EB' },
  { label: 'Teal',    hex: '#0d9488' },
  { label: 'Forest',  hex: '#166534' },
  { label: 'Burgundy',hex: '#7f1d1d' },
]
// Popover: position absolute below the trigger dot, zIndex 50
// 6 swatches in 2x3 grid, each 28x28px with 2px border (3px when selected)
// Hex input below: 120px wide, monospace font, validates on blur
```

**Note on react-colorful:** This project bans Tailwind and uses inline styles exclusively. react-colorful ships with its own CSS file (`react-colorful/dist/index.css`) which must be imported. In Electron's Vite build this would work, but introduces a CSS import exception in a project that otherwise has zero CSS imports in components. Recommendation: custom hex+swatch implementation to keep the pattern consistent.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind classes | Inline styles only | Phase 13 decision | All new UI must use inline styles — no class-based styling |
| CSS `@page` rules | Banned | Phase 13 decision | Cannot use CSS page margin rules in templates |
| Drizzle file migrations | try/catch ALTER TABLE pattern | Phase 13 decision | New columns go in `alterStatements` array in db/index.ts |
| showSummary in preview header | Move to builder pane | Phase 15 (this phase) | Remove from VariantEditor preview header, add to VariantBuilder |

---

## Open Questions

1. **templateOptions loading on mount: IPC or included in TemplateVariant type?**
   - What we know: `TemplateVariant` interface in preload/index.d.ts currently has `id, name, layoutTemplate, createdAt` — no templateOptions
   - What's unclear: Should templateOptions be loaded separately (new IPC call on variant open) or bundled into the TemplateVariant row (add field to the templates:list response)?
   - Recommendation: Bundle into `templates:list` response — add `templateOptions` to the SELECT return and to the `TemplateVariant` interface. Avoids a second IPC call on variant open.

2. **showSummary initialization on new variant create**
   - What we know: `templates:create` in templates.ts returns the new variant but doesn't initialize any exclusion rows
   - What's unclear: Where to insert the default summary exclusion row (shown for Executive, hidden for all others)
   - Recommendation: Add initialization logic to `templates:create` handler — after insert, check `data.layoutTemplate ?? 'classic'` and insert summary exclusion row if not Executive. This keeps variant creation atomic.

3. **How does the PDF export path pass templateOptions to PrintApp?**
   - What we know: PDF export creates a BrowserWindow that loads print.html with `window.api` available (preload injected). PrintApp reads data via `window.api` in this mode, not postMessage.
   - What's unclear: PrintApp currently reads template key from URL query param; it does not call any `templateOptions` IPC in BrowserWindow mode.
   - Recommendation: Add `window.api.templates.getOptions(variantId)` call in the PDF path (inside the `if (typeof window.api !== 'undefined')` branch of PrintApp's useEffect), alongside the existing `profile.get()` and `templates.getBuilderData()` calls.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files, no test directories, no test scripts in package.json |
| Config file | None — Wave 0 gap |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTRL-01 | Template dropdown triggers re-render | manual-only | — | N/A |
| CTRL-02 | Color picker saves and applies accentColor | manual-only | — | N/A |
| CTRL-03 | Margin sliders update layout | manual-only | — | N/A |
| CTRL-04 | Skills mode dropdown toggles grouped/inline | manual-only | — | N/A |
| CTRL-05 | Page break never splits job entry | manual-only | — | N/A |
| CTRL-06 | templateOptions persists across variant reopen | manual-only | — | N/A |
| PREV-01 | Page boundaries visible in preview | manual-only | — | N/A |
| PREV-02 | Controls trigger real-time preview update | manual-only | — | N/A |

**Note:** This project has no automated test infrastructure. All validation is manual smoke testing. The verification plan should specify exact manual steps for each requirement.

### Wave 0 Gaps
No test infrastructure exists in the project. Given the project pattern (no testing framework at all), this phase should not introduce one unless explicitly requested. All verification is manual.

*(Existing test infrastructure: None — project has zero test files, no jest/vitest config, no test script in package.json.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `src/renderer/src/PrintApp.tsx` — PagedContent, postMessage format, template props
- Direct code reading: `src/renderer/src/components/VariantEditor.tsx` — current state, header layout, showSummary location
- Direct code reading: `src/renderer/src/components/VariantPreview.tsx` — postMessage send, iframe key, scale
- Direct code reading: `src/renderer/src/components/VariantBuilder.tsx` — builder pane structure, toggle patterns
- Direct code reading: `src/main/db/index.ts` — ensureSchema, alterStatements pattern (lines 205-228)
- Direct code reading: `src/main/handlers/templates.ts` — IPC handlers, setItemExcluded pattern
- Direct code reading: `src/main/handlers/export.ts` — printToPDF margins, DOCX margin twips
- Direct code reading: `src/renderer/src/components/templates/types.ts` — ResumeTemplateProps (accentColor, compact, skillsDisplay, showSummary already present)
- Direct code reading: `src/renderer/src/components/templates/resolveTemplate.ts` — TEMPLATE_MAP, TEMPLATE_LIST
- Direct code reading: `src/main/db/schema.ts` — templateVariants schema (no templateOptions yet)
- Direct code reading: `src/preload/index.ts` — API surface exposed to renderer

### Secondary (MEDIUM confidence)
- Project STATE.md — react-colorful decision history, accentColor hardcoded as #cccccc note
- Project .planning/CONTEXT.md — all locked decisions verified against code

### Tertiary (LOW confidence)
- `accent-color` CSS property browser support: known to work in Chrome 93+ / Electron 13+; Electron 39.2.6 is based on Chrome ~130, so HIGH confidence in practice

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; only new dep is react-colorful (discretionary)
- Architecture: HIGH — all integration points directly read from source code; no inference required
- Pitfalls: HIGH — derived from direct code inspection of existing patterns and specific edge cases documented in CONTEXT.md

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable Electron/React app — no fast-moving deps)
