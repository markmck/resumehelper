# Project Research Summary

**Project:** ResumeHelper
**Domain:** Local-first desktop resume management and job application tracking (Electron + SQLite)
**Researched:** 2026-03-13 (v1.0) / 2026-03-14 (v1.1 update)
**Confidence:** MEDIUM-HIGH (core architecture HIGH; theme integration MEDIUM; AI layer MEDIUM)

## Executive Summary

ResumeHelper is a local-first Electron desktop app for managing structured resume content, maintaining named template variants, tracking job submissions with frozen snapshots, and — in a future phase — using semantic AI to surface relevant experience items for a given job description. The product's defining constraint is that AI suggests which existing experience items to include but never generates or rewrites text. The v1.0 foundation is already scaffolded (Electron 39, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, better-sqlite3, electron-builder) and ships work experience, skills, template variants with per-item include/exclude toggles, PDF/DOCX export, submission tracking with frozen snapshots, and profile management. The v1.1 milestone adds four well-scoped features: a Projects section (mirroring the jobs/bullets pattern exactly), tag autocomplete for skill inputs (pure renderer change), resume.json data import, and curated jsonresume theme support for PDF rendering.

The recommended v1.1 build order follows strict data model dependencies: Projects schema first (because import, themes, and the export pipeline all depend on projects existing in `BuilderData`), then tag autocomplete (isolated renderer change, zero risk), then extending the export pipeline to include projects, then the resume.json importer, and finally the theme rendering pipeline. Only three new npm packages are required: `resume-schema` for JSON Resume schema validation, and `jsonresume-theme-even` plus `jsonresume-theme-class` as the first two bundled themes. No new libraries are needed for Projects or tag autocomplete.

The central risks are packaging-related and data-integrity-related. The existing `CREATE TABLE IF NOT EXISTS` schema strategy does not add columns to pre-existing tables on upgrade — any new column requires an explicit `ALTER TABLE ADD COLUMN` wrapped in a try/catch, and this must be tested against a v1.0 database (not just a fresh install). Resume.json theme packages that use `require()` relative paths will fail inside Electron's ASAR bundle unless explicitly unpacked. The import deduplication strategy (replace vs. merge) must be decided before writing any import code — a blind insert creates duplicates on re-import. And any code that reads `templateVariantItems` (template rendering, submission snapshots, PDF, DOCX) must be updated whenever a new `itemType` is added, or new entities silently vanish from exports.

---

## Key Findings

### Recommended Stack

The existing scaffold handles all v1.1 requirements. Three new packages are needed.

**New v1.1 dependencies only:**
- `resume-schema ^1.0.0`: Official JSON Resume schema validator; callback-based API; zero dependencies; used to validate imported JSON before mapping to internal schema
- `jsonresume-theme-even ^0.14.x`: First bundled theme; dual ESM/CJS builds (safe for electron-vite CJS main process); most-maintained community theme
- `jsonresume-theme-class latest`: Second bundled theme; official jsonresume org theme; documented as self-contained and offline-safe; verify module format after install

**Existing stack (unchanged, covers all other v1.1 needs):**
- `Electron 39 + electron-vite`: Main/renderer process split; main process is CJS bundle; already handles IPC, dialogs, BrowserWindow PDF pipeline
- `better-sqlite3 + Drizzle ORM`: Synchronous SQLite; schema managed via `ensureSchema()` with `CREATE TABLE IF NOT EXISTS`; `db.transaction()` used for atomic writes
- `@dnd-kit/sortable`: Already installed; reused for project bullet reordering without new dependencies
- `docx ^9.6.1`: Already installed; extend existing DOCX builder with a Projects section

**What NOT to add:**
- Dynamic runtime npm theme installation — fragile path resolution in packaged apps; security liability; defer to v2+
- `react-tag-autocomplete` — data model conflict (`{label, value, id}` objects vs. existing freeform string arrays); custom ~70-line component is simpler
- `dangerouslySetInnerHTML` for theme HTML — strips `<head>`, leaks CSS; use `<iframe srcdoc>` instead
- HTML-to-DOCX converters (`html-docx-js`, etc.) — notoriously lossy; `docx` code-first API is already in use

