# Stack Research

**Domain:** Desktop resume management app — PDF/DOCX export, resume templating, AI-assisted job matching
**Researched:** 2026-03-13 (v1.0), updated 2026-03-14 (v1.1 additions), updated 2026-03-23 (v2.0 AI analysis additions), updated 2026-03-25 (v2.1 template rendering additions)
**Confidence:** MEDIUM-HIGH for v2.1 section (core font/CSS claims backed by official docs and Chromium behavior; react-colorful React 19 compatibility is MEDIUM — untested, but hooks-only implementation has no known breakage)

---

## v2.1 Additions — Template Rendering and Export

These additions cover: 5 purpose-built HTML/CSS templates (Classic, Modern, Jake, Minimal, Executive), font loading for Lato/EB Garamond/Inter, CSS page break control, accent color picker, and DOCX per-template font selection. The base stack (Electron 39, React 19, TypeScript, Drizzle, SQLite, docx 9.6.1, electron-vite 5) is unchanged.

---

### Font Loading for Electron PDF Export (No New Library)

**Problem:** New templates need Lato (Modern/Minimal), EB Garamond (Executive), and Inter (Jake) in addition to the existing Calibri fallback. These fonts must render correctly in both the live preview pane and the hidden BrowserWindow used by `printToPDF`. Google Fonts CDN calls are unreliable in hidden BrowserWindows and fail offline.

**Recommended approach: bundle woff2 files in `src/renderer/public/fonts/`**

electron-vite copies `src/renderer/public/` as-is into the renderer's output root during build. Files placed there are served at `/` in dev (`http://localhost:5173/fonts/...`) and bundled into the output at the same relative path in production (`app://./fonts/...`). The hidden BrowserWindow for export shares the same Electron renderer origin, so `/fonts/...` paths resolve identically for preview and PDF export.

```
src/renderer/public/
  fonts/
    inter-regular.woff2
    inter-bold.woff2
    lato-light.woff2       (weight 300)
    lato-regular.woff2     (weight 400)
    lato-bold.woff2        (weight 700)
    eb-garamond-regular.woff2
    eb-garamond-italic.woff2
```

```css
/* Declare in a <style> block within each template component that needs it,
   OR in a shared fonts.css imported once in main.tsx */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Lato';
  src: url('/fonts/lato-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}
/* etc. */
```

**Font sources:** Google Fonts — all three are OFL-licensed (open source, redistribution allowed).
- Inter: https://fonts.google.com/specimen/Inter
- Lato: https://fonts.google.com/specimen/Lato
- EB Garamond: https://fonts.google.com/specimen/EB+Garamond

**Why "EB Garamond" and not "Garamond":** The system font named "Garamond" only exists on some Windows machines. EB Garamond is the open-source revival and is bundleable. Reference it as `font-family: 'EB Garamond'` in template CSS.

**Why NOT base64 inline fonts:** Causes "OTS parsing error: Failed to convert WOFF 2.0 font to SFNT" in some Chromium versions. Makes CSS files enormous and unmaintainable. No advantage over woff2 file references in an Electron app where the filesystem is always available.

**Why NOT Google Fonts @import:** Network-dependent. Fails if the user is offline. Race condition possible in the hidden BrowserWindow's 200ms settle window. Not reproducible across environments.

**PrintToPDF font settle time:** The existing `print:ready` IPC signal + 200ms settle delay in export.ts is sufficient for woff2 fonts to load in the Chromium renderer. Do not increase the timeout speculatively — only increase if visual testing shows font fallback actually occurring.

**Confidence: MEDIUM-HIGH** — electron-vite public asset behavior from official docs; woff2 path resolution in Electron is standard Chromium behavior; OTS error with base64 fonts from community reports.

---

### CSS Page Break Techniques for printToPDF

**Context:** Electron 39 uses Chromium ~130+. Modern Chromium has full CSS Fragmentation Level 3 support. The existing ProfessionalLayout already uses `pageBreakInside: 'avoid'` on job/project/education entries — this pattern is proven to work with the existing printToPDF call.

**Extend this pattern for new templates:**

```typescript
// On job/project/education/volunteer entry containers — prevent splitting mid-entry
style={{
  breakInside: 'avoid',       // CSS Fragmentation Level 3 (modern)
  pageBreakInside: 'avoid',   // CSS2.1 alias — include both for safety
}}

// On section heading (h2) — prevent heading orphaned at page bottom
style={{
  breakAfter: 'avoid',
  pageBreakAfter: 'avoid',
}}

// Forced page break (e.g., if Executive template needs a two-region layout)
style={{
  breakBefore: 'page',
  pageBreakBefore: 'always',
}}
```

