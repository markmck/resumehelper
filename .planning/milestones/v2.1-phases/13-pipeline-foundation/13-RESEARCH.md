# Phase 13: Pipeline Foundation - Research

**Researched:** 2026-03-25
**Domain:** Electron + React unified rendering pipeline — PrintApp, VariantPreview, print.html, woff2 fonts
**Confidence:** HIGH (based on direct codebase inspection of every file in scope)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Classic template visual style**
- 1:1 replica of current ProfessionalLayout — same layout, spacing, section styles
- Uppercase section headings (WORK EXPERIENCE, SKILLS, EDUCATION, etc.) — keep current style
- Professional summary renders as plain paragraph below contact line when present, no "SUMMARY" section heading above it
- Skips cleanly when summary is empty
- Wire accentColor prop from day one — defaults to current gray (#cccccc) for section heading borders. No UI to change it yet (Phase 15), but template accepts the prop

**Font strategy**
- Classic uses Times New Roman for PDF, Times New Roman for DOCX
- Fonts bundled as woff2: Inter, Lato, EB Garamond per EXPRT-04
- Per-template font assignments from STACK.md research are locked decisions

**Preview pane behavior**
- Zoom-to-fit width: iframe renders at full paper dimensions (816x1056px), CSS transform scales down to fit preview pane width
- Vertical scroll when content exceeds one page
- Gray background behind white paper (dark gray from design system tokens) — PDF viewer feel
- Visible page gaps: gray strip between page 1 and page 2 as you scroll
- Auto-refresh: iframe reloads when builder checkboxes toggle or template changes, ~200ms debounce

**Validation**
- Written smoke test checklist output as part of Phase 13

### Claude's Discretion
- Prod URL construction approach (relative ./print.html, preload global, or IPC-provided URL)
- Exact debounce timing for preview refresh
- Page gap visual implementation details (CSS approach)
- filterResumeData utility implementation details
- resolveTemplate registry implementation details

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TMPL-02 | Templates render as HTML/CSS inside the preview pane at page scale, showing actual page boundaries | Preview iframe path + CSS zoom-to-fit transform pattern |
| TMPL-03 | All templates use single-column ATS-friendly layout with standard section headings | ClassicTemplate inherits ProfessionalLayout structure; ATS heading list confirmed |
| PREV-03 | Preview and PDF export render identically — same component, same engine, no layout drift | Unified print.html path — structurally impossible to drift when both use same URL+component |
| EXPRT-04 | Template fonts bundled as woff2 (Lato, EB Garamond, Inter) | public/fonts/ woff2 approach; @font-face in print.html style tag or shared CSS |
</phase_requirements>

---

## Summary

Phase 13 is a surgical refactoring phase, not a feature-addition phase. The codebase already has a proven PrintApp + print.html pattern that works correctly for the "professional" layout. The goal is to generalize that pattern into a template-aware unified path: add a `template` query param, build ClassicTemplate.tsx as a 1:1 port of ProfessionalLayout, unify VariantPreview to always use iframe src (never inline React render), and remove the isProfessional/isTheme branch in export.ts.

The primary unknown going into planning is the `print.html` prod URL construction. In dev, `window.location.origin` is `http://localhost:5173` and works fine. In prod, the renderer is a `file://` page where `window.location.origin` returns `"null"`. Three approaches exist; the planner should treat URL construction as a spike task: prototype all three approaches and pick what works, because none are proven in this specific codebase. The safest approach based on community evidence is a preload global (`window.__printBase`), but `loadFile` with `query:` param (already proven in export.ts for the professional path in dev mode) is also available.

Font bundling is straightforward: `src/renderer/public/` does not yet exist. Create it with a `fonts/` subdirectory. electron-vite copies `public/` as-is into the renderer output root, so `/fonts/lato-regular.woff2` paths work identically in dev and prod. The `@font-face` declarations should live in `print.html`'s `<style>` tag (not in the main app CSS) because fonts only need to load in the print rendering context.

**Primary recommendation:** Build in strict dependency order: types.ts → filterResumeData.ts → ClassicTemplate.tsx → resolveTemplate.ts → PrintApp.tsx (template param) → URL construction spike → VariantPreview.tsx (iframe only) → export.ts (unified path). Validate preview=PDF before marking phase complete.

---

## Standard Stack

### Core (unchanged — no new npm packages for Phase 13)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 39 | Desktop shell, BrowserWindow, printToPDF | Already in use |
| React | 19.2.x | Template components, PrintApp | Already in use |
| TypeScript | Latest | Type safety for template props | Already in use |
| electron-vite | 5 | Build system; multi-entry (index.html + print.html) | Already in use; print.html already in rollupOptions |

### No New Dependencies for Phase 13

Phase 13 requires zero new npm packages. Fonts are static woff2 files dropped into `src/renderer/public/fonts/`. Template components use inline styles (existing pattern). react-colorful is deferred to Phase 15.

### Font Files to Download (not npm packages)

| Font | Weights | Source | License |
|------|---------|--------|---------|
| Inter | 400, 700 | fonts.google.com/specimen/Inter | OFL |
| Lato | 300, 400, 700 | fonts.google.com/specimen/Lato | OFL |
| EB Garamond | 400, 400 italic | fonts.google.com/specimen/EB+Garamond | OFL |

Note: Classic template uses Times New Roman — a system font, no woff2 needed. EXPRT-04 requires Inter/Lato/EB Garamond bundled for future templates; Phase 13 bundles them even though Classic doesn't use them.

---

## Architecture Patterns

### Recommended Project Structure

```
src/renderer/src/
├── components/
│   ├── templates/                    # NEW — all template code
│   │   ├── types.ts                  # ResumeTemplateProps interface
│   │   ├── resolveTemplate.ts        # string key -> component + TEMPLATE_LIST
│   │   ├── filterResumeData.ts       # excluded-item filtering utility
│   │   └── ClassicTemplate.tsx       # Phase 13: only template built
│   ├── ProfessionalLayout.tsx        # KEEP — do not delete in Phase 13
│   ├── VariantPreview.tsx            # MODIFIED: iframe-only path
│   └── VariantEditor.tsx             # UNCHANGED in Phase 13
├── PrintApp.tsx                      # MODIFIED: reads template param
└── ...

src/renderer/
├── print.html                        # MODIFIED: @font-face style block
├── public/                           # NEW directory
│   └── fonts/                        # NEW: woff2 files placed here
└── ...

src/main/
├── lib/
│   └── themeRegistry.ts             # MODIFIED: add 'classic' to THEMES
└── handlers/
    └── export.ts                    # MODIFIED: unified PDF path
```

### Pattern 1: ResumeTemplateProps Interface

**What:** Shared TypeScript interface in `templates/types.ts`. All template components receive the same props. This is the shared contract — not a shared base component.

**When to use:** Import from `./types` in every template component and in PrintApp.

```typescript
// src/renderer/src/components/templates/types.ts
import type {
  BuilderJob,
  BuilderProject,
  BuilderSkill,
  BuilderEducation,
  BuilderVolunteer,
  BuilderAward,
  BuilderPublication,
  BuilderLanguage,
  BuilderInterest,
  BuilderReference,
  Profile,
} from '../../../../preload/index.d'

export interface ResumeTemplateProps {
  profile?: Profile
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects?: BuilderProject[]
  education?: BuilderEducation[]
  volunteer?: BuilderVolunteer[]
  awards?: BuilderAward[]
  publications?: BuilderPublication[]
  languages?: BuilderLanguage[]
  interests?: BuilderInterest[]
  references?: BuilderReference[]
  accentColor?: string     // defaults to '#cccccc' inside template
  compact?: boolean        // defaults to false — Phase 15 controls
  skillsDisplay?: 'grouped' | 'inline'  // defaults to 'grouped'
}
```

The `Profile` type is already defined in `preload/index.d.ts` but does not include `summary`. Check whether `summary` needs to be added to the Profile interface or if it exists already. The `profile.summary` field IS used in the current ProfessionalLayout so the type likely already has it — confirm before writing ClassicTemplate.

### Pattern 2: filterResumeData Utility

**What:** Extracts the excluded-item filtering logic currently duplicated between `ProfessionalLayout.tsx` and `themeRegistry.ts::buildResumeJson()`. Returns arrays of only included items, ready for rendering.

**When to use:** Called at the top of each template component (or in PrintApp before passing props).

```typescript
// src/renderer/src/components/templates/filterResumeData.ts
import type { ResumeTemplateProps } from './types'

export interface FilteredResumeData {
  jobs: /* included jobs with included bullets */
  skills: /* included skills */
  projects: /* included projects with included bullets */
  education: /* included education */
  // ... etc
  skillGroups: Record<string, string[]>  // grouped for 'grouped' display mode
}

export function filterResumeData(props: ResumeTemplateProps): FilteredResumeData {
  const includedJobs = props.jobs.filter((j) => !j.excluded).map((job) => ({
    ...job,
    bullets: job.bullets.filter((b) => !b.excluded),
  }))
  // ... same pattern for each entity type
  // skill grouping: group by first tag, key = tag name, value = skill names array
}
```

The existing logic lives in `ProfessionalLayout.tsx` lines 41-58 and `themeRegistry.ts` lines 24-32. Port this logic, don't rewrite it.

### Pattern 3: ClassicTemplate Component

**What:** A 1:1 visual port of `ProfessionalLayout.tsx` — same layout, spacing, fonts — but structured as a `ResumeTemplateProps` consumer and with the following differences per CONTEXT.md:
- Summary renders WITHOUT a "SUMMARY" section heading (plain paragraph after contact line)
- Section headings are uppercase (WORK EXPERIENCE, SKILLS, EDUCATION, etc.) — current ProfessionalLayout uses "Work Experience" not "WORK EXPERIENCE", so this IS a change
- `accentColor` prop wired to section heading border color — defaults to `#cccccc`
- Times New Roman as the base font family (current ProfessionalLayout uses Calibri/Segoe UI)

**Key difference from ProfessionalLayout:** ProfessionalLayout uses mixed case headings ("Work Experience"). ClassicTemplate uses UPPERCASE per CONTEXT.md. This is an intentional divergence.

```typescript
// src/renderer/src/components/templates/ClassicTemplate.tsx
import type { ResumeTemplateProps } from './types'
import { filterResumeData } from './filterResumeData'

export default function ClassicTemplate({
  profile,
  accentColor = '#cccccc',
  ...props
}: ResumeTemplateProps): React.JSX.Element {
  const { includedJobs, skillGroups, includedProjects, /* ... */ } = filterResumeData({ profile, ...props })

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#333333',
    borderBottom: `1px solid ${accentColor}`,
    paddingBottom: '3px',
    marginBottom: '10px',
    marginTop: '18px',
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      color: '#1a1a1a',
      fontFamily: "'Times New Roman', 'Times', serif",
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: '0.5in',
    }}>
      {/* Header: name centered, contact line centered, summary as plain paragraph */}
      {/* Sections: WORK EXPERIENCE, SKILLS, EDUCATION, PROJECTS, etc. */}
    </div>
  )
}
```

### Pattern 4: resolveTemplate Registry

**What:** Maps DB string values to React component types. The only coupling point between the persistent string `'classic'` and the component code.

**When to use:** Called in `PrintApp.tsx`. Import of template components happens through this function only.

```typescript
// src/renderer/src/components/templates/resolveTemplate.ts
import ClassicTemplate from './ClassicTemplate'
import type { ResumeTemplateProps } from './types'

const TEMPLATE_MAP: Record<string, React.ComponentType<ResumeTemplateProps>> = {
  classic: ClassicTemplate,
  // Phase 14 will add: modern, jake, minimal, executive
}

export function resolveTemplate(key: string): React.ComponentType<ResumeTemplateProps> {
  return TEMPLATE_MAP[key] ?? ClassicTemplate  // Classic is the safe fallback
}

export const TEMPLATE_LIST = Object.keys(TEMPLATE_MAP).map((key) => ({
  key,
  displayName: key.charAt(0).toUpperCase() + key.slice(1),
}))
```

### Pattern 5: PrintApp Template Param

**What:** Extend PrintApp to read a `template` query param alongside the existing `variantId` param. Call `resolveTemplate()` to select the component. Everything else (data fetching, `print:ready` signal) is unchanged.

**Current PrintApp:** Reads only `variantId`, always renders `<ProfessionalLayout />`.

**Modified PrintApp:** Reads `variantId` AND `template`, renders the resolved component.

```typescript
// PrintApp.tsx — modified useEffect
const params = new URLSearchParams(window.location.search)
const variantId = Number(params.get('variantId'))
const templateKey = params.get('template') ?? 'classic'
const TemplateComponent = resolveTemplate(templateKey)

// Data fetch is unchanged
// print:ready signal is unchanged
// Render:
return (
  <TemplateComponent
    profile={data.profile}
    jobs={data.jobs}
    skills={data.skills}
    projects={data.projects}
    education={data.education}
    volunteer={data.volunteer}
    awards={data.awards}
    publications={data.publications}
    languages={data.languages}
    interests={data.interests}
    references={data.references}
    accentColor="#cccccc"  // Phase 13 hardcoded; Phase 15 reads from DB
  />
)
```

### Pattern 6: VariantPreview iframe-Only Path

**What:** Remove the three-way branch in VariantPreview (isBuiltIn → ProfessionalLayout, theme → srcDoc iframe) and replace with a single iframe pointing to `print.html?variantId=X&template=Y`. The iframe renders at 816x1056px (letter paper at 96dpi), scaled down to fit the preview pane width via CSS transform.

**Key challenge:** URL construction in prod (see Pitfall 3 below).

**Preview pane sizing per CONTEXT.md:**
- iframe is `816px` wide, `1056px` tall (1:1 letter page size at 96dpi)
- CSS `transform: scale(N)` where N = `containerWidth / 816`
- Container needs `overflow: hidden` plus explicit height = `1056 * scale`
- Scrollable outer container for multi-page resumes

```typescript
// VariantPreview.tsx (simplified)
function VariantPreview({ variantId, layoutTemplate, refreshKey }: VariantPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.offsetWidth
      setScale(w / 816)
    }
  }, [/* containerRef width */])

  const printUrl = buildPrintUrl(variantId, layoutTemplate ?? 'classic')

  return (
    <div
      ref={containerRef}
      style={{
        background: 'var(--color-surface-raised)',  // dark gray background
        overflowY: 'auto',
        height: '100%',
        padding: '16px',
      }}
    >
      <div style={{ height: `${1056 * scale}px`, overflow: 'hidden' }}>
        <iframe
          key={`${variantId}-${layoutTemplate}-${refreshKey}`}
          src={printUrl}
          style={{
            width: '816px',
            height: '1056px',
            border: 'none',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </div>
  )
}
```

The `key` prop forces iframe reload when variantId, layoutTemplate, or refreshKey changes — this is the debounce-friendly refresh mechanism.

### Pattern 7: Print URL Construction (Spike Required)

**What:** `buildPrintUrl(variantId, templateKey)` must work in both dev and prod contexts.

**Dev context:** Vite dev server at `http://localhost:5173`. `window.location.origin` = `"http://localhost:5173"`. URL = `http://localhost:5173/print.html?variantId=X&template=Y`. Works fine.

**Prod context:** Renderer loaded as `file:///C:/Users/.../app/renderer/index.html`. `window.location.origin` = `"null"` (this is a known browser behavior — origin is null for file:// pages). A string like `"null/print.html"` is NOT a valid URL.

**Three approaches — all viable, pick during spike:**

| Approach | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| **A: Relative path** | `./print.html?variantId=X&template=Y` | Simplest code | Relative URLs in `src` attr may not work in all iframe contexts in Electron |
| **B: Preload global** | Preload sets `window.__printBase` via contextBridge; renderer builds `${window.__printBase}/print.html?...` | Clean, always correct | Requires preload change |
| **C: `app.isPackaged` + IPC** | IPC handler returns the correct base URL | Explicit, debuggable | Extra IPC roundtrip on every preview load |

The export.ts already has the correct pattern for the PDF export path:
```typescript
// Dev:
await win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=${variantId}`)
// Prod:
await win.loadFile(join(__dirname, '../renderer/print.html'), { query: { variantId: String(variantId) } })
```

For the preview iframe src (renderer-side), the recommended approach is **B (preload global)**:

```typescript
// src/preload/index.ts — add to contextBridge
// Before exposing api, detect the correct print base:
const printBase = process.env['ELECTRON_RENDERER_URL']
  ?? new URL('../renderer', import.meta.url).href  // file:// path to renderer dir

contextBridge.exposeInMainWorld('__printBase', printBase)
```

Then in VariantPreview:
```typescript
const base = (window as Window & { __printBase?: string }).__printBase
  ?? window.location.origin
const printUrl = `${base}/print.html?variantId=${variantId}&template=${layoutTemplate}`
```

**Spike task:** Prototype and test all three approaches in dev AND with a packaged build before committing. The planner should include a spike task before the VariantPreview change task.

### Pattern 8: Unified export.ts PDF Path

**What:** Remove the `isProfessional` / `isTheme` branch split in `export:pdf` handler. All templates use the BrowserWindow + print.html path. The theme path (`renderThemeHtml` + tmpfile) is no longer needed for the new templates and remains only for backward compat with old variant records that have 'even'/'class'/'elegant' as `layoutTemplate`.

**Strategy for Phase 13:** Keep the old `isTheme` path temporarily (don't break existing users with 'even' variants), but route 'classic' through the new unified path. The old theme path is removed in Phase 16.

```typescript
// export.ts — updated isProfessional check
const isProfessional = !layoutTemplate
  || layoutTemplate === 'professional'
  || layoutTemplate === 'traditional'
  || layoutTemplate === 'classic'  // ADD: classic uses print.html path

// For the print.html path, extend the URL with template param:
if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  await win.loadURL(
    `${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=${variantId}&template=${layoutTemplate}`
  )
} else {
  await win.loadFile(join(__dirname, '../renderer/print.html'), {
    query: { variantId: String(variantId), template: layoutTemplate },
  })
}
```

### Pattern 9: Font Loading in print.html

**What:** Add `@font-face` declarations to `print.html`'s `<style>` tag. This ensures fonts are declared before PrintApp renders, avoiding flash-of-fallback-font.

**Current print.html:** Minimal — just a `<div id="root">` and `<script>` tag. No font declarations.

**Modified print.html:**
```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Print</title>
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:" />
    <style>
      @font-face {
        font-family: 'Inter';
        src: url('/fonts/inter-regular.woff2') format('woff2');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'Inter';
        src: url('/fonts/inter-bold.woff2') format('woff2');
        font-weight: 700;
        font-style: normal;
      }
      @font-face {
        font-family: 'Lato';
        src: url('/fonts/lato-light.woff2') format('woff2');
        font-weight: 300;
        font-style: normal;
      }
      @font-face {
        font-family: 'Lato';
        src: url('/fonts/lato-regular.woff2') format('woff2');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'Lato';
        src: url('/fonts/lato-bold.woff2') format('woff2');
        font-weight: 700;
        font-style: normal;
      }
      @font-face {
        font-family: 'EB Garamond';
        src: url('/fonts/eb-garamond-regular.woff2') format('woff2');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'EB Garamond';
        src: url('/fonts/eb-garamond-italic.woff2') format('woff2');
        font-weight: 400;
        font-style: italic;
      }
    </style>
  </head>
  <body style="background: white; margin: 0; padding: 0;">
    <div id="root"></div>
    <script type="module" src="/src/PrintApp.tsx"></script>
  </body>