**Critical version check:** Any theme with `"type": "module"` (ESM-only) requires `await import()` inside an async IPC handler rather than synchronous `require()`. Verify each theme's `package.json` before integrating. `jsonresume-theme-even` provides both builds and is safe either way.

### Expected Features

**Must have — v1.1 table stakes (P1):**
- Projects section with toggleable bullets — mirrors jobs pattern; standard for developer resumes; needed for accurate theme rendering and import
- Tag autocomplete on skill inputs — typing tags without suggestions is friction; users expect combobox UX on any tag field
- resume.json data import — unblocks users migrating existing data; maps all four sections (basics, work, skills, projects) in one pass

**Should have — v1.1 differentiators (P2):**
- resume.json theme support with curated 2-3 bundled themes — unlocks 400+ community layouts; `templateVariants.layoutTemplate` column already exists for this

**Defer to post-v1.1:**
- Local theme file loading (power-user `render.js` from disk without bundling)
- Pipeline status tracking (deferred from v1.0; next milestone after v1.1)
- resume.json export (symmetric with import; v1.2 candidate)

**Defer to v2+:**
- Dynamic npm theme installation at runtime
- AI experience matching (suggest relevant items for a job description)

**Anti-features explicitly out of scope:**
- AI-generated or AI-rewritten resume text — defeats the product's core promise
- Full merge/conflict UI on import — use replace strategy for v1.1
- Theme CSS editing in-app — themes are open-source npm packages; fork to customize
- Cloud sync, team features, job board scraping — contradict local-first value proposition

**v1.1 feature priority matrix:**

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Projects section | HIGH | MEDIUM | P1 |
| Tag autocomplete | HIGH | LOW | P1 |
| resume.json import | MEDIUM | MEDIUM | P1 |
| resume.json theme support | MEDIUM | HIGH | P2 |

### Architecture Approach

The v1.1 architecture extends the existing Electron main/renderer split at well-defined integration points — no structural changes are needed, only extensions. The renderer communicates exclusively through a typed `window.api` contextBridge. Business logic lives in `handlers/` modules by domain. The single Drizzle singleton handles all database access.

The most important cross-cutting concern is `BuilderData`: the TypeScript type that drives both `VariantBuilder` (checkbox tree) and `ProfessionalLayout` (PDF renderer). Every feature that adds entities to the resume must extend `BuilderData` and update every handler that produces or consumes it — `templates:getBuilderData`, `export:pdf`, `export:docx`, and `submissions:create` (snapshot capture). Missing any consumer is the primary way new data entities vanish silently from exports.

**Major v1.1 components and integration points:**

1. `db/schema.ts` — New `projects` and `projectBullets` tables; nullable `projectId` FK column added to `templateVariantItems` via `ALTER TABLE` (not `CREATE TABLE IF NOT EXISTS`)
2. `db/index.ts` / `ensureSchema()` — Add `CREATE TABLE IF NOT EXISTS` for new tables; add `ALTER TABLE template_variant_items ADD COLUMN project_id INTEGER` in try/catch
3. `handlers/projects.ts` + `handlers/projectBullets.ts` — New CRUD handlers; identical API shape to `jobs.ts`/`bullets.ts`
4. `handlers/templates.ts` — Extend `getBuilderData` and `setItemExcluded` for `'project'` and `'project_bullet'` itemType values
5. `handlers/export.ts` — Extend `getBuilderDataForVariant` for projects; add Projects section to DOCX builder; add theme PDF path using temp HTML file + `win.loadFile()`
6. `handlers/import.ts` — New handler: `dialog.showOpenDialog` → parse → `resume-schema` validate → `db.transaction()` bulk insert into profile/jobs/skills/projects
7. `helpers/resumeJsonBuilder.ts` — New: `buildResumeJson(variantId)` maps DB data filtered by variant exclusions into resume.json shape for theme rendering
8. `ProjectList/ProjectItem/ProjectAddForm` — New components; mirror `JobList/JobItem/JobAddForm`
9. `TagInput.tsx` — Add `suggestions?: string[]` prop; dropdown via React portal with `onMouseDown={e => e.preventDefault()}` on items
10. `VariantPreview.tsx` + `VariantEditor.tsx` — Add `<iframe srcdoc={html}>` preview path; add layout selector for `variant.layoutTemplate`

