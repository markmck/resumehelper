# Stack Research

**Domain:** Desktop resume management app — PDF/DOCX export, resume templating, AI-assisted job matching
**Researched:** 2026-03-13 (v1.0), updated 2026-03-14 (v1.1 additions), updated 2026-03-23 (v2.0 AI analysis additions)
**Confidence:** MEDIUM (core choices HIGH, AI/vector layer MEDIUM due to alpha-stage packages)

> **Scope note:** This document covers ONLY the additional libraries needed on top of the existing
> scaffold. The existing stack (Electron 39, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM,
> better-sqlite3, electron-builder) is already decided and not re-researched here.

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
| `@ai-sdk/openai` | ^3.0.47 | OpenAI (GPT-4o, o1, etc.) provider adapter | Same interface as Anthropic adapter. User supplies their own API key. |
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

**Defer to v2.1:** If offline matching (no API key required) becomes a requirement, revisit
`@huggingface/transformers` + `sqlite-vec`. The v2.1 scope already includes "AI-powered
auto-variant generation" which would justify the embedding pipeline investment.

**Confidence:** HIGH — This is an architectural decision, not a library question. Confirmed by
reviewing AI SDK `generateObject` capabilities.

---

### Dark Theme Design System — CSS Custom Properties

**Feature:** Full UI redesign with a dark-mode token system. Stripe/Vercel-inspired, 4px grid,
semantic color tokens, consistent typography scale.

**Recommended: CSS custom properties on `:root` + Tailwind CSS 4 `@custom-variant` (no new library)**

The existing Tailwind CSS 4 installation provides everything needed. No new CSS-in-JS library or
design token tool is required.

**Approach:**

```css
/* src/renderer/src/assets/tokens.css — imported once in main.tsx */
:root {
  /* Surface tokens */
  --color-bg-base: #0a0a0a;
  --color-bg-surface: #111111;
  --color-bg-elevated: #1a1a1a;
  --color-bg-overlay: #222222;

  /* Text tokens */
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #525252;

  /* Accent tokens */
  --color-accent-primary: #3b82f6;
  --color-accent-hover: #2563eb;

  /* Border tokens */
  --color-border-subtle: #262626;
  --color-border-default: #404040;

  /* Spacing — 4px grid */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Typography */
  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
}
```

**Why NOT Style Dictionary or other token tools:**
Style Dictionary transforms design tokens stored in JSON/YAML into platform-specific outputs. This
app already has a design system document and HTML mockups defining the token system — the tokens are
known, not discovered. Introducing a build-time token transform pipeline adds complexity with no
payoff for a single-platform app.

**Why NOT Tailwind CSS `@theme` block for all tokens:**
The existing project has a documented constraint: "Inline styles over Tailwind for spacing — Tailwind
v4 utility classes not applying reliably." CSS custom properties consumed directly via inline styles
(`style={{ color: 'var(--color-text-primary)' }}`) are reliable regardless of Tailwind's utility
class application behavior. Define tokens as CSS custom properties, reference them via inline styles
for layout/spacing (consistent with existing pattern), use Tailwind classes only for structural
utilities where they reliably apply.

**Dark mode activation in Electron:**
Since this is a dark-first app (not a toggle), set `data-theme="dark"` on `<html>` unconditionally.
If a light mode is added later, use Tailwind v4's `@custom-variant dark` with attribute selector:

```css
/* In global CSS — only needed if light mode toggle is added */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

**Confidence:** HIGH — CSS custom properties are a baseline web platform feature. Tailwind v4
`@custom-variant` verified at https://tailwindcss.com/docs/dark-mode. The inline style constraint
is an existing documented project decision.

---

### Drag Reorder — Already Installed

**Feature:** Drag-to-reorder work experience cards on the redesigned Experience page.

`@dnd-kit/core` ^6.3.1 and `@dnd-kit/sortable` ^10.0.0 are **already installed** (confirmed in
`package.json`). No new installation needed. The v2.0 redesign extends the existing drag-reorder
pattern already used for bullet points to the card level.

**Confidence:** HIGH — Confirmed in package.json.

---

### Submission Pipeline Status — Database Only

**Feature:** Fixed pipeline stages (Applied → Phone Screen → Technical → Offer → Rejected) on each
submission record.

**No new library required.** This is a Drizzle schema change only:

```typescript
// Add to submissions table
status: text('status', {
  enum: ['applied', 'phone_screen', 'technical', 'offer', 'rejected']
}).notNull().default('applied'),
```

Drizzle ORM's enum constraint on a text column enforces valid values at the ORM layer. The status
column is a simple string — no state machine library needed.

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
| `electron-store` v11 | Pure ESM only — conflicts with electron-vite CJS main process bundle. Project does not use it yet; adding it now creates ESM/CJS friction | `safeStorage` + Drizzle for API key storage |
| `electron-conf` | No encryption support (stated explicitly in README). Unsuitable for storing API keys | `safeStorage` + Drizzle |
| Style Dictionary / design-token tools | Build-time token pipeline for multi-platform. Overkill for a single-platform app with known tokens | CSS custom properties directly in a `tokens.css` file |
| CSS-in-JS libraries (styled-components, emotion) | Runtime style injection conflicts with existing Tailwind + inline style pattern. No SSR requirement that would justify them | CSS custom properties + inline styles (existing pattern) |
| `react-query` / `@tanstack/react-query` | Caching library designed for network requests. All data in this app comes from local SQLite via IPC — no network latency to cache | Direct IPC calls with React state (existing pattern) |

---

## Version Compatibility (v2.0)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ai` ^6.0.135 | Node.js 18+, TypeScript 5.x | Electron 39 runs Node.js 22 — fully compatible. No Next.js required. |
| `@ai-sdk/anthropic` ^3.0.63 | `ai` ^6.x | Provider adapter — must match `ai` major version. |
| `@ai-sdk/openai` ^3.0.47 | `ai` ^6.x | Provider adapter — must match `ai` major version. |
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

