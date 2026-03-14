# Stack Research

**Domain:** Desktop resume management app — PDF/DOCX export, resume templating, AI-assisted job matching
**Researched:** 2026-03-13
**Confidence:** MEDIUM (core choices HIGH, AI/vector layer MEDIUM due to alpha-stage packages)

> **Scope note:** This document covers ONLY the additional libraries needed on top of the existing
> scaffold. The existing stack (Electron 39, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM,
> better-sqlite3, electron-builder) is already decided and not re-researched here.

---

## Recommended Stack

### PDF Export

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron `webContents.printToPDF()` | built-in (Electron 39) | Render React resume template → PDF | Zero dependencies, uses the same Chromium engine already bundled in Electron. Supports full CSS including Tailwind utility classes, backgrounds, and custom fonts. No binary download conflicts. |

**Approach:** Create a hidden `BrowserWindow` (`show: false`) in the main process, load an internal `file://` URL pointing to a dedicated resume-renderer renderer page, wait for `did-finish-load`, call `printToPDF({ printBackground: true, pageSize: 'A4' })`, and write the `Buffer` to disk via `dialog.showSaveDialog`. Expose this as an IPC handler.

**Confidence:** HIGH — This is the officially documented Electron approach. Verified against Electron docs and multiple real-world implementations.

**Why NOT Puppeteer:** Puppeteer requires its own Chromium binary download (150–400 MB), creating a conflict with Electron's already-bundled Chromium. Packaging an Electron app with Puppeteer is notoriously fragile — the compiled app fails to locate Chromium at runtime. The `puppeteer-core` workaround (pointing at Electron's Chromium) requires version-pinning gymnastics and has no reliable long-term support path.

**Why NOT jsPDF / PDFMake / PDFKit:** These libraries generate PDFs via a JavaScript draw API or JSON document definitions. They do not render HTML/CSS. Maintaining a parallel document-definition representation alongside your React template creates a two-source-of-truth problem. Any CSS layout change (spacing, fonts, columns) must be manually mirrored in the PDF definition. This approach does not scale for a template-driven system.

---

### DOCX Export

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `docx` | ^9.6.1 | Programmatically generate .docx files from resume data | Fully TypeScript-native with bundled types (no `@types/` needed). Declarative API maps cleanly to structured resume data (sections, paragraphs, tables, styles). Works in Node.js main process. 2.7M weekly downloads, actively maintained. |

**Approach:** Build the DOCX from resume data objects fetched via Drizzle — not by converting from HTML. Write a `ResumeDocxBuilder` class in the main process that reads the versioned resume snapshot from SQLite and constructs a `docx.Document` with typed section builders. Expose via IPC the same way as PDF.

**Confidence:** HIGH — npmjs.com confirms v9.6.1 published within days of research date. TypeScript types are first-class. Actively maintained GitHub repo.

**Why NOT `docxtemplater`:** Template-based approach requires maintaining a `.docx` Word template file as a binary asset in the repo. Any layout change requires editing the Word template externally, then re-committing the binary. For a programmers's tool where the template IS the product, a code-first API (`docx`) is more maintainable and version-control-friendly.

**Why NOT `html-docx-js` / `html-to-docx`:** HTML-to-DOCX converters produce poor output — DOCX is not HTML and the mapping is lossy. Tables, margins, and fonts frequently render incorrectly in Word. The `docx` library produces specification-compliant OOXML that Word, LibreOffice, and Google Docs handle correctly.

---

### AI-Assisted Job Matching

The project constraint is clear: AI suggests relevant existing experience items; it never generates or rephrases text. This means the core operation is **semantic similarity search** — not generative AI.

Two viable architectures:

#### Option A: Local Embeddings + sqlite-vec (Recommended for privacy-first)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@huggingface/transformers` | ^3.8.1 | Run embedding model locally in Node.js (ONNX/WASM runtime) | No API key required, no data leaves the machine. v3 replaced the `@xenova/transformers` package. Supports `all-MiniLM-L6-v2` model (22 MB) which produces 384-dim embeddings suitable for semantic similarity. Works in Node.js main process. |
| `sqlite-vec` | ^0.1.7-alpha.10 | Vector KNN search as a SQLite extension | Same database already used for all app data. No separate vector DB process. Loads into `better-sqlite3` via `sqliteVec.load(db)` — one-liner integration. MIT/Apache-2.0 licensed. |