</html>
```

**Note on CSP:** The current `print.html` CSP does not include `font-src 'self'`. Add this directive or fonts will be blocked.

### Anti-Patterns to Avoid

- **Shared base template component:** Do not create BaseTemplate.tsx. Share the TypeScript type and filterResumeData utility only. Each template's JSX is independent.
- **CSS files for template styles:** Inline styles only. CSS file imports require path resolution that breaks in prod.
- **Keeping separate preview/PDF code paths:** Once Classic is proven, the isBuiltIn branch in VariantPreview must be gone. No hybrid state where Professional still renders inline.
- **Adding @page CSS rules:** Conflicts with printToPDF's `margins` option (Electron issue #8138). Use inline padding instead.
- **Google Fonts CDN:** Unreliable in hidden BrowserWindows, offline-unsafe. Use bundled woff2 only.
- **Deleting ProfessionalLayout.tsx in Phase 13:** Keep it. It may be referenced by existing snapshot exports. Phase 16 deletes it after migration is fully verified.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-PDF converter | Existing `printToPDF` + BrowserWindow | Already proven; Chromium renders fonts, layout, page breaks correctly |
| Font loading | Base64 inline fonts | woff2 files in public/ | OTS errors in Chromium with base64; no benefit in Electron where filesystem is always available |
| Template registry | Conditional imports scattered across files | `resolveTemplate.ts` single function | One coupling point; Classic is the only key in Phase 13 |
| Exclusion filtering | Inline `filter()` calls in ClassicTemplate | `filterResumeData()` utility | Logic already exists in ProfessionalLayout; consolidate, don't duplicate |
| Preview scaling math | CSS width alone | `transform: scale(containerWidth/816)` + explicit container height | Width-only scaling clips the content height; transform + explicit height is the correct zoom-to-fit |

---

## Common Pitfalls

### Pitfall 1: `window.location.origin` is `"null"` in prod file:// context

**What goes wrong:** VariantPreview builds iframe src as `${window.location.origin}/print.html?...`. In dev this is `http://localhost:5173/print.html?...` and works. In prod it becomes `"null/print.html?..."` which is not a valid URL. The iframe shows a blank page or navigation error. PDF export (which uses `loadFile` in main process) is unaffected — only the preview iframe breaks.