**Key refactor needed:** Extract `getBuilderDataForVariant` to a shared `main/helpers/builderData.ts` helper. It currently exists as duplicate logic in both `handlers/export.ts` and `handlers/templates.ts`. When projects are added, both copies must be updated — the second will be missed. Fix the duplication as part of Phase 3.

### Critical Pitfalls

1. **`CREATE TABLE IF NOT EXISTS` does not add columns to existing tables** — Adding `projectId` to `templateVariantItems` or any new column to a pre-existing table requires an explicit `ALTER TABLE ... ADD COLUMN` wrapped in try/catch. `CREATE TABLE IF NOT EXISTS` is a no-op for existing tables. Test specifically on a v1.0 database before shipping. (Pitfall 10 in PITFALLS.md)

2. **Projects silently dropped from exports if all `templateVariantItems` consumers are not updated** — Every handler that reads exclusion state must handle `'project'` and `'project_bullet'` as `itemType` values: `templates:getBuilderData`, both copies of `getBuilderDataForVariant` (export.ts and templates.ts), `submissions:create` snapshot capture. Use a TypeScript discriminated union for `itemType` to get compiler enforcement. (Pitfall 9)

3. **Theme packages fail inside ASAR unless unpacked** — Themes that use `require('./template.hbs')` or `fs.readFileSync` for relative paths work in dev but fail in packaged builds. Add `asarUnpack: ["**/jsonresume-theme-*/**"]` to electron-builder config. Test every bundled theme in the packaged binary before release. (Pitfall 13)

4. **resume.json import creates duplicates without a deduplication strategy** — resume.json has no stable primary keys. Blind insert produces duplicates on any re-import. Decide strategy before writing any code: recommended v1.1 approach is replace (confirm with user, delete existing data, re-import in a transaction). Merge is a v2 concern. (Pitfall 11)

5. **Tag autocomplete blur-before-click race condition** — `onBlur` fires before `onClick`, closing the dropdown before the suggestion click registers. Fix: `onMouseDown={e => e.preventDefault()}` on suggestion items. Use a React portal to escape `overflow: hidden` ancestors in the scrollable Experience tab. (Pitfall 15)

6. **Theme HTML must never use `dangerouslySetInnerHTML`** — Theme output is a complete `<!DOCTYPE html>` document; injecting into React DOM strips `<head>`, leaks theme CSS into the app, and breaks style blocks. Use `<iframe srcdoc={html} sandbox="allow-same-origin">` for preview. Use temp file + `win.loadFile()` for PDF generation. (Pitfall 14)

7. **`SubmissionSnapshot` must include `projects` for v1.1** — Extend the `SubmissionSnapshot` type with `projects?: BuilderProject[]` (optional, not required, for backward compatibility with v1.0 snapshots that have no projects key). (Cross-feature type extension in ARCHITECTURE.md)

---

## Implications for Roadmap

The v1.1 feature dependency graph is unambiguous and maps directly to phases. Build order is determined by data model dependencies, not arbitrary grouping.

### Phase 1: Projects Section (Schema + CRUD + UI)

**Rationale:** Projects is the foundational dependency for all other v1.1 features. The import handler needs the projects table to exist before it can map `projects[]` from resume.json. The theme mapper needs `projects` in `BuilderData` for accurate theme rendering. The `templateVariantItems` schema change (adding `projectId`) must happen before any export pipeline extension. Building projects first means all subsequent phases get complete data in one pass.