**Model recommendation:** `Xenova/all-MiniLM-L6-v2` — 22 MB ONNX model, 384 dimensions, well-benchmarked for semantic sentence similarity. Download on first use and cache in Electron's `userData` directory.

**Confidence:** MEDIUM — `@huggingface/transformers` v3 is confirmed stable (released 2024, current v3.8.1). `sqlite-vec` is confirmed compatible with `better-sqlite3` and loads cleanly, but the npm package is still versioned as alpha (v0.1.7-alpha.10). Core functionality is stable and production-used, but the alpha label warrants a smoke test during integration.

**Operational flow:**
1. On experience item save → generate embedding → store in `vec_items` virtual table
2. On job description paste → generate embedding for the pasted text
3. SQL KNN query against `vec_items` → return top-N experience items by cosine distance
4. Display ranked suggestions; user selects which to include — no text is modified

#### Option B: OpenAI API Embeddings (Simpler, requires network + API key)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `openai` | ^4.x (current ~4.90) | Call `text-embedding-3-small` API to generate embeddings | Easier to set up than local ONNX models. `text-embedding-3-small` at 1536 dimensions outperforms local MiniLM on most benchmarks. |
| `sqlite-vec` | ^0.1.7-alpha.10 | Same vector storage as Option A | Same rationale |

**Confidence:** HIGH for the OpenAI SDK. MEDIUM for sqlite-vec (same alpha caveat).

**When to choose Option B:** If the user is comfortable providing an OpenAI API key and the app is used in environments with reliable internet access. Eliminates the 22 MB model download and ONNX startup latency.

**Recommendation:** Start with Option A (local). It matches the project's offline-first desktop nature and eliminates privacy concerns about pasting job descriptions to a third-party API. Option B can be added as a user-configurable setting later with minimal refactoring (swap the embedding provider, keep the sqlite-vec query layer unchanged).

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sqlite-vec` | ^0.1.7-alpha.10 | Vector KNN search in SQLite | Required for AI matching feature regardless of embedding provider |
| `@huggingface/transformers` | ^3.8.1 | Local ONNX embedding inference | Option A (local embeddings) only |
| `openai` | ^4.90.x | OpenAI API client for embeddings | Option B (cloud embeddings) only |

---

## Installation

```bash
# PDF export — no additional packages needed.
# It uses Electron's built-in webContents.printToPDF() API.

# DOCX export
npm install docx

# AI matching — Option A (local, recommended)
npm install @huggingface/transformers sqlite-vec

# AI matching — Option B (cloud, optional/alternative)
npm install openai sqlite-vec
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `webContents.printToPDF()` | Puppeteer | Never in an Electron app — binary conflicts make packaging unreliable |
| `webContents.printToPDF()` | jsPDF / PDFMake | Only if you need PDF generation in a pure browser context with no Electron runtime |
| `docx` (code-first) | `docxtemplater` (template-first) | If your team already has Word `.docx` templates maintained by non-developers and wants a mail-merge workflow |
| Local embeddings (`@huggingface/transformers`) | OpenAI API (`openai`) | If offline-first is not a priority and the user already has an OpenAI API key |
| `sqlite-vec` | Separate vector DB (Chroma, Qdrant, LanceDB) | Never for this use case — adding a separate DB process defeats the point of an offline desktop app |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `puppeteer` / `puppeteer-core` | Electron already bundles Chromium; Puppeteer downloads a second incompatible Chromium binary. Packaging consistently fails or produces a 400 MB+ app. | `webContents.printToPDF()` |
| `jsPDF` | Cannot render HTML/CSS. Requires manually re-implementing layout in a JS draw API, creating parallel maintenance burden with your React template. | `webContents.printToPDF()` |
| `html-docx-js` / `html-to-docx` | Lossy HTML→DOCX conversion. Produces documents with broken tables, wrong margins, and non-compliant OOXML that fails in some Word versions. | `docx` (code-first API) |
| `@xenova/transformers` | Deprecated. v3 of Transformers.js moved to `@huggingface/transformers`. The `@xenova/` package is no longer updated. | `@huggingface/transformers` |
| `sqlite-vss` | Predecessor to `sqlite-vec`. Depends on Faiss (C++ build complexity). `sqlite-vec` is the maintained successor, written in pure C with no dependencies. | `sqlite-vec` |
| Full LLM (GPT-4, Llama) for matching | The project explicitly prohibits AI-generated or AI-rephrased text. Using a generative LLM introduces the exact exaggeration risk the app is designed to eliminate. Semantic similarity via embeddings is the correct tool. | Embedding similarity only |