**Why it happens:** `window.location.origin` is defined by the Origin header spec to return `"null"` for opaque origins including `file://` URLs.

**How to avoid:** Use a preload global (`window.__printBase`), a relative path `./print.html`, or an IPC-provided URL. Treat this as a spike task before committing to VariantPreview changes. Test on the packaged build, not just dev mode.

**Warning signs:** Preview works in `npm run dev` but shows blank in packaged app.

### Pitfall 2: iframe `key` prop not used — preview doesn't reload on data change

**What goes wrong:** VariantPreview renders `<iframe src={printUrl} />`. The user toggles a checkbox in VariantBuilder. The print URL `?variantId=X&template=classic` hasn't changed, so React doesn't re-render the iframe. The preview shows stale data.

**Why it happens:** React's reconciler only re-renders the iframe when props change. If the URL is the same, the iframe is not reloaded even though the data inside has changed.

**How to avoid:** Include `refreshKey` in the iframe's `key` prop: `key={${variantId}-${layoutTemplate}-${refreshKey}}`. The `refreshKey` is already passed from VariantEditor and increments on checkbox toggle.

**Warning signs:** Toggling jobs/bullets in builder doesn't update the preview.

### Pitfall 3: font-src missing from print.html CSP

**What goes wrong:** `@font-face` declarations in `print.html` reference woff2 files from `/fonts/`. The existing CSP is `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:`. There is no `font-src` directive. Since `default-src 'self'` is the fallback, fonts from `'self'` should load — but the absence of an explicit `font-src` makes the behavior depend on CSP spec interpretation. Add `font-src 'self'` explicitly to avoid ambiguity.