**Approach:** In the Electron main process, after `dialog.showOpenDialog` picks the `.json` file,
read it with `fs.readFileSync`, `JSON.parse`, call `resumeSchema.validate()`, then map conforming
fields to internal Drizzle schema models. Validation errors should be collected and shown to the
user as import warnings (not hard failures) — partial imports are acceptable.

**No parsing library needed:** The resume.json format is plain JSON. `JSON.parse` is sufficient.
`resume-schema` adds only schema validation on top of that — it is not a parser.

**Confidence:** HIGH — Official jsonresume package. Schema is at stable v1.0.0. The validate()
API is well-documented and callback-based (no async complications for the main process).

**Alternative considered:** `@jsonresume/schema` (v1.2.1) — a newer scoped package from the same
org. Use `resume-schema` (the older package) instead: it is the canonical reference implementation
explicitly linked from the official schema docs, and its v1.0.0 stable tag signals intentional API
stability. The newer scoped package has no substantial API advantage for simple validation.

---

### resume.json Theme Rendering

**Feature:** Allow users to select an installed jsonresume theme, render their resume data through
it, and display or export the resulting HTML.

This is the most architecturally complex of the four new features. The theme contract is:

```javascript
// All jsonresume themes export a render() function:
import * as theme from 'jsonresume-theme-even';
const html = theme.render(resumeObject); // returns complete HTML string
```

The HTML string is self-contained (inlined CSS, no external requests required by well-written
themes). The challenge is loading theme modules at runtime in Electron's main process.

#### Theme Module Loading Strategy

**Recommended approach: bundle 2–3 curated themes at install time (not dynamic user-installed plugins)**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `jsonresume-theme-even` | ^0.14.x | First-party bundled theme — flat, modern layout, dual ESM/CJS builds | Most actively maintained community theme. Explicitly supports both ESM and CJS. Full CSS inlined in output. Wide adoption. |
| `jsonresume-theme-class` | latest | Official jsonresume org theme — self-contained, offline-safe | Published under the jsonresume org. Documented as "self-contained" and designed to work offline — directly relevant to an Electron desktop app. |

**Why NOT dynamic user-installed themes (require/import at arbitrary user-provided paths):**
Electron's main process CJS bundle (`electron-vite` default output) can call `require()` on a
known node_modules path, but arbitrary user-installed npm packages introduce: (1) path resolution
complexity on packaged apps where `node_modules` is bundled differently, (2) ESM/CJS conflicts —
many newer themes are ESM-only, requiring `import()` inside an async function which complicates
IPC handler design, (3) no sandboxing — a theme module runs in the main process with full Node.js
access. For v1.1, bundle 2–3 known-good themes. Expose a theme selector in UI. Dynamic plugin
loading is a v2+ concern.

**ESM caveat for theme packages:** `electron-vite` compiles the main process as CJS by default.
Themes that are ESM-only require `await import('jsonresume-theme-X')` inside an async IPC handler.
`jsonresume-theme-even` provides both CJS and ESM builds, making it safe for either approach.
Verify the target theme's `package.json` `"type"` field before adding it — if `"type": "module"`,
use dynamic `import()`.

#### Rendering the HTML in the UI

**Recommended approach: `<iframe srcdoc={html}>`**

Render the HTML string from the theme's `render()` call inside an `<iframe>` with the `srcdoc`
attribute. No new library needed — this is built-in browser/Electron behavior.

```tsx
// In the renderer process:
<iframe
  srcdoc={themeHtml}
  sandbox="allow-same-origin"
  style={{ width: '100%', height: '100%', border: 'none' }}
/>
```

