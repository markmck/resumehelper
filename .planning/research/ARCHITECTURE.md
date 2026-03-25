# Architecture Research

**Domain:** Resume template rendering pipeline — Electron + React desktop app
**Researched:** 2026-03-25
**Confidence:** HIGH (based on direct codebase inspection)

---

## Existing Architecture (v2.0 Baseline)

### System Overview

The existing app has two rendering paths and three consumers of those paths. The v2.1
template system's primary architectural goal is replacing both paths with a single
unified path.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Renderer Process                            │
│                                                                     │
│  VariantEditor                                                      │
│    ├── VariantBuilder (checkbox pane)                               │
│    └── VariantPreview (preview pane)  ←── layoutTemplate prop       │
│          ├── IF isBuiltIn('professional')                           │
│          │     renders: <ProfessionalLayout ...props />             │
│          └── IF theme ('even'/'class'/'elegant')                    │
│                loads themeHtml via IPC → <iframe srcDoc={themeHtml}>│
│                                                                     │
│  PrintApp  (print.html, hidden BrowserWindow)                       │
│    └── reads ?variantId, always renders: <ProfessionalLayout />     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ IPC (window.api.*)
┌──────────────────────────────▼──────────────────────────────────────┐
│                          Main Process                               │
│                                                                     │
│  handlers/themes.ts   → themeRegistry.ts → jsonresume-theme-*      │
│  handlers/export.ts   → getBuilderDataForVariant()                 │
│    ├── isProfessional? → BrowserWindow(print.html) + print:ready   │
│    └── isTheme?        → renderThemeHtml() → tmpfile → printToPDF  │
│                                                                     │
│  handlers/templates.ts → setLayoutTemplate IPC                     │
│  db/schema.ts          → templateVariants.layoutTemplate (col)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Current Bifurcation — The Problem to Solve

There are two completely separate rendering paths with incompatible behaviors:

| | Built-in (professional) | Theme path (even/class/elegant) |
|---|---|---|
| Preview | React `<ProfessionalLayout />` direct render | iframe with HTML from main process |
| PDF export | Hidden BrowserWindow loads `print.html` | main writes tmp HTML file, loads in BrowserWindow |
| Snapshot PDF | Falls back to 'even' via themeRegistry | Uses themeRegistry directly |
| CSS source | Inline styles (reliable) | jsonresume npm package CSS (unreliable for PDF) |
| PDF fidelity | Good — same React component in preview and PrintApp | Poor — npm theme packages not tuned for paper output |

The new templates must eliminate this bifurcation. The unified path: every template
renders via `print.html` / `PrintApp.tsx` BrowserWindow, and preview reuses the same
URL. This makes layout drift between preview and PDF structurally impossible.

---

## Recommended Architecture for v2.1

### Core Design Decision: Per-Template React Components, No Shared Base

**Recommendation:** Build 5 separate React template components (ClassicTemplate,
ModernTemplate, JakeTemplate, MinimalTemplate, ExecutiveTemplate). Do NOT build a
shared base component that all templates extend or compose.

**Rationale:**
- Each of the 5 templates has fundamentally different layouts (2-column vs 1-column,
  sidebar vs stacked, colored header vs minimal header) — a shared base would add
  complexity without reducing duplication, because the structure diverges across templates
- The shared contract IS the `ResumeTemplateProps` TypeScript interface — shared type,
  not shared component
- The existing `ProfessionalLayout.tsx` is the right mental model: a self-contained
  React component with inline styles that renders all resume sections. Replicate that
  pattern 5 times, diverging per template design
- CSS-in-JS (inline styles) is already established and proven reliable in this codebase

**What IS shared across templates:**
- `ResumeTemplateProps` interface (TypeScript type, not a component)
- `resolveTemplate(key)` function — the single coupling point from DB string to component
- `filterResumeData()` utility — consolidates the excluded-item logic currently duplicated
  in `ProfessionalLayout.tsx` and `themeRegistry.ts`

### Unified Rendering Path (New)

Both preview and PDF export use the same URL: `print.html?variantId=X&template=classic`.
PrintApp reads both params and renders the appropriate template component. The preview
pane shows an iframe pointing to this URL. PDF export loads the same URL in a hidden
BrowserWindow. There is no longer a separate "isProfessional" vs "isTheme" code path.

