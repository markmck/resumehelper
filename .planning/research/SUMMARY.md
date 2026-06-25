# Project Research Summary

**Project:** ResumeHelper v2.6 — Per-Variant Text Overrides + Excluded-Bullet Suggestions
**Domain:** Electron desktop app — polymorphic SQLite override table + AI-powered excluded-bullet surfacing
**Researched:** 2026-06-05
**Confidence:** HIGH

---

## Executive Summary

ResumeHelper v2.6 extends the existing three-layer data model (base → variant → analysis) with two new capabilities: (1) users can reword text at the variant tier rather than only include/exclude items, and (2) the AI analysis can surface base bullets the active variant omits when a job description specifically demands that experience. All research is grounded directly in source code — no new dependencies are required, every capability is covered by the installed stack, and every integration point is already established by patterns in the existing codebase (`templateVariantItems`, `ensureSchema()`, `buildMergedBuilderData()`, `acceptSuggestion()`, `InlineEdit.tsx`).

The recommended approach is a four-phase build in strict dependency order: (1) schema and data migration as a blocker for everything else, (2) merge-helper extension to apply multi-field and multi-tier overrides with correct precedence, (3) variant reword UI built on top of Phase 2 handlers, (4) excluded-bullet suggestion pipeline (prompt engineering, new Zod schema field, new DB table, new IPC handlers, OptimizeVariant card). Phases 3 and 4 are parallelizable once Phase 2 ships. The single `buildMergedBuilderData()` merge path is the key architectural invariant — all override application happens inside this function so every surface (PDF, DOCX, snapshot, resume.json export) automatically benefits.

The primary risks are: a schema design decision (generic `entity_id` vs per-entity nullable FK columns) that must be resolved in Phase 1 before any other work proceeds; migration correctness for existing `analysisBulletOverrides` rows; merge-precedence inversion (variant override silently winning over accepted AI suggestions); snapshot coverage gaps for new entity types; and LLM hallucination of bullet IDs in the excluded-bullet suggestion feature. Each risk has a clear mitigation grounded in existing patterns in the codebase.

---

## Key Findings

### Recommended Stack

No new dependencies. Every capability needed for v2.6 is already provided by the installed stack: `drizzle-orm` for the new table definition and queries, `better-sqlite3` for the `ensureSchema()` migration pattern, `zod` for `ResumeScorerSchema` extension, Vercel AI SDK `generateObject` for the excluded-bullet suggestion call (same pattern as the current scorer), React + TypeScript for UI, and Vitest with `MockLanguageModelV3` for tests. The `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN` try/catch pattern in `ensureSchema()` handles all schema changes with no additional migration infrastructure.

**Core technologies (confirmed from package.json + source):**
- `drizzle-orm` ^0.45.1 — new `entityOverrides` + `analysisExcludedBulletSuggestions` Drizzle table definitions
- `better-sqlite3` ^12.10.0 — `ensureSchema()` migration pattern; `sqlite.transaction()` wrapping the data migration
- `zod` ^4.3.6 — extend `ResumeScorerSchema` with `excluded_bullet_suggestions.default([])` for backward compat
- `ai` (Vercel AI SDK) ^6.0.136 — `generateObject` with expanded schema; same `callResumeScorer` call pattern
- `react` + TypeScript ^19.2.1 / ^5.9.3 — `InlineEdit.tsx` (multiline=true) reuse for variant reword UI
- `vitest` ^4.1.2 — `MockLanguageModelV3` covers new prompt/schema tests; `createTestDb()` must be kept in sync

### Expected Features

**Must have (P1 — v2.6 launch):**
- Unified `entityOverrides` table (polymorphic shape: `variant_id`, `analysis_id`, `entity_type`, `entity_id`, `field`, `override_text`) with correct NULL semantics and partial unique indexes
- Migration of all existing `analysisBulletOverrides` rows into the new table (INSERT-SELECT + row-count assertion)
- Updated `buildMergedBuilderData()` reading from `entityOverrides` with precedence analysis → variant → base
- Inline reword affordance for bullet text at variant tier (`InlineEdit` pattern, pencil icon on hover)
- Inline reword affordance for summary at variant tier (gated on non-empty `profileSummary` + `showSummary`)
- Visual distinction in VariantBuilder: accent left-border/dot for overridden fields; no strikethrough (already means "excluded")
- Reset-to-base for all overridable fields (DELETE override row → preview refresh)
- Excluded-bullet suggestion cards in OptimizeVariant (requires prompt change + new Zod field + new table)

**Should have (P2 — add after core validated):**
- Inline reword for job title (role field) at variant tier
- Inline reword for project title + description (requires `projects.description` schema addition first)
- Staleness indicator when base text updated after a variant override is established
- Override count badge in VariantEditor builder pane header

