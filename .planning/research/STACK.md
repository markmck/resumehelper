# Stack Research

**Domain:** Electron desktop app — v2.6 Per-Variant Text Overrides + Excluded-Bullet Suggestions
**Researched:** 2026-06-05
**Confidence:** HIGH (all findings grounded in actual source code, no external lookups required)

---

## Verdict: No New Dependencies

Every capability needed for v2.6 is already provided by the installed stack. This is pure schema
work, application logic, and prompt engineering inside existing patterns.

---

## Existing Stack (Confirmed from package.json + source)

| Technology | Installed Version | Role in v2.6 |
|------------|------------------|--------------|
| `drizzle-orm` | ^0.45.1 | New `overrides` table definition + migration DATA move via `db.insert` |
| `better-sqlite3` | ^12.10.0 | `ALTER TABLE ... ADD COLUMN` in try/catch pattern for bootstrap migration; raw `sqlite.exec` for data migration transaction |
| `zod` | ^4.3.6 | Existing Zod schemas in `aiProvider.ts` expand to include excluded-bullet suggestion shape |
| `ai` (Vercel AI SDK) | ^6.0.136 | `generateObject` with expanded `ResumeScorerSchema` to emit excluded-bullet suggestions — same call pattern already used in `callResumeScorer` |
| `@ai-sdk/anthropic` / `@ai-sdk/openai` | ^3.0.63 / ^3.0.48 | No change — provider-agnostic `LanguageModel` interface unchanged |
| `react` + TypeScript | ^19.2.1 / ^5.9.3 | Renderer-side UI for variant-tier inline reword affordance — existing component patterns |
| `vitest` | ^4.1.2 | Existing `MockLanguageModelV3` pattern covers new prompt/schema tests |

---

## What v2.6 Needs and How Existing Pieces Cover It

### (a) Unified Polymorphic Overrides Table + Migration

**What is needed:**

1. A new `overrides` table in `schema.ts` (Drizzle table definition) covering all entity types
   and tiers in a single polymorphic shape.
2. The new table added to `ensureSchema()` in `db/index.ts` via `CREATE TABLE IF NOT EXISTS`.
3. A data migration that reads every existing `analysisBulletOverrides` row and writes it into
   the new `overrides` table, then (optionally) keeps the old table for a release cycle or drops
   it when no code references it.

**How existing stack covers it:**

- **Drizzle `sqliteTable`** — The `schema.ts` pattern for defining nullable FK columns is already
  established by `templateVariantItems`, which uses exactly the same polymorphic multi-FK shape
  (one row type, many nullable entity-id columns). The new `overrides` table follows that same
  pattern: nullable `variant_id`, nullable `analysis_id`, `entity_type TEXT`, `entity_id INTEGER`,
  `field TEXT`, `override_text TEXT`.
- **`ensureSchema()` bootstrap pattern** — `db/index.ts` already runs `CREATE TABLE IF NOT EXISTS`
  for every table and then a list of `ALTER TABLE ... ADD COLUMN` try/catch statements. The new
  table goes into the same `sqlite.exec(...)` block. No new migration infrastructure needed.
- **Data migration pattern** — The skill-category migration in `ensureSchema()` (lines 317–342 of
  `db/index.ts`) is the exact model to follow: wrap in `sqlite.transaction()`, read old rows with
  `sqlite.prepare(...).all()`, insert into new table, mark old rows migrated. Run once, idempotent
  guard via a sentinel check (e.g., check `overrides` row count vs `analysisBulletOverrides` count,
  or add a boolean migrated column to the old table). No new libraries needed.
- **`applyOverrides()` in `src/shared/overrides.ts`** — This function currently takes a flat
  `BulletOverride[]`. It will need to be generalized to accept the new polymorphic shape and apply
  by `(entity_type, entity_id, field)` key. This is pure TypeScript refactoring — no new library.
- **`buildMergedBuilderData()` in `mergeHelper.ts`** — Currently reads from `analysisBulletOverrides`
  for Layer 3. After migration it reads from `overrides` filtered by `analysis_id IS NOT NULL` for
  analysis-tier rows and by `variant_id IS NOT NULL` for variant-tier rows. The merge precedence
  logic (analysis wins over variant wins over base) is three Map lookups in sequence — pure code.