**How to avoid:** Add `font-src 'self'` to print.html's meta CSP tag when adding @font-face declarations.

### Pitfall 4: Summary section heading present in Classic (differs from CONTEXT.md decision)

**What goes wrong:** ProfessionalLayout renders `<h2 style={sectionHeadingStyle}>Summary</h2>` followed by the summary text. The CONTEXT.md decision says ClassicTemplate should render summary as a plain paragraph after the contact line with NO "SUMMARY" heading.

**Why it happens:** ClassicTemplate is described as a 1:1 replica, so a developer ports ProfessionalLayout verbatim including the Summary heading.

**How to avoid:** The CONTEXT.md decision overrides the "1:1 replica" instruction for this specific detail. ClassicTemplate summary rendering: if `profile.summary` exists, render it as a plain `<div>` with paragraph styling below the contact info, NO `<h2>Summary</h2>` above it.

### Pitfall 5: print.html `<style>` tag @font-face fonts loaded lazily — not ready when print:ready fires

**What goes wrong:** PrintApp sends `print:ready` after React renders (using `requestAnimationFrame` + `setTimeout(0)`). Fonts declared via `@font-face` in a `<style>` tag may not have finished downloading at this point if the font load is slower than one frame. The PDF captures fallback fonts.

**Why it happens:** `requestAnimationFrame` fires after the first paint, but font loading is asynchronous and may complete after the first paint.

