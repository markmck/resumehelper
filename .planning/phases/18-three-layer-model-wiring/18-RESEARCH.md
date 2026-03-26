# Phase 18: Three-Layer Model Wiring - Research

**Researched:** 2026-03-26
**Domain:** Electron IPC / SQLite / React state — wiring override persistence, preview merging, export, and submission snapshot
**Confidence:** HIGH

## Summary

Phase 18 is a pure wiring phase — no new tables, no new libraries, no migrations. All infrastructure exists in the codebase from Phase 17. The work is connecting five already-built pieces in the correct order: (1) the `acceptSuggestion`/`dismissSuggestion` IPC handlers in `ai.ts`, (2) the `applyOverrides()` utility in `shared/overrides.ts`, (3) the `getBuilderData` handler in `templates.ts`, (4) the export handlers in `export.ts`, and (5) the `buildSnapshotForVariant` function in `submissions.ts`.

The renderer's `OptimizeVariant.tsx` currently implements a batch "Save & Apply" pattern that mutates base bullet text globally. This entire save-flow (state variables `saving`, `showConfirm`, `saveAsNew`, `newVariantName`, `savedMessage`, and the `handleSave` function) must be replaced with per-click IPC calls to `ai:acceptSuggestion` / `ai:dismissSuggestion`. The `VariantPreview` component currently calls `getBuilderData(variantId)` with no analysis context — it must pass an optional `analysisId` so the main process can merge overrides before returning data.

The skill-additions acceptance path is strictly database-only: `window.api.ai.acceptSuggestion` does NOT cover skills. A new IPC handler pair (`ai:acceptSkillAddition` / `ai:dismissSkillAddition`) must be wired against the `analysisSkillAdditions` table. Snapshot merging must include both bullet overrides (via `applyOverrides()`) and accepted skill additions (appended to the skills array from `analysisSkillAdditions` where `status = 'accepted'`).

**Primary recommendation:** Work in five sequential tasks — (1) OptimizeVariant rewire, (2) `getBuilderData` + `VariantPreview` analysis context, (3) export analysisId support, (4) snapshot override merging, (5) skill addition IPC handlers. No new dependencies needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Accept/Persist Flow**
- D-01: Accepting a suggestion immediately persists to the overrides table per-click via `ai:acceptSuggestion(analysisId, bulletId, text)` -- no batch save pattern
- D-02: The current "Save & Apply" button is removed entirely -- the optimize screen becomes a review-and-decide flow; navigate away when done
- D-03: The variant duplication feature ("Save as new variant") is dropped from the optimize screen -- overrides are analysis-scoped, not variant-scoped, so variant duplication doesn't apply
- D-04: Skill accept flow is analysis-scoped only -- accepting a skill suggestion writes to `analysis_skill_additions` table (status: accepted), base skills table remains untouched

**Preview Context Switching**
- D-05: `getBuilderData(variantId, analysisId?)` -- when analysisId is provided, main process fetches overrides and calls `applyOverrides()` before returning data. Renderer doesn't need to know about overrides.
- D-06: After each accept/dismiss in OptimizeVariant, re-fetch `getBuilderData(variantId, analysisId)` and push updated data to the preview iframe -- simple re-fetch, no optimistic local updates
- D-07: Both PDF and DOCX export paths support the analysisId parameter for override merging -- what you see in analysis preview is what you export

**Undo/Revert Mechanics**
- D-08: Each accepted suggestion shows a per-bullet "Revert" button/icon. Clicking it calls `ai:dismissSuggestion` to delete the override row, reverting that bullet to base text.
- D-09: Reverted suggestion returns to "pending" state with the original suggested text still visible -- user can re-accept it later