**What does NOT work reliably:**

- `@page` CSS margin rules **conflict with** `printToPDF`'s `margins` option (confirmed Electron issue #8138). The existing export.ts uses `margins: { top: 0, bottom: 0, left: 0, right: 0 }`. Do NOT add `@page` rules to new templates — they cause layout drift between preview and PDF.
- `break-inside: avoid-page` — only `avoid` is reliably supported in Chromium's print engine; `avoid-page` is spec but not reliably implemented.
- `orphans`/`widows` CSS properties — apply only to text nodes inside block containers, not to block elements like sections. Useless for resume section control.

**Page break simulation in preview:** The live preview pane shows continuous scroll, not paginated pages. To show visible page break markers in preview (one of the v2.1 requirements), inject visual dividers at fixed page height intervals using JavaScript (`document.querySelector` after render, or a React `useEffect` that computes element positions relative to page height). This is a UI overlay — it does not affect printToPDF output.

**Confidence: MEDIUM** — CSS Fragmentation support confirmed via MDN and caniuse; `@page` conflict confirmed via Electron GitHub issue #8138; page-break-inside behavior in ProfessionalLayout is already validated in production.

---

### Accent Color Picker — react-colorful

**Add:** `react-colorful` 5.6.1

```bash
npm install react-colorful
```

**Usage in Variant Builder:**

```tsx
import { HexColorPicker, HexColorInput } from 'react-colorful'

<HexColorPicker color={accentColor} onChange={setAccentColor} />
<HexColorInput color={accentColor} onChange={setAccentColor} prefixed />
```

**Why react-colorful:**
- 2.8 KB — smallest available hex color picker
- Zero dependencies
- No CSS import required (since v5)
- Uses only stable React hooks — compatible with React 19 (no class component patterns, no deprecated lifecycle methods)
- Provides both a visual swatch picker and a text hex input

**Caveat:** Last npm publish was ~2022. The library is functionally complete and not actively developed, which is acceptable for a mature, stable UI primitive. If peer dependency warnings appear with React 19, the fallback is a native `<input type="color">` + a separate text input — both are natively supported in Chromium with no library needed.

**Why NOT react-color (older library):** Uses deprecated React class component patterns, last updated 2018, 25x larger bundle.

**Why NOT @uiw/react-color:** 5x larger, more components than needed for a single accent picker.

**Why NOT native `<input type="color">` as first choice:** The OS-native color picker chrome (the system color dialog) does not match the dark design system. It also lacks an inline hex text input companion without additional code.

**Confidence: MEDIUM** — version and features from npm registry; React 19 compatibility inferred from hooks-only implementation (no official compatibility test found).

---

### DOCX Per-Template Font Selection (No New Library)

The existing `docx` 9.6.1 implementation is sufficient. For v2.1, pass a `fontName` parameter to the DOCX builder to allow per-template font selection:

```typescript
// In export.ts — DOCX builder receives fontName from variant's template selection
new TextRun({ text: job.role, bold: true, size: 22, font: fontName })
```

**Recommended DOCX font mapping by template:**

| Template | HTML/PDF Font | DOCX Font | Rationale |
|----------|--------------|-----------|-----------|
| Classic | Times New Roman | Times New Roman | ATS-safe, built into Word |
| Modern | Calibri / Inter | Calibri | Inter not available in Word; Calibri is the ATS-standard |
| Jake | Calibri | Calibri | Same as Modern |
| Minimal | Calibri | Calibri | Same |
| Executive | EB Garamond | Garamond | Garamond is built into Word on Windows and macOS; ATS-safe |