**How to avoid:** The existing export.ts adds a 200ms settle delay AFTER `print:ready` before calling `printToPDF`. This settle window is documented as sufficient for woff2 fonts from the local filesystem (not CDN). For local file:// paths (which is what prod uses), font load latency is negligible — the settle delay is adequate. Do not increase the timeout unless visual testing reveals font fallback in actual PDF output.

**Warning signs:** PDF shows Times New Roman fallback instead of the intended font when using templates that use Lato/Inter/EB Garamond.

### Pitfall 6: Forgetting to add 'classic' to themeRegistry THEMES and export.ts isProfessional check

**What goes wrong:** ClassicTemplate is built, resolveTemplate is wired, PrintApp handles the `template` param — but `export.ts` still has `layoutTemplate === 'professional' || layoutTemplate === 'traditional'` as the isProfessional check. A variant with `layoutTemplate = 'classic'` falls into the `isTheme` branch, which calls `renderThemeHtml('classic', ...)`, which throws `Unknown theme: classic`. PDF export fails.

**How to avoid:** When updating export.ts, add `|| layoutTemplate === 'classic'` to the isProfessional check. Also update `themeRegistry.ts` THEMES array to include `{ key: 'classic', displayName: 'Classic' }` so the dropdown shows it.

**Warning signs:** Exporting a variant with layoutTemplate='classic' shows an error dialog.