**Defer (v2.7+):**
- Bulk override management UI
- Override history / audit trail
- AI-suggested rewording at variant tier (keep AI strictly at analysis tier)
- Propagate variant override back to base (destroys layer model)

**Anti-features (explicitly rejected):**
- Variant-tier summary CREATE from scratch without a base summary
- Batch "accept all" for variant overrides
- Free-form company name override (misrepresentation risk; allow role/title only)

### Architecture Approach

The v2.6 architecture extends the single `buildMergedBuilderData()` merge path with a new Layer 2.5 (variant-tier text overrides) inserted between Layer 2 (variant exclusions) and Layer 3 (analysis overrides). A new unified `entityOverrides` table replaces `analysisBulletOverrides`; a separate `analysisExcludedBulletSuggestions` table (mirroring `analysisSkillAdditions`) handles the accept/dismiss lifecycle for excluded-bullet suggestions. All override application stays inside `buildMergedBuilderData()` — the renderer always receives merged data, never applies overrides client-side.

**Major components:**

1. **`entityOverrides` table** (`schema.ts` + `index.ts`) — unified polymorphic override store; two partial unique indexes; ON DELETE CASCADE via per-entity nullable FK columns (not generic `entity_id`)
2. **`buildMergedBuilderData()` extension** (`mergeHelper.ts`) — two-pass override map (variant-tier first, analysis-tier overwrites); `summaryOverride?: string` added to `MergedBuilderData`; analysis-tier inclusion un-exclusion for excluded bullets
3. **`analysisExcludedBulletSuggestions` table + handlers** (`schema.ts`, `ai.ts`) — stores LLM suggestions; `acceptExcludedBulletSuggestion` writes to `entityOverrides` with `source='inclusion'`; mirrors `analysisSkillAdditions` pattern exactly
4. **Variant reword UI** (`VariantBuilder.tsx` + `InlineEdit.tsx`) — hover pencil icon → multiline InlineEdit → IPC `templates:setVariantOverride` → preview refresh
5. **Excluded-bullet suggestion prompt extension** (`analysisPrompts.ts`, `aiProvider.ts`) — new `## Excluded Bullets` section; `excluded_bullet_suggestions` field with `.default([])` on `ResumeScorerSchema`
6. **`buildSnapshotForVariant()` extension** (`submissions.ts`) — splice `summaryOverride` into `frozenProfile.summary`

### Critical Pitfalls

1. **Migration column mapping error** — INSERT-SELECT from `analysis_bullet_overrides` must map `bullet_id` → `entity_id` (not `analysis_id`). Prevention: explicit column-by-column INSERT-SELECT; post-migration row-count assertion at `ensureSchema()` startup; keep old table alive, do NOT drop in v2.6.

2. **Merge precedence inversion** — variant-tier override applied after analysis-tier clobbers accepted AI suggestions. Prevention: Layer 2.5 (variant text) strictly before Layer 3 (analysis) in `buildMergedBuilderData()`; unit test: same-entity variant + analysis override → analysis text wins.

3. **NULL-column ambiguity breaks merge queries** — `WHERE variant_id = ?` returns no rows when `variant_id` is NULL. All merge queries must use `IS NULL` / `IS NOT NULL` guards. Drizzle: `isNull(entityOverrides.analysisId)` for variant-only lookups.

4. **Snapshot freezes base text for new entity types** — if any entity type is not yet handled in `buildMergedBuilderData()`, snapshot captures wrong text silently. Prevention: snapshot integration test (variant override for summary + bullet + project title → submit → assert snapshot JSON contains override text, not base text) is the correctness contract.

5. **LLM bullet ID hallucination** — `acceptExcludedBulletSuggestion` handler must validate the `bulletId` exists in `job_bullets` AND is currently excluded in the variant before writing to `entityOverrides`. Never trust the renderer payload.

---

## Design Tension: Generic `entity_id` vs Per-Entity Nullable FK Columns

**This is the most consequential Phase 1 decision and must be resolved before any DDL is written.**

ARCHITECTURE.md proposes a single generic `entity_id INTEGER` column alongside an `entity_type` discriminator. This is simple and flexible. However, PITFALLS.md explicitly warns that SQLite FK `ON DELETE CASCADE` is per-column — a generic `entity_id` integer with no FK declaration means cascade deletes never fire. Deleting a job leaves orphaned override rows in the table indefinitely.

PITFALLS.md recommends per-entity nullable FK columns (separate `bullet_id`, `project_bullet_id`, etc.) to enable individual `ON DELETE CASCADE` declarations per parent table. This is the **existing pattern used by `template_variant_items`** in the real schema — the direct precedent established by the codebase.