```
User picks template in VariantEditor dropdown
       │
       ▼
templateVariants.layoutTemplate = 'classic' | 'modern' | 'jake' | 'minimal' | 'executive'
       │
       ├── Preview path
       │     VariantPreview
       │       → <iframe src="print.html?variantId=42&template=classic" />
       │
       └── Export path
             export:pdf IPC handler
               → reads layoutTemplate from DB
               → BrowserWindow.loadURL("print.html?variantId=42&template=classic")
               → waits for print:ready IPC signal
               → printToPDF(...)
               → PDF is pixel-identical to preview
```

---

## Component Responsibilities

### New vs Modified — Complete List

**New files (create from scratch):**

| File | Purpose |
|------|---------|
| `src/renderer/src/components/templates/types.ts` | `ResumeTemplateProps` interface shared by all 5 templates |
| `src/renderer/src/components/templates/resolveTemplate.ts` | Maps template key string to React component |
| `src/renderer/src/components/templates/filterResumeData.ts` | Shared excluded-item filtering utility |
| `src/renderer/src/components/templates/ClassicTemplate.tsx` | Classic single-column template |
| `src/renderer/src/components/templates/ModernTemplate.tsx` | Modern template with accent color and distinct header |
| `src/renderer/src/components/templates/JakeTemplate.tsx` | Jake Gutierrez-style: dense, lines, two-column header |
| `src/renderer/src/components/templates/MinimalTemplate.tsx` | Minimal, whitespace-heavy, typography-focused |
| `src/renderer/src/components/templates/ExecutiveTemplate.tsx` | Executive: prominent header, conservative sections |

**Modified files (surgical changes):**

| File | Change |
|------|--------|
| `src/renderer/src/PrintApp.tsx` | Read `template` query param; call `resolveTemplate()` to pick component |
| `src/renderer/src/components/VariantPreview.tsx` | Drop built-in/theme branch split; render all templates as `<iframe src="print.html?...">` |
| `src/renderer/src/components/VariantEditor.tsx` | Template controls UI: accent color picker, compact toggle, skills display mode |
| `src/main/lib/themeRegistry.ts` | Replace THEMES list and `renderThemeHtml()` with new template keys; keep `buildResumeJson()` |
| `src/main/handlers/export.ts` | Remove isProfessional/isTheme branch split; all templates use print.html path |
| `src/main/handlers/themes.ts` | Return new TEMPLATE_LIST from `templates:list` IPC |
| `src/preload/index.ts` | Extend `templates.setLayoutTemplate` signature if template controls add new params |

**Deleted after migration verified:**
- `src/renderer/src/components/ProfessionalLayout.tsx`

**Unchanged:**
- `src/main/db/schema.ts` — `layoutTemplate` column already exists; no migration needed for basic template selection
- `src/main/handlers/templates.ts` — `setLayoutTemplate` IPC already exists
- `src/main/handlers/export.ts` data assembly (`getBuilderDataForVariant`) — unchanged
- All other handler files

---

## Recommended Project Structure

```
src/renderer/src/
├── components/
│   ├── templates/                    # NEW — all template code
│   │   ├── types.ts                  # ResumeTemplateProps interface
│   │   ├── resolveTemplate.ts        # string key → component
│   │   ├── filterResumeData.ts       # shared excluded-item filtering
│   │   ├── ClassicTemplate.tsx
│   │   ├── ModernTemplate.tsx
│   │   ├── JakeTemplate.tsx
│   │   ├── MinimalTemplate.tsx
│   │   └── ExecutiveTemplate.tsx
│   ├── ProfessionalLayout.tsx        # KEEP until migration complete, then delete
│   ├── VariantPreview.tsx            # MODIFIED
│   ├── VariantEditor.tsx             # MODIFIED (template controls)
│   └── ...
├── PrintApp.tsx                      # MODIFIED
└── ...

src/main/
├── lib/
│   └── themeRegistry.ts             # MODIFIED
├── handlers/
│   ├── export.ts                    # MODIFIED
│   └── themes.ts                    # MODIFIED
└── ...
```

### Structure Rationale

- **`templates/` subdirectory:** Isolates all template code; adding a 6th template
  later requires adding one file to this directory and one entry in `resolveTemplate.ts`
- **`types.ts` separate from components:** `ResumeTemplateProps` is consumed by all 5
  template components, `PrintApp.tsx`, and `filterResumeData.ts` — a shared types file
  avoids circular imports
- **`resolveTemplate.ts`:** The only coupling between the DB string value and component
  code — explicit and in one place; template key typos cause compile errors

