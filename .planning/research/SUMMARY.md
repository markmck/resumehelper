# Project Research Summary

**Project:** ResumeHelper v2.2 — Three-Layer Data Model
**Domain:** Desktop resume management app — analysis-scoped overrides, skills chip UI, analysis/variant UX gaps
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

ResumeHelper v2.2 solves a specific architectural problem: AI bullet rewrites currently mutate the `job_bullets` table globally, permanently overwriting the user's canonical experience data. The milestone introduces a three-layer model (base experience → variant selection → analysis-scoped overrides) that preserves data integrity while still letting analysis results tailor resume content per job posting. This is the load-bearing change the entire milestone depends on — everything else either requires it or is independent of it.

The recommended approach is a new `analysis_bullet_overrides` table with `(analysis_id, bullet_id)` uniqueness, added via the existing `ensureSchema()` / `CREATE TABLE IF NOT EXISTS` pattern, zero new npm dependencies, and a pure-TypeScript merge function applied at render/export time. Skills management gets a chip grid built on the already-installed `@dnd-kit` packages with a new `category` column on the `skills` table (migrated from the existing `tags` array). Analysis UX gaps — submit from analysis screen, auto-extract company/role, job-level variant toggle — are all low-risk additive changes against existing schema.

The dominant risk is schema migration correctness. The project has an established `ensureSchema()` + `ALTER TABLE` try/catch pattern that works, but every new column and table must be verified against existing databases, not just fresh installs. The second risk is the `OptimizeVariant` accept path: changing where rewrites are written is a behavioral break, and it must happen atomically with the storage target existing. Both risks are well-understood and have clear mitigations documented in PITFALLS.md.

---

## Key Findings

### Recommended Stack

No new npm packages are required for v2.2. The entire milestone is built on the existing stack: Electron 39 + React 19 + Drizzle ORM + better-sqlite3 + `@dnd-kit/core 6.3.1` + `@dnd-kit/sortable 10.0.0` + `ai` SDK + Zod. All library capabilities needed for the milestone (cross-container DnD, structured LLM extraction, Drizzle JSON columns, SQL migrations) are already installed and in use.

**Core technologies:**
- `@dnd-kit/core` + `@dnd-kit/sortable`: chip grid with cross-container drag — already installed, already used in `BulletList.tsx` / `JobList.tsx`; use `rectSortingStrategy` for variable-width chips, `DragOverlay` for drag preview
- `drizzle-orm` + `better-sqlite3`: new `analysis_bullet_overrides` table and `skills.category` column added via `ensureSchema()` — no Drizzle file-based migration needed
- `ai` SDK + `zod`: company/role extraction reuses the existing `generateObject` + Zod pattern from v2.0; no new LLM infrastructure
- Custom `SkillChip` component (~50 lines, inline styles only): Material UI and PrimeReact chips are incompatible with the `file://` protocol renderer constraint

**Critical version note:** `@dnd-kit/sortable 10.0.0` is installed. Use `rectSortingStrategy` (not `verticalListSortingStrategy`) for the chip grid — the latter assumes equal-height vertical rows and produces wrong behavior with variable-width horizontal chips.

### Expected Features

**Must have for v2.2 launch (P1):**
- Analysis-scoped bullet overrides (`analysis_bullet_overrides` table + merge-at-render) — gates the entire milestone
- `OptimizeVariant` accept path writes to override table, not `job_bullets.text` — removes the destructive mutation
- Merge-at-render for preview/PDF/snapshot when `analysisId` is in context — makes overrides visible
- Toggle entire job on/off in `VariantBuilder.tsx` — UI-only, handler already implemented
- Submit from analysis screen with pre-populated company/role — closes the analyze → log submission workflow gap
- Auto-extract company/role from posting during analysis — eliminates manual re-entry after paste
- Chip grid skills management — replaces unwieldy list; uses existing `@dnd-kit` install
- Edit submission metadata inline — uses existing `InlineEdit.tsx` pattern, no schema change
- Remove stale "coming soon" messages — cleanup, no behavior change

**Add after v2.2 validation (P2):**
- "Promote override to base bullet" explicit action
- Category rename as bulk tag-update operation
- Per-analysis score delta display