**Recommendation: use per-entity nullable FK columns** (consistent with `template_variant_items` and the existing orphan-handling LEFT JOIN pattern in `ai.ts`). The tradeoffs:

| Approach | Pro | Con |
|----------|-----|-----|
| Generic `entity_id INTEGER` (ARCHITECTURE.md proposal) | Simpler DDL; no new columns when adding entity types | No FK; no CASCADE; orphan rows accumulate on delete |
| Per-entity nullable FK columns (PITFALLS.md / codebase precedent) | CASCADE delete fires; FK constraint enforced at DB level; consistent with `template_variant_items` | More columns; DDL change required when adding new entity types |

**The SPEC and Phase 1 implementation must make this call explicitly.**

---

## Cross-Cutting Flags (All Phases Must Know)

1. **`projects` table has NO `description` column** — project-description variant override (P2 feature) requires `ALTER TABLE projects ADD COLUMN description TEXT NOT NULL DEFAULT ''` before any override can be stored. Do not attempt project description override without this migration. Scope explicitly in or out of Phase 1 spec.

2. **`createTestDb()` in `tests/helpers/db.ts` is a manual copy of `ensureSchema()`** — must be updated in lockstep with every new table. If Phase 1 adds `entityOverrides` and `analysisExcludedBulletSuggestions` to `ensureSchema()` but forgets `createTestDb()`, all in-memory DB tests silently run against wrong schema. Add to every phase checklist that touches `ensureSchema()`.

3. **Keep `analysisBulletOverrides` table read-only after migration — do NOT drop in v2.6** — add a post-migration row-count assertion that runs at `ensureSchema()` startup. Drop via explicit `DROP TABLE IF EXISTS` in a v2.7 cleanup phase only.

4. **`ResumeScorerSchema` new field must use `.default([])`** — `excluded_bullet_suggestions` must declare `.default([])` so all existing `MockLanguageModelV3` test fixtures parse without change. Using `.optional()` alone would require updating every mock response.

5. **`summaryOverride` must thread through `buildMergedBuilderData` → `buildSnapshotForVariant`** — `MergedBuilderData` needs `summaryOverride?: string`; `buildSnapshotForVariant()` must splice it into `frozenProfile.summary`; callers building resumeText for LLM scoring must use `summaryOverride ?? profileRow.summary`. A gap here means submission snapshots silently freeze base summary text.

---

## Implications for Roadmap

### Phase 1: Schema + Data Migration

**Rationale:** Every other phase reads from or writes to `entityOverrides`. Strict blocker.

**Delivers:**
- `entityOverrides` Drizzle table in `schema.ts` + `ensureSchema()` CREATE TABLE
- Two partial unique indexes (variant-only and analysis-scoped)
- `analysisExcludedBulletSuggestions` Drizzle table + CREATE TABLE
- Data migration: INSERT-SELECT from `analysisBulletOverrides` → `entityOverrides` in `sqlite.transaction()` with idempotency guard and row-count assertion
- `createTestDb()` updated in sync
- `acceptSuggestion()` in `ai.ts` redirected to write `entityOverrides` (atomic cutover)
- `applyOverrides()` usage retired from `mergeHelper.ts`; Layer 3 query redirected to `entityOverrides`
- Old `analysisBulletOverrides` kept read-only, not dropped

**Must resolve before spec:** Generic `entity_id` vs per-entity nullable FK columns

---

### Phase 2: Merge Precedence Extension + Summary Override Threading

**Rationale:** Variant reword UI (Phase 3) calls handlers added here. Excluded-bullet acceptance (Phase 4) depends on inclusion un-exclusion logic added here. Both are blocked on this.

**Delivers:**
- `buildMergedBuilderData()` extended with two-pass override map (Layer 2.5 variant-tier, Layer 3 analysis-tier overwrites)
- Multi-field override application: `job.role`, `job.company`, `project.name`, all bullet `.text` fields
- `summaryOverride?: string` added to `MergedBuilderData` type
- Analysis-tier inclusion un-exclusion: accepted excluded-bullet suggestions flip `bullet.excluded = false` for that analysis
- `buildSnapshotForVariant()` splices `summaryOverride` into `frozenProfile.summary`
- `acceptVariantOverride()` / `getVariantOverrides()` / `clearVariantOverride()` handlers in `templates.ts` + IPC registration
- Variant override write path stamps `template_variants.updated_at` (staleness detection)
- Unit tests: merge precedence; snapshot summary override; inclusion un-exclusion

---

### Phase 3: Variant Reword UI

**Rationale:** Pure UI layer on top of Phase 2 handlers. No AI pipeline changes. Parallelizable with Phase 4 after Phase 2 ships.