**Snapshot Override Strategy**
- D-10: `buildSnapshotForVariant(variantId, analysisId?)` -- when analysisId is provided, fetch overrides and merge via `applyOverrides()` before freezing. Merged text baked into `bullet.text` in the snapshot (self-contained, no re-apply needed).
- D-11: Accepted skill additions from `analysis_skill_additions` are also merged into the snapshot's skills array with their category -- snapshot captures the complete resume as it would appear in analysis context

### Claude's Discretion
- Exact UI placement and styling of the per-bullet revert button
- How the analysis status gets updated (e.g., auto-stamp as "reviewed" on first accept)
- Error handling for edge cases (e.g., bullet deleted between accept and preview refresh)
- Whether to show a brief toast/indicator on accept/dismiss for visual feedback

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-02 | Accepting an AI suggestion writes override to analysis, not to base bullet or variant | `ai:acceptSuggestion` IPC handler already writes to `analysis_bullet_overrides` table. OptimizeVariant must call it per-click instead of `bullets:update`. |
| DATA-03 | Preview/export merges base text → variant selection → analysis overrides with correct precedence | `applyOverrides()` in `src/shared/overrides.ts` handles merge. Must be called inside `getBuilderData` (for preview) and `getBuilderDataForVariant` (for DOCX export) when `analysisId` is provided. PDF export uses hidden BrowserWindow + postMessage — data push must include merged builder data. |
| DATA-04 | Variant preview without analysis context shows base text only (no overrides) | When `analysisId` is absent from `getBuilderData`, function returns unmodified base text (current behavior). No change needed — it's the default code path. |
| DATA-05 | Same variant analyzed against two jobs produces independent override sets | Guaranteed by the `(analysisId, bulletId)` UNIQUE constraint on `analysis_bullet_overrides`. Each analysis has its own rows; `getBuilderData(variantId, analysisId)` only loads overrides for the specific analysis. |
| DATA-06 | Dismissing a suggestion creates no override; undoing acceptance removes override and reverts to base | `ai:dismissSuggestion` deletes the row (hard delete, confirmed in Phase 17). Renderer must call it on revert click. Local UI state must reset to pending. |
| DATA-07 | Submission snapshot captures fully merged three-layer result, immutable after creation | `buildSnapshotForVariant` must accept optional `analysisId`, fetch overrides, call `applyOverrides()`, and append accepted `analysis_skill_additions` rows to the skills array before JSON-freezing. |
</phase_requirements>

---

## Standard Stack

### Core (already in project — no new installs)

| Module | Location | Purpose |
|--------|----------|---------|
| `applyOverrides()` | `src/shared/overrides.ts` | Pure merge function — takes bullets array + overrides array, returns merged array |
| `BulletOverride` type | `src/shared/overrides.ts` | Runtime type used by `applyOverrides()` |
| `analysisBulletOverrides` table | `src/main/db/schema.ts` | Phase 17 table — holds per-(analysis, bullet) override text |
| `analysisSkillAdditions` table | `src/main/db/schema.ts` | Phase 17 table — holds skill suggestions with `status` column |
| `ai:acceptSuggestion` handler | `src/main/handlers/ai.ts:130` | Already writes upsert to `analysis_bullet_overrides` |
| `ai:dismissSuggestion` handler | `src/main/handlers/ai.ts:151` | Already hard-deletes from `analysis_bullet_overrides` |
| `ai:getOverrides` handler | `src/main/handlers/ai.ts:168` | Reads all overrides for an analysisId |
| `window.api.ai.*` bridge | `src/preload/index.ts:235` | All three handlers already exposed to renderer |

**No new npm packages needed.** This phase installs nothing.

---

## Architecture Patterns

### Pattern 1: Optional analysisId threading

All three data-fetching functions (`getBuilderData`, `getBuilderDataForVariant`, `buildSnapshotForVariant`) share the same pattern: add an optional second parameter, fetch overrides from DB when it is provided, call `applyOverrides()` on the bullets sub-array inside each job.

**Current signature (templates.ts, line 122):**
```typescript
ipcMain.handle('templates:getBuilderData', async (_, variantId: number) => {
```

