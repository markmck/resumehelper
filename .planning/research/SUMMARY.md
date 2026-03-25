# Project Research Summary

**Project:** ResumeHelper v2.1 — Resume Template System
**Domain:** Electron desktop app — PDF/DOCX resume export, multi-template rendering pipeline
**Researched:** 2026-03-25
**Confidence:** HIGH (codebase inspected directly; all findings grounded in existing code)

---

## Executive Summary

ResumeHelper v2.1 is a targeted replacement of three failing jsonresume npm themes (Even, Class, Elegant) with five purpose-built React template components (Classic, Modern, Jake, Minimal, Executive). The root problem is a bifurcated rendering pipeline: the existing "professional" path renders via a React component directly in the renderer, while the "theme" path renders HTML in an iframe from the main process. This structural split causes preview-to-PDF layout drift — the defining trust failure of the current system. The recommended fix eliminates both paths and replaces them with a single unified path: every template renders through `print.html` + `PrintApp.tsx` in a Chromium BrowserWindow, used as both the preview iframe src and the PDF export target.

The implementation requires one new npm package (`react-colorful` for accent color picking), bundled woff2 font files for Inter/Lato/EB Garamond, and surgical modifications to five existing files (PrintApp, VariantPreview, VariantEditor, export.ts, themeRegistry.ts). The core architectural insight is that sharing the same URL between preview and export makes layout drift structurally impossible — the same React component, same Chromium engine, same rendering context. Template components share a TypeScript interface (`ResumeTemplateProps`) and a registry function (`resolveTemplate`), but each template's JSX is independent. No shared base component.

The primary risk is the template pipeline migration itself: removing the old bifurcated paths while keeping the app functional requires a careful phase sequence (validate Classic template end-to-end before building the other four; remove old theme wiring only after all five new templates are confirmed working). A secondary risk is the `templateOptions` schema migration — accent color, compact margins, and skills display mode all gate on this column landing correctly in existing users' SQLite databases via `ALTER TABLE` with a `try/catch` guard.

---

## Key Findings

### Recommended Stack

The existing v2.0 stack (Electron 39, React 19, TypeScript, Drizzle ORM, SQLite, docx 9.6.1, electron-vite 5) requires no major additions. One new dependency is warranted: `react-colorful@5.6.1` (2.8KB, zero deps, hooks-only, React 19 compatible) for the accent color picker. Font loading uses bundled woff2 files in `src/renderer/public/fonts/` — no CDN, no Google Fonts import, no base64 encoding. DOCX per-template font selection is a parameter addition to the existing `docx` builder, not a new library.

**Core technologies:**
- **Electron 39 + `webContents.printToPDF`:** Existing PDF export mechanism — do not replace with puppeteer or @react-pdf/renderer
- **React 19 inline styles:** Established pattern in `ProfessionalLayout.tsx`; required because templates render in an isolated BrowserWindow with no external CSS available
- **Bundled woff2 fonts:** Inter (Jake), Lato (Modern/Minimal), EB Garamond (Executive) — placed in `src/renderer/public/fonts/`, copied as-is by electron-vite to both dev and prod
- **react-colorful@5.6.1:** Accent color picker; only new npm dependency for v2.1
- **Drizzle `ALTER TABLE` migration:** `templateOptions TEXT DEFAULT '{}'` column on `templateVariants`, added via try/catch `ALTER TABLE` at startup (not via Drizzle file-based migration runner)

