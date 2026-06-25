# Architecture Research

**Domain:** ResumeHelper v2.6 — Per-Variant Text Overrides + Excluded-Bullet Suggestions
**Researched:** 2026-06-05
**Confidence:** HIGH — grounded in real source files, no speculation

---

## Context: What Already Exists

The v2.5 codebase has a single authoritative merge path:

```
buildMergedBuilderData(db, variantId, analysisId?)   ← src/main/lib/mergeHelper.ts
  Layer 1: base data (jobs, bullets, projects, skills, ...)
  Layer 2: variant exclusions via templateVariantItems (excluded boolean)
  Layer 3: analysisBulletOverrides → applyOverrides() rewrites bullet .text
          analysisSkillAdditions → pushes accepted skills into the array
  → MergedBuilderData

Consumers (ALL call buildMergedBuilderData):
  templates:getBuilderData     → VariantBuilder preview
  export:pdf/docx              → src/main/handlers/export.ts
  buildSnapshotForVariant()    → src/main/handlers/submissions.ts
  runAnalysis()                → src/main/handlers/ai.ts (no analysisId, variant-only)
  buildVariantResumeJson()     → src/main/lib/variantResumeBuilder.ts
```

`applyOverrides()` lives in `src/shared/overrides.ts` and today only handles bullet-text substitution via a `Map<bulletId, overrideText>`. It is called from `mergeHelper.ts` lines 295-297 after fetching `analysisBulletOverrides` rows.

The existing override table:
```sql
analysis_bullet_overrides (
  id, analysis_id NOT NULL FK, bullet_id NOT NULL FK,
  override_text NOT NULL, source, suggestion_id, created_at,
  UNIQUE(analysis_id, bullet_id)
)
```

---

## Part A: Unified `overrides` Table — Exact Shape

### Decision: Replace, not extend

`analysisBulletOverrides` covers exactly one entity type (`job_bullet`) and exactly one scope (analysis). The new table must cover: `job_bullet`, `project_bullet`, `summary`, `job_title`, `job_company`, `project_name`, and any future scalar field — at both the variant tier and the analysis tier.

A single polymorphic table is the correct choice (confirmed by milestone brief). Extending `analysisBulletOverrides` with nullable columns would create an invalid hybrid that cannot express variant-scoped overrides cleanly.

### Proposed DDL

```sql
CREATE TABLE IF NOT EXISTS `entity_overrides` (
  `id`             integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `variant_id`     integer REFERENCES `template_variants`(`id`) ON DELETE cascade,
  `analysis_id`    integer REFERENCES `analysis_results`(`id`) ON DELETE cascade,
  `entity_type`    text NOT NULL,
  `entity_id`      integer NOT NULL,
  `field`          text NOT NULL,
  `override_text`  text NOT NULL,
  `source`         text NOT NULL DEFAULT 'user',
  `created_at`     integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`variant_id`, `analysis_id`, `entity_type`, `entity_id`, `field`)
);
```

### NULL semantics — critical rule

| variant_id | analysis_id | Meaning |
|-----------|-------------|---------|
| NOT NULL  | NULL        | Variant-tier override — applies across all analyses for this variant |
| NOT NULL  | NOT NULL    | Analysis-tier override — overrides the variant-tier value for this specific analysis |
| NULL      | NOT NULL    | INVALID — forbidden by application logic (analysis always has a variant) |
| NULL      | NULL        | INVALID — must have at least one scope |

The UNIQUE constraint uses `UNIQUE(variant_id, analysis_id, entity_type, entity_id, field)`. SQLite NULLs are distinct in UNIQUE constraints, so `(variantId=1, analysisId=NULL, ...)` and `(variantId=1, analysisId=5, ...)` are unique independently — correct behavior.

Because SQLite treats NULL != NULL in UNIQUE indexes, a partial index is needed for the variant-only case to prevent duplicate variant-tier rows:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS `entity_overrides_variant_only_uidx`
  ON `entity_overrides` (`variant_id`, `entity_type`, `entity_id`, `field`)
  WHERE `analysis_id` IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS `entity_overrides_analysis_uidx`
  ON `entity_overrides` (`analysis_id`, `entity_type`, `entity_id`, `field`)
  WHERE `analysis_id` IS NOT NULL;
