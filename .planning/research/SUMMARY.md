# Project Research Summary

**Project:** ResumeHelper
**Domain:** Desktop resume management and job application tracking (Electron + React + SQLite)
**Researched:** 2026-03-13
**Confidence:** MEDIUM-HIGH (stack HIGH, features HIGH, architecture HIGH, AI/vector layer MEDIUM)

## Executive Summary

ResumeHelper is a local-first Electron desktop app for managing structured resume content, maintaining named template variants, tracking job submissions, and optionally using semantic AI to surface relevant experience items for a given job description. The product's defining constraint — AI suggests which existing experience items to include, but never generates or rewrites text — is both the core differentiator against cloud tools like Teal and Huntr and the primary architectural invariant that must be enforced at the type level, not just by convention. The existing scaffold (Electron 39, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, better-sqlite3, electron-builder) is already in place; only three additional libraries are required: `docx` for DOCX export, `sqlite-vec` for vector KNN search, and either `@huggingface/transformers` (local, offline-first) or `openai` (cloud, simpler) for embedding generation.

The recommended architecture is a strict three-layer structure: a React renderer communicating only through a typed `window.api` contextBridge, a thin IPC handler layer in the main process that dispatches to domain services, and a Drizzle/better-sqlite3 database layer that is the sole source of truth. PDF export uses Electron's built-in `webContents.printToPDF()` — no Puppeteer, no extra Chromium binary, no packaging conflicts. The schema must be designed upfront with two non-negotiable patterns: template variants store references (IDs) to experience items, never text copies; and every submission stores a serialized JSON snapshot of the resume content at the moment of submission, making the live template freely editable without corrupting the audit trail.

The two highest-risk phases are the initial database schema (getting the snapshot and reference patterns right before any UI is built) and the AI integration (enforcing the "no text generation" contract at the function signature level). Both risks are fully preventable with the patterns identified in research. The recommended build order — experience database, template variants, submission tracking, exports, AI matching — follows strict dependency ordering and matches the feature priority matrix from competitor analysis.

---

## Key Findings

### Recommended Stack

The existing scaffold covers all core infrastructure. Three additional packages are needed and have clear choices. For PDF export, `webContents.printToPDF()` is built into Electron 39 and requires zero new dependencies — Puppeteer must be explicitly avoided because it conflicts with Electron's bundled Chromium at packaging time. For DOCX export, the `docx` library (v9.6.1, TypeScript-native, 2.7M weekly downloads) generates spec-compliant OOXML from a code-first API; HTML-to-DOCX converters produce unusable output and must be avoided. For AI matching, the recommended path is Option A: `@huggingface/transformers` v3.8.1 with the 22 MB `all-MiniLM-L6-v2` ONNX model for local, offline embedding generation, combined with `sqlite-vec` (v0.1.7-alpha.10) for KNN search within the existing SQLite database. Option B (OpenAI API) is a valid alternative that can be added as a configurable swap later without changing the sqlite-vec query layer.

**Core technologies:**
- `webContents.printToPDF()` (built-in): PDF export — zero dependencies, uses already-bundled Chromium, full CSS/Tailwind support
- `docx` v9.6.1: DOCX export — TypeScript-native, code-first API maps directly to structured resume data
- `@huggingface/transformers` v3.8.1: Local embedding inference — offline-first, no API key, 22 MB model cached in userData
- `sqlite-vec` v0.1.7-alpha.10: Vector KNN search — integrates with existing better-sqlite3 in one line, no separate process
- `openai` v4.90.x (optional alternative): Cloud embedding — simpler setup, higher accuracy, requires API key and network access

**Critical version notes:**
- `@huggingface/transformers` is ESM-only; requires dynamic `import()` in the main process or ESM output config in electron-vite
- `sqlite-vec` alpha label warrants a smoke test during integration despite being production-used
- `better-sqlite3` >=12 (already at 12.8.0) is confirmed compatible with `sqlite-vec`

### Expected Features

Competitor analysis (Teal, Huntr, Careerflow) confirms the feature dependency chain: experience database unlocks everything else. The product's local-first nature and strict AI boundary are genuine differentiators — all three major competitors are cloud-only and all three rewrite resume text with AI.