**Delivers:** `projects` and `projectBullets` tables with `ensureSchema()` support; `ALTER TABLE` migration for `templateVariantItems.projectId`; `handlers/projects.ts` + `handlers/projectBullets.ts`; extended `BuilderData` type with `projects: BuilderProject[]`; `ProjectList/ProjectItem/ProjectAddForm` components in the Experience tab; extended `templates:getBuilderData` and `templates:setItemExcluded` for project item types.

**Addresses:** Projects section (P1 table stakes); `BuilderData` type extension; `templateVariantItems` schema migration.

**Avoids:** Pitfall 9 (add TypeScript discriminated union for `itemType` immediately; audit all consumers of `templateVariantItems`). Pitfall 10 (use `ALTER TABLE ADD COLUMN` in try/catch; test on v1.0 database). Pitfall 1 (extend `SubmissionSnapshot` with optional `projects` field now).

**Research flag:** Standard patterns — exact mirror of existing jobs/bullets pattern. No deeper research needed.

---

### Phase 2: Tag Autocomplete

**Rationale:** Pure renderer change with zero IPC or schema dependencies. Can be built at any point, but placed second because it is low-risk, high-visibility, and isolated — it will not conflict with simultaneous schema work from Phase 1. Completing it early delivers immediate UX improvement and reduces the total risk surface for later phases.

**Delivers:** `TagInput.tsx` extended with `suggestions?: string[]` prop; dropdown rendered via React portal with keyboard navigation (Arrow/Enter/Escape/Tab); `onMouseDown preventDefault` on suggestion items; `allTags` derived via `useMemo` in `SkillList` and passed as a prop.

**Addresses:** Tag autocomplete (P1 table stakes).

**Avoids:** Pitfall 15 (blur-before-click) — implement portal + `preventDefault` from the start, not as a bugfix. Pitfall 16 (re-created suggestion list) — `useMemo` in parent, not inline in `TagInput`.

**Research flag:** Standard patterns — React combobox with portal and `preventDefault` is well-documented. No deeper research needed.

---

### Phase 3: Projects in Export Pipeline

**Rationale:** Phase 1 adds projects to the data model. Phase 3 completes the integration by propagating projects through every export path. These two phases must produce a complete, shippable Projects feature — the state where "projects CRUD exists but doesn't appear in exports" must never ship. This phase is also where the `getBuilderDataForVariant` duplication is fixed.

**Delivers:** `ProfessionalLayout.tsx` renders Projects section (after Skills); `VariantBuilder.tsx` shows Projects section with checkboxes; `PrintApp.tsx` passes projects to `ProfessionalLayout`; DOCX builder adds Projects section; `getBuilderDataForVariant` extracted to `main/helpers/builderData.ts` (shared by export.ts and templates.ts).

**Addresses:** Completes Projects feature as fully exported and variant-controllable; resolves existing handler duplication.

**Avoids:** Pitfall 9 (update all `templateVariantItems` consumers in this phase — treat export pipeline extension as a required deliverable, not a follow-up). Pitfall 5 (test PDF output with Projects content at multiple content volumes).

**Research flag:** Standard patterns. No deeper research needed.

---

### Phase 4: resume.json Data Import

**Rationale:** Depends on Phase 1 (projects table must exist to receive imported `projects[]`). All other target tables (jobs, skills, profile) already exist since v1.0. This is a pure write path — no new tables, no new UI beyond a button, a preview summary, and a result toast.

**Delivers:** `handlers/import.ts` with `import:resumeJson` handler (dialog → parse → `resume-schema` validate → preview → `db.transaction()` bulk insert); `window.api.importFile.resumeJson()` on the preload bridge; import button in the Experience tab with before/after summary ("14 jobs, 31 skills, 3 projects found — this will replace existing data"); result toast after completion.

**Addresses:** resume.json data import (P1 table stakes).

**Avoids:** Pitfall 11 (replace strategy with confirmation dialog — decide before writing any code). Pitfall 12 (defensive mapper — handle missing sections, `basics.location` as object, nullable `highlights`/`keywords`, date normalization; `console.warn` on unexpected shapes; post-import summary with skipped-row count). Test with at least three real-world files: official example, LinkedIn export, hand-written file with missing sections.