**Target signature:**
```typescript
ipcMain.handle('templates:getBuilderData', async (_, variantId: number, analysisId?: number) => {
  // ... existing exclusion logic ...

  // After building jobsWithBullets, apply overrides if context present:
  if (analysisId != null) {
    const overrideRows = db.select({
      bulletId: analysisBulletOverrides.bulletId,
      overrideText: analysisBulletOverrides.overrideText,
      source: analysisBulletOverrides.source,
      suggestionId: analysisBulletOverrides.suggestionId,
    })
    .from(analysisBulletOverrides)
    .where(eq(analysisBulletOverrides.analysisId, analysisId))
    .all()

    for (const job of jobsWithBullets) {
      job.bullets = applyOverrides(job.bullets, overrideRows)
    }
  }
```

The same pattern applies in `export.ts` (function `getBuilderDataForVariant`) and `submissions.ts` (function `buildSnapshotForVariant`).

**Important:** `applyOverrides()` operates only on `{ id, text }` arrays. The `BuilderBullet` type has `{ id, text, sortOrder, excluded }` — `applyOverrides` spreads the input object, so `sortOrder` and `excluded` are preserved. Confirmed from `src/shared/overrides.ts:34` — the spread `{ ...b, text: ... }` keeps all extra fields.

### Pattern 2: Preload bridge extension for analysisId

`window.api.templates.getBuilderData(variantId)` must become `window.api.templates.getBuilderData(variantId, analysisId?)`.

**Current preload bridge (index.ts:40):**
```typescript
getBuilderData: (variantId: number) =>
  ipcRenderer.invoke('templates:getBuilderData', variantId),
```

**Target:**
```typescript
getBuilderData: (variantId: number, analysisId?: number) =>
  ipcRenderer.invoke('templates:getBuilderData', variantId, analysisId),
```

The TypeScript declaration in `index.d.ts` must also be updated.

### Pattern 3: OptimizeVariant per-click IPC wiring

The current `accept(i)` function only updates React local state. It must also call the IPC handler immediately and trigger a preview re-fetch:

**Current (lines 298-301):**
```typescript
const accept = (i: number): void => {
  setSuggStates((prev) => prev.map((s, idx) => (idx === i ? { ...s, state: 'accepted' } : s)))
  if (editingIndex === i) setEditingIndex(null)
}
```

**Target pattern:**
```typescript
const accept = async (i: number): Promise<void> => {
  const sugg = analysis!.suggestions[i]
  const bulletId = bulletIdMap.get(sugg.original_text)
  if (bulletId == null) {
    console.warn('[OptimizeVariant] No bullet ID for suggestion', i)
    return
  }
  const finalText = suggStates[i].finalText
  await window.api.ai.acceptSuggestion(analysis!.id, bulletId, finalText)
  setSuggStates((prev) => prev.map((s, idx) => (idx === i ? { ...s, state: 'accepted' } : s)))
  if (editingIndex === i) setEditingIndex(null)
  setPreviewRefreshKey((k) => k + 1)  // trigger VariantPreview re-fetch
}
```

**Dismiss (revert)** calls `ai:dismissSuggestion` and resets state to `pending` with original suggested text (per D-09).

**Accept-all**: must iterate and call `acceptSuggestion` for each pending suggestion sequentially (or in parallel with Promise.all — no ordering constraint).

### Pattern 4: VariantPreview analysisId support

`VariantPreview` currently takes no `analysisId` prop. When rendered inside `OptimizeVariant`, it must pass the analysis ID so `getBuilderData` returns merged data.

**VariantPreview interface addition:**
```typescript
interface VariantPreviewProps {
  variantId: number
  analysisId?: number     // NEW
  // ... existing props
}
```

**Fetch call (currently line 51):**
```typescript
window.api.templates.getBuilderData(variantId)
```