**Font embedding in DOCX:** The `docx` library does not support font embedding (GitHub issue #239, open since 2019, no resolution). DOCX files reference fonts by name — Word loads them from the system. This is acceptable because:
1. All DOCX fonts listed above (Calibri, Times New Roman, Garamond) are built into Word on all supported platforms
2. ATS systems parse text content, not font rendering — font embedding is irrelevant for ATS compliance
3. Adding font embedding would require manually post-processing the DOCX ZIP structure — disproportionate complexity

**ATS compliance principles (already followed by existing implementation):**
- Use standard section headings: WORK EXPERIENCE, EDUCATION, SKILLS (not creative alternatives)
- Plain text bullets — no tables, text boxes, columns, or headers/footers with critical info
- Single-column layout for all DOCX output regardless of template visual style
- Font sizes: body text 10–11pt (size: 20–22 in docx), section headers 11–12pt (size: 22–24), name 14–16pt (size: 28–32)

**Confidence: HIGH** — docx font embedding limitation confirmed via official GitHub; ATS font recommendations from multiple 2025 ATS guides agree on Calibri/Times New Roman/Garamond as safe choices.

---

### Template Schema Changes (No New Library)

The existing `templateVariants` table needs two new columns to support per-variant template and accent color persistence:

```typescript
// In src/main/db/schema.ts — additions to templateVariants table
templateId: text('template_id').notNull().default('classic'),  // 'classic' | 'modern' | 'jake' | 'minimal' | 'executive'
accentColor: text('accent_color').notNull().default('#2563eb'),  // hex string
compactMargins: integer('compact_margins', { mode: 'boolean' }).notNull().default(false),
skillsDisplayMode: text('skills_display_mode').notNull().default('grouped'),  // 'grouped' | 'tags' | 'columns'
```

These are Drizzle schema additions only — no new library.

---

## v2.1 Installation

```bash
# New dependency
npm install react-colorful

# Font files — download from Google Fonts (OFL license), place in:
# src/renderer/public/fonts/
# Required files:
#   inter-regular.woff2, inter-bold.woff2
#   lato-light.woff2, lato-regular.woff2, lato-bold.woff2
#   eb-garamond-regular.woff2, eb-garamond-italic.woff2

# No new npm packages for:
# - Font loading (static files in public/)
# - Page break control (CSS inline styles, existing pattern)
# - DOCX font selection (parameter addition to existing docx builder)
# - Template schema (Drizzle column additions only)
```

---

## v2.1 What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| puppeteer / puppeteer-core | ~200MB Chrome download, redundant with existing Electron Chromium | Existing `webContents.printToPDF` |
| html2canvas + jsPDF | Rasterizes text to image — destroys ATS parsability and search-in-PDF | `printToPDF` (vector text output) |
| pdfmake / pdf-lib | Coordinate-based layout — templates would need a parallel programmatic implementation alongside the HTML/CSS version | `printToPDF` (renders existing HTML/CSS templates directly) |
| @react-pdf/renderer | Separate React renderer — templates would need two implementations (one for preview, one for PDF). Different CSS support from browser | Single template component + `printToPDF` |
| docxtemplater | Requires .docx template files on disk — same ESM/path problem that killed the old resume.json themes. Overkill for programmatic generation | `docx` 9.6.1 (already in use) |
| CSS @page rules in templates | Conflicts with printToPDF's `margins` option (Electron issue #8138) — causes layout drift | printToPDF `margins` option (already used) |
| Google Fonts @import CDN | Network-dependent, offline failure, race condition in hidden BrowserWindow | Bundled woff2 in `src/renderer/public/fonts/` |
| Base64 inline fonts | OTS parsing errors in some Chromium versions; unmaintainable | woff2 file references |
| vite-plugin-webfont-dl | Downloads fonts at build time but same result as manually placing woff2 files; adds a build-time plugin dependency | Manual download of woff2 files into public/fonts/ |
| react-color (old library) | Deprecated class component API, 2018-vintage, 25x larger than react-colorful | react-colorful |

---

## v2.1 Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-colorful@5.6.1 | React 19.2.x | Hooks only; no deprecated APIs; peer dep listed as React >=16.8.0 |
| docx@9.6.1 (existing) | Electron main process | `Packer.toBuffer()` confirmed working; font embedding not supported by design |
| woff2 font files | Electron 39 / Chromium 130+ | woff2 natively supported in Chromium — no loader or plugin needed |
| CSS break-inside/pageBreakInside | Chromium 130+ | Both legacy and modern properties work — use both for safety |

---

## v2.1 Sources

- electron-vite.org/guide/assets — public directory behavior for renderer process (MEDIUM confidence — official docs)
- github.com/electron/electron/issues/8138 — `@page` margin CSS conflicts with printToPDF margins option (MEDIUM confidence — confirmed issue)
- github.com/dolanmiu/docx/issues/239 — font embedding not supported in docx library (HIGH confidence — open issue, no progress since 2019)
- github.com/omgovich/react-colorful — react-colorful 5.6.1, zero deps, hooks API (HIGH confidence — official repo)
- developer.mozilla.org/en-US/docs/Web/CSS/break-inside — CSS Fragmentation support (HIGH confidence — MDN)
- caniuse.com/css-page-break — page-break property browser support tables (HIGH confidence)
- fonts.google.com/specimen/Inter, /Lato, /EB+Garamond — OFL license confirmed (HIGH confidence)
- ATS font guides 2025 — multiple sources (enhancv, jobscan, resumeoptimizerpro) agree on Calibri/Times New Roman/Garamond (MEDIUM confidence — marketing content but consistent across sources)

---

---

## v2.0 Additions

These features require the following new library decisions for the AI analysis milestone:
- LLM API integration (provider-agnostic: Claude, OpenAI, etc.)
- Job posting text parsing/extraction
- Match scoring and semantic keyword analysis
- Provider abstraction layer with user-supplied API keys
- Dark theme design system (CSS custom properties, 4px grid)
- Submission pipeline status tracking (fixed stages — database-only, no new library)

---

### LLM Integration — AI SDK (Vercel)

**Feature:** Send job posting text + resume data to an LLM, receive structured analysis (match
score, gaps, keyword coverage, rewrite suggestions) as typed TypeScript objects.

**Recommended: `ai` (AI SDK v6) + provider-specific adapters**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ai` | ^6.0.135 | AI SDK Core — provider-agnostic `generateText`, `generateObject`, `streamText`, `streamObject` with Zod schema enforcement | Released Dec 2025. Works in Node.js (no Next.js required). Single API surface for all providers. `generateObject` + Zod schema produces fully-typed, validated TypeScript objects from LLM responses — critical for reliable match scores and structured analysis output. |
| `@ai-sdk/anthropic` | ^3.0.63 | Anthropic Claude provider adapter | Drop-in provider. User supplies their own API key. Swap without changing call-site code. |
| `@ai-sdk/openai` | ^3.0.48 | OpenAI (GPT-4o, o1, etc.) provider adapter | Same interface as Anthropic adapter. User supplies their own API key. |
| `zod` | ^4.3.6 | Schema definition for structured LLM output + runtime validation | AI SDK natively consumes Zod schemas in `generateObject`. Already a peer dependency of AI SDK. Produces TypeScript types automatically — no manual type declarations for LLM output shapes. |

**Architecture pattern — all AI calls run in the Electron main process:**

```typescript
// src/main/handlers/ai.ts — IPC handler pattern
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const AnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  keywordHits: z.array(z.string()),
  gaps: z.array(z.string()),
  bulletSuggestions: z.array(z.object({
    bulletId: z.number(),
    original: z.string(),
    suggestion: z.string(),
  })),
});