**Research flag:** Replace-vs-merge UX decision must be locked before implementation starts. The technical approach is standard (better-sqlite3 transaction); no library research needed.

---

### Phase 5: resume.json Theme Rendering

**Rationale:** Most complex feature; placed last. Depends on Phases 1 and 3 (projects must be in `BuilderData` for accurate theme rendering). Requires ASAR unpacking configuration, a new `buildResumeJson()` mapper, an iframe-based preview, and a temp-file PDF path. All prerequisites are stable after Phase 3.

**Delivers:** `npm install jsonresume-theme-even jsonresume-theme-class`; `asarUnpack` config for theme packages; `helpers/resumeJsonBuilder.ts` with `buildResumeJson(variantId)`; theme PDF path in `export.ts` (write theme HTML to temp file → `win.loadFile()` → `printToPDF()` → cleanup); `VariantPreview.tsx` renders `<iframe srcdoc={html} sandbox="allow-same-origin">` for theme layouts; `VariantEditor.tsx` layout selector sets `variant.layoutTemplate`.

**Addresses:** resume.json theme support (P2 differentiator).

**Avoids:** Pitfall 13 (ASAR unpacking — add `asarUnpack` before testing any theme; test packaged binary). Pitfall 14 (CSS isolation — use `<iframe srcdoc>` not `dangerouslySetInnerHTML`). ESM/CJS theme loading — verify each theme's `package.json` `"type"` field; use dynamic `await import()` for ESM-only themes.

**Research flag:** Requires per-theme vetting during integration — inspect each theme's `index.js` for `fs`/`require()` calls before adding it to the curated list. The ASAR unpacking and iframe approach are architecturally correct but lack live Electron + jsonresume theme integration examples in the research corpus (MEDIUM confidence). Test packaged binary early in this phase, not at the end.

---

### Phase Ordering Rationale

- **Projects before everything:** Import maps `projects[]` to the projects table; themes need `projects` in `BuilderData` for complete rendering; the `templateVariantItems` schema change is a one-time migration that should happen before any handler reads it
- **Tag autocomplete in its own phase:** Isolated renderer change; no risk of merge conflicts with simultaneous schema work; delivers visible UX improvement early
- **Export pipeline as a required completion of Projects:** The state where projects exist in the DB but not in exports must never ship; treat Phase 3 as the closing gate on Phase 1
- **Import after projects table exists:** Can map all four resume.json sections in one pass; avoids a two-step import that skips projects
- **Themes last:** Most complex; most dependencies; most packaging risk; benefits from all prior phases being stable and tested

### Research Flags

**Phases needing targeted verification during implementation:**
- **Phase 5 (Themes):** Vet each bundled theme's `index.js` for ASAR-unsafe `require()` patterns before integrating. Verify `jsonresume-theme-class` module format immediately on install (`node -e "require('jsonresume-theme-class')"`). Run packaged binary test early.

**Phases with well-documented patterns (standard — no research-phase needed):**
- **Phase 1 (Projects Schema):** Exact mirror of existing jobs/bullets pattern; `ALTER TABLE ADD COLUMN` is a known SQLite pattern
- **Phase 2 (Tag Autocomplete):** React combobox with portal and `preventDefault` is extensively documented
- **Phase 3 (Export Pipeline Extension):** Follows existing export handler patterns
- **Phase 4 (Import):** IPC dialog + `db.transaction()` insert; standard better-sqlite3 patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack is already deployed. Three new packages are stable, well-maintained, and vetted against official docs. ESM/CJS theme loading concern is documented with a concrete mitigation. |
| Features | HIGH | v1.1 scope is tightly bounded and grounded in the existing codebase. Feature dependencies are confirmed by code inspection. Official JSON Resume schema docs verified. |
| Architecture | HIGH | Research conducted against the actual codebase (direct code inspection). Integration points are concrete file names, function signatures, and SQL patterns — not speculation. |
| Pitfalls | HIGH (core patterns) / MEDIUM (theme integration) | SQLite/Electron packaging, IPC patterns, `ensureSchema()` migration, and React autocomplete pitfalls are code-verified and well-documented. Theme ASAR integration is architecturally correct but lacks live Electron + jsonresume examples in the research corpus. |