**Defer to v2.3+:**
- Skills `sortOrder` within categories
- Skills pills display in PDF/DOCX
- Submission analytics and pattern insights
- AI-powered auto-variant generation

**Anti-features to reject in v2.2:**
- Auto-promote all accepted rewrites to base bullets (violates layer separation)
- Batch accept AI rewrites without per-bullet review (reintroduces fabrication risk)
- Analysis overrides that carry forward across re-analysis (re-analysis must start fresh)

### Architecture Approach

Three new components (`SkillChip`, `SkillChipGroup`, `SkillChipGrid`), one new IPC handler pair (`ai:saveOverrides`, `ai:getOverrides`), one new table (`analysis_bullet_overrides`), one new utility function (`applyOverrides`), and modifications to `OptimizeVariant`, `VariantBuilder`, `PrintApp`, `buildSnapshotForVariant`, `AnalysisResults`, `AnalysisList`, and `NewAnalysisForm`. The rendering pipeline receives an optional `analysisOverrides` field in the postMessage payload — absent means current behavior, present triggers a pure merge. The existing `SnapshotViewer` needs no changes because overrides are baked into the snapshot shape.

**Major components:**
1. `analysis_bullet_overrides` table — stores `(analysis_id, bullet_id, override_text)` with `UNIQUE(analysis_id, bullet_id)` and `ON DELETE CASCADE` on both FKs; added via `ensureSchema()` main block
2. `applyOverrides()` utility (`src/renderer/src/lib/overrides.ts`) — pure function, ~10 lines, maps override rows onto `BuilderJob[]` without mutating the input
3. `SkillChipGrid` component tree — `DndContext` wrapping multiple `SortableContext` containers (one per category), using `rectSortingStrategy` and `DragOverlay`
4. `buildSnapshotForVariant()` modification — adds optional `analysisId` param; if present, fetches overrides and runs `applyOverrides` before JSON serialization

**Key patterns:**
- Non-destructive override storage: base data never mutated by the analysis flow
- `ensureSchema()` for new tables, `ALTER TABLE` try/catch for new columns on existing tables
- Additive postMessage payload extension: `analysisOverrides?: Array<{...}>` — absent means identical to current behavior
- Tags-as-categories: `skills.tags[0]` is the display group — `category` column replaces this with a single authoritative category; drag-between-groups updates the column via existing `skills:update` IPC

### Critical Pitfalls

The following pitfalls are the highest-risk items for this milestone specifically:

1. **OptimizeVariant still calls `bullets:update` after three-layer model lands** (Pitfall 35) — The accept path change and the storage target must ship atomically. If `analysis_bullet_overrides` exists but `OptimizeVariant` still writes to `job_bullets`, the table is dead code and the bug persists. Block: do the schema + IPC first, change `OptimizeVariant` in the same phase.

2. **Snapshot builder ignores `analysisId` — submission freezes base text instead of override** (Pitfall 36) — `buildSnapshotForVariant` was written before overrides existed. It must be updated in the same phase that introduces the overrides table, not deferred. Add a test: create override → create submission → read snapshot JSON → assert override text is present.

3. **Skills migration silently drops existing tag assignments** (Pitfall 37) — If the migration only creates new tables without reading existing `skills.tags` data, users lose all category organization. The migration must read `tags` JSON for every existing skill, deduplicate category names, and insert assignment rows. Verify with a count assertion post-migration.

4. **Drag-and-drop on Windows using HTML5 DnD API** (Pitfall 38) — `dragover`/`drop` has documented Electron/Windows quirks. `@dnd-kit` uses pointer events instead and is already installed. Do not implement the chip drag with native HTML5 DnD even though ARCHITECTURE.md shows a native DnD pattern — STACK.md recommendation supersedes it. See Gaps section.

5. **`DragOverlay` transform stacking context conflict** (Pitfall 39) — If the skills chip grid is ever nested inside a container with `transform: scale()` applied (e.g., the preview pane), `DragOverlay` will render in the wrong position. Mount the `DndContext` above any transform-bearing ancestor.

---

## Implications for Roadmap

Based on combined research, the dependency graph is clear and suggests five phases with one critical ordering constraint: schema and IPC must land before any UI that writes to the new table.

### Phase A: Schema + Override IPC Foundation