**Must have for v1 launch (P1):**
- Experience database (jobs, skills, projects, education) — foundation; nothing else is possible without it
- Template variant creation and management (named role archetypes like "Frontend Focus") — P1
- Per-job customization via experience item toggle — core daily workflow; must be fast
- PDF export (text-based, ATS-safe layout) — required for actual job applications
- Submission log (company, role, date, which variant) — validates tracking value prop
- Pipeline status tracking (Applied, Phone Screen, Interview, Offer, Rejected/Withdrawn) — validates visibility value prop
- Application dashboard (kanban or table view of all submissions) — closes the loop

**Should have after validation (P2):**
- DOCX export — add when users report ATS rejection of PDF; important but non-blocking for v1
- AI experience matching — add once experience database is rich enough to make suggestions meaningful
- Resume version snapshot at submission (frozen JSON content) — substantially increases trust; medium complexity
- Pipeline stage notes and dates — richer history beyond status alone

**Defer to v2+ (P3):**
- ATS-safety indicators on export — medium complexity for moderate value; maintain ATS knowledge burden
- Resume analytics (which variant gets responses) — requires >20 submissions to be meaningful
- LinkedIn PDF import — fragile parsing; only worth it if data-entry friction is cited as the top blocker

**Anti-features to explicitly document and reject:**
- AI-generated or AI-rewritten resume text — defeats the product's core promise
- Cover letter generation — out of scope; AI-generated cover letters are already recruiter noise
- Cloud sync / multi-device — contradicts local-first value proposition; offer SQLite export/import instead
- Job board scraping or auto-apply — encourages spray-and-pray behavior; keep applications intentional

### Architecture Approach

The architecture follows a strict three-layer Electron pattern across five domain services. The renderer process contains three page-level views (Experience Library, Template Builder, Submission Board) that communicate exclusively through a typed `window.api` contextBridge. The main process hosts a thin IPC handler layer (one file per domain, registered via a single `registerAllHandlers()` call) that delegates to domain services. All database access happens in services via a single Drizzle singleton; the renderer never touches the database. The schema has five tables ordered by foreign key dependency: `experience_items` → `template_variants` → `template_variant_items` → `submissions` → `ai_match_sessions`. Two patterns are architecturally mandatory: template variants reference experience items by ID (never store text copies), and every submission stores a serialized JSON snapshot of content at submission time.

**Major components:**
1. **Experience Library (UI + ExperienceService)** — CRUD for all raw experience data; the source of truth for all resume content
2. **Template Builder (UI + TemplateService)** — named variants that reference experience items; snapshot generation at submission time
3. **Submission Board (UI + SubmissionService)** — submission logging, pipeline status transitions, frozen snapshot retrieval
4. **ExportService** — PDF via `webContents.printToPDF()` in a hidden BrowserWindow; DOCX via `docx` library in main process
5. **AIMatchService** — returns `{ id, score, reason }[]` only; reads experience items, never writes; runs entirely in main process to protect API keys

### Critical Pitfalls

1. **Mutable resume state after submission** — store a serialized JSON snapshot (`resume_snapshot TEXT NOT NULL`) on the submissions table at insert time; the live template must remain freely editable without corrupting historical records; this cannot be retrofitted cheaply after the schema is built

2. **Template variants storing text copies instead of ID references** — template_variant_items must join to experience_items for current text on every render; text columns on the variant table create an N×M maintenance problem where edits to experience items must be manually propagated across all templates

3. **AI boundary erosion** — enforce the "no text generation" contract at the TypeScript function signature level: `AIMatchService.match()` must return `{ id: number; score: number; reason: string }[]` with no text field; document this as an architectural decision record so future contributors cannot accidentally add "helpful" rewriting features

4. **SQLite native module packaging failure** — `better-sqlite3` must be rebuilt against Electron's Node ABI (`electron-rebuild` in postinstall); ASAR must exclude the native module (`asarUnpack: ["**/better-sqlite3/**"]`); database path must use `app.getPath('userData')`, never `__dirname`; the packaged binary (not just `npm start`) must be tested on a clean machine