**Overall confidence:** HIGH for Phases 1-4. MEDIUM for Phase 5 (themes) until first packaged-binary test confirms ASAR unpacking and theme rendering work end-to-end.

### Gaps to Address

- **Theme ASAR validation:** The `asarUnpack` pattern is correct but must be tested in a packaged binary early in Phase 5. Do not treat theme integration as complete until the packaged binary renders a theme correctly.
- **`jsonresume-theme-class` module format:** Documented as "self-contained" but ESM vs. CJS not confirmed in research. Verify with `node -e "require('jsonresume-theme-class')"` immediately after install; use dynamic `await import()` if ESM-only.
- **`ensureSchema()` migration on v1.0 database:** The `ALTER TABLE ADD COLUMN` approach for `templateVariantItems.projectId` must be tested on a database created by the v1.0 `ensureSchema()`, not only on a fresh install.
- **Import replace-vs-merge UX copy:** The replace strategy is the correct technical choice for v1.1; the confirmation dialog copy and before/after summary format should be designed before implementation to avoid rework.
- **`getBuilderDataForVariant` duplication:** The existing v1.0 codebase already has this function duplicated between `handlers/export.ts` and `handlers/templates.ts`. Phase 3 must resolve this before adding projects support to both copies independently.

---

## Sources

### Primary (HIGH confidence)
- JSON Resume schema docs — https://docs.jsonresume.org/schema — `validate()` API, projects section fields, work/skills/projects field mappings confirmed
- JSON Resume theme development contract — https://jsonresume.org/theme-development — `render()` signature: `module.exports = { render(resume) { return htmlString } }`
- `resume-schema` npm — https://www.npmjs.com/package/resume-schema — v1.0.0 stable, callback-based API
- jsonresume/resume-schema GitHub — https://github.com/jsonresume/resume-schema — authoritative schema source
- Electron IPC docs — https://www.electronjs.org/docs/latest/tutorial/ipc — contextBridge patterns
- Electron ESM docs — https://www.electronjs.org/docs/latest/tutorial/esm — dynamic `import()` in main process
- better-sqlite3 transaction docs — synchronous transaction wrapper; confirmed in existing codebase patterns
- Existing codebase (direct inspection) — `src/main/db/schema.ts`, `src/main/db/index.ts`, `src/main/handlers/*.ts`, `src/preload/index.ts`, `src/preload/index.d.ts`, all renderer components
- W3C Combobox Pattern — https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ — keyboard navigation requirements

### Secondary (MEDIUM confidence)
- `jsonresume-theme-even` GitHub — https://github.com/rbardini/jsonresume-theme-even — dual ESM/CJS build (implied from repo structure, not directly confirmed)
- `jsonresume-theme-class` GitHub — https://github.com/jsonresume/jsonresume-theme-class — self-contained, offline-safe claim
- jsonresume-theme-boilerplate — https://github.com/jsonresume/jsonresume-theme-boilerplate — reference for theme export shape
- resume-cli Puppeteer PDF rendering — https://github.com/jsonresume/resume-cli/pull/275 — confirms HTML-to-PDF via headless browser as ecosystem standard
- `react-tag-autocomplete` GitHub — https://github.com/i-like-robots/react-tag-autocomplete — v7.5.1; React 18+ peerDep; evaluated and rejected due to data model conflict
- Teal resume builder feature docs — https://help.tealhq.com/en/collections/9568976-resume-builder — v1.0 competitor feature baseline

### Tertiary (LOW confidence — validate during implementation)
- ESM/CJS compatibility of `jsonresume-theme-class`: inferred from "official org theme" description; must verify by `require()` test after install
- ASAR behavior with relative `require()` in theme packages: pattern is documented in Electron ASAR docs and electron-builder issues; no live jsonresume theme + Electron example found in research corpus

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