---

## Code Examples

### filterResumeData — Port from Existing Code

The logic to port lives in two places. The canonical version to use as the basis:

```typescript
// Source: src/renderer/src/components/ProfessionalLayout.tsx lines 41-58
const includedJobs = jobs.filter((j) => !j.excluded)
const includedSkills = skills.filter((s) => !s.excluded)
const includedProjects = (projects ?? []).filter((p) => !p.excluded)
// ... etc for education, volunteer, awards, publications, languages, interests, references

// Skill grouping (lines 52-58):
const skillGroups = includedSkills.reduce<Record<string, BuilderSkill[]>>((acc, skill) => {
  const groupKey = skill.tags.length > 0 ? skill.tags[0] : 'Other'
  if (!acc[groupKey]) acc[groupKey] = []
  acc[groupKey].push(skill)
  return acc
}, {})
```

Note: filterResumeData should also filter bullets within each job (lines 165-166 in ProfessionalLayout):
```typescript
const bullets = job.bullets.filter((b) => !b.excluded)
```

### Existing print:ready Signal (Unchanged)

```typescript
// Source: src/renderer/src/PrintApp.tsx lines 58-67 (current)
useEffect(() => {
  if (data !== null) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.electron.ipcRenderer.send('print:ready')
      }, 0)
    })
  }
}, [data])
```