```

These two partial indexes replace the composite UNIQUE on the table itself for the two valid cases.

### entity_type enumeration

```
'job_bullet'        entity_id = job_bullets.id,      field = 'text'
'project_bullet'    entity_id = project_bullets.id,   field = 'text'
'summary'           entity_id = 1 (sentinel),          field = 'text'
'job_title'         entity_id = jobs.id,              field = 'role'
'job_company'       entity_id = jobs.id,              field = 'company'
'project_name'      entity_id = projects.id,          field = 'name'
```

Using separate entity_type values for `job_title` vs `job_company` (both on jobs.id) avoids ambiguity. The `field` column is technically redundant given type-per-field naming, but keeping it allows future multi-field entities without a new entity_type and provides self-documentation.

### source values

```
'user'          — user typed directly into the reword UI
'ai_suggestion' — user accepted an LLM rewrite suggestion
'inclusion'     — analysis accepted an excluded-bullet inclusion suggestion
```

### Migration of analysisBulletOverrides

This is a data migration, not just a schema migration. The existing rows must survive.

**Migration approach — inline in `ensureSchema()`, wrapped in a transaction:**

```sql
-- Step 1: Create new table (CREATE TABLE IF NOT EXISTS — idempotent)
-- Step 2: Migrate existing rows (INSERT OR IGNORE — idempotent)
INSERT OR IGNORE INTO entity_overrides
  (variant_id, analysis_id, entity_type, entity_id, field, override_text, source, created_at)
SELECT
  ar.variant_id,          -- NOT NULL per analysisResults schema
  abo.analysis_id,
  'job_bullet',
  abo.bullet_id,
  'text',
  abo.override_text,
  abo.source,
  abo.created_at
FROM analysis_bullet_overrides abo
JOIN analysis_results ar ON ar.id = abo.analysis_id;
-- Step 3: Keep analysis_bullet_overrides table intact for the transition phase
--         (drop it only after all reads/writes are fully migrated)
```

The migration runs inside a `sqlite.transaction()` in `ensureSchema()` guarded by:
```sql
SELECT COUNT(*) FROM analysis_bullet_overrides WHERE id NOT IN (
  SELECT eo.entity_id FROM entity_overrides eo
  WHERE eo.entity_type = 'job_bullet' AND eo.analysis_id = analysis_bullet_overrides.analysis_id
)
```
If count is 0, skip — idempotent.

**schema.ts change:** Add `entityOverrides` Drizzle table definition. Keep `analysisBulletOverrides` in schema.ts until the old table is dropped (a later phase). Remove it from schema.ts only when `DROP TABLE IF EXISTS analysis_bullet_overrides` is added to `ensureSchema()`.

**No dual-write needed** — once `mergeHelper.ts` reads from `entity_overrides`, the old table is read-only legacy. `acceptSuggestion()` in `ai.ts` writes to `entity_overrides` from day one of the migration phase.

---

## Part B: applyOverrides / buildMergedBuilderData Changes

### What changes in mergeHelper.ts

Layer 3 must be rewritten to query `entity_overrides` instead of `analysisBulletOverrides`, and must apply overrides across all entity types, not just bullets.

**Precedence algorithm — analysis → variant → base:**

```typescript
// Fetch all relevant overrides in one query (two rows max per field per entity)
const overrideRows = db.select().from(entityOverrides)
  .where(
    or(
      // variant-tier: applies to this variant regardless of analysis
      and(eq(entityOverrides.variantId, variantId), isNull(entityOverrides.analysisId)),
      // analysis-tier: applies only to this specific analysis
      analysisId != null
        ? and(eq(entityOverrides.variantId, variantId), eq(entityOverrides.analysisId, analysisId))
        : sql`0`
    )
  )
  .all()

// Build a lookup: key = `${entityType}:${entityId}:${field}` → overrideText
// Analysis-tier wins over variant-tier when both exist for same key
const overrideMap = new Map<string, string>()

// Pass 1: variant-tier (lower priority)
for (const row of overrideRows.filter(r => r.analysisId == null)) {
  overrideMap.set(`${row.entityType}:${row.entityId}:${row.field}`, row.overrideText)
}
// Pass 2: analysis-tier (higher priority, overwrites)
for (const row of overrideRows.filter(r => r.analysisId != null)) {
  overrideMap.set(`${row.entityType}:${row.entityId}:${row.field}`, row.overrideText)
}