ipcMain.handle('ai:analyze', async (_event, { jobText, resumeData, provider, apiKey }) => {
  const model = provider === 'anthropic'
    ? anthropic('claude-3-5-sonnet-20241022', { apiKey })
    : createOpenAI({ apiKey })('gpt-4o');

  const { object } = await generateObject({
    model,
    schema: AnalysisSchema,
    prompt: buildAnalysisPrompt(jobText, resumeData),
  });
  return object; // TypeScript type inferred from AnalysisSchema
});
```

**Why NOT raw `openai` or `@anthropic-ai/sdk` packages:**
Direct provider SDKs work but require parallel integration code for each provider. Provider
switching would require changing call-site code. AI SDK's `generateObject` + Zod schema enforces
structured output at the SDK level — raw SDKs leave JSON parsing and validation to the application.

**Why NOT LangChain:**
LangChain is a heavyweight abstraction layer (dozens of transitive dependencies) designed for
chaining multi-step agent pipelines. The v2.0 use case is a single structured generation call per
analysis — there is no chain. LangChain's overhead is unjustified for this scope.

**Why NOT LiteLLM or OpenRouter proxy:**
Both require running a separate server process. This is a local Electron app — no server. AI SDK
handles provider switching in-process.

**AI SDK Node.js compatibility:** Explicitly confirmed in official docs. Works in Node.js 18+.
Electron 39 runs Node.js 22 — fully compatible. No Next.js required.

**Confidence:** HIGH — AI SDK v6 is verified via official docs (ai-sdk.dev). Version confirmed via
`npm show ai version` (6.0.135). Provider adapter versions confirmed via npm. Node.js compatibility
confirmed at https://ai-sdk.dev/docs/getting-started/nodejs.

---

### Structured Output — Zod Integration with AI SDK

`generateObject` is the key function for reliable structured LLM output. It accepts a Zod schema
and returns a fully-typed, validated object. If the model returns malformed JSON or a schema
mismatch, it throws rather than silently returning bad data.

**Pattern for match scoring:**

```typescript
const { object: analysis } = await generateObject({
  model,
  schema: AnalysisSchema,
  mode: 'json', // force JSON mode where provider supports it
  prompt: '...',
});
// analysis is typed as z.infer<typeof AnalysisSchema>
```

`streamObject` is available for progressive UI updates (show partial results as they arrive).
For v2.0, `generateObject` is simpler and sufficient — analysis is a one-shot call.

**Confidence:** HIGH — `generateObject` API verified at https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data.

---

### Settings Persistence — API Keys and Provider Config

**Feature:** Store user-supplied API key(s) and AI provider selection between app launches.
Keys must survive app restarts. UI: Settings page with provider dropdown + API key input.

**Recommended: Electron `safeStorage` + Drizzle (existing DB)**

Do NOT add a new settings library. Use existing primitives:

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `electron.safeStorage` | built-in | Encrypt API key string using OS keychain (macOS Keychain, Windows DPAPI, Linux secret store) | Built into Electron — no new dependency. The only correct approach for storing user-supplied secrets in an Electron app. `safeStorage.encryptString(apiKey)` → `Buffer` → store as blob in SQLite. Decrypt on read with `safeStorage.decryptString(buffer)`. |
| Drizzle ORM + better-sqlite3 | existing | Persist provider choice, encrypted key blob, and model selection | Already in the stack. A `settings` table with key-value rows stores all AI config alongside existing app data. No separate config file needed. |

**Implementation sketch:**

```typescript
// Schema addition
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