**What NOT to add:** puppeteer, html2canvas, pdfmake, @react-pdf/renderer, docxtemplater, CSS `@page` rules (conflicts with printToPDF margins per Electron issue #8138), Google Fonts `@import` (offline failure), base64 fonts (OTS parsing errors).

### Expected Features

The v2.1 milestone has a clear, bounded scope. The old theme system is removed; a new template system replaces it. All features must maintain ATS-clean output (single-column, no tables, no text boxes).

**Must have (table stakes — v2.1 launch):**
- 5 distinct React template components (Classic, Modern, Jake, Minimal, Executive) — all single-column
- Preview-to-PDF fidelity via unified `print.html` rendering path — this is the core trust requirement
- Page break overlay in preview pane — users must see page 2 boundary before exporting
- `templateOptions` JSON column migration — gates all three customization controls
- Accent color picker (8-10 preset swatches, no freeform hex input for v2.1)
- Compact margin toggle (normal / tight — two states only)
- Skills display mode: `grouped` and `inline` (defer `pills` to v2.2)
- Remove Even/Class/Elegant theme wiring and iframe path in VariantPreview

**Should have (competitive — v2.1.x after validation):**
- Skills `pills` display mode with explicit DOCX inline fallback
- Template thumbnail grid picker (text dropdown is acceptable for v2.1 launch)

**Defer (v2.2+):**
- A4 page size support (needs different page-height calculations for overlay)
- User-requested additional templates
- AI-powered auto-variant generation (already scoped to v2.2 in PROJECT.md)

**Anti-features to reject:** freeform margin sliders, per-section font controls, custom font upload, multi-column templates, live font-size shrink-to-fit, runtime theme install from URL.

### Architecture Approach

The core architectural decision is per-template independent React components (no shared base component) connected through a shared TypeScript type and a single registry function. The unified rendering path eliminates the preview/export split: `VariantPreview` renders an `<iframe src="print.html?variantId=X&template=classic">` instead of either a direct React component render or an `srcDoc` iframe. The PDF export handler loads the same URL in a hidden BrowserWindow. `PrintApp.tsx` reads the `?template=` param, calls `resolveTemplate()`, and renders the appropriate component.

**Major components:**
1. `src/renderer/src/components/templates/` — new directory containing all 5 template components plus `types.ts`, `resolveTemplate.ts`, and `filterResumeData.ts`
2. `PrintApp.tsx` (modified) — reads `?template=` param, dispatches to `resolveTemplate()`, serves both preview iframes and PDF export BrowserWindows
3. `VariantPreview.tsx` (modified) — drops built-in/theme branch split; all templates render as `<iframe src="print.html?...">`
4. `export.ts` (modified) — removes `isProfessional`/`isTheme` branch split; all templates use the `print.html` BrowserWindow path
5. `themeRegistry.ts` (modified) — replaces old THEMES list and `renderThemeHtml()` with new template keys; `buildResumeJson()` kept

### Critical Pitfalls

1. **Keeping isProfessional/isTheme code branches** — Adding new templates alongside old paths creates three rendering surfaces. Collapse to one path in Phase 1 by removing the `isProfessional` check in `export.ts` and the built-in/theme split in `VariantPreview.tsx`.

2. **CSS `@page` rules in templates** — Conflicts with `printToPDF`'s `margins` option (Electron issue #8138), causing layout drift between preview and PDF. Use `printToPDF`'s `margins` option only; never add `@page` to template CSS.

3. **CSS file imports for template styles** — Templates render in an isolated `print.html` BrowserWindow page. External CSS file loading breaks in prod due to path resolution differences between dev (Vite) and prod (`file://`). Use inline styles (`React.CSSProperties`) for all visual properties; inject a single `<style>` tag only for print-specific rules that cannot be inline.

4. **`templateOptions` schema migration on existing databases** — `CREATE TABLE IF NOT EXISTS` is a no-op on existing tables. The new `template_options` column requires `ALTER TABLE template_variants ADD COLUMN template_options TEXT DEFAULT '{}'` inside a `try/catch` in `db/index.ts` — not a Drizzle file-based migration (the existing `migrate()` catch block swallows errors silently).

5. **Building all 5 templates before validating the pipeline** — The Classic template proves the entire architecture (types, resolveTemplate, PrintApp dispatch, VariantPreview iframe path, unified export). Build and validate Classic end-to-end first. The other four templates are independent increments.

6. **Snapshot PDF path breaks on old theme removal** — `export:snapshotPdf` currently uses `renderThemeHtml()` from themeRegistry. When Even/Class/Elegant are removed, this path breaks. Short-term fix: hardcode 'classic' as the snapshot template fallback. Full solution (snapshot stores its template key) addressed in the cleanup phase.

7. **`print.html` iframe src in production** — `window.location.origin` is `null` for `file://` pages. The preview iframe URL construction must handle both dev (Vite origin) and prod (relative path via `window.__printBase` global exposed from preload, or a relative `./print.html` path).

---

## Implications for Roadmap

The architecture research defines a clear build order with explicit dependencies. The suggested phase structure directly maps to that dependency graph.

### Phase 1: Pipeline Foundation
**Rationale:** All other work depends on this. The Classic template proves the unified rendering path end-to-end. Cannot safely build remaining templates or remove old code until this is validated.
**Delivers:** One working template (Classic) with preview-to-PDF fidelity; unified rendering path in PrintApp, VariantPreview, and export.ts; `ResumeTemplateProps` type and `resolveTemplate` registry established.
**Addresses:** Preview-to-PDF fidelity (table stakes), ATS-clean single-column output
**Avoids:** Building 5 templates before pipeline is proven; keeping old branch splits alongside new code

### Phase 2: Remaining Templates
**Rationale:** Classic proves the pattern; Modern, Jake, Minimal, Executive are independent increments that each add one file and one entry in `resolveTemplate.ts`. No new architectural decisions required.
**Delivers:** 4 remaining template components; users have 5 distinct visual choices
**Addresses:** 5 distinct template styles (table stakes)
**Avoids:** Shared base component anti-pattern (each template is independent JSX)

### Phase 3: Template Controls
**Rationale:** Controls require the `templateOptions` schema column plus at least 2-3 templates to demonstrate value. Accent color is the highest-visibility feature; compact toggle and skills mode are low-complexity additions.
**Delivers:** `templateOptions` DB migration; accent color picker (preset swatches); compact margin toggle; skills display mode (grouped + inline)
**Addresses:** Accent color persists per variant, compact margin toggle, skills display mode (all table stakes)
**Avoids:** ALTER TABLE on existing databases breaking silently (use try/catch pattern, not Drizzle file-based migration)

### Phase 4: Page Break Overlay
**Rationale:** Depends on templates rendering at fixed page width inside the preview iframe. The overlay is a React component in `VariantPreview` (not in `PrintApp`) — it must be excluded from the print path. Placed after Phase 3 so it can be tested with compact margin toggle (margin changes affect content height, requiring overlay re-measurement).
**Delivers:** Page break visualization with page number labels in preview pane; ResizeObserver re-measurement when template options change
**Addresses:** Page break visualization in preview (table stakes)
**Avoids:** Overlay appearing in printToPDF output (use `isPrintContext` guard in render)

### Phase 5: Cleanup and Old Theme Removal
**Rationale:** Old theme wiring should be removed only after all 5 new templates are confirmed working. This is the last phase — removing first causes gaps.
**Delivers:** Removal of Even/Class/Elegant npm packages and `renderThemeHtml()`; removal of `isProfessional` branch in export.ts; deletion of `ProfessionalLayout.tsx`; snapshot PDF path updated to Classic fallback; `THEMES` constant updated to list only 5 new templates
**Addresses:** Remove Even/Class/Elegant theme wiring (explicitly in v2.1 milestone goal)
**Avoids:** Snapshot PDF path breakage (Classic fallback handles it in this phase)

### Phase Ordering Rationale

- Phase 1 must precede all others: `resolveTemplate.ts` and the unified `print.html` path are load-bearing dependencies for every subsequent template
- Phase 2 and Phase 3 can partially overlap (building templates 2-5 while controls are being specced), but the `templateOptions` DB migration must land before any controls UI is wired
- Phase 4 (overlay) requires stable template rendering at fixed dimensions — best after Phase 2 so overlay is testable across all templates; and after Phase 3 so compact margin toggle can be validated against re-measurement
- Phase 5 (cleanup) is strictly last; removing old code before new code is proven risks regressions for snapshot PDF and variants already using the 'traditional' layout template value

### Research Flags

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 2 (remaining templates):** Incremental — each follows the same pattern as Classic; no new architectural decisions
- **Phase 4 (page break overlay):** Well-understood DOM measurement pattern; implementation notes in FEATURES.md are sufficient (Option A React overlay with `pointer-events: none` is the chosen approach)

Phases that may benefit from targeted research during planning:
- **Phase 1 (pipeline foundation):** The `print.html` production URL construction (`window.location.origin` is `null` in `file://` context) needs a prototype before VariantPreview is modified; three documented options exist but none has been tested in this codebase
- **Phase 5 (cleanup):** Snapshot PDF path decision (Classic fallback vs full template-aware snapshot) should be made explicit before this phase begins to avoid scope expansion

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All library choices reference official docs or confirmed GitHub issues; direct codebase inspection |
| Features | HIGH | Core feature set bounded by existing PROJECT.md milestone goal; ATS guidance from multiple 2025/2026 sources |
| Architecture | HIGH | Based on direct codebase inspection of all affected files; build order from explicit dependency analysis |
| Pitfalls | HIGH | Schema/migration and IPC patterns code-verified; `@page` conflict confirmed via Electron issue #8138; MEDIUM on snapshot PDF path (design decision open) |

**Overall confidence: HIGH**

### Gaps to Address

- **`print.html` production URL construction:** `window.location.origin` is `null` in `file://` context. Three options documented in ARCHITECTURE.md (`window.__printBase` preload global, relative `./print.html` path, IPC-provided URL). Validate with a quick prototype before committing the VariantPreview change.

- **Snapshot PDF path:** Classic fallback vs full template-aware snapshot is a product decision, not a technical unknown. Decide before Phase 5 to avoid scope expansion mid-cleanup.

- **react-colorful React 19 compatibility:** MEDIUM confidence — hooks-only implementation should be fine, but no official compatibility test found. Fallback is native `<input type="color">` + text input (low risk, minimal extra work).

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/renderer/src/components/VariantPreview.tsx` — bifurcated render path (current)
- `src/renderer/src/PrintApp.tsx` — existing print path and `print:ready` signal
- `src/renderer/src/components/ProfessionalLayout.tsx` — existing template component pattern (inline styles, page-break-inside)
- `src/main/handlers/export.ts` — isProfessional/isTheme branch split
- `src/main/lib/themeRegistry.ts` — existing theme registry and `buildResumeJson()`
- `src/main/db/schema.ts` — `layoutTemplate` column confirmed; `templateVariants` table structure
- `.planning/PROJECT.md` — inline styles constraint, ESM theme bundling issue (Class theme), scope boundaries

### Secondary (MEDIUM-HIGH confidence — official docs)
- electron-vite.org/guide/assets — public directory behavior for renderer process
- github.com/electron/electron/issues/8138 — `@page` CSS vs printToPDF margin conflict (confirmed issue)
- github.com/dolanmiu/docx/issues/239 — font embedding not supported in docx library (open since 2019)
- github.com/omgovich/react-colorful — react-colorful 5.6.1, zero deps, hooks API
- fonts.google.com — Inter, Lato, EB Garamond (OFL license, redistribution permitted)

### Tertiary (MEDIUM confidence — community sources)
- MDN CSS Fragmentation Level 3 — `break-inside: avoid` and `pageBreakInside: avoid` in Chromium 130+
- 2025/2026 ATS guides — Calibri/Times New Roman/Garamond as safe DOCX fonts; single-column requirement
- github.com/jakegut/resume — Jake Gutierrez resume template (MIT license, most-forked resume template on GitHub)

---

*Research completed: 2026-03-25*
*Ready for roadmap: yes*