function getOverride(type: string, id: number, field: string): string | undefined {
  return overrideMap.get(`${type}:${id}:${field}`)
}
```

**Application points within buildMergedBuilderData:**

```typescript
// After building jobsWithBullets:
for (const job of jobsWithBullets) {
  job.role    = getOverride('job_title',   job.id, 'role')    ?? job.role
  job.company = getOverride('job_company', job.id, 'company') ?? job.company
  for (const bullet of job.bullets) {
    bullet.text = getOverride('job_bullet', bullet.id, 'text') ?? bullet.text
  }
}

// After building projectsWithBullets:
for (const project of projectsWithBullets) {
  project.name = getOverride('project_name', project.id, 'name') ?? project.name
  for (const bullet of project.bullets) {
    bullet.text = getOverride('project_bullet', bullet.id, 'text') ?? bullet.text
  }
}

// summary override — profile.summary is fetched separately in callers,
// but the override lives here because it's variant/analysis scoped:
// Return summaryOverride: string | undefined from buildMergedBuilderData
// so callers can splice it in when building resumeText / snapshot.
```

**MergedBuilderData type change:**

```typescript
export type MergedBuilderData = {
  // ... existing fields ...
  showSummary: boolean
  summaryOverride?: string   // NEW — variant/analysis-tier reword of profile.summary
}
```

Callers that use `summary` (snapshot, PDF, DOCX) pick up `summaryOverride ?? profileRow.summary`.

### What changes in applyOverrides (src/shared/overrides.ts)

`applyOverrides()` today is a bullet-only function. It can be retired or generalized. Given it's only called from `mergeHelper.ts`, the cleanest move is to inline the logic into `mergeHelper.ts`'s new `getOverride()` helper and delete `applyOverrides()` — or keep it as a pure utility for the bullet case to avoid test churn. Decision: keep signature intact but delegate to the new `getOverride` map internally. The exported `BulletOverride` and `SkillAddition` interfaces in `src/shared/overrides.ts` stay; add `EntityOverride` interface there.

---

## Part C: Excluded-Bullet Suggestions in the Analysis Run

### What the LLM needs

`runAnalysis()` in `src/main/handlers/ai.ts` currently calls:
```typescript
const merged = await buildMergedBuilderData(db, variantId)  // no analysisId
```
This gives only bullets that are INCLUDED in the variant. The LLM scores against those bullets.

For excluded-bullet suggestions, the LLM needs to see the excluded bullets separately so it can say: "Bullet B42 is excluded from your variant but matches a gap in the JD — consider re-including it for this job."

**What to pass the LLM:**

```typescript
// After building merged (included bullets), also build excluded set:
const allBullets = ... // already fetched in mergeHelper Layer 1
const includedBulletIds = new Set(merged.jobs.flatMap(j => j.bullets.filter(b => !b.excluded).map(b => b.id)))
const excludedBullets = allBullets.filter(b => !includedBulletIds.has(b.id))

