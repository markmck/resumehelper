# Architecture Patterns

**Domain:** Resume management desktop app — three-layer data model, analysis-scoped overrides, skills chip UI
**Researched:** 2026-03-26
**Focus:** Integration with existing Electron + React 19 + Drizzle ORM + SQLite architecture

---

## Existing Architecture Reference

Before describing the new patterns, the key existing structures:

**Data layer (main process):**
- `src/main/db/schema.ts` — Drizzle table definitions
- `src/main/db/index.ts` — `ensureSchema()` with `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` try/catch array
- `src/main/handlers/` — one file per domain, each exports `register*Handlers()`

**Rendering pipeline:**
- `print.html` + `PrintApp.tsx` + postMessage — single surface for preview, PDF export, and snapshot viewer
- Templates receive `BuilderJob[]` / `BuilderSkill[]` etc., filtered by `excluded` flags

**Current data contract (`BuilderJob`):**
```typescript
interface BuilderBullet { id: number; text: string; sortOrder: number; excluded: boolean }
interface BuilderJob    { id: number; company: string; role: string; startDate: string;
                          endDate: string|null; excluded: boolean; bullets: BuilderBullet[] }
```

**Current suggestion flow (v2.1 — the problem being solved):**
- `OptimizeVariant.tsx` accepts rewrites → mutates `job_bullets.text` in-place globally
- Accepted skills are written to `skills` table or variant exclusion toggles
- Changes are permanent and cross-variant — no way to show "what this analysis suggested" without applying it

---

## Recommended Architecture for v2.2

### Layer 1 of 3: Base Experience (unchanged)

`jobs`, `job_bullets`, `skills` tables are the canonical source of truth. They do not change. Users edit bullets here in the Experience tab as before.

No schema changes needed at this layer.

### Layer 2 of 3: Variant Selection (existing)

`template_variant_items` holds exclusion rows. When `excluded = true` for a bullet/skill/job, the rendering pipeline filters it out. Already working.

**New feature in this layer: job-level toggle.** The handler already exists (`templates:setItemExcluded` with `itemType: 'job'`). The UI in `VariantBuilder.tsx` needs to expose a checkbox/toggle per job header. The cascade to bullets is already implemented in the handler.

### Layer 3 of 3: Analysis Overrides (new)

Overrides are **scoped to a specific analysis result** and **never touch base data**. They are applied at render time via merge.

**Schema addition — new table:**
```sql
CREATE TABLE IF NOT EXISTS analysis_bullet_overrides (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id  INTEGER NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  bullet_id    INTEGER NOT NULL REFERENCES job_bullets(id) ON DELETE CASCADE,
  override_text TEXT NOT NULL,
  UNIQUE(analysis_id, bullet_id)
);
```

Added via the `ensureSchema()` main block — `CREATE TABLE IF NOT EXISTS` handles fresh installs; existing DBs pick it up on next launch because the pattern runs every startup.

**No changes needed** to `analysis_results.suggestions` (JSON column) — it continues to store raw LLM output. Overrides are a separate concern.

---

## Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| `SkillChipGrid.tsx` | Chip-per-skill display, grouped by tag, drag-between-groups | NEW | `skills:list`, `skills:update`, `skills:delete`, `skills:create` |
| `SkillChipGroup.tsx` | One category group — header, chip row, drop target | NEW | Parent `SkillChipGrid` |
| `SkillChip.tsx` | Single chip — inline rename on double-click, drag handle, delete on hover | NEW | Parent `SkillChipGroup` |
| `SkillList.tsx` | Existing list view — replace body with `SkillChipGrid` | MODIFIED | Same IPC surface |
| `SkillItem.tsx` | Old row item | REMOVED from Skills tab (can stay for VariantBuilder toggle if needed) | — |
| `VariantBuilder.tsx` | Add job-level toggle per job header | MODIFIED | `templates:setItemExcluded` (already handles 'job' type) |
| `OptimizeVariant.tsx` | Accept rewrites → write to `analysis_bullet_overrides` instead of `job_bullets` | MODIFIED | New `ai:saveOverrides` IPC |
| `AnalysisResults.tsx` | Pre-fill submission form with company/role from analysis; add Submit CTA | MODIFIED | Data already returned by `jobPostings.getAnalysis` |
| `AnalysisList.tsx` | Add "Submit" CTA directly from list row | MODIFIED | Existing `onLogSubmission` prop pattern |
| `NewAnalysisForm.tsx` | Auto-extract company/role from pasted job text after LLM parse completes | MODIFIED | `parsedJob` already returned from `ai:analyze` |
| `PrintApp.tsx` | Accept optional `analysisOverrides` in postMessage payload; merge at render | MODIFIED | postMessage protocol |
| `SnapshotViewer.tsx` | No change needed — overrides are baked into snapshot at submit time | UNCHANGED | — |
| `ai:saveOverrides` handler | Write accepted rewrites to `analysis_bullet_overrides` | NEW | `analysis_bullet_overrides` table |
| `ai:getOverrides` handler | Return overrides for a given `analysisId` | NEW | `analysis_bullet_overrides` table |
| `buildSnapshotForVariant()` | Accept optional `analysisId`; merge overrides into snapshot before serialization | MODIFIED | `ai:getOverrides` called during snapshot build |