This exact pattern stays in the modified PrintApp — do not change the timing.

### export.ts loadFile with query params (Proven Pattern)

```typescript
// Source: src/main/handlers/export.ts lines 237-240 (current, prod path)
await win.loadFile(join(__dirname, '../renderer/print.html'), {
  query: { variantId: String(variantId) },
})
// Extended for template param:
await win.loadFile(join(__dirname, '../renderer/print.html'), {
  query: { variantId: String(variantId), template: layoutTemplate },
})
```

This pattern is proven in the existing codebase for prod. The `query` option to `loadFile` appends the params as URL query string.

### CSS zoom-to-fit for 816px iframe

```typescript
// Scale factor for fitting 816px paper width into container
const scale = containerWidthPx / 816
// Container height must accommodate the scaled-down 1056px iframe:
const containerHeight = 1056 * scale
// iframe style:
{
  width: '816px',
  height: '1056px',
  border: 'none',
  transformOrigin: 'top left',
  transform: `scale(${scale})`,
  display: 'block',  // prevent inline baseline gap
}
// Wrapper div style:
{
  width: '100%',
  height: `${containerHeight}px`,
  overflow: 'hidden',  // clip iframe chrome at bottom
}
```

---

## State of the Art

| Old Approach | Current Approach | Phase | Impact |
|--------------|------------------|-------|--------|
| `isProfessional` branch in export.ts | Single print.html path for all templates | Phase 13 | Layout drift structurally impossible |
| `isBuiltIn` / `srcDoc` branch in VariantPreview | Single iframe src path for all templates | Phase 13 | Preview always uses same rendering context as PDF |
| ProfessionalLayout direct render in renderer | ClassicTemplate via resolveTemplate in isolated PrintApp context | Phase 13 | No diff between what you see and what you get |
| jsonresume theme npm packages | Self-contained React template components | Phase 16 (cleanup) | No ESM/CJS bundling issues |

**Deprecated in this phase:**
- `isBuiltIn()` function in VariantPreview.tsx — removed when iframe-only path implemented
- `themeHtml` state in VariantPreview.tsx — removed (no more srcDoc iframe)
- `themeLoading` state in VariantPreview.tsx — removed

---

## Open Questions