// Add to scorer prompt:
const excludedBulletsText = excludedBullets.map(b => `[EB${b.id}] ${b.text}`).join('\n')
```

The scorer prompt gets a new section appended:

```
## Excluded Bullets (not on this variant — consider suggesting re-inclusion)
[EB42] Led migration of legacy monolith to microservices architecture
[EB17] Reduced CI pipeline duration by 40% through parallelization
...
```

### New Zod schema for suggestions

Extend `ResumeScorerSchema` in `src/main/lib/aiProvider.ts`:

```typescript
export const ResumeScorerSchema = z.object({
  // ... existing fields ...
  excluded_bullet_suggestions: z.array(
    z.object({
      bullet_id: z.number(),        // matches [EB{id}] marker
      bullet_text: z.string(),       // original text for UI display without a second query
      reason: z.string(),            // why it's relevant to this JD
      target_keywords: z.array(z.string()),  // JD keywords it addresses
    })
  ).default([]),
})
```

Adding `.default([])` means existing test mocks with `rewrite_suggestions: []` continue to pass — no backward-compat break.

### Storage — new table

Excluded-bullet suggestions are analysis-scoped and user-actionable (accept/dismiss). They follow the same pattern as `analysisSkillAdditions`:

```sql
CREATE TABLE IF NOT EXISTS `analysis_excluded_bullet_suggestions` (
  `id`            integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `analysis_id`   integer NOT NULL REFERENCES `analysis_results`(`id`) ON DELETE cascade,
  `bullet_id`     integer NOT NULL REFERENCES `job_bullets`(`id`) ON DELETE cascade,
  `bullet_text`   text NOT NULL,
  `reason`        text NOT NULL DEFAULT '',
  `target_keywords` text NOT NULL DEFAULT '[]',
  `status`        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'dismissed'
  `created_at`    integer NOT NULL DEFAULT (unixepoch()),
  UNIQUE (`analysis_id`, `bullet_id`)
);
```

### How accept persists an inclusion override

When the user accepts an excluded-bullet suggestion:

1. Update `analysis_excluded_bullet_suggestions.status = 'accepted'` for that (analysisId, bulletId)
2. Insert into `entity_overrides`:
   ```typescript
   db.insert(entityOverrides).values({
     variantId: analysisResult.variantId,   // from analysisResults row
     analysisId: analysisId,
     entityType: 'job_bullet',
     entityId: bulletId,
     field: 'text',
     overrideText: bulletText,              // original text — no reword, re-inclusion only
     source: 'inclusion',
   }).onConflictDoUpdate({ ... }).run()
   ```
3. The bullet is now present in `entity_overrides` with the analysis scope. When `buildMergedBuilderData(db, variantId, analysisId)` runs, the bullet's text resolves to `overrideText` (the original text). But the bullet is still `excluded: true` in the variant layer — the override text alone does not un-exclude it.

**Critical: un-excluding the bullet at the analysis tier.**

The current model only has exclusion at the variant tier (via `templateVariantItems`). An analysis-tier inclusion must override the exclusion. This requires a small extension to `buildMergedBuilderData`:

```typescript
// NEW: fetch analysis-tier inclusion overrides
const analysisInclusionBulletIds = new Set<number>()
if (analysisId != null) {
  const inclusionRows = db.select({ entityId: entityOverrides.entityId })
    .from(entityOverrides)
    .where(and(
      eq(entityOverrides.analysisId, analysisId),
      eq(entityOverrides.entityType, 'job_bullet'),
      eq(entityOverrides.source, 'inclusion'),
    ))
    .all()
  for (const row of inclusionRows) analysisInclusionBulletIds.add(row.entityId)
}

// When building jobsWithBullets, override excluded flag:
bullets: (bulletsByJobId.get(job.id) ?? []).map(b => ({
  id: b.id,
  text: getOverride('job_bullet', b.id, 'text') ?? b.text,
  sortOrder: b.sortOrder,
  excluded: excludedBulletIds.has(b.id) && !analysisInclusionBulletIds.has(b.id),
  //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //         variant says excluded           analysis inclusion overrides it
})),
```

This is clean — the variant still excludes the bullet (immutable), but the analysis layer says "include anyway for this job." Snapshots freeze the merged result, so the snapshot will have `excluded: false` for that bullet when `analysisId` was provided.

### New IPC handlers in ai.ts

```typescript
// Store suggestions after analysis run (called at end of runAnalysis)
export function ensureExcludedBulletSuggestions(db, analysisId, suggestions)

// Accept — writes entity_overrides + updates status
export function acceptExcludedBulletSuggestion(db, analysisId, bulletId)

// Dismiss — updates status only
export function dismissExcludedBulletSuggestion(db, analysisId, bulletId)