---

## Data Flow

### Normal preview/export (no analysis overrides)

```
VariantBuilder → templates:getBuilderData(variantId)
              → [jobs with excluded flags, skills with excluded flags]
              → postMessage to PrintApp
              → resolveTemplate(key)(props)
              → rendered HTML
```

### Preview with analysis overrides applied

```
OptimizeVariant or AnalysisResults
  → ai:getOverrides(analysisId)   → [{ bulletId, overrideText }]
  → templates:getBuilderData(variantId)
  → merge: for each bullet, if override exists replace .text with overrideText
  → postMessage to PrintApp with merged BuilderJob[]
  → rendered HTML  [no schema mutation — base bullets unchanged]
```

**Merge function (pure, ~10 lines):**
```typescript
// src/renderer/src/lib/overrides.ts
export function applyOverrides(
  jobs: BuilderJob[],
  overrides: Array<{ bulletId: number; overrideText: string }>
): BuilderJob[] {
  const map = new Map(overrides.map(o => [o.bulletId, o.overrideText]))
  return jobs.map(job => ({
    ...job,
    bullets: job.bullets.map(b =>
      map.has(b.id) ? { ...b, text: map.get(b.id)! } : b
    ),
  }))
}
```

### Submission snapshot with overrides

```
submissions:create(variantId, analysisId)
  → buildSnapshotForVariant(variantId, analysisId?)   [modified signature]
  → [existing: build jobs/skills/etc with exclusions]
  → if analysisId: fetch analysis_bullet_overrides for that analysisId
  → applyOverrides(snapshot.jobs, overrides)   [same merge utility]
  → JSON.stringify(merged snapshot) → resumeSnapshot column
```

The snapshot shape is unchanged — `jobs[].bullets[].text` values are just the override values where applicable. The existing `SnapshotViewer` renders them correctly with no changes.

### Skills chip drag (category reassignment)

```
User drags chip from "Languages" group to "Frameworks" group
  → onDrop: compute new tags array (replace old category tag with new one)
  → optimistic UI update in SkillChipGrid state
  → skills:update(id, { tags: newTagArray })   [existing IPC]
  → SkillChipGrid re-computes groups from updated tags
```

No new IPC required. The existing `skills:update` handler accepts `{ tags: string[] }`.

---

## Patterns to Follow

### Pattern 1: Non-Destructive Override Storage

**What:** Store overrides in a join table keyed to `(analysis_id, bullet_id)`. Never mutate base data. Merge only at render time.

**When:** Any time AI-suggested content must be scoped to a specific context without polluting base history.

**Why this fits the existing codebase:** The immutable snapshot principle is already established — `buildSnapshotForVariant` freezes state at submit time. Overrides extend this principle to bullet text: the override is the "what was sent to this job posting" record, not a permanent edit to the bullet.

### Pattern 2: ensureSchema() ALTER TABLE Pattern for New Tables

**What:** New tables go in the `CREATE TABLE IF NOT EXISTS` block in `ensureSchema()`. New columns on existing tables go in the `alterStatements` array (try/catch silently ignores "column already exists").

**When:** Every schema change in this project. Do not use file-based migrations for new tables.

**Example addition for `analysis_bullet_overrides`:**
```typescript
// In ensureSchema() main block — append to the sqlite.exec() call:
CREATE TABLE IF NOT EXISTS \`analysis_bullet_overrides\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`analysis_id\` integer NOT NULL,
  \`bullet_id\` integer NOT NULL,
  \`override_text\` text NOT NULL,
  UNIQUE(\`analysis_id\`, \`bullet_id\`),
  FOREIGN KEY (\`analysis_id\`) REFERENCES \`analysis_results\`(\`id\`) ON DELETE cascade,
  FOREIGN KEY (\`bullet_id\`) REFERENCES \`job_bullets\`(\`id\`) ON DELETE cascade
);

// And in schema.ts:
export const analysisBulletOverrides = sqliteTable('analysis_bullet_overrides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  analysisId: integer('analysis_id').notNull()
    .references(() => analysisResults.id, { onDelete: 'cascade' }),
  bulletId: integer('bullet_id').notNull()
    .references(() => jobBullets.id, { onDelete: 'cascade' }),
  overrideText: text('override_text').notNull(),
})
```