// Write API key (main process only — safeStorage requires app ready)
const encrypted = safeStorage.encryptString(rawApiKey);
db.insert(settings).values({ key: 'ai_api_key', value: encrypted.toString('base64') }).run();

// Read API key
const row = db.select().from(settings).where(eq(settings.key, 'ai_api_key')).get();
const apiKey = safeStorage.decryptString(Buffer.from(row.value, 'base64'));
```

**Why NOT `electron-store` v11:**
electron-store v11 is pure ESM only. The electron-vite build compiles the main process as CJS by
default. Adding a pure-ESM package to the CJS main process bundle requires workarounds (marking as
external, dynamic import). The existing project does NOT use electron-store. Adding it purely for
settings would introduce an ESM/CJS friction point with no benefit — Drizzle + SQLite already
provides durable storage.

**Why NOT `electron-conf` v1.3.0:**
electron-conf explicitly does not support encryption ("❌ No encryption" per its own README). API
keys stored unencrypted in a JSON file are visible as plaintext on disk. This is unsuitable for
user-supplied secrets.

**Why NOT a plain JSON file with `fs`:**
Unencrypted API keys stored in a JSON file in `app.getPath('userData')` are readable by any process
on the machine. `safeStorage` uses OS-level encryption tied to the user's login — a meaningful
security improvement for negligible code cost.

**Confidence:** HIGH — `safeStorage` API verified at https://www.electronjs.org/docs/latest/api/safe-storage. Supported since Electron 15. Available in Electron 39.

---

### Semantic Keyword Matching — LLM Embeddings via AI SDK

**Feature:** Match resume keywords against job posting keywords semantically (not just exact string
match). Powers the 0–100 match score and gap analysis.

**Recommended: Delegate to LLM prompt engineering (no separate embedding library)**

For v2.0, semantic matching is handled by the LLM prompt itself rather than a separate embedding
pipeline. The LLM receives both the full resume text and job posting text and is instructed to
return a structured analysis including semantic matches. This approach:

1. Requires zero additional dependencies
2. Leverages the LLM's language understanding directly
3. Returns structured output (via `generateObject` + Zod schema) with match score, hits, and gaps
4. Is accurate enough for the v2.0 use case (assisted tailoring, not automated filtering)

**Why NOT a vector embedding pipeline (`sqlite-vec` + `@huggingface/transformers`):**
The v1.0 research mentioned `@huggingface/transformers` + `sqlite-vec` as "Option A". This approach
requires:
- Downloading embedding model weights (~100MB–1GB) at first run
- Running inference locally (CPU-bound, slow on first run)
- Vector index maintenance in SQLite
- Complex pipeline: text → embedding → cosine similarity → score

For v2.0, this pipeline adds significant complexity and first-run latency with no benefit over
the LLM-based approach — the user is already paying for API calls for the analysis itself. The
match score comes from the same LLM call that produces all other analysis, not a separate step.

**Confidence:** HIGH — This is an architectural decision, not a library question.

---

### Dark Theme Design System — CSS Custom Properties

**Feature:** Full UI redesign with a dark-mode token system. Stripe/Vercel-inspired, 4px grid,
semantic color tokens, consistent typography scale.

**Recommended: CSS custom properties on `:root` + Tailwind CSS 4 `@custom-variant` (no new library)**

The existing Tailwind CSS 4 installation provides everything needed. No new CSS-in-JS library or
design token tool is required.

**Why NOT Style Dictionary or other token tools:**
Style Dictionary transforms design tokens stored in JSON/YAML into platform-specific outputs. This
app already has a design system document and HTML mockups defining the token system — the tokens are
known, not discovered. Introducing a build-time token transform pipeline adds complexity with no
payoff for a single-platform app.

**Why NOT Tailwind CSS `@theme` block for all tokens:**
The existing project has a documented constraint: "Inline styles over Tailwind for spacing — Tailwind
v4 utility classes not applying reliably." CSS custom properties consumed directly via inline styles
(`style={{ color: 'var(--color-text-primary)' }}`) are reliable regardless of Tailwind's utility
class application behavior.

**Confidence:** HIGH — CSS custom properties are a baseline web platform feature.

---

### Drag Reorder — Already Installed

`@dnd-kit/core` ^6.3.1 and `@dnd-kit/sortable` ^10.0.0 are **already installed** (confirmed in
`package.json`). No new installation needed.

---

### Submission Pipeline Status — Database Only

**No new library required.** This is a Drizzle schema change only — a `status` text column with enum constraint on the submissions table.

**Confidence:** HIGH — This is a schema design decision, not a library question.

---

## v2.0 Installation

```bash
# AI SDK core + provider adapters
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod

# No new installs for:
# - Settings storage (safeStorage built-in + existing Drizzle)
# - Dark theme design system (CSS custom properties, no library)
# - Drag reorder (@dnd-kit already installed)
# - Submission pipeline (Drizzle schema change only)
```

---

## What NOT to Add (v2.0)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `langchain` / `@langchain/core` | Heavyweight multi-step agent framework (100+ transitive deps). Designed for chains; v2.0 uses single structured calls. Adds ~15MB+ to bundle | `ai` (AI SDK) + `generateObject` |
| Raw `openai` or `@anthropic-ai/sdk` | Provider-specific API surface — switching providers requires call-site changes. No structured output enforcement | `ai` + `@ai-sdk/openai` / `@ai-sdk/anthropic` |
| LiteLLM / OpenRouter | Requires a running server process. Incompatible with local Electron app architecture | AI SDK handles provider switching in-process |
| `@huggingface/transformers` + `sqlite-vec` for embeddings | Downloads 100MB–1GB model weights. CPU-bound inference. Adds a separate embedding pipeline when the LLM call already performs semantic analysis | LLM prompt-based semantic analysis via `generateObject` |
| `electron-store` v11 | Pure ESM only — conflicts with electron-vite CJS main process bundle | `safeStorage` + Drizzle for API key storage |
| `electron-conf` | No encryption support (stated explicitly in README). Unsuitable for storing API keys | `safeStorage` + Drizzle |
| Style Dictionary / design-token tools | Build-time token pipeline for multi-platform. Overkill for a single-platform app with known tokens | CSS custom properties directly in a `tokens.css` file |
| CSS-in-JS libraries (styled-components, emotion) | Runtime style injection conflicts with existing Tailwind + inline style pattern | CSS custom properties + inline styles (existing pattern) |
| `react-query` / `@tanstack/react-query` | Caching library designed for network requests. All data in this app comes from local SQLite via IPC — no network latency to cache | Direct IPC calls with React state (existing pattern) |

---

## Version Compatibility (v2.0)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ai` ^6.0.135 | Node.js 18+, TypeScript 5.x | Electron 39 runs Node.js 22 — fully compatible. No Next.js required. |
| `@ai-sdk/anthropic` ^3.0.63 | `ai` ^6.x | Provider adapter — must match `ai` major version. |
| `@ai-sdk/openai` ^3.0.48 | `ai` ^6.x | Provider adapter — must match `ai` major version. |
| `zod` ^4.3.6 | `ai` ^6.x (peer dep) | AI SDK natively consumes Zod schemas. zod v4 is the current major. |
| `electron.safeStorage` | Electron 15+ | Available in Electron 39. Main process only — cannot call from renderer or preload. |