// Retrieve for UI
export function getExcludedBulletSuggestions(db, analysisId)
```

IPC channel names follow existing pattern: `ai:acceptExcludedBulletSuggestion`, etc.

---

## Part D: Snapshot Correctness

**No special snapshot work required.** Snapshots are correct because:

1. `buildSnapshotForVariant(db, variantId, analysisId?)` calls `buildMergedBuilderData(db, variantId, analysisId)`.
2. `buildMergedBuilderData` now applies all override tiers (variant + analysis) before returning.
3. The returned `MergedBuilderData` has overridden `.text` values already baked in, and `.excluded` flags correctly reflect analysis-tier inclusions.
4. `buildSnapshotForVariant` spreads the result directly into `resumeSnapshot` JSON.
5. `summaryOverride` from `MergedBuilderData` must be spliced into `frozenProfile.summary` inside `buildSnapshotForVariant`:

```typescript
const frozenProfile = profileRow ? {
  name: profileRow.name,
  email: profileRow.email,
  phone: profileRow.phone,
  location: profileRow.location,
  linkedin: profileRow.linkedin,
  summary: merged.summaryOverride ?? profileRow.summary ?? undefined,
} : undefined
```

The snapshot is a frozen JSON blob — any override text present at submit time is frozen verbatim. No post-hoc lookup from live override tables. This is already how bullet overrides work today.

**Edge case — orphaned overrides in snapshots:** If a bullet's override row is deleted after a snapshot was taken, the snapshot is unaffected (it stores the merged text, not references). Existing behavior. No change.

**Variant-tier overrides and snapshot identity:** If the user rewrites a variant-tier bullet text and then submits, the snapshot captures the reworded text. The raw base text is not in the snapshot. This is the desired behavior — the snapshot represents what was sent.

---

## Part E: System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Renderer (React)                                  │
│  VariantBuilder  VariantEditor  OptimizeVariant  AnalysisResults            │
│  [new] InlineRewordUI           [new] ExcludedBulletSuggestions             │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │ IPC (contextBridge)
┌───────────────────────────────▼────────────────────────────────────────────┐
│                         Main Process (Electron)                              │
│                                                                              │
│  handlers/ai.ts          handlers/templates.ts    handlers/submissions.ts   │
│  [mod] runAnalysis()     [unchanged merge call]   [unchanged merge call]     │
│  [new] acceptVariantOverride()                                               │
│  [new] getVariantOverrides()                                                 │
│  [new] ensureExcludedBulletSuggestions()                                    │
│  [new] acceptExcludedBulletSuggestion()                                     │
│  [new] dismissExcludedBulletSuggestion()                                    │
│  [new] getExcludedBulletSuggestions()                                       │
│                                                                              │
│  lib/mergeHelper.ts  ←————————————————— MODIFIED                            │
│  [mod] buildMergedBuilderData()                                              │
│        Layer 3 reads entity_overrides (replaces analysisBulletOverrides)    │
│        Applies variant-tier + analysis-tier overrides                        │
│        Honors analysis-tier inclusion un-exclusions                          │
│                                                                              │
│  lib/aiProvider.ts  ←——————————————————— MODIFIED                           │
│  [mod] ResumeScorerSchema + excluded_bullet_suggestions field                │
│  [mod] buildScorerPrompt() — new excluded bullets section                   │
│                                                                              │
│  shared/overrides.ts  ←————————————————— MODIFIED (interface additions)     │
│  [mod] Add EntityOverride interface                                          │
│  [keep] applyOverrides() — may be retired or kept as utility                │
│                                                                              │
│  db/schema.ts  ←———————————————————————— MODIFIED                           │
│  [new] entityOverrides table                                                 │
│  [new] analysisExcludedBulletSuggestions table                              │
│  [keep] analysisBulletOverrides — until migration verified + dropped        │
│                                                                              │
│  db/index.ts  ←————————————————————————— MODIFIED                           │
│  [new] ensureSchema: CREATE TABLE entity_overrides + partial indexes        │
│  [new] ensureSchema: CREATE TABLE analysis_excluded_bullet_suggestions      │
│  [new] ensureSchema: migration of analysisBulletOverrides rows              │
└────────────────────────────────────────────────────────────────────────────┘
                                │
                     SQLite (better-sqlite3)
                     entity_overrides  (NEW)
                     analysis_excluded_bullet_suggestions  (NEW)
                     analysis_bullet_overrides  (EXISTING — migration source)
```

---

## Part F: Component Boundaries — New vs Modified

### New components

| Component | File | Purpose |
|-----------|------|---------|
| `entityOverrides` Drizzle table | `src/main/db/schema.ts` | ORM definition for unified override table |
| `analysisExcludedBulletSuggestions` Drizzle table | `src/main/db/schema.ts` | ORM definition for suggestion table |
| `acceptVariantOverride()` | `src/main/handlers/templates.ts` | Write variant-tier override to entity_overrides |
| `getVariantOverrides()` | `src/main/handlers/templates.ts` | Read all variant overrides for UI display |
| `ensureExcludedBulletSuggestions()` | `src/main/handlers/ai.ts` | Store LLM excluded-bullet suggestions post-analysis |
| `acceptExcludedBulletSuggestion()` | `src/main/handlers/ai.ts` | Accept inclusion + write entity_overrides |
| `dismissExcludedBulletSuggestion()` | `src/main/handlers/ai.ts` | Update suggestion status to dismissed |
| `getExcludedBulletSuggestions()` | `src/main/handlers/ai.ts` | Retrieve for OptimizeVariant UI |
| Variant reword inline UI | `src/renderer/src/components/VariantEditor.tsx` (new section) | Click-to-reword for each overridable field |
| Excluded bullet panel | `src/renderer/src/components/OptimizeVariant.tsx` (new section) | Surface re-inclusion suggestions |