**Target:**
```typescript
window.api.templates.getBuilderData(variantId, analysisId)
```

The `refreshKey` prop (already exists) drives re-fetch after each accept/dismiss. OptimizeVariant increments `refreshKey` after each IPC call — VariantPreview already re-fetches on `refreshKey` change.

### Pattern 5: Export analysisId threading

**PDF export** (`export:pdf`) uses a hidden `BrowserWindow` that renders `print.html` and awaits a `print:ready` signal. The builder data is NOT sent as IPC — the print window fetches it itself via `getBuilderData`. To support analysisId, the simplest approach is:

1. Add `analysisId` query param to the URL loaded in the hidden window:
   ```
   /print.html?variantId=5&template=classic&analysisId=12
   ```
2. `PrintApp.tsx` already reads `variantId` and `template` from query params — extend it to read `analysisId` and pass it to `getBuilderData`.

However, the CONTEXT.md (D-06) says the preview uses re-fetch of `getBuilderData(variantId, analysisId)` — the same approach works for PDF export. The main process `export:pdf` handler must accept `analysisId?: number` and pass it as a query param.

**DOCX export** (`export:docx`) directly calls `getBuilderDataForVariant(variantId)` in `export.ts:326`. The function must accept an optional `analysisId` and apply overrides before returning data, then the handler passes it through.

**Preload bridge change:**
```typescript
// current:
pdf: (variantId: number, defaultFilename: string) =>
  ipcRenderer.invoke('export:pdf', variantId, defaultFilename),
docx: (variantId: number, defaultFilename: string) =>
  ipcRenderer.invoke('export:docx', variantId, defaultFilename),

// target:
pdf: (variantId: number, defaultFilename: string, analysisId?: number) =>
  ipcRenderer.invoke('export:pdf', variantId, defaultFilename, analysisId),
docx: (variantId: number, defaultFilename: string, analysisId?: number) =>
  ipcRenderer.invoke('export:docx', variantId, defaultFilename, analysisId),
```

### Pattern 6: Snapshot override merging

`buildSnapshotForVariant(variantId)` in `submissions.ts` must accept `analysisId?` and merge both bullet overrides and accepted skill additions.

**Bullet override merge (same as getBuilderData pattern):**
```typescript
if (analysisId != null) {
  const overrideRows = db.select(/* ... */)
    .from(analysisBulletOverrides)
    .where(eq(analysisBulletOverrides.analysisId, analysisId))
    .all()
  for (const job of jobsWithBullets) {
    job.bullets = applyOverrides(job.bullets, overrideRows)
  }
}
```

**Skill addition merge (D-11):**
```typescript
if (analysisId != null) {
  const acceptedSkills = db.select()
    .from(analysisSkillAdditions)
    .where(and(
      eq(analysisSkillAdditions.analysisId, analysisId),
      eq(analysisSkillAdditions.status, 'accepted')
    ))
    .all()
  for (const sk of acceptedSkills) {
    skillsWithExcluded.push({
      id: -1,          // sentinel — no real skill row in base table
      name: sk.skillName,
      tags: sk.category ? [sk.category] : [],
      excluded: false,
    })
  }
}
```

**Note:** Using `-1` as a sentinel `id` is safe because the snapshot is a frozen JSON blob — no FK lookups are performed on snapshot data.

### Pattern 7: Skill addition IPC handlers

There are no existing `ai:acceptSkillAddition` / `ai:dismissSkillAddition` handlers. These must be added to `src/main/handlers/ai.ts`. They update `status` in `analysis_skill_additions`:

```typescript
// ai:acceptSkillAddition
ipcMain.handle('ai:acceptSkillAddition', async (_event, analysisId: number, skillName: string) => {
  db.update(analysisSkillAdditions)
    .set({ status: 'accepted' })
    .where(and(
      eq(analysisSkillAdditions.analysisId, analysisId),
      eq(analysisSkillAdditions.skillName, skillName),
    ))
    .run()
  return { success: true }
})

// ai:dismissSkillAddition
ipcMain.handle('ai:dismissSkillAddition', async (_event, analysisId: number, skillName: string) => {
  db.update(analysisSkillAdditions)
    .set({ status: 'dismissed' })
    .where(and(
      eq(analysisSkillAdditions.analysisId, analysisId),
      eq(analysisSkillAdditions.skillName, skillName),
    ))
    .run()
  return { success: true }
})
```

**Note:** Unlike bullet overrides (which have no DB row until accepted), skill additions have a row from the start (seeded when analysis is created — or must be seeded on first view). The renderer must ensure `analysis_skill_additions` rows exist before calling accept/dismiss. If they are not seeded by the analysis step, an `ai:ensureSkillAdditions(analysisId, skills[])` upsert step is needed on OptimizeVariant mount.

### Pattern 8: State to remove from OptimizeVariant

The following state and handlers exist ONLY for the batch save flow and must be deleted per D-02/D-03:

| State variable | Line | Why removed |
|----------------|------|-------------|
| `saving` | 118 | No batch save operation |
| `showConfirm` | 119 | Confirmation dialog removed |
| `saveAsNew` | 120 | "Save as new variant" dropped (D-03) |
| `newVariantName` | 121 | No new variant naming |
| `savedMessage` | 122 | No save completion message |
| `handleSave` | 344-408 | Entire batch save handler removed |

The JSX confirmation dialog at lines 1502-end must also be removed.

The `canSave` computed value (`acceptedCount > 0 || addedSkillCount > 0`) is also removed.

### Recommended Task Sequence

```
Wave 0 (no external dependencies)
  Task 1: OptimizeVariant rewire — accept/dismiss call IPC per-click, remove batch save, add revert button

Wave 1 (depends on Task 1 logic)
  Task 2: getBuilderData + VariantPreview — thread analysisId through templates handler and preview component
  Task 3: Skill addition IPC handlers + seeding + OptimizeVariant skill wiring

Wave 2 (depends on Task 2)
  Task 4: Export handlers — thread analysisId through pdf/docx export paths
  Task 5: Snapshot override merging — extend buildSnapshotForVariant with analysisId
```

### Anti-Patterns to Avoid

- **Optimistic local update of bullet text:** D-06 explicitly says simple re-fetch after accept, not local state mutation. Don't update `analysis.suggestions[i].original_text` or build a local merged text — re-fetch drives truth.
- **Writing to base bullets table on accept:** The old `handleSave` called `window.api.bullets.update(bulletId, { text })`. This must not be called anywhere in the new flow.
- **Blocking the renderer thread on accept:** Each accept makes one IPC call + one re-fetch. Both are async — use `async` event handlers and `await` correctly.
- **Leaking override state into base Experience tab:** After accepting a suggestion, the `templates:getBuilderData` call without `analysisId` (used by the base Experience view) must still return base text. This is guaranteed by the optional parameter — only pass `analysisId` when in analysis context.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Bullet text merge | Custom loop/map | `applyOverrides()` from `src/shared/overrides.ts` |
| Upsert on accept | Custom conflict check | `onConflictDoUpdate` already in `ai:acceptSuggestion` handler |
| Override fetch | Ad-hoc SQL | `ai:getOverrides` handler (or inline same query pattern in `getBuilderData`) |

---

## Common Pitfalls

### Pitfall 1: bulletIdMap still uses original_text as key — fragile after override

**What goes wrong:** The current `bulletIdMap` maps `b.text` (original text from DB) to `b.id`. After accepting an override, if the component re-fetches builder data with `analysisId`, the builder data now returns the overridden text. The next accept action tries `bulletIdMap.get(sugg.original_text)` — the suggestion's `original_text` is still the base text, so the lookup still works. This is fine.