5. **Drizzle migrations never running for end users** — `drizzle-kit push` is dev-only; `migrate()` must be called programmatically in the main process startup sequence before any query runs; ship migration files inside the app package (unpacked from ASAR); test both fresh install and upgrade paths with the packaged binary

---

## Implications for Roadmap

Based on combined research, the feature dependency chain, and the pitfall-to-phase mapping, a five-phase structure is recommended. This order is not arbitrary — each phase is a hard prerequisite for the next.

### Phase 1: Foundation — Database Schema + Experience Library

**Rationale:** The feature dependency graph has a single root: `experience_items`. Without a populated experience database, there is nothing to build templates from, nothing to snapshot, nothing for AI to match against, and nothing to export. The schema must also be fully designed now — including the snapshot column and the ID-reference pattern for template items — because retrofitting these after the UI is built is high-cost (see Pitfalls 1 and 2).

**Delivers:** Working schema with all five tables, Drizzle migrations running at startup, full CRUD for experience items (jobs, skills, projects, education) via the Experience Library UI, IPC handler infrastructure established.

**Addresses features:** Experience database (P1).

**Avoids pitfalls:** Mutable submission state (design snapshot column now), template text copies (design ID-reference join now), SQLite packaging failure (establish `asarUnpack` and `userData` path), Drizzle migration startup runner (establish `migrate()` call now), IPC channel sprawl (establish handler module structure now).

**Research flag:** Standard patterns — Drizzle schema design and Electron IPC setup are well-documented. No phase-level research needed; follow patterns in ARCHITECTURE.md directly.

---

### Phase 2: Template Variants + Builder UI

**Rationale:** Template variants are the compositing layer that transforms raw experience items into targeted resume views. Per-job customization (the core daily workflow) depends on this layer. Submission snapshots also require a populated template variant to serialize at submission time.

**Delivers:** Named template variant creation (e.g., "Frontend Focus", "Fullstack"), experience item toggle/reorder within a variant, live preview of the composed resume, clone-a-variant for per-job customization. TemplateService including `buildSnapshot()` method.

**Addresses features:** Template variants (P1), per-job customization (P1).

**Avoids pitfalls:** Template variant text copies (verify schema: no text columns on variant table, only foreign keys to experience_items).

**Research flag:** Standard patterns — join table design and toggle UI are well-documented. No phase-level research needed.

---

### Phase 3: Submission Tracking + Pipeline Board

**Rationale:** Submission tracking depends on both experience items (Phase 1) and template variants (Phase 2) existing. The snapshot at submission time serializes the composed variant state — both must be complete. Pipeline tracking is meaningless without a submission log to track.

**Delivers:** Submission logging (company, role, date, template variant, frozen JSON snapshot), pipeline status tracking (Applied → Phone Screen → Interview → Offer → Rejected/Withdrawn), application dashboard with kanban or table view, ability to view the exact resume snapshot that was submitted.

**Addresses features:** Submission log (P1), pipeline status (P1), application dashboard (P1), resume version snapshot (P2 — implement here since SubmissionService.create() is already being written).

**Avoids pitfalls:** Mutable submission state (verify: `resume_snapshot TEXT NOT NULL` stored at insert time, template FK is soft reference only).

**Research flag:** Standard patterns — submission log and kanban pipeline are well-established UI patterns. No phase-level research needed.

---

### Phase 4: Export (PDF + DOCX)

**Rationale:** Export reads from template variants and submission snapshots, both of which are complete after Phase 3. PDF and DOCX can be built in parallel as independent sub-tasks. The preview-first approach (build live preview pane before triggering export) prevents the PDF overflow pitfall.

**Delivers:** PDF export via `webContents.printToPDF()` from a hidden BrowserWindow renderer page, DOCX export via `docx` library in main process, live preview pane in Template Builder showing rendered resume before export, export from both the live template and historical submission snapshots.

**Addresses features:** PDF export (P1), DOCX export (P2).

**Avoids pitfalls:** PDF layout overflow (build preview UI first, test with min/max content resumes), DOCX formatting destruction (use `docx` code-first API, not HTML-to-DOCX converters), Puppeteer conflict (use `webContents.printToPDF()` exclusively).