### Modified components

| Component | File | Change |
|-----------|------|--------|
| `buildMergedBuilderData()` | `src/main/lib/mergeHelper.ts` | Layer 3 rewrites to query entity_overrides; applies multi-field overrides; analysis-tier inclusion un-exclusion |
| `MergedBuilderData` type | `src/main/lib/mergeHelper.ts` | Add `summaryOverride?: string` |
| `buildSnapshotForVariant()` | `src/main/handlers/submissions.ts` | Splice `summaryOverride` into frozen profile.summary |
| `runAnalysis()` | `src/main/handlers/ai.ts` | Pass excluded bullets to scorer prompt; call `ensureExcludedBulletSuggestions` after storing results |
| `ResumeScorerSchema` | `src/main/lib/aiProvider.ts` | Add `excluded_bullet_suggestions` array field |
| `buildScorerPrompt()` | `src/main/lib/analysisPrompts.ts` | New section in prompt for excluded bullets |
| `src/shared/overrides.ts` | `src/shared/overrides.ts` | Add `EntityOverride` interface; `applyOverrides` may be retired |
| `ensureSchema()` | `src/main/db/index.ts` | New tables; partial indexes; migration block |
| `createTestDb()` | `tests/helpers/db.ts` | Mirror schema additions (must stay in sync) |

---

## Part G: Data Flow

### Variant-tier reword flow

```
User edits text in VariantEditor
  → IPC: templates:setVariantOverride(variantId, entityType, entityId, field, text)
  → acceptVariantOverride(db, variantId, null, entityType, entityId, field, text)
  → INSERT OR REPLACE INTO entity_overrides (variant_id=V, analysis_id=NULL, ...)
  → IPC response: { success: true }
  → VariantEditor re-fetches preview via templates:getBuilderData(variantId)
  → buildMergedBuilderData applies variant-tier override → overridden text in preview
```

### Analysis-tier reword flow (existing bullet rewrites, migrated)

```
User clicks "Accept" on a rewrite suggestion in OptimizeVariant
  → IPC: ai:acceptSuggestion(analysisId, bulletId, text)  [channel name unchanged]
  → acceptSuggestion(db, analysisId, bulletId, text)
  → INSERT OR REPLACE INTO entity_overrides (variant_id=V, analysis_id=A, entity_type='job_bullet', ...)
  → Preview re-renders via buildMergedBuilderData(db, variantId, analysisId)
  → Analysis-tier override wins over variant-tier for this bullet
```

### Excluded-bullet suggestion flow

```
runAnalysis():
  1. buildMergedBuilderData(db, variantId) → includedBullets
  2. Compute excludedBullets = allBullets - includedBullets
  3. Build scorer prompt with excluded bullets section
  4. callResumeScorer() returns excluded_bullet_suggestions[]
  5. ensureExcludedBulletSuggestions(db, analysisId, suggestions)
     → INSERT INTO analysis_excluded_bullet_suggestions (idempotent)

User views OptimizeVariant:
  → IPC: ai:getExcludedBulletSuggestions(analysisId)
  → Returns pending suggestions with bullet text + reason

User accepts inclusion:
  → IPC: ai:acceptExcludedBulletSuggestion(analysisId, bulletId)
  → acceptExcludedBulletSuggestion(db, analysisId, bulletId):
      UPDATE status='accepted' in analysis_excluded_bullet_suggestions
      INSERT entity_overrides (source='inclusion', overrideText=originalText)
  → Preview re-fetches with analysisId
  → buildMergedBuilderData detects inclusion override → bullet.excluded = false
  → Bullet appears in preview/export/snapshot
```

### Snapshot correctness flow

```
createSubmission(db, { variantId, analysisId }):
  → buildSnapshotForVariant(db, variantId, analysisId)
  → buildMergedBuilderData(db, variantId, analysisId)
      variant-tier overrides applied (job/project text rewrites)
      analysis-tier overrides applied (bullet rewrites + inclusions)
      analysis-tier inclusions un-exclude bullets
  → frozen profile with summaryOverride spliced in
  → JSON.stringify(snapshot) → stored in submissions.resume_snapshot
  → Snapshot is immutable: contains merged text, not override references
```

---

## Part H: Suggested Build Order

Dependencies constrain sequencing. Every later phase depends on the schema and merge changes from earlier phases.