**Why it works:** The map is built from the initial `getBuilderData(variantId)` call (no analysisId), so it always maps base text to bullet IDs. Suggestions' `original_text` is also base text. The map remains valid for the lifetime of the component.

**Resolution:** No fix needed — but do NOT re-build `bulletIdMap` from a `getBuilderData` call that includes `analysisId`, because then keys would be override text, not base text.

### Pitfall 2: accept-all calling IPC sequentially is slow

**What goes wrong:** If there are 8 suggestions and the user clicks "Accept all", calling `ai:acceptSuggestion` 8 times sequentially could feel sluggish (8 round-trip SQLite writes).

**Resolution:** Use `Promise.all()` to fire all IPC calls in parallel, then update state and trigger one re-fetch.

### Pitfall 3: VariantPreview iframe key change forces full reload

**What goes wrong:** `VariantPreview` uses `key={${variantId}-${layoutTemplate}-${refreshKey}}` on the iframe. Incrementing `refreshKey` creates a new DOM element — full iframe reload. The iframe must re-initialize (signal `print-ready`, receive `print-data` via postMessage), which takes ~200ms.

**Resolution:** This is acceptable per D-06 ("simple re-fetch"). The refreshKey mechanism already handles it. Just ensure `refreshKey` is only incremented on actual data changes (accept/dismiss), not on every render.

### Pitfall 4: PDF export hidden window doesn't use analysisId

**What goes wrong:** The PDF export opens a hidden BrowserWindow and the print.html page fetches its own data via `getBuilderData(variantId)` — no analysis context. If `analysisId` is passed to `export:pdf` but not forwarded to the print URL, the PDF shows base text while the preview shows overridden text.

**Resolution:** Pass `analysisId` as a query param on the print URL. `PrintApp.tsx` must read `analysisId` from `window.location.search` and pass it to `getBuilderData`.

### Pitfall 5: Snapshot skill additions need non-null category

**What goes wrong:** `analysisSkillAdditions.category` defaults to `''` (empty string). If `applyOverrides` for skills uses `tags: [sk.category]`, skills with empty category get `tags: ['']`, which may render oddly in templates that filter empty tags.

**Resolution:** Use `tags: sk.category ? [sk.category] : []` — guard the empty string.

### Pitfall 6: Skill additions may not be seeded in analysis_skill_additions

**What goes wrong:** The current `ai:analyze` handler in `ai.ts` does NOT insert rows into `analysis_skill_additions`. The Phase 17 CONTEXT noted this was for the skill additions table. If rows don't exist, `ai:acceptSkillAddition` has nothing to update.

**Resolution:** Either (a) seed `analysis_skill_additions` rows during `ai:analyze` (requires AI scorer to return skill suggestions), or (b) seed them from the renderer on OptimizeVariant mount with an upsert call. Check the `ai:analyze` handler — `scoreResult.gaps` maps to `gapSkills`, but those are currently only stored in the `analysis_results.gapSkills` JSON column, not in `analysis_skill_additions`.

**Action:** The plan must include seeding `analysis_skill_additions` rows either in `ai:analyze` or via a new `ai:seedSkillAdditions(analysisId, skills[])` IPC call triggered on OptimizeVariant mount.

---

## Code Examples

### applyOverrides call site (verified from src/shared/overrides.ts)

```typescript
// Source: src/shared/overrides.ts
import { applyOverrides } from '../../shared/overrides'
import { analysisBulletOverrides } from '../db/schema'
import { eq } from 'drizzle-orm'

// In getBuilderData handler, after building jobsWithBullets:
if (analysisId != null) {
  const overrideRows = db.select({
    bulletId: analysisBulletOverrides.bulletId,
    overrideText: analysisBulletOverrides.overrideText,
    source: analysisBulletOverrides.source,
    suggestionId: analysisBulletOverrides.suggestionId,
  })
  .from(analysisBulletOverrides)
  .where(eq(analysisBulletOverrides.analysisId, analysisId))
  .all()

  for (const job of jobsWithBullets) {
    // applyOverrides returns Array<{id, text}> but preserves spread fields
    job.bullets = applyOverrides(job.bullets, overrideRows) as typeof job.bullets
  }
}
```

