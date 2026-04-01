# Phase 07: resume-json-theme-rendering - Research

**Researched:** 2026-03-22
**Domain:** jsonresume theme packages, Electron main process ESM handling, iframe srcdoc rendering, asarUnpack configuration
**Confidence:** MEDIUM-HIGH (theme render APIs verified from source; ESM handling verified from electron-vite official docs; asarUnpack pattern from electron-builder official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dropdown at the top of the Preview sub-tab: "Professional (built-in)" | "Even" | "Class" | "Elegant"
- Switching immediately re-renders the preview
- Selected theme persists per variant (saved to `layoutTemplate` column in DB — already exists)
- Default theme for existing and new variants: "Professional" (built-in)
- Submission snapshots capture the active theme — snapshot viewer renders with the theme that was active at submission time (`layoutTemplate` already in SubmissionSnapshot)
- iframe with `srcdoc` — render theme's HTML output into an iframe for complete CSS isolation from app styles
- When "Professional" is selected, use the existing ProfessionalLayout React component (no iframe)
- When a theme is selected, generate resume.json data, call theme's render function, put HTML into iframe srcdoc
- Hidden BrowserWindow loads the theme's HTML (same pattern as existing PDF export)
- Theme HTML written to temp file or passed as data URL, then `printToPDF`
- DOCX export stays built-in only — resume.json themes are HTML/CSS, they can't produce DOCX
- DOCX button remains available regardless of theme (always uses built-in format)
- 3 themes: Even (clean/minimal), Class (traditional), Elegant (modern)
- npm packages: `jsonresume-theme-even`, `jsonresume-theme-class`, `jsonresume-theme-elegant`
- System designed so adding a theme is just npm install + config entry (extensible for future)
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

### Deferred Ideas (OUT OF SCOPE)
- User-importable resume.json themes (runtime theme installation from npm or local files)
- Theme thumbnail previews in the selector dropdown
- Theme-specific options/configuration (some themes have color settings)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| THM-01 | User can select from bundled resume.json themes for preview and export | Theme registry pattern, dropdown in VariantEditor, setLayoutTemplate IPC (already wired) |
| THM-02 | Theme-rendered preview shows in the Preview sub-tab | iframe srcdoc approach, IPC handler to call theme.render(), VariantPreview conditional branch |
| THM-03 | PDF export uses the selected theme's HTML rendering | Hidden BrowserWindow with loadURL(data:...) or temp file, same printToPDF pattern as existing export |
</phase_requirements>

---

## Summary

This phase integrates three jsonresume-theme packages into an existing Electron/React app. The primary technical challenges are: (1) handling the mixed ESM/CJS module formats across the three theme packages in the electron-vite main process bundle, (2) getting theme HTML into both an iframe preview and a PDF-capable BrowserWindow, and (3) ensuring theme package files are accessible after the app is packaged into an ASAR archive.

The existing codebase already has all required infrastructure wired: `layoutTemplate` column exists on `template_variants`, `setLayoutTemplate` IPC handler is registered, `VariantPreview.tsx` already loads builder data, and the hidden BrowserWindow PDF pattern is proven and in use. The work is additive: add theme packages, write a `buildResumeJson()` mapper, add a new IPC handler `themes:renderHtml`, branch VariantPreview on layout template, and extend the PDF export handler.

**Primary recommendation:** Install packages as production dependencies, use `externalizeDeps.exclude` in electron.vite.config.ts to bundle them into the main process CJS output (avoiding ESM import errors at runtime), add all three to `asarUnpack` in electron-builder.yml, render via a new `themes:renderHtml` IPC handler that is called from the renderer, and load theme HTML into the PDF BrowserWindow via `loadURL('data:text/html,...')` or a temp file.

---

## Standard Stack

### Core Theme Packages

| Package | Version | Format | Render API | Notes |
|---------|---------|--------|-----------|-------|
| `jsonresume-theme-even` | 0.26.1 | Dual ESM/CJS (has `exports.require` CJS entry `./dist/index.cjs`) | `render(resume): Promise<string>` — async, returns full HTML string | TypeScript types included; upgraded schema handling built in |
| `jsonresume-theme-class` | use `@jsonresume/jsonresume-theme-class` 0.6.0 | ESM only (`"type": "module"`) | `export async function render(resume): Promise<string>` | Requires Node 20.11+; uses Handlebars; no CJS build |
| `jsonresume-theme-elegant` | 1.16.1 | CJS (`module.exports = { render }`) | `render(resume): string` — synchronous | Legacy package, last updated ~5 years ago; uses Pug/LESS; `module.exports = { render }` |

**Important package name note:** There are two class packages on npm. Use `@jsonresume/jsonresume-theme-class` (the maintained scoped package, v0.6.0) rather than `jsonresume-theme-class` (v0.1.2, unscoped, may be stale).

**Installation:**
```bash
npm install jsonresume-theme-even @jsonresume/jsonresume-theme-class jsonresume-theme-elegant
```

### resume.json Schema (official v1.0.0)

The standard schema all themes expect:

```typescript
interface ResumeJson {
  basics: {
    name: string
    label?: string
    email?: string
    phone?: string
    url?: string
    summary?: string
    location?: { address?: string; postalCode?: string; city?: string; countryCode?: string; region?: string }
    profiles?: Array<{ network: string; username: string; url: string }>
  }
  work?: Array<{ name: string; position: string; url?: string; startDate: string; endDate?: string; summary?: string; highlights: string[] }>
  volunteer?: Array<{ organization: string; position: string; url?: string; startDate: string; endDate?: string; summary?: string; highlights: string[] }>
  education?: Array<{ institution: string; url?: string; area: string; studyType: string; startDate: string; endDate?: string; score?: string; courses: string[] }>
  awards?: Array<{ title: string; date?: string; awarder: string; summary?: string }>
  publications?: Array<{ name: string; publisher: string; releaseDate?: string; url?: string; summary?: string }>
  skills?: Array<{ name: string; level?: string; keywords: string[] }>
  languages?: Array<{ language: string; fluency: string }>
  interests?: Array<{ name: string; keywords: string[] }>
  references?: Array<{ name: string; reference: string }>
  projects?: Array<{ name: string; startDate?: string; endDate?: string; description?: string; highlights: string[]; url?: string }>
}
```

**Key mapping differences from BuilderData to resume.json:**
- `BuilderJob.company` → `work[].name` (not `company`)
- `BuilderJob.role` → `work[].position`
- `BuilderJob.bullets[].text` → `work[].highlights[]`
- `BuilderSkill` items grouped by first tag → `skills[].name` = tag, `skills[].keywords` = skill names in that group
- Skills with no tags → group under `"Other"`
- `BuilderProject.bullets[].text` → `projects[].highlights[]`
- `Profile.linkedin` → `basics.profiles[0]` (network: "LinkedIn")
- `BuilderVolunteer.highlights` already an array — maps directly
- `BuilderEducation.courses` already an array — maps directly

---

## Architecture Patterns

### Recommended File Structure (additions only)

```
src/main/
├── handlers/
│   ├── export.ts          # extend: add theme HTML branch to pdf handler
│   └── themes.ts          # NEW: registerThemeHandlers() — renderHtml IPC
src/main/
├── lib/
│   └── themeRegistry.ts   # NEW: theme config map + buildResumeJson() mapper
src/renderer/src/components/
├── VariantEditor.tsx       # extend: add theme dropdown
├── VariantPreview.tsx      # extend: add iframe branch
└── SnapshotViewer.tsx      # extend: add iframe branch for non-professional layouts
```

### Pattern 1: Theme Registry (extensibility design)

**What:** A central config object that maps theme keys to their npm package + display name. Adding a theme in the future = add one entry.

**When to use:** All theme lookups go through this; never hardcode theme package names outside this file.

```typescript
// src/main/lib/themeRegistry.ts
// Source: project design from CONTEXT.md extensibility requirement

export interface ThemeEntry {
  key: string
  displayName: string
  // packageName stored separately — import handled in renderThemeHtml()
}

export const THEMES: ThemeEntry[] = [
  { key: 'professional', displayName: 'Professional (built-in)' },
  { key: 'even', displayName: 'Even' },
  { key: 'class', displayName: 'Class' },
  { key: 'elegant', displayName: 'Elegant' },
]

export const THEME_KEYS = THEMES.map(t => t.key)
```

### Pattern 2: renderThemeHtml() — Main Process Function

**What:** A function in the main process that accepts a theme key and resume JSON data, imports the theme dynamically, calls render(), and returns HTML string.

**When to use:** Called from both the IPC handler for preview and from the PDF export handler.

```typescript
// src/main/lib/themeRegistry.ts
// Dynamic import handles both ESM (@jsonresume/jsonresume-theme-class)
// and CJS (jsonresume-theme-elegant, jsonresume-theme-even CJS fallback)

export async function renderThemeHtml(themeKey: string, resumeJson: object): Promise<string> {
  switch (themeKey) {
    case 'even': {
      const theme = await import('jsonresume-theme-even')
      return theme.render(resumeJson)
    }
    case 'class': {
      const theme = await import('@jsonresume/jsonresume-theme-class')
      return theme.render(resumeJson)
    }
    case 'elegant': {
      // CJS: module.exports = { render }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const theme = require('jsonresume-theme-elegant') as { render: (r: object) => string }
      return Promise.resolve(theme.render(resumeJson))
    }
    default:
      throw new Error(`Unknown theme: ${themeKey}`)
  }
}
```

**Note on electron-vite bundling:** Because electron-vite bundles the main process to CJS by default, any ESM-only dependency (`@jsonresume/jsonresume-theme-class`) must be excluded from bundling so it is kept as an external require. Use `externalizeDeps.exclude` to force Vite to bundle it inline as CJS instead:

```typescript
// electron.vite.config.ts — main section addition
main: {
  build: {
    rollupOptions: {
      external: []  // don't manually external these
    },
    // Tell electron-vite to NOT externalize these — bundle them into CJS output
    // so ESM-only packages work without dynamic import issues at runtime
  }
}
```

The electron-vite documented approach: add ESM-only packages to `externalizeDeps.exclude` so they get bundled (transpiled to CJS by Rollup) rather than left as external requires that fail at runtime.

```typescript
// electron.vite.config.ts
main: {
  build: {
    externalizeDeps: {
      exclude: ['@jsonresume/jsonresume-theme-class', 'jsonresume-theme-even']
    }
  }
}
```

`jsonresume-theme-even` has a CJS build (`./dist/index.cjs`) so it may work without exclusion, but including it in `exclude` ensures consistent bundling regardless of how Node resolves the conditional export.

`jsonresume-theme-elegant` is pure CJS (`module.exports = { render }`) so it can be left as an external `require()` — it will load fine from `node_modules` at runtime.

### Pattern 3: IPC Handler — themes:renderHtml

**What:** A new IPC handler in the main process that the renderer calls to get the HTML string for a theme. The renderer passes variantId + themeKey; the handler fetches builder data, builds resume.json, calls renderThemeHtml(), returns HTML string.

**Why IPC:** Theme packages (Node.js) cannot run in the renderer process. All theme invocation must happen in the main process.

```typescript
// src/main/handlers/themes.ts
ipcMain.handle('themes:renderHtml', async (_, variantId: number, themeKey: string) => {
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
  const builderData = await getBuilderDataForVariant(variantId)
  const resumeJson = buildResumeJson(profileRow, builderData)
  return renderThemeHtml(themeKey, resumeJson)
})
```

### Pattern 4: VariantPreview iframe Branch

**What:** VariantPreview checks layoutTemplate. If "professional" (or falsy/null), render ProfessionalLayout as before. Otherwise, call `window.api.themes.renderHtml(variantId, layoutTemplate)` and put the result into an `<iframe srcdoc={html}>`.

```typescript
// src/renderer/src/components/VariantPreview.tsx
// Branch on layoutTemplate — "professional" or empty → ProfessionalLayout
// Any other value → iframe with srcdoc

const [themeHtml, setThemeHtml] = useState<string | null>(null)
const layoutTemplate = variant?.layoutTemplate ?? 'professional'

useEffect(() => {
  if (layoutTemplate === 'professional') {
    setThemeHtml(null)
    return
  }
  window.api.themes.renderHtml(variantId, layoutTemplate).then(setThemeHtml)
}, [variantId, layoutTemplate])

// In render:
if (layoutTemplate !== 'professional') {
  return (
    <iframe
      srcDoc={themeHtml ?? ''}
      style={{ width: '100%', height: '100%', border: 'none' }}
      sandbox="allow-same-origin"
    />
  )
}
```

**Note:** `sandbox="allow-same-origin"` is needed because some themes use inline scripts. If scripts cause errors, consider `"allow-scripts allow-same-origin"` — but keep scripts contained since this is local trusted HTML.

**Note on data availability:** VariantPreview currently receives only `variantId`. The `layoutTemplate` value must either be fetched from the DB (via a new IPC call or extending `getBuilderData` response) or passed as a prop from VariantEditor which already holds the `TemplateVariant` object (which includes `layoutTemplate`).

### Pattern 5: PDF Export with Theme HTML

**What:** The existing PDF export loads `print.html` in a hidden BrowserWindow. For themed exports, instead load the theme HTML directly using `loadURL('data:text/html,...')` or write to a temp file.

**Decision: data URL vs temp file**

- `data:text/html,<url-encoded HTML>` — simplest, no file cleanup, but URL length limits may truncate large theme HTML (some themes produce 50-100KB HTML). URLs above ~2MB may be silently truncated on some platforms.
- Temp file written to `os.tmpdir()` then `win.loadFile(tmpPath)` — no size limits, requires file cleanup on completion. Use `fs.writeFile` + `win.loadFile()` + delete after `printToPDF`.

**Recommendation:** Use temp file approach to avoid URL length limits. Theme HTML (CSS inlined) can be large. Write to `path.join(os.tmpdir(), 'resume-theme-preview.html')` then delete after PDF generation.

```typescript
// src/main/handlers/export.ts — themed PDF branch
import { tmpdir } from 'os'

// In 'export:pdf' handler, after fetching variant:
const variant = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
const layoutTemplate = variant?.layoutTemplate ?? 'professional'

if (layoutTemplate !== 'professional') {
  // Theme path
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
  const builderData = await getBuilderDataForVariant(variantId)
  const resumeJson = buildResumeJson(profileRow, builderData)
  const html = await renderThemeHtml(layoutTemplate, resumeJson)

  const tmpPath = join(tmpdir(), `resume-theme-${variantId}.html`)
  await fs.writeFile(tmpPath, html, 'utf-8')
  await win.loadFile(tmpPath)
  // ... wait for load, printToPDF ...
  await fs.unlink(tmpPath).catch(() => {})
}
```

**Wait strategy for theme HTML load:** Unlike the existing print route which uses `print:ready` IPC signal, a bare HTML file has no signal mechanism. Use `win.webContents.once('did-finish-load', resolve)` instead. Add a 500ms settle delay after that event before calling `printToPDF`.

### Anti-Patterns to Avoid

- **Calling theme render() in renderer process** — theme packages are Node.js modules, they cannot run in the browser/renderer context. All theme calls MUST go through IPC to the main process.
- **Using `require()` on ESM-only `@jsonresume/jsonresume-theme-class`** — will throw `ERR_REQUIRE_ESM` at runtime. Use dynamic `import()` or bundle via `externalizeDeps.exclude`.
- **Passing theme HTML as `srcdoc` without loading state** — causes flash of empty content. Show a loading state while the IPC call resolves.
- **Assuming `layoutTemplate` default is 'professional'** — the DB schema has `default('traditional')` (not 'professional'). Treat both 'traditional' and 'professional' as the built-in layout, or migrate the default value.
- **Loading theme HTML with `loadURL('data:text/html,...')` for large themes** — data URLs have platform-specific length limits; use temp file instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML/CSS resume layout | Custom HTML template | `jsonresume-theme-even`, `@jsonresume/jsonresume-theme-class`, `jsonresume-theme-elegant` | Thousands of users have tested these; they handle edge cases, i18n, responsive print CSS |
| Schema normalization | Custom field remapping in each theme call | `buildResumeJson()` mapper (single place) | Themes expect strict schema; centralize once |
| CSS isolation in preview | Scoped CSS or Shadow DOM | `<iframe srcdoc>` | iframe is the only reliable full CSS isolation in Electron's Chromium renderer |
| PDF from HTML | Custom PDF library | Existing `win.webContents.printToPDF()` pattern | Already proven in this codebase; handles print CSS correctly |

**Key insight:** The jsonresume ecosystem has hundreds of themes all built to a standard interface — `render(resumeJson): Promise<string>|string`. Never bypass this API.

---

## Common Pitfalls

### Pitfall 1: layoutTemplate Default Value Mismatch

**What goes wrong:** The DB schema sets `layoutTemplate` default to `'traditional'` (see schema.ts line 32: `.default('traditional')`). The CONTEXT.md says default is `"Professional"`. Existing rows in production databases have `'traditional'` as their value. Code that checks `layoutTemplate === 'professional'` will branch to iframe for these rows.

**Why it happens:** Default value was set in an earlier phase before the theme feature was designed.

**How to avoid:** Treat both `'professional'` and `'traditional'` (and empty string) as the built-in layout. The canonical check should be: `const isProfessional = !layoutTemplate || layoutTemplate === 'professional' || layoutTemplate === 'traditional'`. Or add a migration that updates `'traditional'` → `'professional'` at startup.

**Warning signs:** Preview shows a blank iframe for existing variants instead of ProfessionalLayout.

### Pitfall 2: ERR_REQUIRE_ESM at Runtime for @jsonresume/jsonresume-theme-class

**What goes wrong:** `@jsonresume/jsonresume-theme-class` is `"type": "module"` with no CJS build. The electron-vite main process outputs CJS. If this package is left as an external require, Node throws `ERR_REQUIRE_ESM` when the IPC handler is first called.

**Why it happens:** electron-vite externalizes all node_modules by default to keep the bundle small. ESM-only packages then fail when `require()`'d at runtime.

**How to avoid:** Add `@jsonresume/jsonresume-theme-class` (and `jsonresume-theme-even` as precaution) to `externalizeDeps.exclude` in `electron.vite.config.ts`. Rollup will bundle them inline, converting ESM to CJS.

**Warning signs:** App works in dev (`electron-vite dev`) but crashes on first theme switch with `ERR_REQUIRE_ESM`.

### Pitfall 3: Theme Packages Not Accessible After ASAR Packaging

**What goes wrong:** After running `electron-builder`, theme packages are bundled into `app.asar`. Theme packages that read CSS/template files from disk (via `fs.readFileSync`, `path.join(__dirname, ...)`) fail because ASAR paths are not real filesystem paths for all Node fs operations.

**Why it happens:** `jsonresume-theme-class` loads Handlebars templates and CSS from disk. If those files are inside ASAR, the read may fail.

**How to avoid:** Add theme packages to `asarUnpack` in `electron-builder.yml`:

```yaml
asarUnpack:
  - resources/**
  - node_modules/better-sqlite3/**
  - node_modules/jsonresume-theme-even/**
  - node_modules/@jsonresume/jsonresume-theme-class/**
  - node_modules/jsonresume-theme-elegant/**
```

**Warning signs:** Themes work in dev and `electron-builder --dir` (unpacked) but fail in the packaged `.exe`/`.dmg`.

**Note on automatic detection:** electron-builder docs say native modules are auto-detected for asarUnpack, but this only applies to `.node` binary addons — not pure-JS packages that do disk reads. Theme packages must be explicitly listed.

### Pitfall 4: PDF BrowserWindow Has No print:ready Signal for Theme HTML

**What goes wrong:** The existing PDF flow waits for `ipcMain.once('print:ready')` — a custom signal sent by PrintApp.tsx after React renders. A bare theme HTML file has no React, no IPC, so this signal never fires. The 3-second safety timeout does fire, but this delays every PDF export unnecessarily.

**Why it happens:** The existing signal mechanism is React-specific.

**How to avoid:** For theme-based PDF exports, listen for `win.webContents.once('did-finish-load', ...)` instead of `print:ready`. Add a 500ms settle delay after `did-finish-load` to allow fonts and images to paint. Keep the existing `print:ready` path for Professional layout.

**Warning signs:** PDF exports with themes always take exactly 3 seconds (the timeout firing) instead of completing promptly.

### Pitfall 5: Skills Grouping — Ungrouped Skills

**What goes wrong:** `buildResumeJson()` groups skills by their first tag. Skills with no tags must be handled — if they're dropped, the user's untagged skills disappear from theme output silently.

**Why it happens:** The DB allows skills with empty tags arrays.

**How to avoid:** Assign ungrouped skills to an "Other" group (or a "Skills" catch-all). Consistent with the existing DOCX export code in `export.ts` line 402: `const group = skill.tags.length > 0 ? skill.tags[0] : 'Other'`.

### Pitfall 6: VariantPreview Needs layoutTemplate Prop, Not Just variantId

**What goes wrong:** Currently VariantPreview only receives `variantId`. To branch on layoutTemplate, it needs to know the current template value. Reading it via a new IPC call on every render adds latency.

**Why it happens:** VariantEditor holds the `TemplateVariant` object (which has `layoutTemplate`) but only passes `variantId` down.

**How to avoid:** Pass `layoutTemplate` as a prop from VariantEditor to VariantPreview. VariantEditor already has `variant: TemplateVariant` as a prop, so `variant.layoutTemplate` is available. Update VariantPreview's prop interface to accept `layoutTemplate?: string`. When theme changes, VariantEditor calls `setLayoutTemplate` IPC, receives updated variant, and re-renders VariantPreview with new layoutTemplate — triggering fresh renderHtml call.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### buildResumeJson() Mapper

```typescript
// Source: resume.json schema (jsonresume.org/schema) + existing BuilderData structure
// in src/main/lib/themeRegistry.ts

import type { Profile } from '../../preload/index.d'

export function buildResumeJson(profileRow: Profile | undefined, builderData: BuilderData): object {
  const includedJobs = builderData.jobs.filter(j => !j.excluded)
  const includedSkills = builderData.skills.filter(s => !s.excluded)
  const includedProjects = builderData.projects.filter(p => !p.excluded)
  const includedEducation = (builderData.education ?? []).filter(e => !e.excluded)
  const includedVolunteer = (builderData.volunteer ?? []).filter(v => !v.excluded)
  const includedAwards = (builderData.awards ?? []).filter(a => !a.excluded)
  const includedPublications = (builderData.publications ?? []).filter(p => !p.excluded)
  const includedLanguages = (builderData.languages ?? []).filter(l => !l.excluded)
  const includedInterests = (builderData.interests ?? []).filter(i => !i.excluded)
  const includedReferences = (builderData.references ?? []).filter(r => !r.excluded)

  // Group skills by first tag
  const skillGroups: Record<string, string[]> = {}
  for (const skill of includedSkills) {
    const group = skill.tags.length > 0 ? skill.tags[0] : 'Other'
    if (!skillGroups[group]) skillGroups[group] = []
    skillGroups[group].push(skill.name)
  }

  const profiles = []
  if (profileRow?.linkedin) {
    profiles.push({ network: 'LinkedIn', username: profileRow.linkedin, url: profileRow.linkedin })
  }

  return {
    basics: {
      name: profileRow?.name ?? '',
      email: profileRow?.email ?? '',
      phone: profileRow?.phone ?? '',
      location: profileRow?.location ? { city: profileRow.location } : undefined,
      profiles,
    },
    work: includedJobs.map(job => ({
      name: job.company,           // resume.json uses "name" not "company"
      position: job.role,          // resume.json uses "position" not "role"
      startDate: job.startDate,
      endDate: job.endDate ?? undefined,
      highlights: job.bullets.filter(b => !b.excluded).map(b => b.text),
    })),
    skills: Object.entries(skillGroups).map(([name, keywords]) => ({ name, keywords })),
    projects: includedProjects.map(p => ({
      name: p.name,
      highlights: p.bullets.filter(b => !b.excluded).map(b => b.text),
    })),
    education: includedEducation.map(e => ({
      institution: e.institution,
      area: e.area,
      studyType: e.studyType,
      startDate: e.startDate,
      endDate: e.endDate ?? undefined,
      score: e.score || undefined,
      courses: e.courses,
    })),
    volunteer: includedVolunteer.map(v => ({
      organization: v.organization,
      position: v.position,
      startDate: v.startDate,
      endDate: v.endDate ?? undefined,
      summary: v.summary || undefined,
      highlights: v.highlights,
    })),
    awards: includedAwards.map(a => ({
      title: a.title,
      date: a.date ?? undefined,
      awarder: a.awarder,
      summary: a.summary || undefined,
    })),
    publications: includedPublications.map(p => ({
      name: p.name,
      publisher: p.publisher,
      releaseDate: p.releaseDate ?? undefined,
      url: p.url || undefined,
      summary: p.summary || undefined,
    })),
    languages: includedLanguages.map(l => ({ language: l.language, fluency: l.fluency })),
    interests: includedInterests.map(i => ({ name: i.name, keywords: i.keywords })),
    references: includedReferences.map(r => ({ name: r.name, reference: r.reference })),
  }
}
```

### electron.vite.config.ts Addition

```typescript
// Source: https://electron-vite.org/guide/troubleshooting (official electron-vite docs)
main: {
  build: {
    externalizeDeps: {
      exclude: ['@jsonresume/jsonresume-theme-class', 'jsonresume-theme-even']
    }
  }
}
```

### electron-builder.yml asarUnpack Addition

```yaml
# Source: https://www.electron.build/configuration.html (official electron-builder docs)
asarUnpack:
  - resources/**
  - node_modules/better-sqlite3/**
  - node_modules/jsonresume-theme-even/**
  - node_modules/@jsonresume/jsonresume-theme-class/**
  - node_modules/jsonresume-theme-elegant/**
```

### Wait for Theme HTML Load in PDF Export

```typescript
// Source: Electron docs — webContents events
// For theme HTML (not print:ready signal available):
await new Promise<void>((resolve) => {
  win.webContents.once('did-finish-load', () => {
    setTimeout(resolve, 500) // settle delay for fonts/images
  })
  setTimeout(resolve, 5000) // safety timeout
})
```

### VariantPreview — layoutTemplate Prop Approach

```typescript
// VariantPreview receives layoutTemplate from VariantEditor
interface VariantPreviewProps {
  variantId: number
  layoutTemplate: string  // add this prop
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| CJS-only theme packages | Dual ESM/CJS (`jsonresume-theme-even`) and ESM-only (`@jsonresume/jsonresume-theme-class`) | Must use externalizeDeps.exclude or dynamic import — can't blindly require() |
| `print:ready` IPC signal (React-only) | `did-finish-load` event for bare HTML loads | Need two branches in PDF export handler |
| `loadURL(data:text/html,...)` for small HTML | Temp file approach for larger HTML | Theme HTML can be 50-100KB with inlined CSS |

**Deprecated/outdated:**
- Unscoped `jsonresume-theme-class` (v0.1.2): superseded by `@jsonresume/jsonresume-theme-class` v0.6.0 — use scoped package.

---

## Open Questions

1. **`jsonresume-theme-elegant` render function sync vs async**
   - What we know: The npm registry metadata shows `main: "index.js"`, no `"type"` field (CJS). GitHub source shows `module.exports = { render }`. The render function calls `renderResume()` from `./tpl/index` which uses Pug template rendering — likely synchronous.
   - What's unclear: Whether it returns a string or a Promise. Could not load the full source file.
   - Recommendation: After install, verify: `const result = themeElegant.render(testResume); console.log(typeof result, result instanceof Promise)`. Wrap with `Promise.resolve()` regardless — safe for both sync and async.

2. **`@jsonresume/jsonresume-theme-class` — `externalizeDeps.exclude` bundle size impact**
   - What we know: This package has dependencies: `@fluent/bundle`, `@fluent/langneg`, `handlebars`, `html-minifier`, `marked`. Bundling pulls all of these into the main process output.
   - What's unclear: Whether bundling causes any circular dependency errors via Rollup.
   - Recommendation: Run `build:unpack` and inspect output size. If bundle fails, fall back to dynamic `import()` at the call site, which works even for externalized ESM packages in Node 18+ (Electron 28+ supports ESM dynamic imports in main process).

3. **`did-finish-load` timing for theme CSS fonts**
   - What we know: Theme HTML may reference Google Fonts or web fonts (especially `jsonresume-theme-elegant`). In packaged Electron, network requests may fail or be slow.
   - What's unclear: Whether themes use web fonts or inline everything.
   - Recommendation: Verify each theme's generated HTML after integration. If web fonts are referenced, either increase settle delay to 1500ms or add `--print-background: true` and accept missing fonts in the PDF.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files, no test directories, no package.json test scripts |
| Config file | None — Wave 0 must create if tests are added |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements — Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THM-01 | Theme dropdown persists selection via setLayoutTemplate IPC | manual-only | N/A — no test framework | N/A |
| THM-02 | iframe renders theme HTML for non-professional variants | manual-only | N/A — no test framework | N/A |
| THM-03 | PDF export uses theme HTML when layoutTemplate != professional | manual-only | N/A — no test framework | N/A |

**Manual-only justification:** No test infrastructure exists in this project. All behavioral verification is done by running the app. The planner should include explicit manual verification steps for each requirement (install packages, switch dropdown, verify iframe shows, export PDF and inspect).

### Wave 0 Gaps

- No test infrastructure exists. This phase does not require creating one — manual verification per the existing project pattern is sufficient.

---

## Sources

### Primary (HIGH confidence)
- npm registry `jsonresume-theme-even` — version 0.26.1, dual CJS/ESM exports confirmed
- npm registry `@jsonresume/jsonresume-theme-class` — version 0.6.0, `"type": "module"`, ESM-only
- npm registry `jsonresume-theme-elegant` — version 1.16.1, CJS, `main: "index.js"`
- GitHub `jsonresume/jsonresume-theme-class` source — `export async function render(resume)` confirmed
- GitHub `mudassir0909/jsonresume-theme-elegant` source — `module.exports = { render }` confirmed
- https://electron-vite.org/guide/troubleshooting — `externalizeDeps.exclude` for ESM-only packages
- https://www.electron.build/configuration.html — asarUnpack glob pattern documentation
- https://jsonresume.org/schema — official resume.json schema field names

### Secondary (MEDIUM confidence)
- WebSearch cross-referenced with electron-vite docs: dynamic import as alternative to externalizeDeps.exclude
- WebSearch cross-referenced with Electron docs: `did-finish-load` event for non-React HTML loads
- GitHub issue electron-userland/electron-builder#6792: asarUnpack not auto-detected for non-native packages

### Tertiary (LOW confidence)
- `jsonresume-theme-elegant` render function sync/async status — could not load full source; inferred synchronous from module pattern and dependencies
- `@jsonresume/jsonresume-theme-class` Rollup bundling behavior — not directly tested; based on electron-vite documented behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack (theme packages, versions, render APIs): HIGH — verified from npm registry and GitHub source
- Architecture (ESM handling pattern, asarUnpack): HIGH — verified from official electron-vite and electron-builder docs
- buildResumeJson mapping: HIGH — derived from official schema + existing codebase patterns
- Pitfalls (layoutTemplate default, ESM errors, ASAR): HIGH — each backed by official docs or direct source inspection
- PDF BrowserWindow approach for theme HTML: MEDIUM — temp file approach is sound but did-finish-load timing is empirical

**Research date:** 2026-03-22
**Valid until:** 2026-06-22 (stable ecosystem — theme packages haven't changed in months/years; electron-vite and electron-builder APIs are stable)