### Phase 1: Schema + Migration (blocker for everything)

**Deliver:**
- `entity_overrides` table DDL in `schema.ts` + `index.ts` (`ensureSchema`)
- Two partial unique indexes
- `analysis_excluded_bullet_suggestions` table DDL
- Migration block: copy `analysisBulletOverrides` rows → `entity_overrides`
- Update `createTestDb()` in `tests/helpers/db.ts` to include new tables
- `acceptSuggestion()` in `ai.ts` writes to `entity_overrides` (not `analysisBulletOverrides`)
- `mergeHelper.ts` Layer 3 reads from `entity_overrides` (precedence-aware)
- `applyOverrides()` usage retired in `mergeHelper.ts`
- `dismissSuggestion()` and `getOverrides()` updated to read `entity_overrides`
- Tests: migration idempotency, precedence (analysis wins over variant wins over base)

**Why first:** Everything else — variant UI, excluded suggestions, snapshot — reads from `entity_overrides`. No UI is possible without this.

### Phase 2: Merge Precedence — Multi-field Support

**Deliver:**
- `buildMergedBuilderData` applies overrides to `job.role`, `job.company`, `project.name`, `profile.summary` (via `summaryOverride`)
- `MergedBuilderData` type gains `summaryOverride?: string`
- `buildSnapshotForVariant` splices `summaryOverride` into frozen profile
- `acceptVariantOverride()` handler + IPC registration in `templates.ts`
- `getVariantOverrides()` handler + IPC registration
- Analysis-tier inclusion un-exclusion logic in `buildMergedBuilderData`
- Tests: multi-field override precedence, snapshot summary override, inclusion un-exclusion

**Why second:** Variant reword UI (Phase 3) calls `acceptVariantOverride`. Excluded-bullet suggestions (Phase 4) need the inclusion un-exclusion logic in merge.

### Phase 3: Variant Reword UI

**Deliver:**
- Inline reword affordance in `VariantEditor.tsx` for: summary, job role/company, project name, bullet text
- Preload bridge: `templates:setVariantOverride`, `templates:getVariantOverrides`
- Display current override text vs base text
- Revert-to-base action (DELETE from entity_overrides)
- Visual indicator when a field has a variant-tier override
- Tests: handler round-trip, revert clears override, preview reflects reword

**Why third:** Pure UI built on top of Phase 2 handlers. No AI pipeline changes needed here.

### Phase 4: Excluded-Bullet Suggestions

**Deliver:**
- `buildScorerPrompt()` gains excluded-bullets section (with `[EB{id}]` markers)
- `ResumeScorerSchema` gains `excluded_bullet_suggestions` field with `.default([])`
- `runAnalysis()` computes `excludedBullets`, passes to prompt, calls `ensureExcludedBulletSuggestions()`
- New handlers: `ensureExcludedBulletSuggestions`, `acceptExcludedBulletSuggestion`, `dismissExcludedBulletSuggestion`, `getExcludedBulletSuggestions`
- Preload bridge for new channels
- UI panel in `OptimizeVariant.tsx`: "Re-include for this job?" suggestions
- Tests: schema additions in MockLanguageModelV3 response; acceptance writes entity_overrides; merge un-excludes bullet

**Why fourth:** Depends on Phase 1 (entity_overrides table), Phase 2 (inclusion un-exclusion in merge). Does not block Phase 3.

### Dependency graph

```
Phase 1: Schema + Migration
  ├── Phase 2: Merge Precedence
  │     ├── Phase 3: Variant Reword UI
  │     └── Phase 4: Excluded-Bullet Suggestions
  └── (Phase 4 also depends on Phase 2)
```

Phases 3 and 4 are parallelizable after Phase 2 ships.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Dual-writing to both tables during transition

**What people do:** Write new overrides to both `entity_overrides` and `analysisBulletOverrides` during the migration phase so reads can fall back.

**Why it's wrong:** Creates two sources of truth. A dismiss on one table doesn't remove from the other. Merge reads one table and misses the other.

**Do this instead:** Cut over reads to `entity_overrides` atomically in Phase 1 (same PR that migrates data). Keep `analysisBulletOverrides` as a read-only artifact until explicitly dropped. Never write new rows to it after the cutover.

### Anti-Pattern 2: Using NULL entity_id for the summary override

**What people do:** Use `entity_id = NULL` for the summary because there's no profile-summary entity ID.