### Pattern 3: Single postMessage Payload Extension

**What:** PrintApp receives data via postMessage. Extend the payload with an optional `analysisOverrides` field. If absent, behavior is identical to current.

**When:** Whenever rendering needs analysis-specific data without changing the base data path.

**Extension (additive, backward compatible):**
```typescript
// PrintApp.tsx postMessage payload:
interface PostMessagePayload {
  profile: Profile
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  // ... existing fields unchanged ...
  analysisOverrides?: Array<{ bulletId: number; overrideText: string }>  // NEW optional
}
// In PrintApp useEffect on message receipt:
const overrides = payload.analysisOverrides ?? []
const resolvedJobs = overrides.length > 0 ? applyOverrides(payload.jobs, overrides) : payload.jobs
```

### Pattern 4: Chip UI Using Existing Tag-as-Category Model

**What:** Skills already use `tags: string[]` where the first tag is the display group (see `buildResumeJson` in `themeRegistry.ts`). The chip grid renders this grouping visually. Drag-between-groups mutates `tags[0]` via the existing `skills:update` IPC.

**Why:** Zero schema change. The existing `tags` JSON column handles all state. Drag is a pure UI concern.

**Drag approach — native HTML5:**
```typescript
// SkillChip drag source:
<div draggable onDragStart={e => e.dataTransfer.setData('skillId', String(skill.id))} ...>

// SkillChipGroup drop target:
<div
  onDragOver={e => { e.preventDefault(); setDropHighlight(true) }}
  onDragLeave={() => setDropHighlight(false)}
  onDrop={e => {
    e.preventDefault()
    const skillId = Number(e.dataTransfer.getData('skillId'))
    onDropSkill(skillId, groupTag)  // parent handles tags:update call
    setDropHighlight(false)
  }}
  style={{ border: dropHighlight ? '1px dashed var(--color-accent)' : '1px solid transparent' }}
>
```

Uses only inline styles — compatible with file:// context. No external CSS library.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Writing Rewrites to Base Bullets

**What was happening:** `OptimizeVariant.tsx` `handleSave` calls `window.api.bullets.update(bulletId, { text: finalText })` for accepted suggestions. This overwrites `job_bullets.text` globally.

**Why bad:** The rewrite becomes permanent. Re-analyzing with a different job posting sees the already-rewritten text, not the original. Multiple analyses targeting the same bullet conflict.

**Instead:** Write to `analysis_bullet_overrides`. The base bullet stays untouched.

### Anti-Pattern 2: Storing Override State in analysis_results.suggestions

**What:** Modifying the `suggestions` JSON column to track accepted/dismissed state.

**Why bad:** `suggestions` is LLM output — should be immutable to allow re-reading original suggestions. Mixing state into it means accepted rewrites are lost on re-analysis.

**Instead:** `analysis_bullet_overrides` is the accepted-state record. `suggestions` remains read-only LLM output.

### Anti-Pattern 3: Chip Drag Using External CSS Libraries

**What:** Importing `react-beautiful-dnd`, `@dnd-kit/core`, or similar libraries that ship their own CSS.

**Why bad:** Established constraint — "external CSS breaks in prod file:// context." All layout must use inline styles or existing CSS custom properties.

**Instead:** HTML5 native drag events (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) with inline style state for drop-target highlight.

### Anti-Pattern 4: New IPC Channels for Existing Data

**What:** Creating a `skills:listForChipGrid` handler that returns the same data as `skills:list`.

**Why bad:** Duplication. Grouping logic is pure client-side computation on the existing data shape.

**Instead:** Reuse `skills:list`. `SkillChipGrid` groups the flat list in-component using the existing `tags` array.

---

## Integration Points — New vs Modified Summary

### New (net-new items)

| Item | Type | Location |
|------|------|----------|
| `analysis_bullet_overrides` | DB table | `schema.ts` + `ensureSchema()` block |
| `analysisBulletOverrides` | Drizzle table def | `schema.ts` |
| `ai:saveOverrides` | IPC handler | `src/main/handlers/ai.ts` |
| `ai:getOverrides` | IPC handler | `src/main/handlers/ai.ts` |
| `applyOverrides()` | Utility function | `src/renderer/src/lib/overrides.ts` |
| `SkillChipGrid.tsx` | React component | `src/renderer/src/components/` |
| `SkillChipGroup.tsx` | React component | `src/renderer/src/components/` |
| `SkillChip.tsx` | React component | `src/renderer/src/components/` |

### Modified (existing items that change)