**Delivers:**
- Hover pencil icon on each bullet row, summary section, and job title row in `VariantBuilder.tsx`
- `InlineEdit.tsx` (multiline=true) invoked inline; pre-populated with current effective text
- On save: IPC `templates:setVariantOverride` → preview refresh via `templates:getBuilderData`
- Visual indicator: accent left-border on overridden fields (NOT strikethrough)
- Reset-to-base: "Reset" link → `templates:clearVariantOverride` → preview refresh
- Tier badge: "Variant" label to distinguish from analysis-tier rewrites
- Preload bridge additions
- `duplicateVariant()` extended to copy override rows for the new variant
- Tests: IPC handler round-trip; reset clears override; preview reflects reword; summary gate

---

### Phase 4: Excluded-Bullet Suggestions

**Rationale:** Depends on Phase 1 (entityOverrides table) and Phase 2 (inclusion un-exclusion in merge). Parallelizable with Phase 3.

**Delivers:**
- `buildScorerPrompt()` extended with `## Excluded Bullets (not on this variant)` section using `[EB{id}]` markers; capped at 20 from partially-excluded jobs only
- `ResumeScorerSchema` gains `excluded_bullet_suggestions: z.array(...).default([])`
- `runAnalysis()` computes `excludedBullets` post-merge, passes to scorer, calls `ensureExcludedBulletSuggestions()`
- `analysisExcludedBulletSuggestions` table populated; accept/dismiss/get handlers in `ai.ts`
- `acceptExcludedBulletSuggestion()`: validates `bulletId` exists in `job_bullets` AND is currently excluded before writing `entityOverrides`
- Preload bridge additions
- UI panel in `OptimizeVariant.tsx`: "Bullets you excluded that match this job" section; card with bullet text, reason, JD keywords; "Include for this job" / "Skip" actions; accepted → green state
- Excluded-bullet scoring is a separate optional call, NOT bundled into main analysis (user-triggered, not automatic)
- Tests: MockLanguageModelV3 with `excluded_bullet_suggestions`; hallucinated bulletId rejected; merge un-excludes bullet after acceptance; prompt includes excluded-bullets section

---

### Phase Ordering Rationale

- Phase 1 is the strict blocker — no other phase can start without the unified table and migration
- Phase 2 before Phase 3 and 4 — merge layer changes and new handlers must exist before UI can call them
- Phases 3 and 4 are parallelizable — Phase 3 is pure UI; Phase 4 is AI pipeline; neither depends on the other
- Grouping follows the "handler extraction → pure function → unit test" pattern established in v2.4

### Research Flags

**Phases needing design decisions before spec (not deeper research):**
- **Phase 1:** FK approach (generic `entity_id` vs per-entity nullable columns) — spec must commit before DDL
- **Phase 1:** `projects.description` column — explicitly in or out of scope; if deferred, scope project-description override out of Phase 2/3

**Phases with well-established patterns (skip research-phase):**
- **Phase 1:** `ensureSchema()`, `templateVariantItems` FK pattern, skill-category migration — direct codebase precedents
- **Phase 2:** `buildMergedBuilderData()` extension — structure clear, precedence algorithm fully specified in research
- **Phase 3:** `InlineEdit.tsx` reuse — no unknowns
- **Phase 4:** `analysisSkillAdditions` / `acceptSkillAddition` as the carbon-copy analog

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against package.json + source; no new dependencies required; all patterns confirmed in source files |
| Features | HIGH | Grounded in VariantBuilder.tsx, OptimizeVariant.tsx, InlineEdit.tsx, mergeHelper.ts; UX copy specifics are MEDIUM (convention-based) |
| Architecture | HIGH | Real source reading; all integration points named with file:function specificity; DDL and data flow both fully specified |
| Pitfalls | HIGH | Each pitfall tied to specific source lines; migration and merge ordering risks well-understood from existing codebase patterns |

**Overall confidence: HIGH**

### Gaps to Address

- **FK design decision** — per-entity nullable FK vs generic `entity_id`: must be recorded as a Key Decision in PROJECT.md at end of Phase 1
- **`projects.description` migration scope** — explicitly in or out of Phase 1 spec; ambiguity will block Phase 2/3 project-description overrides
- **Excluded-bullet `[EB{id}]` prompt stability** — validate during Phase 4 that the LLM returns the correct IDs; if not, add secondary text-match resolution path
- **`duplicateVariant()` gap** — currently copies `templateVariantItems` but not variant-tier overrides from `entityOverrides`; must be addressed in Phase 3 spec (add INSERT-SELECT for overrides in the duplicate transaction) or flagged as a known limitation

---

*Research completed: 2026-06-05*
*Ready for roadmap: yes*
