# Stack Research

**Domain:** Desktop resume management app — PDF/DOCX export, resume templating, AI-assisted job matching
**Researched:** 2026-03-13 (v1.0), updated 2026-03-14 (v1.1 additions)
**Confidence:** MEDIUM (core choices HIGH, AI/vector layer MEDIUM due to alpha-stage packages)

> **Scope note:** This document covers ONLY the additional libraries needed on top of the existing
> scaffold. The existing stack (Electron 39, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM,
> better-sqlite3, electron-builder) is already decided and not re-researched here.

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
# v1.1 — new dependencies only

# resume.json schema validation
npm install resume-schema

# resume.json themes (bundle 2 curated themes)
npm install jsonresume-theme-even jsonresume-theme-class

# No new installs needed for:
# - Projects section (uses existing Drizzle + @dnd-kit)
# - Tag autocomplete (custom component, no library)
```

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@jsonresume/schema` | Newer scoped package with no API advantage over `resume-schema` for validation; less stable versioning history | `resume-schema` ^1.0.0 |
| Dynamic theme plugin system (runtime npm install) | Main process has full Node.js access; running user-provided code in-process is a security liability. Complex path resolution in packaged Electron apps. | Bundle 2–3 curated themes at build time |
| `react-tag-autocomplete` | Data model (`{label, value, id}`) conflicts with existing freeform string tags; library owns styling that conflicts with existing approach | Custom ~70-line component using existing React state patterns |
| `headlessui/react` Combobox for tags | Designed for single-select comboboxes, not multi-value tag inputs; would need extensive wrapper code | Custom component |
| `dangerouslySetInnerHTML` for theme HTML | Cannot inject a full `<html><head><body>` document into React DOM | `<iframe srcdoc={html}>` |
| ESM-only themes (e.g., themes with `"type": "module"` and no CJS fallback) | Requires async `import()` in IPC handlers; complicates main process CJS bundle | Prefer themes with dual ESM/CJS exports; `jsonresume-theme-even` has both |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `resume-schema` ^1.0.0 | Node.js >=12, CJS | No native dependencies. Works in Electron main process. Callback-based API — no async needed. |
| `jsonresume-theme-even` ^0.14.x | Node.js >=14, ESM + CJS | Dual build — safe for electron-vite CJS main process. Verify with `node -e "require('jsonresume-theme-even')"` after install. |
| `jsonresume-theme-class` latest | Node.js >=14 | Official jsonresume org theme. Self-contained output. Verify module format after install. |
| `react-tag-autocomplete` 7.5.1 (if needed) | React 18+, React 19 compatible (peerDeps say ">=18") | TypeScript types included. `allowNew` prop enables freeform tag creation. |

---

## Existing v1.0 Stack (Not Re-Researched)

The following remain unchanged from v1.0 research:

- **PDF export** — `webContents.printToPDF()` (built-in Electron)
- **DOCX export** — `docx` ^9.6.1
- **AI matching** — `@huggingface/transformers` ^3.8.1 + `sqlite-vec` ^0.1.7-alpha.10 (Option A) or `openai` ^4.x + `sqlite-vec` (Option B)

See prior research sections above for full rationale on those choices.

---

## Sources

- JSON Resume schema docs — https://docs.jsonresume.org/schema — validate() API confirmed (HIGH confidence)
- `resume-schema` npm — https://www.npmjs.com/package/resume-schema — v1.0.0 stable (HIGH confidence)
- JSON Resume theme development contract — https://jsonresume.org/theme-development — render() signature confirmed (HIGH confidence)
- `jsonresume-theme-even` GitHub — https://github.com/rbardini/jsonresume-theme-even — dual ESM/CJS confirmed (MEDIUM confidence — indirect, repo structure implied)
- `jsonresume-theme-class` GitHub — https://github.com/jsonresume/jsonresume-theme-class — self-contained, offline-safe (MEDIUM confidence)
- `react-tag-autocomplete` GitHub — https://github.com/i-like-robots/react-tag-autocomplete — v7.5.1, React 18+ peerDep (HIGH confidence)
- Electron ESM docs — https://www.electronjs.org/docs/latest/tutorial/esm — dynamic import() in main process (HIGH confidence)
- Electron IPC docs — https://www.electronjs.org/docs/latest/tutorial/ipc — srcdoc iframe rendering approach (MEDIUM confidence — indirect; standard browser behavior confirmed)

---

*Stack research for: ResumeHelper — v1.0 export/AI + v1.1 resume.json import, theme rendering, tag autocomplete*
*Researched: 2026-03-13 (v1.0), 2026-03-14 (v1.1 additions)*