| Item | Change | Risk |
|------|--------|------|
| `OptimizeVariant.tsx` | `handleSave` writes to `ai:saveOverrides` instead of `bullets:update` | Medium — core save path |
| `VariantBuilder.tsx` | Add job-level toggle UI per job header (handler already exists) | Low — additive UI |
| `SkillList.tsx` | Replace list body with `SkillChipGrid` | Low — same IPC surface |
| `PrintApp.tsx` | Accept optional `analysisOverrides` in postMessage; merge before render | Low — additive, null-safe |
| `buildSnapshotForVariant()` in `submissions.ts` | Add optional `analysisId` param; fetch + merge overrides if provided | Low — optional param |
| `submissions:create` handler | Pass `analysisId` through to `buildSnapshotForVariant` | Low — data already in payload |
| `AnalysisResults.tsx` | Pre-fill company/role in log submission form (data already present in `raw`) | Low — display only |
| `AnalysisList.tsx` | Add Submit CTA per row | Low — additive button |
| `NewAnalysisForm.tsx` | Auto-populate company/role fields after `ai:analyze` returns `parsedJob` | Low — `parsedJob` already returned |
| Preload `window.api` types | Add `ai.saveOverrides`, `ai.getOverrides` | Low — additive |

---

## Suggested Build Order

Dependencies flow bottom-to-top. Schema and IPC must land before UI.

```
Phase A — Schema + Override IPC (unblocks everything else)
  1. Add analysis_bullet_overrides to ensureSchema() and schema.ts
  2. Implement ai:saveOverrides handler
  3. Implement ai:getOverrides handler
  4. Expose both in preload
  5. Write applyOverrides() utility

Phase B — OptimizeVariant Rewires (depends on Phase A)
  1. Change handleSave to call ai:saveOverrides (replaces bullets:update calls)
  2. Add override-aware preview in OptimizeVariant (merge overrides before postMessage)
  3. Remove "Optimization available in a future update" placeholder text

Phase C — Analysis Submission Flow (depends on Phase A)
  1. Modify buildSnapshotForVariant() to accept optional analysisId
  2. Add override merge in submissions:create
  3. Add "Submit" button to AnalysisList rows
  4. Pre-fill company/role in SubmissionLogForm from analysis data
  5. Auto-populate company/role in NewAnalysisForm after parse

Phase D — Skills Chip Grid (independent, can run parallel to B-C)
  1. Build SkillChip.tsx
  2. Build SkillChipGroup.tsx
  3. Build SkillChipGrid.tsx
  4. Replace SkillList.tsx body

Phase E — Variant UX: Job Toggle (independent, any phase)
  1. Add job-level toggle checkbox to VariantBuilder.tsx job headers
  (handler already implemented — UI-only change)
```

---

## Scalability Considerations

Single-user desktop app — scalability concerns are UI performance and DB state management.

| Concern | Approach |
|---------|----------|
| Same bullet accepted in two analyses | `UNIQUE(analysis_id, bullet_id)` — each analysis owns its own overrides, no cross-contamination |
| SkillChipGrid with 100+ skills | Client-side grouping is O(n); native HTML5 drag has no virtualization requirement at this scale |
| Snapshot size with overrides | Overrides are merged into `jobs[].bullets[].text` before serialization — snapshot shape unchanged, SnapshotViewer needs no changes |
| Re-analysis after overrides exist | New analysis gets a new `analysisId`; starts with empty overrides. Old analysis overrides persist and are still viewable. |
| Deleting a bullet or analysis | `ON DELETE CASCADE` on both FK constraints — orphaned overrides are automatically cleaned |

---

## Sources

- Direct code inspection: `src/main/db/schema.ts` — full table schema
- Direct code inspection: `src/main/db/index.ts` — `ensureSchema()` pattern, `alterStatements` array
- Direct code inspection: `src/main/handlers/ai.ts` — current `ai:analyze`, stub `ai:acceptSuggestion`
- Direct code inspection: `src/main/handlers/templates.ts` — `setItemExcluded` job cascade, `getBuilderData`
- Direct code inspection: `src/main/handlers/submissions.ts` — `buildSnapshotForVariant`, `submissions:create`
- Direct code inspection: `src/main/handlers/skills.ts` — `skills:update` accepts `{ tags: string[] }`
- Direct code inspection: `src/renderer/src/components/OptimizeVariant.tsx` — `handleSave` with `bullets:update` mutation (the anti-pattern being replaced)
- Direct code inspection: `src/renderer/src/components/SkillList.tsx`, `SkillItem.tsx` — current flat list UI
- Direct code inspection: `src/renderer/src/components/AnalysisResults.tsx` — `raw.company`/`raw.role` already available
- Direct code inspection: `src/renderer/src/PrintApp.tsx` — postMessage payload structure
- Direct code inspection: `src/main/lib/themeRegistry.ts` — `tags[0]` as group key in `buildResumeJson`
- Confidence: HIGH — all patterns derived from direct source reading of the codebase at v2.1 shipped state