**Research flag:** Needs validation — the hidden BrowserWindow PDF renderer approach requires a multi-page electron-vite config for the resume renderer entry point. Verify electron-vite multi-page setup and `@media print` / Tailwind `print:` variant behavior during this phase. Low risk but worth a targeted spike.

---

### Phase 5: AI Experience Matching

**Rationale:** AI matching augments the template-building workflow but has no blocking dependencies of its own — it reads from the experience database (Phase 1) and surfaces suggestions in the Template Builder (Phase 2). Building it last ensures the experience database is populated enough to make suggestions meaningful, and allows the AI contract to be implemented with a complete understanding of the data model.

**Delivers:** Job description paste input, semantic embedding generation (local via `@huggingface/transformers` + `all-MiniLM-L6-v2`, or cloud via OpenAI API), KNN similarity search via `sqlite-vec` against stored experience item embeddings, ranked suggestion list with relevance rationale displayed in Template Builder, user toggle to include/exclude suggested items (AI never modifies content).

**Addresses features:** AI experience matching (P2).

**Avoids pitfalls:** AI boundary erosion (enforce `{ id, score, reason }[]` return type at service signature; no text modification path), AI API key security (store in `safeStorage` or `electron-store`, never in renderer or database).

**Research flag:** Needs deeper research during planning — `@huggingface/transformers` v3's ESM-only nature in an electron-vite CJS main process requires validation (dynamic `import()` pattern or ESM output config). `sqlite-vec` alpha label warrants an integration smoke test before committing to this stack path. Plan a dedicated spike at the start of this phase.

---

### Phase Ordering Rationale

- **Dependency ordering is strict:** Every phase builds on the one before it. Attempting to build the Template Builder before the experience database, or submission tracking before template variants, requires rework of core data contracts.
- **Schema first, UI second:** All five database tables should be defined in Phase 1, even if only `experience_items` is actively used. This prevents costly migration complexity later and forces early resolution of the snapshot and reference patterns.
- **Snapshots built when SubmissionService is new code:** The immutable snapshot pattern is far cheaper to implement correctly in Phase 3 than to retrofit in Phase 4 or 5. Recovery cost if deferred is rated HIGH in PITFALLS.md.
- **AI last prevents premature optimization:** AI matching on a sparse experience database produces low-quality suggestions. Building it after the database is populated (via organic usage through Phases 1-4) ensures the feature launches with meaningful signal.
- **Export in Phase 4 not Phase 1:** Export reads from variants and snapshots. Building export before those layers forces mocking or stub data, then rework when real data shapes are established.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Export):** Validate electron-vite multi-page config for the hidden PDF renderer BrowserWindow; confirm Tailwind CSS 4 `print:` variant behavior in the Chromium headless context used by `printToPDF()`.
- **Phase 5 (AI Matching):** Validate ESM dynamic `import()` for `@huggingface/transformers` in the electron-vite CJS main process bundle; run sqlite-vec integration smoke test against the actual better-sqlite3 version in use; benchmark ONNX model cold-start latency on target hardware.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Database + Experience Library):** Drizzle schema design, IPC handler module structure, and Electron userData path setup are well-documented and confirmed by existing scaffold. Follow ARCHITECTURE.md patterns directly.
- **Phase 2 (Template Variants):** Join table design and toggle UI are standard patterns. No novel integrations.
- **Phase 3 (Submission Tracking):** Kanban pipeline and submission log are standard CRUD + UI patterns. Snapshot serialization is a straightforward JSON column write.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core choices (webContents.printToPDF, docx, openai SDK) verified against official docs and npm. Single MEDIUM item: sqlite-vec alpha label and @huggingface/transformers ESM-in-CJS integration warrant smoke tests. |
| Features | HIGH | Cross-referenced against Teal, Huntr, and Careerflow feature documentation. Feature dependency chain is well-established. MVP definition is clear and grounded in competitor analysis. |
| Architecture | HIGH | Brownfield — existing scaffold is confirmed. Patterns (IPC handler modules, service layer, Drizzle singleton) are derived from the actual codebase structure plus well-documented Electron patterns. |
| Pitfalls | MEDIUM-HIGH | Architecture pitfalls (snapshot design, IPC structure, packaging) are HIGH confidence from official docs and confirmed issue reports. AI boundary and DOCX formatting pitfalls are MEDIUM from community sources and library documentation. |