---

## Architectural Patterns

### Pattern 1: Template Key Registry

**What:** A single function maps a template key string (stored in DB) to a React
component. All consumers (PrintApp, VariantPreview) call this function rather than
importing template components directly.

**When to use:** Always — centralizes the DB-string-to-component coupling.

**Trade-offs:** Slight indirection, but prevents template key strings from spreading
across multiple files.

```typescript
// templates/resolveTemplate.ts
import ClassicTemplate from './ClassicTemplate'
import ModernTemplate from './ModernTemplate'
import JakeTemplate from './JakeTemplate'
import MinimalTemplate from './MinimalTemplate'
import ExecutiveTemplate from './ExecutiveTemplate'
import type { ResumeTemplateProps } from './types'

const TEMPLATE_MAP: Record<string, React.ComponentType<ResumeTemplateProps>> = {
  classic:   ClassicTemplate,
  modern:    ModernTemplate,
  jake:      JakeTemplate,
  minimal:   MinimalTemplate,
  executive: ExecutiveTemplate,
}

export function resolveTemplate(key: string): React.ComponentType<ResumeTemplateProps> {
  return TEMPLATE_MAP[key] ?? ClassicTemplate  // Classic is the safe fallback
}

export const TEMPLATE_LIST = Object.keys(TEMPLATE_MAP).map((key) => ({
  key,
  displayName: key.charAt(0).toUpperCase() + key.slice(1),
}))
```

### Pattern 2: Print URL with Template Param

**What:** `print.html` currently accepts `?variantId=X`. Extend to
`?variantId=X&template=classic`. PrintApp reads both params, calls `resolveTemplate()`,
renders the selected component with data fetched via `window.api`.

**When to use:** This is the unification mechanism — preview iframe and export
BrowserWindow both point to this URL.

**Trade-offs:** Preview now depends on the print.html load cycle (slightly more overhead
than inline rendering), but preview fidelity is guaranteed because it uses the exact same
rendering context as PDF export.

```typescript
// PrintApp.tsx (modified useEffect)
const params = new URLSearchParams(window.location.search)
const variantId = Number(params.get('variantId'))
const templateKey = params.get('template') ?? 'classic'
const TemplateComponent = resolveTemplate(templateKey)

// ...fetch data, then render:
return (
  <TemplateComponent
    profile={data.profile}
    jobs={data.jobs}
    skills={data.skills}
    accentColor={data.accentColor ?? '#2563eb'}
    compact={data.compact ?? false}
    skillsDisplay={data.skillsDisplay ?? 'grouped'}
    // ...etc
  />
)
```

### Pattern 3: Preview as iframe Pointing to print.html

**What:** `VariantPreview` renders `<iframe src="print.html?variantId=42&template=classic">`.
This replaces both the current inline `<ProfessionalLayout />` render and the
`srcDoc` iframe for jsonresume themes.

**When to use:** All 5 new templates. This is the only preview path after migration.