**Drizzle ORM conflict target note:** `acceptSuggestion` in `ai.ts` uses
`.onConflictDoUpdate({ target: [analysisBulletOverrides.analysisId, analysisBulletOverrides.bulletId] })`.
The new `overrides` table needs a UNIQUE constraint on `(variant_id, analysis_id, entity_type, entity_id, field)`
(NULLs excluded from uniqueness in SQLite, so variant-tier and analysis-tier rows won't collide on
the same entity). Drizzle's `onConflictDoUpdate` supports multi-column targets — already used in
`ai.ts`, no API gap.

---

### (b) Excluded-Bullet Suggestions During Job Analysis

**What is needed:**

1. During `runAnalysis()`, after building the variant-merged resume, also collect the bullets that
   the variant EXCLUDES from the base experience.
2. Pass those excluded bullets to the LLM (appended to the scorer prompt) with a new instruction:
   "Here are bullets this variant omits — recommend any that are relevant to the JD gaps."
3. The LLM returns a new field alongside `rewrite_suggestions` — a list of excluded-bullet
   re-include suggestions with `bullet_id` and `reason`.
4. Persisting "accepted re-include" decisions: an accepted suggestion adds a row to `overrides`
   (analysis tier, `entity_type = 'bullet'`, `entity_id = bulletId`, `field = 'included'`,
   `override_text = 'true'`) — or alternatively a simpler boolean column in a new
   `analysis_bullet_inclusions` table, mirroring how `analysisSkillAdditions` works.
5. `buildMergedBuilderData()` Layer 3 checks for analysis-tier inclusion overrides on excluded
   bullets and re-includes them.

**How existing stack covers it:**

- **Excluded-bullet enumeration** — `buildMergedBuilderData()` already produces `excluded: true`
  on bullets in `jobsWithBullets`. The `runAnalysis` handler calls `buildMergedBuilderData(db, variantId)`
  (no `analysisId` at this point). Collecting excluded bullets is a simple filter: after the
  merge, iterate `merged.jobs`, then `job.bullets`, collect those with `excluded === true`.
  No new library.
- **Prompt expansion** — `buildScorerPrompt()` in `analysisPrompts.ts` currently takes
  `(resumeText, parsedJob)`. Add a third optional `excludedBullets` parameter, appended as a new
  section in the prompt string. Same string-building pattern already used throughout the file.
- **Schema extension** — `ResumeScorerSchema` in `aiProvider.ts` is a Zod object. Add a new
  optional field: `excluded_bullet_suggestions: z.array(z.object({ bullet_id: z.number(), reason: z.string() })).optional()`. The Vercel AI SDK `generateObject` call auto-retries on schema
  mismatch — the optional field means old LLM responses without the field still parse cleanly.
- **Persistence** — The `analysisSkillAdditions` table and its accept/dismiss handler pattern in
  `ai.ts` is the direct analog. A parallel `analysis_bullet_inclusions` table
  (`id, analysis_id, bullet_id, reason, status`) follows identical structure. Handlers
  `acceptBulletInclusion` / `dismissBulletInclusion` are carbon-copies of `acceptSkillAddition` /
  `dismissSkillAddition`. Alternatively, route through the new unified `overrides` table with
  `field = 'included'` — either approach uses only existing Drizzle + better-sqlite3.
- **Merge integration** — `buildMergedBuilderData()` Layer 3 already iterates `job.bullets` to
  apply text overrides. Add a second pass: for any bullet with `excluded === true`, check the
  inclusion override set; if present and accepted, flip `excluded` to `false`. This is 5–8 lines
  of pure TypeScript inside the existing merge function.

---

## What NOT to Add