**Overall confidence:** HIGH for the v1 feature set and architecture. MEDIUM for the AI matching phase (ESM integration, sqlite-vec alpha).

### Gaps to Address

- **ESM/CJS boundary for `@huggingface/transformers`:** The library is ESM-only but electron-vite defaults to CJS for the main process. The dynamic `import()` workaround is community-documented but not officially validated against electron-vite specifically. Address with a targeted spike at the start of Phase 5. If the workaround proves fragile, Option B (OpenAI SDK, which is CJS-compatible) is a clean fallback with identical sqlite-vec query layer.

- **sqlite-vec WASM build compatibility:** `sqlite-vec` loads as a native SQLite extension into better-sqlite3. The alpha version number warrants a confirmation that the prebuilt binaries for the target platforms (Windows, macOS) are available via npm. Run `sqliteVec.load(db)` in isolation before building any feature against it.

- **PDF page-break behavior with dynamic content:** The exact behavior of `page-break-inside: avoid` and Tailwind `print:` utilities within Electron's `printToPDF()` context is not fully documented. Design and test the resume CSS template with edge-case content volumes (single item, 20+ items, long bullets) before treating PDF export as complete.

- **DOCX export approach confirmation:** PITFALLS.md recommends `docxtemplater` with a `.docx` template file, while STACK.md recommends the `docx` code-first API. These are in tension. The `docx` library (STACK.md recommendation) produces correct OOXML without requiring a binary `.docx` template file in the repo; this is the preferred approach for a code-driven tool. The `docxtemplater` template-based approach is only superior when non-developer formatting is required. Confirm the `docx` library approach during Phase 4 planning and document the decision.

---

## Sources

### Primary (HIGH confidence)
- Electron `webContents.printToPDF()` official docs — https://www.electronjs.org/docs/latest/api/web-contents
- Electron IPC tutorial — https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron Security docs — https://www.electronjs.org/docs/latest/tutorial/security
- Drizzle ORM schema and migration docs — https://orm.drizzle.team/docs/sql-schema-declaration
- `docx` npm package v9.6.1 — https://www.npmjs.com/package/docx
- `@huggingface/transformers` v3 announcement and npm — https://huggingface.co/blog/transformersjs-v3
- sqlite-vec Node.js integration docs — https://alexgarcia.xyz/sqlite-vec/js.html
- `openai` npm package v4.x — https://www.npmjs.com/package/openai
- Teal resume builder feature documentation — https://help.tealhq.com/en/collections/9568976-resume-builder
- ATS PDF vs DOCX compatibility (2026) — https://smallpdf.com/blog/do-applicant-tracking-systems-prefer-resumes-in-pdf-format

### Secondary (MEDIUM confidence)
- Huntr vs Teal vs Careerflow feature comparison — https://www.careerflow.ai/blog/huntr-vs-teal-vs-careerflow
- Challenges building an Electron app (Daniel Corin, 2024) — https://www.danielcorin.com/posts/2024/challenges-building-an-electron-app/
- electron-builder ASAR + SQLite issue #1474 — https://github.com/electron-userland/electron-builder/issues/1474
- DOCX generation with docxtemplater — https://docxtemplater.com/docs/get-started-node/
- AI resume tailoring tools analysis (2025-2026) — https://www.reztune.com/blog/best-ai-resume-tailoring-2025/
- Type-safe IPC in Electron — https://heckmann.app/en/blog/electron-ipc-architecture/
- Transformers.js Electron reference implementation (AnythingLLM) — https://github.com/Mintplex-Labs/transformersjs-electron

### Tertiary (LOW confidence)
- Resume tailoring callback rate research — https://huntr.co/blog/how-to-tailor-resume-to-job-description (vendor claim: 40% more callbacks; treat as directional only)

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