**Trade-offs:** Requires the renderer to construct the correct URL for both dev (Vite
dev server URL) and prod (file:// URL). A helper function handles this. The iframe does
not need a `sandbox` attribute because it loads a fully trusted first-party page.

```typescript
// VariantPreview.tsx (simplified new form)
// In dev: Vite serves print.html at the renderer dev URL
// In prod: file:// points to the bundled print.html

// The renderer can use window.location.origin in dev mode:
const base = window.location.origin  // e.g., http://localhost:5173 in dev
const src = `${base}/print.html?variantId=${variantId}&template=${layoutTemplate}`

return (
  <iframe
    src={src}
    style={{ width: '100%', height: '100%', border: 'none' }}
  />
)
```

Note: In production, the renderer runs as a `file://` page. `window.location.origin`
is `null` for file:// pages. The electron-vite build puts `print.html` in the same
directory as `index.html`. Use a relative path `./print.html` or expose the print URL
via an IPC handler or Electron's `app.getPath`. The simplest approach: expose a
`window.__printBase` global from the preload script set to the correct base URL.

### Pattern 4: Template CSS — Inline Styles with Single Style Tag for Print Rules

**What:** All 5 templates use React inline styles for all visual properties. A single
`<style>` tag is rendered at the top of each template's output for print-only CSS rules
that cannot be expressed as inline styles.

**When to use:** Always. This is the existing codebase constraint and the correct
approach for template components that render in isolated BrowserWindows.

**Rationale:** Templates render inside `print.html` which has no CSS from the main app.
Inline styles are guaranteed to work regardless of what CSS is or isn't loaded. CSS
file imports would require correct asset paths in both dev and prod environments —
unnecessary complexity given that inline styles already work correctly in
`ProfessionalLayout.tsx`.

**Print-specific CSS (cannot be inline):**
```typescript
// At the top of each template's return value:
<>
  <style>{`
    @page { size: letter; margin: 0; }
    body { margin: 0; background: white; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `}</style>
  <div style={{ fontFamily: 'Calibri, sans-serif', padding: '0.5in', ... }}>
    {/* template sections */}
  </div>
</>
```

**Accent color pattern:**
```typescript
// Templates receive accentColor as a prop, use it in style objects:
const sectionHeadingStyle: React.CSSProperties = {
  color: accentColor,
  borderBottom: `2px solid ${accentColor}`,
  // ...
}
```

### Pattern 5: Template Controls via Extended Variant Schema

**What:** Per-variant template settings (accent color, compact mode, skills display)
are stored as new columns on `templateVariants` and passed through the data flow to
the template component via query params or IPC.

**When to use:** Phase where template controls are implemented. Not needed for the
initial 5 template builds.

**Schema additions (new columns via ALTER TABLE in db/index.ts):**
```sql
ALTER TABLE template_variants ADD COLUMN accent_color text NOT NULL DEFAULT '#2563eb'
ALTER TABLE template_variants ADD COLUMN compact integer NOT NULL DEFAULT 0
ALTER TABLE template_variants ADD COLUMN skills_display text NOT NULL DEFAULT 'grouped'
```

**Flow:** `getBuilderData` IPC returns these fields → PrintApp passes them as props to
template component. `VariantEditor` adds color picker and toggle UI that calls
`setLayoutTemplate` or a new `setTemplateOptions` IPC.

---

## Data Flow

### Preview Render Flow (New)

```
User opens Variants tab, selects a variant
    ↓
VariantEditor renders VariantPreview with { variantId: 42, layoutTemplate: 'classic' }
    ↓
VariantPreview builds iframe src:
    "{base}/print.html?variantId=42&template=classic"
    ↓
iframe loads PrintApp.tsx in isolated page context
    ↓
PrintApp reads URL params: variantId=42, template=classic
PrintApp calls window.api.profile.get() + window.api.templates.getBuilderData(42)
    ↓
PrintApp calls resolveTemplate('classic') → ClassicTemplate
    ↓
PrintApp renders <ClassicTemplate profile={...} jobs={...} accentColor={...} ... />
    ↓
iframe displays rendered template at actual page dimensions
```

### PDF Export Flow (New, Unified)

```
User clicks PDF in VariantEditor
    ↓
export:pdf IPC fires with variantId=42
    ↓
Handler reads templateVariants.layoutTemplate from DB → 'classic'
Handler creates hidden BrowserWindow, loads:
    "{devUrl}/print.html?variantId=42&template=classic"   (dev)
    "print.html?variantId=42&template=classic"            (prod)
    ↓
PrintApp runs IDENTICAL code path to preview iframe
    ↓
PrintApp sends 'print:ready' IPC when rendered (existing signal, unchanged)
    ↓
Handler calls printToPDF({ printBackground: true, pageSize: 'Letter', margins: {0,0,0,0} })
    ↓
PDF matches preview exactly: same URL, same rendering engine, same component code
```

### Template Selection Flow

```
User picks 'modern' from template dropdown in VariantEditor
    ↓
handleThemeChange('modern') fires
    ↓
window.api.templates.setLayoutTemplate(variantId, 'modern') → DB update
    ↓
setLayoutTemplate('modern') updates local React state in VariantEditor
    ↓
VariantPreview receives new layoutTemplate prop → iframe src changes to ?template=modern
    ↓
Iframe reloads, PrintApp renders ModernTemplate, preview updates
```

### Snapshot PDF Flow (Design Decision Required)

The `export:snapshotPdf` handler currently renders using `buildResumeJson()` +
`renderThemeHtml()` from themeRegistry — this path is specific to jsonresume themes and
breaks when old themes are removed.

**Recommended approach:** Snapshots store their own data (jobs, skills, etc.) and the
`layoutTemplate` at time of submission. To re-export a snapshot as PDF, the handler
should write the snapshot data to a temporary IPC channel or pass it via query param
encoding, then load `print.html?snapshotId=tmp` in a hidden BrowserWindow where PrintApp
can retrieve it. This keeps the single rendering path and is addressable in the phase
that handles snapshot export.

**Alternative (simpler short-term):** Keep `export:snapshotPdf` using the 'classic'
template as a hardcoded fallback when old themes are removed, replacing the 'even' theme
fallback that exists today. Full template-aware snapshot PDF can be addressed in a
subsequent phase.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| VariantPreview ↔ PrintApp | iframe src URL with query params | variantId + template key; no new IPC handlers needed |
| export:pdf handler ↔ PrintApp | BrowserWindow URL + print:ready IPC | Existing print:ready signal is unchanged |
| VariantEditor ↔ themes handler | `themes:list` IPC | Returns new TEMPLATE_LIST instead of old THEMES array |
| Template components ↔ DB | Unchanged; BuilderData type is unchanged | No schema changes needed for basic template switching |
| PrintApp ↔ resolveTemplate | Direct import in renderer bundle | Happens at build time; no runtime resolution |
| Snapshot PDF ↔ template system | Needs design decision (see above) | Current path uses themeRegistry; breaks on theme removal |

### Preload Changes

No new IPC channels are required for basic template switching. The existing
`templates:setLayoutTemplate` IPC already persists the template key. New IPC may be
needed when template controls (accent color, compact) are implemented:

```typescript
// Possible addition to preload/index.ts when controls phase is built:
templates: {
  // ...existing...
  setTemplateOptions: (id: number, options: {
    accentColor?: string
    compact?: boolean
    skillsDisplay?: 'grouped' | 'inline'
  }) => ipcRenderer.invoke('templates:setTemplateOptions', id, options),
}
```

---

## Build Order for Phases

The template system has clear dependencies. This order minimizes risk.

**Phase 1 — Pipeline validation (must be done first):**
1. Define `ResumeTemplateProps` type in `templates/types.ts`
2. Implement `filterResumeData()` in `templates/filterResumeData.ts`
3. Build `ClassicTemplate.tsx` — one full template
4. Implement `resolveTemplate.ts` with Classic as the only entry
5. Modify `PrintApp.tsx` to read `template` param and call `resolveTemplate()`
6. Modify `VariantPreview.tsx` to use `<iframe src="print.html?...">` for all templates
7. Modify `export.ts` to unify PDF paths (remove isProfessional branch, always use print.html)
8. Update `themeRegistry.ts` THEMES list to include 'classic' alongside old themes
9. Validate: preview matches PDF, no layout drift, existing 'professional' path is removed

Do not build all 5 templates before validating the pipeline. Classic proves the
architecture; the other 4 are incremental.

**Phase 2 — Remaining templates (after pipeline validated):**
- ModernTemplate, JakeTemplate, MinimalTemplate, ExecutiveTemplate
- All are independent; each adds one entry to `resolveTemplate.ts`
- Each follows the same props interface and rendering pattern as Classic

**Phase 3 — Template controls (after at least 2-3 templates exist):**
- Accent color picker in VariantEditor (template consumes `accentColor` prop)
- Compact margin toggle (template consumes `compact` prop)
- Skills display mode toggle (inline pills vs grouped rows)
- Schema: ADD COLUMN for `accentColor`, `compact`, `skillsDisplay` in templateVariants
- `getBuilderData` IPC returns these fields (or a new `getTemplateOptions` IPC)

**Phase 4 — Remove old themes:**
- Remove Even/Class/Elegant npm packages from package.json
- Remove `renderThemeHtml()` switch cases from themeRegistry
- Remove old theme code from export.ts (isProfessional branch already gone after Phase 1)
- Remove `ProfessionalLayout.tsx`
- Update snapshot PDF path (classic fallback or full solution)
- Update `THEMES` constant to only list the 5 new templates

**Dependency graph:**
```
types.ts + filterResumeData.ts
    ↓
ClassicTemplate.tsx
    ↓
resolveTemplate.ts
    ↓
PrintApp.tsx (reads ?template param)
    ↓
VariantPreview.tsx (iframe path)     export.ts (unified path)
    ↓
validate preview = PDF fidelity
    ↓
ModernTemplate + JakeTemplate + MinimalTemplate + ExecutiveTemplate (parallel)
    ↓
template controls (accentColor, compact, skillsDisplay)
    ↓
schema columns + TemplateEditor UI
    ↓
remove old themes + ProfessionalLayout.tsx
```

---

## Anti-Patterns

### Anti-Pattern 1: Shared Base Template Component

**What people do:** Create `BaseTemplate.tsx` with abstract sections that all templates
extend or configure through props.

**Why it's wrong:** Resume template layouts differ structurally (1-column vs 2-column,
sidebar vs stacked, header with accent bar vs minimal header). A shared base becomes
either a kitchen-sink prop explosion or forces artificial uniformity across designs that
are supposed to look distinct.

**Do this instead:** Share the `ResumeTemplateProps` TypeScript type and the
`filterResumeData()` utility. Keep each template's JSX independent. Copy the initial
structure from Classic to start each new template; diverge freely as the design requires.

### Anti-Pattern 2: CSS Class Files for Template Styles

**What people do:** Write `classic-template.css` files and import them into template
components.

**Why it's wrong:** Templates render in `print.html` — an isolated BrowserWindow page.
CSS file loading depends on correct asset URL resolution at runtime. In dev, Vite serves
files; in prod, they must be bundled with the correct relative paths. The existing codebase
already hit this problem with ESM themes (the `Class` theme's Handlebars templates
require disk reads, which broke bundling). Inline styles have zero path-resolution risk.

**Do this instead:** Inline styles as `React.CSSProperties` objects. For print-specific
rules that cannot be inline (`@page`, print media query), inject a single `<style>` tag
at the top of the template's rendered output.

### Anti-Pattern 3: Separate Preview and Export Rendering Paths

**What people do:** Render preview inline in the React app (fast, avoids BrowserWindow
overhead) and use a different rendering path for PDF.

**Why it's wrong:** Any difference between preview and export renders — different fonts,
different CSS loading, different layout state — causes layout drift. The user sees one
layout in preview and gets something different in the PDF. This is exactly the current
problem with Even/Class/Elegant themes, which motivated this entire milestone.

**Do this instead:** Use `print.html` + `PrintApp` for both preview and export. Preview
is an iframe pointing to the same URL that export uses. Layout drift is structurally
impossible when both paths use the same URL, same component, and same Chromium engine.

### Anti-Pattern 4: Server-Side React Rendering in Main Process

**What people do:** Have the main process import template components and call
`ReactDOMServer.renderToStaticMarkup()` to produce HTML, then write to a temp file for
PDF printing.

**Why it's wrong:** The main process has no DOM. `renderToStaticMarkup()` produces
HTML structure but does NOT render fonts, resolve CSS cascade, or compute final text
metrics. Chromium's layout engine is required to get pixel-accurate line heights,
word-wrap, and page break positions — which is exactly what `printToPDF()` needs to
match the visual preview.

**Do this instead:** Always render in a Chromium context (a BrowserWindow for export,
the existing renderer iframe for preview). The `print:ready` pattern already handles
this correctly.

### Anti-Pattern 5: Keeping isProfessional/isTheme Branches

**What people do:** Add a new 'new-template' case alongside the existing professional
and theme branches in `export.ts` and `VariantPreview.tsx`.

**Why it's wrong:** Three code paths for rendering means three places to maintain and
three surfaces for bugs. The whole point of the new architecture is collapsing to one.

**Do this instead:** As part of Phase 1, immediately unify export.ts to one path (the
print.html BrowserWindow path). Remove the `isProfessional` check. ProfessionalLayout
becomes Classic template; it uses the same path as everything else.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 5 templates | Current design — inline styles, single PrintApp, TEMPLATE_MAP lookup |
| 10+ templates | Still fine; `resolveTemplate()` is an O(1) map lookup, adding templates requires no architectural changes |
| Runtime-installable templates | Would require dynamic `import()` + a template manifest file — explicitly out of scope for v2.1 per PROJECT.md |

---

## Sources

- Direct codebase inspection: `VariantPreview.tsx`, `PrintApp.tsx`, `ProfessionalLayout.tsx`,
  `export.ts`, `themeRegistry.ts`, `themes.ts`, `schema.ts`, `VariantEditor.tsx`,
  `preload/index.ts`, `db/schema.ts`
- Project decisions: `.planning/PROJECT.md` — inline styles constraint, ESM theme
  bundling issue (Class theme), DOCX stays built-in only, template rendering is
  browser-side only
- Existing proven pattern: `print:ready` IPC signal in export.ts for PDF-ready signaling

---

*Architecture research for: ResumeHelper v2.1 Resume Templates*
*Researched: 2026-03-25*