**Why it's wrong:** SQLite partial indexes behave unexpectedly with multiple NULL-keyed rows. The UNIQUE constraint won't protect against duplicate summary overrides.

**Do this instead:** Use `entity_id = 1` as a sentinel (matches the profile row's `id = 1`). It's consistent and unique.

### Anti-Pattern 3: Applying variant overrides in the UI instead of merge

**What people do:** Fetch variant overrides in the renderer and patch display values client-side, skipping mergeHelper.

**Why it's wrong:** PDF/DOCX/snapshot consumers would not see the overrides. The single-merge-path invariant is broken.

**Do this instead:** All override application happens in `buildMergedBuilderData`. The renderer only reads the merged result. This is the existing architectural invariant.

### Anti-Pattern 4: Storing excluded_bullet_suggestions in analysis_results.suggestions JSON

**What people do:** Piggyback new suggestion types into the existing `suggestions` text column on `analysis_results`.

**Why it's wrong:** The existing `suggestions` column holds `RewriteSuggestion[]` typed by the renderer. Mixing types in a JSON column requires version-sensitive parsing and breaks existing tests that assert on the suggestions shape.

**Do this instead:** Separate table `analysis_excluded_bullet_suggestions` with explicit status column, mirroring `analysisSkillAdditions`.

---

## Integration Points Reference

| Operation | File:Function | IPC Channel | New/Modified |
|-----------|--------------|-------------|-------------|
| Read merged data (all surfaces) | `mergeHelper.ts:buildMergedBuilderData` | via `templates:getBuilderData` | Modified |
| Write variant-tier override | `templates.ts:acceptVariantOverride` | `templates:setVariantOverride` | New |
| Read variant overrides for UI | `templates.ts:getVariantOverrides` | `templates:getVariantOverrides` | New |
| Accept analysis rewrite (migrated) | `ai.ts:acceptSuggestion` | `ai:acceptSuggestion` | Modified (target table) |
| Dismiss analysis rewrite (migrated) | `ai.ts:dismissSuggestion` | `ai:dismissSuggestion` | Modified (target table) |
| Get analysis overrides (migrated) | `ai.ts:getOverrides` | `ai:getOverrides` | Modified (source table) |
| Run analysis (extended) | `ai.ts:runAnalysis` | `ai:analyze` | Modified (prompt + suggestions) |
| Store excluded suggestions | `ai.ts:ensureExcludedBulletSuggestions` | internal, called by runAnalysis | New |
| Accept excluded-bullet inclusion | `ai.ts:acceptExcludedBulletSuggestion` | `ai:acceptExcludedBulletSuggestion` | New |
| Dismiss excluded suggestion | `ai.ts:dismissExcludedBulletSuggestion` | `ai:dismissExcludedBulletSuggestion` | New |
| Read excluded suggestions for UI | `ai.ts:getExcludedBulletSuggestions` | `ai:getExcludedBulletSuggestions` | New |
| Freeze snapshot with overrides | `submissions.ts:buildSnapshotForVariant` | via `submissions:create` | Modified |

---

## Sources

- `src/main/db/schema.ts` — existing table definitions including `analysisBulletOverrides` UNIQUE constraint
- `src/main/db/index.ts` — `ensureSchema()` migration pattern (ALTER TABLE in try/catch, transaction-wrapped data migrations)
- `src/main/lib/mergeHelper.ts` — complete three-layer merge implementation
- `src/shared/overrides.ts` — `applyOverrides()` signature and `BulletOverride` interface
- `src/main/handlers/ai.ts` — `acceptSuggestion`, `runAnalysis`, `ensureSkillAdditions` patterns
- `src/main/handlers/templates.ts` — `setItemExcluded` and `buildMergedBuilderData` call sites
- `src/main/handlers/submissions.ts` — `buildSnapshotForVariant`, `summaryOverride` splicing point
- `src/main/lib/aiProvider.ts` — `ResumeScorerSchema`, `generateObject` pattern, `.default([])` compatibility
- `src/main/lib/analysisPrompts.ts` — prompt construction pattern for new excluded-bullets section
- `tests/helpers/db.ts` — `createTestDb()` pattern that must be kept in sync with `ensureSchema()`
- `src/preload/index.d.ts` — `BuilderJob`, `BuilderProject`, `MergedBuilderData` consumer interfaces

---

*Architecture research for: ResumeHelper v2.6 Per-Variant Text Overrides*
*Researched: 2026-06-05*