---

## Stack Patterns by Variant

**If user wants fully offline (no API keys ever):**
- Use `@huggingface/transformers` with `all-MiniLM-L6-v2` model
- Download model to `app.getPath('userData')/models/` on first AI feature use
- Disable remote model loading: `env.allowRemoteModels = false` after first download
- Accept ~500 ms cold-start latency on first embedding call per session (ONNX WASM warmup)

**If user provides OpenAI API key:**
- Use `openai` SDK with `text-embedding-3-small` model
- Store API key in Electron's `safeStorage` (encrypted with OS keychain)
- Rate-limit calls: debounce job description input before sending embedding request
- Keep sqlite-vec storage layer identical — only the embedding generation changes

**For PDF resume template rendering:**
- The dedicated resume renderer page should be a separate Electron renderer entry point (already supported by `electron-vite` multi-page config)
- Inject resume data via IPC `sendToFrame` or load as a JSON `file://` URL parameter
- Use `@media print` CSS for page-break control; Tailwind's `print:` variant is available in Tailwind CSS 4

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `sqlite-vec` ^0.1.7-alpha | `better-sqlite3` >=12 | Already on 12.8.0 — confirmed compatible. Load via `sqliteVec.load(db)`. |
| `@huggingface/transformers` ^3.8.1 | Node.js >=18, ESM | Electron 39 ships Node.js 20.x — compatible. Use dynamic `import()` in main process. ESM-only package. |
| `docx` ^9.6.1 | Node.js >=14 | No native dependencies. CJS/ESM compatible. Works in Electron main process. |
| `openai` ^4.90 | Node.js >=18 | Works in Electron main process. Do NOT call from renderer — API key would be exposed. |

**ESM note for `@huggingface/transformers`:** `electron-vite` compiles the main process as CJS by default. Use dynamic `import('@huggingface/transformers')` inside an async function, or configure the main process bundle to output ESM. This requires a `"type": "module"` consideration in `electron-vite` config — verify during integration.

---

## Sources

- Electron `webContents.printToPDF()` official docs — https://www.electronjs.org/docs/latest/api/web-contents (HIGH confidence)
- sqlite-vec Node.js integration docs — https://alexgarcia.xyz/sqlite-vec/js.html (HIGH confidence)
- `docx` npm package — https://www.npmjs.com/package/docx — v9.6.1 confirmed (HIGH confidence)
- `@huggingface/transformers` v3 announcement — https://huggingface.co/blog/transformersjs-v3 (HIGH confidence)
- `@huggingface/transformers` npm — https://www.npmjs.com/package/@huggingface/transformers — v3.8.1 current (HIGH confidence)
- `openai` npm package — https://www.npmjs.com/package/openai — v4.x current (HIGH confidence)
- Puppeteer + Electron conflict discussion — https://github.com/puppeteer/puppeteer/issues/2134 (MEDIUM confidence — issue thread, confirmed architectural incompatibility)
- sqlite-vec v0.1.0 stable release announcement — https://alexgarcia.xyz/blog/2024/sqlite-vec-stable-release/index.html (HIGH confidence)
- Transformers.js Electron fork (AnythingLLM) — https://github.com/Mintplex-Labs/transformersjs-electron (MEDIUM confidence — third-party implementation reference)
- OpenAI text-embedding-3-small model docs — https://platform.openai.com/docs/models/text-embedding-3-small (HIGH confidence)

---

*Stack research for: ResumeHelper — additional libraries for PDF/DOCX export and AI matching*
*Researched: 2026-03-13*