---

## v1.1 Additions

These four new features require the following new library decisions. The existing stack handles
everything else.

---

### resume.json Import — Parsing and Validation

**Feature:** Read a `.json` file from disk and map it into the app's internal schema.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `resume-schema` | ^1.0.0 | Validate imported JSON against the official JSON Resume schema before mapping | Authoritative — maintained by the jsonresume org. Wraps `jsonschema` validation internally. Calling `resumeSchema.validate(obj, callback)` gives a structured error list that can surface user-readable import warnings. Zero-dependency validator. |

**No parsing library needed:** The resume.json format is plain JSON. `JSON.parse` is sufficient.
`resume-schema` adds only schema validation on top of that — it is not a parser.

**Confidence:** HIGH — Official jsonresume package. Schema is at stable v1.0.0.

**Alternative considered:** `@jsonresume/schema` (v1.2.1) — use `resume-schema` instead: it is the canonical reference implementation explicitly linked from the official schema docs.

---

### resume.json Theme Rendering

**Feature:** Allow users to select an installed jsonresume theme, render their resume data through
it, and display or export the resulting HTML.

The theme contract is:

```javascript
import * as theme from 'jsonresume-theme-even';
const html = theme.render(resumeObject); // returns complete HTML string
```

#### Theme Module Loading Strategy

**Recommended approach: bundle 2–3 curated themes at install time**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `jsonresume-theme-even` | ^0.14.x | First-party bundled theme — flat, modern layout, dual ESM/CJS builds | Most actively maintained community theme. Explicitly supports both ESM and CJS. |
| `jsonresume-theme-class` | latest | Official jsonresume org theme — self-contained, offline-safe | Published under the jsonresume org. Designed to work offline. |

**ESM caveat for theme packages:** `electron-vite` compiles the main process as CJS by default.
Themes that are ESM-only require `await import('jsonresume-theme-X')` inside an async IPC handler.
Verify the target theme's `package.json` `"type"` field before adding it.

#### Rendering the HTML in the UI

**Recommended approach: `<iframe srcdoc={html}>`**

```tsx
<iframe
  srcdoc={themeHtml}
  sandbox="allow-same-origin"
  style={{ width: '100%', height: '100%', border: 'none' }}
/>
```

**Confidence:** MEDIUM — The `srcdoc` + `sandbox` iframe pattern is well-established.

---

### Projects Section

**No new libraries required.** Uses existing Drizzle + @dnd-kit + React.

---

### Tag Autocomplete

**Recommended approach: custom component (no new library)**

A ~60–80 line component using React state + IPC query. The autocomplete behavior does not justify a library dependency. The data model (freeform strings) conflicts with `react-tag-autocomplete`'s `{ label, value }` object model.

---

## Full Updated Installation

```bash
# v2.1 — Template rendering additions
npm install react-colorful
# + manually place woff2 font files in src/renderer/public/fonts/

# v2.0 — AI analysis additions
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod

# v1.1 — resume.json import and themes (already installed)
# npm install resume-schema jsonresume-theme-even jsonresume-theme-class
```

---