### Per-click accept with IPC (OptimizeVariant)

```typescript
const accept = async (i: number): Promise<void> => {
  if (!analysis) return
  const sugg = analysis.suggestions[i]
  const bulletId = bulletIdMap.get(sugg.original_text)
  if (bulletId == null) {
    console.warn('[OptimizeVariant] No bulletId for suggestion index', i)
    return
  }
  const finalText = suggStates[i].finalText
  const result = await window.api.ai.acceptSuggestion(analysis.id, bulletId, finalText)
  if ('error' in result) {
    console.error('[OptimizeVariant] acceptSuggestion failed', result.error)
    return
  }
  setSuggStates((prev) =>
    prev.map((s, idx) => (idx === i ? { ...s, state: 'accepted' } : s))
  )
  if (editingIndex === i) setEditingIndex(null)
  setPreviewRefreshKey((k) => k + 1)
}
```

### Dismiss / revert

```typescript
const revert = async (i: number): Promise<void> => {
  if (!analysis) return
  const sugg = analysis.suggestions[i]
  const bulletId = bulletIdMap.get(sugg.original_text)
  if (bulletId == null) return
  await window.api.ai.dismissSuggestion(analysis.id, bulletId)
  const originalText = sugg.suggested_text  // return to original suggestion text
  setSuggStates((prev) =>
    prev.map((s, idx) =>
      idx === i ? { state: 'pending', finalText: originalText } : s
    )
  )
  setPreviewRefreshKey((k) => k + 1)
}
```

---

## State of the Art

| Old Approach | Current (this phase) | Impact |
|--------------|----------------------|--------|
| Batch "Save & Apply" mutates base bullet text | Per-click IPC writes to analysis_bullet_overrides; base text untouched | Enables independent override sets per analysis |
| VariantPreview always shows base text | VariantPreview passes analysisId, main process merges before response | Preview shows what will actually be exported |
| Export ignores analysis context | Export handlers accept analysisId and merge via applyOverrides | WYSIWYG between preview and export |
| Snapshot freezes base+variant text only | Snapshot includes bullet overrides + accepted skills | Submission record captures true analysis-context resume |

---

## Open Questions

1. **Skill additions seeding — ai:analyze or on mount?**
   - What we know: `analysis_results.gapSkills` stores the skill gap data as JSON. `analysis_skill_additions` table exists but is not populated by `ai:analyze`.
   - What's unclear: Whether to seed from `ai:analyze` (requires modifying the analysis flow) or from OptimizeVariant mount (simpler, renderer-driven upsert).
   - Recommendation: Seed from OptimizeVariant mount via a new `ai:ensureSkillAdditions(analysisId, skills[])` upsert handler. This avoids touching the analyze flow and keeps Phase 18 self-contained.

2. **PrintApp.tsx analysisId — does it already read query params for other fields?**
   - What we know: `VariantPreview` passes `variantId` and `template` as query params to print.html. PrintApp reads them to fetch data.
   - What's unclear: The exact implementation of PrintApp.tsx was not read. It may already have the pattern to extend.
   - Recommendation: Read PrintApp.tsx before implementing PDF export change.

3. **"Revert" button placement and state transition wording**
   - What we know: D-08 says per-bullet Revert button calls `ai:dismissSuggestion`, D-09 says suggestion returns to pending state with original suggested text.
   - What's unclear: Whether the current "Undo" button (lines 881-897 in OptimizeVariant) can be repurposed as Revert, or whether a separate Revert button is needed alongside Undo.
   - Recommendation: The existing "Undo" button that appears on `isAccepted` state can be renamed "Revert" and wired to call `ai:dismissSuggestion` + reset state to pending.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — purely internal wiring of existing Electron IPC handlers, SQLite queries, and React component state)

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected in project |
| Config file | None — no vitest.config.*, jest.config.*, or pytest.ini found |
| Quick run command | `npm run typecheck` (type checking as proxy for correctness) |
| Full suite command | `npm run typecheck && npm run lint` |