| Do Not Add | Why |
|------------|-----|
| Any ORM migration library (e.g. `drizzle-kit` push, `knex`, `umzug`) | Established decision: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` try/catch in `ensureSchema()`. File-based migrations were ruled fragile. |
| A JSON-patch or deep-merge library | The merge logic is simple enough to express in 3 Map lookups. Adding a dep for this is pure overhead. |
| A state management library (Redux, Zustand, Jotai) | Existing renderer uses local React state + IPC. Variant-tier override edits are per-field IPC writes, same pattern as `acceptSuggestion`. |
| A rich text editor library | The reword UI is a plain `<textarea>` or `<input>` — same `InlineEdit.tsx` component pattern already in the codebase. |
| A prompt-builder or template library | `analysisPrompts.ts` builds prompts as template literals. That's sufficient and consistent. |
| Additional AI provider packages | Provider-agnostic `LanguageModel` interface via `getModel()` already covers Claude and OpenAI. |

---

## Integration Points in Existing Code

| File | What Changes |
|------|-------------|
| `src/main/db/schema.ts` | Add `overrides` table definition (Drizzle `sqliteTable`) |
| `src/main/db/index.ts` | Add `CREATE TABLE IF NOT EXISTS overrides` in `ensureSchema()`; add data migration block to copy `analysisBulletOverrides` rows; add `ALTER TABLE` entries if new columns needed on existing tables |
| `src/shared/overrides.ts` | Generalize `applyOverrides()` to work with `(entity_type, entity_id, field)` key; update `BulletOverride` type |
| `src/main/lib/mergeHelper.ts` | Replace `analysisBulletOverrides` query with `overrides` query; add variant-tier override layer (between current Layer 2 and Layer 3); add analysis-tier re-inclusion pass for excluded bullets |
| `src/main/lib/analysisPrompts.ts` | Extend `buildScorerPrompt()` to accept and embed excluded bullet list |
| `src/main/lib/aiProvider.ts` | Extend `ResumeScorerSchema` with optional `excluded_bullet_suggestions` field |
| `src/main/handlers/ai.ts` | Collect excluded bullets post-merge; pass to scorer; persist inclusion decisions; add `acceptBulletInclusion` / `dismissBulletInclusion` handlers |
| `src/renderer/src/components/OptimizeVariant.tsx` | Surface excluded-bullet suggestions alongside existing gap/skill cards |
| New: `src/renderer/src/components/[VariantRewordUI].tsx` | Inline reword affordance at variant tier — follows `InlineEdit.tsx` pattern, IPC writes to `overrides` table |

---

## Migration Strategy for `analysisBulletOverrides` Data

The skill-tag-to-skill_categories migration in `db/index.ts` (lines 317–342) is the template:

1. Check if migration is needed: `SELECT COUNT(*) FROM analysis_bullet_overrides WHERE migrated != 1`
   (add `migrated INTEGER DEFAULT 0` column via `ALTER TABLE` try/catch, or just use
   `SELECT COUNT(*) FROM overrides WHERE analysis_id IS NOT NULL AND entity_type = 'bullet'`
   compared to `analysisBulletOverrides` count as the idempotency guard).
2. Wrap in `sqlite.transaction()`.
3. Read all `analysisBulletOverrides` rows with `sqlite.prepare(...).all()`.
4. Insert each into `overrides` with `entity_type = 'bullet'`, `entity_id = bullet_id`,
   `field = 'text'`, `variant_id = NULL`, `analysis_id = analysis_id`.
5. The old table stays (no DROP) — existing `onConflictDoUpdate` references in `ai.ts` can be
   updated to point to `overrides` in the same PR, or kept temporarily while the new table is
   primary.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| No new dependencies needed | HIGH | Every required capability verified against actual installed packages and source patterns |
| Schema design (polymorphic overrides) | HIGH | `templateVariantItems` in `schema.ts` is the direct analog already in production |
| Data migration approach | HIGH | Skill-category migration in `db/index.ts` lines 317–342 is the exact proven pattern |
| Prompt expansion | HIGH | `analysisPrompts.ts` uses plain string building; schema extension via Zod optional field is standard |
| Merge layer extension | HIGH | `buildMergedBuilderData()` structure is clear and the extension points are explicit |
| UI pattern | HIGH | `InlineEdit.tsx` + IPC write pattern covers variant-tier reword; `OptimizeVariant.tsx` covers suggestion display |

---

## Sources

- `src/main/db/schema.ts` — current table definitions; `analysisBulletOverrides` and `templateVariantItems` as design precedents
- `src/main/db/index.ts` — `ensureSchema()` migration pattern; skill-category data migration at lines 317–342
- `src/main/lib/mergeHelper.ts` — three-layer merge; integration points for variant-tier and re-inclusion passes
- `src/shared/overrides.ts` — `applyOverrides()` current interface; extension target
- `src/main/handlers/ai.ts` — `acceptSuggestion`, `acceptSkillAddition` patterns; `runAnalysis` flow showing where excluded-bullet collection slots in
- `src/main/lib/aiProvider.ts` — `ResumeScorerSchema` (Zod extension point); `generateObject` call pattern
- `src/main/lib/analysisPrompts.ts` — `buildScorerPrompt` signature; prompt string construction pattern
- `package.json` — confirmed installed versions of all packages

---
*Stack research for: ResumeHelper v2.6 Per-Variant Text Overrides + Excluded-Bullet Suggestions*
*Researched: 2026-06-05*