**Rationale:** The `analysis_bullet_overrides` table is the load-bearing dependency for the entire milestone. Nothing else that involves analysis overrides can be built until this exists. This phase has no UI — it is schema, IPC handlers, the `applyOverrides` utility, and preload exposure.

**Delivers:** `analysis_bullet_overrides` table in `ensureSchema()` and `schema.ts`, `ai:saveOverrides` and `ai:getOverrides` handlers, preload types, `applyOverrides()` utility.

**Addresses:** Gates all three-layer model features.

**Avoids:** Pitfall 35 (mutating base bullets), Pitfall 36 (snapshot ignoring overrides) — both are prevented by building the infrastructure correctly before the behavioral changes.

**Research flag:** Standard patterns — skip phase research.

---

### Phase B: OptimizeVariant Rewire + Snapshot Builder Update

**Rationale:** Depends on Phase A. Changes the `OptimizeVariant` accept path from `bullets:update` to `ai:saveOverrides` and updates `buildSnapshotForVariant` to accept `analysisId`. These two changes are coupled — doing `OptimizeVariant` without the snapshot builder update leaves submissions with wrong content (Pitfall 36).

**Delivers:** Non-destructive bullet rewrites scoped to analysis, correct snapshot freezing when a submission is created from analysis context, override-aware preview in `OptimizeVariant`.

**Addresses:** Analysis-scoped bullet overrides (the core three-layer feature), correct submission snapshots.

**Avoids:** Pitfall 35 (accept path mutation), Pitfall 36 (snapshot builder omission).

**Research flag:** Standard patterns — skip phase research.

---

### Phase C: Analysis Submission Flow UX

**Rationale:** Depends on Phase B being complete so that submissions created from analysis context capture merged content. Low-risk: all required schema (`submissions.analysisId`) and data (`jobPostings.company`, `jobPostings.role`) already exist. This phase is additive UI and one LLM extraction step.

**Delivers:** Submit button in `AnalysisResults.tsx` and `AnalysisList.tsx`, pre-populated company/role in submission form, auto-extraction via `generateObject` + Zod, auto-populate in `NewAnalysisForm` after parse.

**Addresses:** Submit from analysis screen, auto-extract company/role.

**Avoids:** Pitfall 20 (unvalidated LLM output) — use existing `generateObject` + Zod schema for extraction.

**Research flag:** Standard patterns — skip phase research.

---

### Phase D: Skills Chip Grid

**Rationale:** Independent of Phases B and C — can run in parallel. The `skills.category` column migration must precede chip grid UI. The `@dnd-kit` cross-container pattern is well-documented and already installed. This phase has the highest implementation complexity in the milestone.

**Delivers:** `skills.category` column migration (with existing `tags` data preserved), `SkillChip` / `SkillChipGroup` / `SkillChipGrid` components, drag-between-categories, inline rename, `SkillList.tsx` refactored to use chip grid.

**Addresses:** Chip grid skills management, inline skill rename, drag skills between categories.

**Avoids:** Pitfall 37 (silent tag data loss during migration), Pitfall 38 (HTML5 DnD on Windows — use `@dnd-kit`), Pitfall 39 (`DragOverlay` transform stacking context).

**Research flag:** Migration logic may need a focused implementation plan — reading and transforming existing JSON data inside `ensureSchema()` is slightly outside the established pattern. Consider a pre-phase plan step.

---

### Phase E: Variant UX + Cleanup

**Rationale:** Fully independent. Job-level toggle in `VariantBuilder.tsx` is UI-only (handler already exists). Submission metadata inline edit uses `InlineEdit.tsx`. Coming-soon message removal is pure cleanup. Bundle these together as a low-risk polish phase.

**Delivers:** Job-level toggle per job header in `VariantBuilder.tsx`, inline edit for submission company/role/URL/notes, removal of stale placeholder text.

**Addresses:** Toggle entire job in variant builder, edit submission metadata, remove coming soon messages.

**Avoids:** No significant pitfall risk — all additive or cleanup changes.

**Research flag:** Skip — all standard patterns.

---

### Phase Ordering Rationale

- Phase A must come first: all override-dependent features are blocked on schema + IPC
- Phase B must follow Phase A: the accept path change requires the storage target to exist
- Phase C must follow Phase B: submitting from analysis context is only meaningful when overrides are correctly included in the snapshot
- Phase D is independent: can run in parallel with B and C, or sequentially after; migration must precede its own UI
- Phase E is independent: bundle it last to avoid interfering with higher-risk phases