1. **Profile.summary type**
   - What we know: `profile.summary` is used in ProfessionalLayout and PrintApp, but `Profile` interface in preload/index.d.ts may not declare it
   - What's unclear: Is `summary` on the Profile interface? Line 15 of ProfessionalLayout.tsx shows `profile?: { name, email, phone, location, linkedin, summary? }` as a LOCAL interface, not importing from preload
   - Recommendation: Before writing types.ts, verify whether `Profile` in `preload/index.d.ts` includes `summary`. If not, add it to the Profile interface in preload/index.d.ts since it's a real DB column.

2. **Preload global approach for print URL — untested in this codebase**
   - What we know: Three approaches exist; community recommends preload global
   - What's unclear: Whether Electron's preload `import.meta.url` gives a usable base path in the packaged context
   - Recommendation: Spike task first; if preload global is tricky, try `./print.html` relative path as the simplest fallback and test in packaged build

3. **VariantBuilder debounce wiring — where does refreshKey increment**
   - What we know: VariantEditor has `previewVersion` state that increments on checkbox toggles, passed as `refreshKey` to VariantPreview
   - What's unclear: Whether the current refreshKey + ~200ms debounce pattern from CONTEXT.md requires changes to VariantBuilder/VariantEditor beyond what's already there
   - Recommendation: Inspect VariantBuilder.tsx to confirm how `setPreviewVersion` is called before planning that task

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test files found |
| Config file | None — Wave 0 creates smoke test checklist (manual) |
| Quick run command | Manual — open app, export PDF, compare to preview |
| Full suite command | Manual smoke checklist documented as part of this phase |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| TMPL-02 | Template renders in preview pane at page scale | smoke/manual | Open variant builder, verify Classic template shows at paper dimensions |
| TMPL-03 | Single-column ATS layout with standard headings | smoke/manual | Verify WORK EXPERIENCE, EDUCATION, SKILLS headings; verify single column |
| PREV-03 | Preview matches PDF export exactly | smoke/manual | Export PDF, open side-by-side with preview, verify layout/font/spacing match |
| EXPRT-04 | Font files load in preview and PDF | smoke/manual | Verify no font fallback in either; check PDF text is not Times New Roman when Inter/Lato/EB Garamond expected |

**CONTEXT.md specifies:** A written smoke test checklist is produced as a deliverable of Phase 13 and serves as a regression reference for Phases 14-16.

### Sampling Rate

- Per task commit: Visual inspection in running app
- Per wave merge: Full smoke checklist
- Phase gate: Smoke checklist green before marking phase complete

### Wave 0 Gaps

- [ ] `src/renderer/public/fonts/` — directory must exist with woff2 files before font tests pass
- [ ] Smoke test checklist document — produced as Phase 13 output artifact
- [ ] No automated test framework needed for this phase (rendering pipeline is browser-side; unit tests for filterResumeData possible but deferred)

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `src/renderer/src/PrintApp.tsx`, `src/renderer/src/components/VariantPreview.tsx`, `src/renderer/src/components/ProfessionalLayout.tsx`, `src/main/handlers/export.ts`, `src/main/lib/themeRegistry.ts`, `src/preload/index.ts`, `src/renderer/print.html`, `electron.vite.config.ts`, `src/preload/index.d.ts` — all files read at line level
- `.planning/research/ARCHITECTURE.md` — full component plan, patterns, anti-patterns, data flows
- `.planning/research/STACK.md` — font strategy, CSS page break techniques, no-new-npm rationale
- `.planning/phases/13-pipeline-foundation/13-CONTEXT.md` — locked decisions and discretion areas

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS.md` — verified against codebase patterns
- Electron GitHub issue #8138 — `@page` CSS conflicts with printToPDF margins (referenced in STACK.md; not re-verified but widely cited)

### Tertiary (LOW confidence)

- `window.location.origin === "null"` for file:// pages — well-known browser behavior, not re-verified against Electron 39 specifically

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly; zero new npm dependencies confirmed
- Architecture: HIGH — complete component plan from ARCHITECTURE.md cross-verified against actual source files
- Pitfalls: HIGH for items observed in actual code (print:ready timing, iframe key, isProfessional check); MEDIUM for URL construction (untested in prod)
- Font strategy: MEDIUM-HIGH — electron-vite public/ behavior from official docs; CSP font-src observation from reading actual print.html

**Research date:** 2026-03-25
**Valid until:** 2026-04-24 (stable — Electron, electron-vite, React versions locked; no fast-moving libraries)