The `sandbox="allow-same-origin"` attribute blocks scripts inside the theme HTML (appropriate
since theme HTML is CSS-only presentation) while allowing CSS to apply correctly.

**Why NOT a hidden BrowserWindow + loadURL:** A separate BrowserWindow for preview is heavyweight
(additional process, IPC round-trip, window management). The `srcdoc` approach renders inline in
the existing renderer process, which is sufficient for a preview panel. Reserve the separate-window
approach for PDF export (which already uses it via `printToPDF`).

**Why NOT dangerouslySetInnerHTML:** Theme HTML includes `<html>`, `<head>`, and `<body>` tags.
Injecting a full document tree into a React component via `innerHTML` produces malformed DOM.
An `<iframe>` is the correct container for a complete foreign HTML document.

**Confidence:** MEDIUM — The `srcdoc` + `sandbox` iframe pattern is well-established for
embedding foreign HTML. The specific behavior of Electron's renderer process with `srcdoc` iframes
matches standard Chromium. The ESM/CJS theme loading concern is a REAL issue that needs
verification per-theme during integration.

---

### Projects Section

**Feature:** New database entity (`projects` table) with the same toggleable-bullet pattern as
`work_experience`. CRUD UI in the Experience tab.

**No new libraries required.** This is entirely implemented using the existing stack:

- Drizzle ORM + better-sqlite3 → schema migration for the `projects` table
- React 19 + TypeScript → CRUD UI components (mirrors the existing work experience pattern)
- Tailwind CSS 4 / inline styles → styling (follow existing patterns)
- @dnd-kit/sortable → bullet reordering (already installed, already used for work experience)

The projects section is a database + UI concern, not a library concern.

---

### Tag Autocomplete

**Feature:** When typing a tag in skill or project tag inputs, suggest existing tags already in
the database.

**Recommended approach: custom component (no new library)**

The existing stack provides everything needed. The autocomplete behavior is:
1. On input change → query SQLite for all existing tag strings (via IPC → Drizzle)
2. Filter client-side with `Array.filter` + `String.includes` (or `startsWith`)
3. Render a `<ul>` dropdown with keyboard navigation (arrow keys, Enter, Escape)
4. On selection → append tag to field

This is a ~60–80 line component. The complexity does not justify a library dependency.

**Why NOT `react-tag-autocomplete` (v7.5.1):**
The library is solid (React 18+ compatible, accessible, well-maintained at v7.5.1), but it imposes
its own data model (`{ label, value }` tag objects with `id` fields) that conflicts with the app's
existing freeform string-based tag storage. Adapting the library's model to the DB schema requires
as much code as a custom implementation, with the added cost of a dependency that owns the input
styling and interaction model — difficult to reconcile with the existing Tailwind/inline style
approach.

**Why NOT `@headlessui/react` Combobox:**
Headless UI's Combobox is excellent for standalone combobox fields but is optimized for
single-selection scenarios. Tag inputs require multi-value selection with chip display, which
Headless UI does not handle out of the box. Would require significant wrapper code anyway.

**If a library becomes necessary** (e.g., accessibility requirements for WCAG compliance surface
during implementation), use `react-tag-autocomplete` v7.5.1. It is the only actively-maintained
library specifically designed for this pattern (React 18+, accessible, allows new tags via
`allowNew` prop).

**Confidence:** HIGH — Custom implementation is the established practice for tag inputs in
apps with existing design systems. The data model mismatch with `react-tag-autocomplete` is
a concrete technical reason, not a preference.

---

## Full Updated Installation

```bash
# v2.0 — AI analysis additions
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod

# v1.1 — resume.json import and themes (already installed per git history)
# npm install resume-schema
# npm install jsonresume-theme-even jsonresume-theme-class

# No new installs needed for:
# - Settings storage (safeStorage built-in + existing Drizzle)
# - Dark theme design system (CSS custom properties in tokens.css)
# - Drag reorder (@dnd-kit already at ^6.3.1 / ^10.0.0)
# - Submission pipeline status (Drizzle schema column only)
# - Projects section (uses existing Drizzle + @dnd-kit)
# - Tag autocomplete (custom component, no library)
```

---