## What NOT to Add (Cumulative)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| puppeteer / puppeteer-core | ~200MB Chrome download, redundant with existing Electron Chromium | `webContents.printToPDF` (existing) |
| html2canvas + jsPDF | Rasterizes text — destroys ATS parsability | `printToPDF` (vector output) |
| pdfmake / pdf-lib | Coordinate-based layout — requires parallel implementation alongside HTML/CSS templates | `printToPDF` |
| @react-pdf/renderer | Separate React renderer — templates need two implementations | Single template + `printToPDF` |
| docxtemplater | Requires .docx template files on disk; path resolution issues in packaged Electron apps | `docx` 9.6.1 (existing) |
| CSS `@page` rules in templates | Conflicts with `printToPDF` margins option (Electron issue #8138) | `printToPDF` margins option |
| Google Fonts @import CDN | Network-dependent, offline failure, race condition in hidden BrowserWindow | Bundled woff2 in public/fonts/ |
| Base64 inline fonts | OTS parsing errors in Chromium; unmaintainable | woff2 file references |
| `langchain` / `@langchain/core` | Heavyweight multi-step agent framework. Single structured calls need no chain | `ai` + `generateObject` |
| Raw `openai` or `@anthropic-ai/sdk` | Provider-specific; no structured output enforcement | `ai` + provider adapters |
| `@huggingface/transformers` + `sqlite-vec` | 100MB–1GB model download; complex pipeline | LLM prompt-based semantic analysis |
| `electron-store` v11 | Pure ESM — conflicts with electron-vite CJS main process | `safeStorage` + Drizzle |
| `electron-conf` | No encryption — unsuitable for API keys | `safeStorage` + Drizzle |
| Style Dictionary / design-token tools | Overkill for single-platform app with known tokens | CSS custom properties in `tokens.css` |
| CSS-in-JS (styled-components, emotion) | Runtime injection conflicts with existing pattern | CSS custom properties + inline styles |
| `react-query` / TanStack Query | Caching for network requests — all data is local SQLite | Direct IPC calls with React state |
| `react-tag-autocomplete` | Data model conflicts with freeform string tags | Custom ~70-line component |
| `dangerouslySetInnerHTML` for theme HTML | Cannot inject full `<html><head><body>` into React DOM | `<iframe srcdoc={html}>` |
| react-color (old library) | Deprecated class components, 2018-vintage, 25x larger | react-colorful |
| vite-plugin-webfont-dl | Same outcome as placing woff2 manually; adds build plugin complexity | Manual woff2 download into public/fonts/ |

---

## Version Compatibility (Cumulative)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-colorful@5.6.1 | React 19.2.x | Hooks only; peer dep >=16.8.0; no deprecated APIs |
| `ai` ^6.0.135 | Node.js 18+, TypeScript 5.x | Electron 39 runs Node.js 22 — fully compatible. |
| `@ai-sdk/anthropic` ^3.0.63 | `ai` ^6.x | Must match `ai` major version. |
| `@ai-sdk/openai` ^3.0.48 | `ai` ^6.x | Must match `ai` major version. |
| `zod` ^4.3.6 | `ai` ^6.x (peer dep) | zod v4 is current major. |
| `electron.safeStorage` | Electron 15+ | Main process only. Available in Electron 39. |
| `resume-schema` ^1.0.0 | Node.js >=12, CJS | Works in Electron main process. |
| `jsonresume-theme-even` ^0.14.x | Node.js >=14, ESM + CJS | Dual build — safe for electron-vite CJS main process. |
| `jsonresume-theme-class` latest | Node.js >=14 | Official jsonresume org theme. |
| woff2 font files | Electron 39 / Chromium 130+ | Natively supported; no loader needed. |
| CSS break-inside/pageBreakInside | Chromium 130+ | Use both legacy and modern — confirmed working. |

---

## Sources

**v2.1:**
- electron-vite.org/guide/assets — public directory behavior for renderer (MEDIUM confidence)
- github.com/electron/electron/issues/8138 — @page CSS conflicts with printToPDF margins (MEDIUM confidence)
- github.com/dolanmiu/docx/issues/239 — font embedding not supported in docx (HIGH confidence)
- github.com/omgovich/react-colorful — react-colorful 5.6.1 features (HIGH confidence)
- developer.mozilla.org/en-US/docs/Web/CSS/break-inside — CSS Fragmentation (HIGH confidence)
- caniuse.com/css-page-break — page-break property browser support (HIGH confidence)
- fonts.google.com — OFL license for Inter, Lato, EB Garamond (HIGH confidence)

**v2.0:**
- AI SDK official docs — https://ai-sdk.dev/docs/introduction (HIGH confidence)
- AI SDK generateObject — https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data (HIGH confidence)
- Electron `safeStorage` API — https://www.electronjs.org/docs/latest/api/safe-storage (HIGH confidence)

**v1.1:**
- JSON Resume schema docs — https://docs.jsonresume.org/schema (HIGH confidence)
- JSON Resume theme development — https://jsonresume.org/theme-development (HIGH confidence)

---

*Stack research for: ResumeHelper — v1.0 export + v1.1 resume.json import/themes + v2.0 AI analysis + v2.1 template rendering*
*Researched: 2026-03-13 (v1.0), 2026-03-14 (v1.1), 2026-03-23 (v2.0), 2026-03-25 (v2.1)*