No automated test infrastructure exists in this project. The package.json scripts are: `format`, `lint`, `typecheck:node`, `typecheck:web`, `typecheck`, `start`, `dev`, `build`. No test runner.

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-02 | Accept writes to override table, not base bullet | manual | Launch app, accept suggestion, check base Experience tab unchanged | N/A |
| DATA-03 | Preview merges overrides correctly | manual | Launch app, accept suggestion, verify OptimizeVariant preview shows override | N/A |
| DATA-04 | Base tab shows base text without analysisId | manual | Navigate to Experience tab after accepting in optimize screen | N/A |
| DATA-05 | Two analyses produce independent overrides | manual | Create 2 analyses on same variant, accept different suggestions in each | N/A |
| DATA-06 | Dismiss reverts; revert removes override | manual | Accept then revert, verify preview shows base text | N/A |
| DATA-07 | Submission snapshot captures merged result | manual | Accept suggestion, log submission from optimize screen, inspect snapshot JSON | N/A |

### Sampling Rate

- **Per task:** `npm run typecheck` — catches type errors in all changed files
- **Per wave:** `npm run typecheck && npm run lint` — full static analysis
- **Phase gate:** TypeScript clean + lint clean before `/gsd:verify-work`

### Wave 0 Gaps

- No test files needed — no test runner in project. Verification is TypeScript type safety + manual smoke test.
- Ensure `applyOverrides` return type is compatible with `BuilderBullet[]` (type assertion may be needed since `applyOverrides` returns `Array<{id, text}>` without `sortOrder`/`excluded`). This is a Wave 0 type-correctness concern.

---

## Sources

### Primary (HIGH confidence)
- `src/shared/overrides.ts` — `applyOverrides()` signature and behavior confirmed by direct reading
- `src/main/handlers/ai.ts` — `acceptSuggestion`, `dismissSuggestion`, `getOverrides` handlers confirmed implemented
- `src/main/handlers/templates.ts` — `getBuilderData` handler structure confirmed (lines 122-302)
- `src/main/handlers/export.ts` — `getBuilderDataForVariant` export function confirmed (lines 52-220), `export:pdf` and `export:docx` handlers read
- `src/main/handlers/submissions.ts` — `buildSnapshotForVariant` function confirmed (lines 23-226)
- `src/main/db/schema.ts` — `analysisBulletOverrides` (lines 211-225) and `analysisSkillAdditions` (lines 227-239) schemas confirmed
- `src/renderer/src/components/OptimizeVariant.tsx` — entire component read, batch save flow confirmed (lines 344-408, 1410-1600+)
- `src/renderer/src/components/VariantPreview.tsx` — `getBuilderData` call confirmed at line 52, refreshKey mechanism confirmed
- `src/preload/index.ts` — `ai.*` bridge confirmed exposed (lines 235-247), `templates.getBuilderData` signature at line 40
- `.planning/config.json` — `nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)
- Phase 17 decisions from STATE.md — `acceptSuggestion` writes ONLY to `analysis_bullet_overrides`, `dismissSuggestion` is hard delete, confirmed by reading `ai.ts` directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules read directly from source
- Architecture patterns: HIGH — all integration points confirmed by reading actual code
- Pitfalls: HIGH — derived from direct code reading (bulletIdMap construction, iframe key behavior, skill seeding gap)
- Open questions: MEDIUM — PrintApp.tsx not read; skill seeding path not confirmed

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable Electron/React/SQLite patterns)