## What NOT to Add (Cumulative)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `langchain` / `@langchain/core` | Heavyweight multi-step agent framework. v2.0 uses single structured calls — no chains | `ai` + `generateObject` |
| Raw `openai` or `@anthropic-ai/sdk` | Provider-specific; no structured output enforcement | `ai` + provider adapters |
| LiteLLM / OpenRouter | Requires a running server process | AI SDK in-process |
| `@huggingface/transformers` + `sqlite-vec` | 100MB–1GB model download; complex pipeline for no benefit over LLM-based analysis | LLM prompt-based semantic analysis |
| `electron-store` v11 | Pure ESM; conflicts with electron-vite CJS main process bundle | `safeStorage` + Drizzle |
| `electron-conf` | No encryption — unsuitable for API keys | `safeStorage` + Drizzle |
| Style Dictionary / design-token tools | Overkill for a single-platform app with known tokens | CSS custom properties in `tokens.css` |
| CSS-in-JS (styled-components, emotion) | Runtime injection conflicts with existing pattern | CSS custom properties + inline styles |
| `react-query` / TanStack Query | Designed for network request caching; all data is local SQLite via IPC | Direct IPC calls with React state |
| `@jsonresume/schema` | No API advantage over `resume-schema` for validation; less stable versioning history | `resume-schema` ^1.0.0 |
| Dynamic theme plugin system | Main process security liability; complex path resolution in packaged apps | Bundle curated themes at build time |
| `react-tag-autocomplete` | Data model conflicts with freeform string tags; owns styling | Custom ~70-line component |
| `dangerouslySetInnerHTML` for theme HTML | Cannot inject full `<html><head><body>` into React DOM | `<iframe srcdoc={html}>` |

---

## Version Compatibility (Cumulative)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ai` ^6.0.135 | Node.js 18+, TypeScript 5.x | Electron 39 runs Node.js 22 — fully compatible. |
| `@ai-sdk/anthropic` ^3.0.63 | `ai` ^6.x | Must match `ai` major version. |
| `@ai-sdk/openai` ^3.0.47 | `ai` ^6.x | Must match `ai` major version. |
| `zod` ^4.3.6 | `ai` ^6.x (peer dep) | AI SDK natively consumes Zod schemas. zod v4 is current major. |
| `electron.safeStorage` | Electron 15+ | Main process only. Available in Electron 39. |
| `resume-schema` ^1.0.0 | Node.js >=12, CJS | No native dependencies. Works in Electron main process. |
| `jsonresume-theme-even` ^0.14.x | Node.js >=14, ESM + CJS | Dual build — safe for electron-vite CJS main process. |
| `jsonresume-theme-class` latest | Node.js >=14 | Official jsonresume org theme. Verify module format after install. |
| `react-tag-autocomplete` 7.5.1 (if needed) | React 18+, React 19 compatible | TypeScript types included. `allowNew` prop enables freeform tags. |

---

## Existing Stack (Not Re-Researched)

The following remain unchanged from v1.0:

- **PDF export** — `webContents.printToPDF()` (built-in Electron)
- **DOCX export** — `docx` ^9.6.1
- **Drag reorder** — `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 (already installed)
- **Database** — Drizzle ORM ^0.45.1 + better-sqlite3 ^12.8.0

---

## Sources

- AI SDK official docs — https://ai-sdk.dev/docs/introduction — Node.js compatibility, provider list confirmed (HIGH confidence)
- AI SDK Node.js getting started — https://ai-sdk.dev/docs/getting-started/nodejs — install commands, v6 confirmed (HIGH confidence)
- AI SDK providers — https://ai-sdk.dev/docs/foundations/providers-and-models — full provider list confirmed (HIGH confidence)
- AI SDK generateObject — https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data — Zod schema integration confirmed (HIGH confidence)
- AI SDK v6 release — https://vercel.com/blog/ai-sdk-6 — Dec 2025 release, feature set confirmed (HIGH confidence)
- `ai` package version — `npm show ai version` → 6.0.135 (HIGH confidence, verified live)
- `@ai-sdk/anthropic` version — `npm show @ai-sdk/anthropic version` → 3.0.63 (HIGH confidence, verified live)
- `@ai-sdk/openai` version — `npm show @ai-sdk/openai version` → 3.0.47 (HIGH confidence, verified live)
- `zod` version — `npm show zod version` → 4.3.6 (HIGH confidence, verified live)
- Electron `safeStorage` API — https://www.electronjs.org/docs/latest/api/safe-storage — encrypt/decrypt API confirmed (HIGH confidence)
- `electron-conf` README — https://github.com/alex8088/electron-conf — "❌ No encryption" confirmed (HIGH confidence)
- `electron-store` README — https://github.com/sindresorhus/electron-store — ESM-only v11, Electron 30+ confirmed (HIGH confidence)
- Tailwind CSS 4 dark mode — https://tailwindcss.com/docs/dark-mode — `@custom-variant` approach confirmed (HIGH confidence)
- JSON Resume schema docs — https://docs.jsonresume.org/schema — validate() API confirmed (HIGH confidence)
- JSON Resume theme development — https://jsonresume.org/theme-development — render() signature confirmed (HIGH confidence)

---

*Stack research for: ResumeHelper — v1.0 export/AI + v1.1 resume.json import/themes + v2.0 AI analysis*
*Researched: 2026-03-13 (v1.0), 2026-03-14 (v1.1 additions), 2026-03-23 (v2.0 AI analysis additions)*