### Research Flags

Phases needing deeper research during planning:
- **Phase D (Skills migration step):** The one-time migration from `tags` JSON array to `category` column involves reading and transforming existing row data inside `ensureSchema()`. The approach is clear but the idempotency check and verification query details may benefit from a focused implementation plan.

Phases with standard patterns (skip research-phase):
- **Phase A, B, C, E:** All use established project patterns (Drizzle `ensureSchema()`, IPC handler structure, `generateObject` + Zod, `InlineEdit.tsx`).

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All v2.2 library usage verified against installed packages and official docs; no new dependencies |
| Features | HIGH | All features verified against existing codebase — schema columns, IPC handlers, components confirmed |
| Architecture | HIGH | All patterns derived from direct source code inspection of the v2.1 shipped codebase |
| Pitfalls | HIGH (schema/IPC), MEDIUM (dnd-kit/Electron) | Schema/migration pitfalls code-verified; dnd-kit Electron DnD based on official docs + issue tracker |

**Overall confidence:** HIGH

### Gaps to Address

- **Conflict: ARCHITECTURE.md vs STACK.md on DnD approach.** ARCHITECTURE.md documents a native HTML5 DnD implementation pattern for the chip grid. STACK.md and PITFALLS.md both recommend `@dnd-kit` and warn against native HTML5 DnD on Windows (Pitfall 38). **Resolution: use `@dnd-kit`.** ARCHITECTURE.md was written before the Windows-specific pitfall was documented; STACK.md supersedes it.

- **Conflict: FEATURES.md vs ARCHITECTURE.md on override storage shape.** FEATURES.md describes `bulletOverrides` as a JSON column on `analysisResults`. ARCHITECTURE.md and STACK.md both describe a separate `analysis_bullet_overrides` table. **Resolution: use the separate table.** Individual deletes, FK cascades, indexed lookups by `bulletId` — the table design is clearly superior to the JSON column approach.

- **`skills.sortOrder` column:** STACK.md adds `sortOrder` to the `skills` schema addition, but FEATURES.md defers within-category reorder to post-v2.2. The column can be added to the schema as a forward-compat measure (with default 0) without implementing the reorder UI in v2.2. No impact on Phase D deliverables either way.

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `src/main/db/schema.ts` — full table schema, confirmed existing columns
- `src/main/db/index.ts` — `ensureSchema()` pattern, `alterStatements` array
- `src/main/handlers/ai.ts` — current `ai:analyze`, stub `ai:acceptSuggestion`
- `src/main/handlers/templates.ts` — `setItemExcluded` job cascade, `getBuilderData`
- `src/main/handlers/submissions.ts` — `buildSnapshotForVariant`, `submissions:create`
- `src/main/handlers/skills.ts` — `skills:update` accepts `{ tags: string[] }`
- `src/renderer/src/components/OptimizeVariant.tsx` — `handleSave` with `bullets:update` (the anti-pattern being replaced)
- `src/renderer/src/components/SkillList.tsx`, `SkillItem.tsx` — current flat list UI
- `src/renderer/src/components/AnalysisResults.tsx` — `raw.company`/`raw.role` already available
- `src/renderer/src/PrintApp.tsx` — postMessage payload structure
- `src/main/lib/themeRegistry.ts` — `tags[0]` as group key in `buildResumeJson`

### Primary (HIGH confidence — official library docs)
- drizzle-orm docs (orm.drizzle.team) — `text({ mode: 'json' }).$type<T>()` column pattern confirmed
- dnd-kit official docs + MultipleContainers story — cross-container sortable pattern, `rectSortingStrategy`
- Electron GitHub issue tracker — Pitfall 38 (DnD on Windows), Pitfall 34 (DPI scale), Pitfall 30 (font loading)

### Secondary (MEDIUM confidence)
- Community sources on ATS parsing behavior (Pitfalls 31, 32) — behavior varies by vendor
- dnd-kit `DragOverlay` in Electron stacking context behavior (Pitfall 39) — CSS spec behavior, not Electron-specific testing

---
*Research completed: 2026-03-26*
*Ready for roadmap: yes*
