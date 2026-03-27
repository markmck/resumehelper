# Phase 19: Analysis Submission Flow - Research

**Researched:** 2026-03-27
**Domain:** Electron/React IPC — inline editing, regex extraction, staleness detection, orphaned FK handling
**Confidence:** HIGH

## Summary

Phase 19 is a pure UI and IPC wiring phase. There are no new external dependencies, no new tables of meaningful complexity, and no AI calls. Every requirement can be satisfied by combining patterns already established in Phases 17 and 18 with minor additions to three existing files in the renderer and two handlers in main.

The largest technical decision is staleness detection: `jobBullets` has no `updatedAt` column today. Decision D-07 says staleness is derived by comparing `analysis.createdAt` against bullet/variant `updatedAt` timestamps. This requires adding an `updated_at` column to `job_bullets` (via ALTER TABLE in `ensureSchema`) and ensuring every bullet update touch touches it. The `template_variant_items` table similarly has no `updatedAt`. Because staleness for variant structure (exclusion changes) must compare against that table, the cleanest approach is to track a `variantUpdatedAt` on `template_variants` instead — updating it whenever `setItemExcluded` fires — since `template_variants` does have a `createdAt` and the schema is simpler to augment than adding `updatedAt` to every `template_variant_items` row.

The "Log Submission" button already exists in `AnalysisResults`. Adding it to `OptimizeVariant` is a one-line addition to the component's prop interface and action bar. The navigation path (OptimizeVariant → SubmissionLogForm) uses the existing `onLogSubmission` callback already threaded through `AnalysisTab`.

**Primary recommendation:** Add `updatedAt` to `job_bullets` and add `updatedAt` to `template_variants` (stamped on variant item exclusion changes), then compute staleness in `jobPostings:getAnalysis` as a derived boolean; wire the "Log Submission" button into OptimizeVariant using the existing callback plumbing.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Log Submission Placement**
- D-01: "Log Submission" button appears on both AnalysisResults and OptimizeVariant screens. Both pre-fill company, role, variantId, and analysisId.
- D-02: Clicking "Log Submission" from OptimizeVariant navigates to the existing SubmissionLogForm (same form, same flow as from AnalysisResults). No inline form or modal.

**Inline Company/Role Editing**
- D-03: Company and role fields are click-to-edit inline in the AnalysisResults metadata bar. Changes persist to the jobPostings table via an update IPC handler.
- D-04: Not editable in the AnalysisList table — only in the detailed AnalysisResults view.

**Company/Role Auto-Extraction**
- D-05: Simple regex/heuristic extraction at paste-time in NewAnalysisForm. Parse common patterns from pasted text ('Company: X', 'About X', header lines, 'Role: Y', 'Position: Y'). Auto-fill the company and role fields. User can still override.
- D-06: No additional LLM call at paste-time. The LLM extraction that happens during analysis run is unchanged.

**Stale Analysis Detection**
- D-07: An analysis is stale when any bullet text in the variant's included jobs was edited, or variant exclusion structure changed, after the analysis was created. Compare analysis.createdAt against relevant updatedAt timestamps.
- D-08: Staleness is computed on-demand when analysis is viewed (no stored column). Derived at read time by comparing timestamps. Always accurate, no sync issues.
- D-09: Stale indicator is a yellow/amber warning badge or banner on AnalysisResults: "Analysis may be outdated — resume content changed since this analysis ran." Includes a "Re-analyze" button. Does NOT block any actions — user can still submit or optimize.

**Orphaned Override Handling**
- D-10: When a bullet referenced by an override has been deleted, show the orphaned suggestion with a strikethrough/muted style and a notice: "Original bullet was deleted." Don't crash, don't hide it.
- D-11: Detection via LEFT JOIN at load time — when loading overrides for an analysis, LEFT JOIN against jobBullets. If bullet row is NULL, the override is orphaned. Mark in returned data so renderer shows the notice.
- D-12: Override rows are cleaned up by ON DELETE CASCADE when the bullet is deleted from the database. The orphaned state is transient — visible only if the override was loaded before the cascade ran (e.g., analysis was already open).

### Claude's Discretion
- Exact regex patterns for company/role extraction from job posting text
- Warning badge styling (exact colors, icon, positioning)
- Strikethrough styling for orphaned overrides
- Whether the stale banner appears in AnalysisList as well (e.g., small icon in the list row)
- updatedAt column addition to jobBullets if one doesn't exist (needed for staleness comparison)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANLYS-01 | User can log submission directly from the optimize screen | OptimizeVariant needs `onLogSubmission` prop added; AnalysisTab already threads `onLogSubmission` but OptimizeVariant never receives it |
| ANLYS-02 | Company and role auto-extracted from job posting text when not manually entered | Regex extraction added to rawText textarea's `onChange` in NewAnalysisForm; only fires when company/role fields are empty |
| ANLYS-03 | User can edit company and role after analysis is created | Click-to-edit inline in AnalysisResults metadata bar; new `jobPostings:update` IPC handler; preload bridge updated |
| ANLYS-04 | Stale indicator shown when base bullet or variant changes after analysis | Requires `updated_at` on `job_bullets` and `updated_at` on `template_variants`; staleness derived in `jobPostings:getAnalysis`; banner rendered in AnalysisResults |
| ANLYS-05 | Orphaned overrides (deleted base bullets) handled gracefully with UI notice | LEFT JOIN in `ai:getOverrides` returning `isOrphaned: boolean`; OptimizeVariant renders strikethrough notice for orphaned rows |
</phase_requirements>

---

## Standard Stack

No new libraries are introduced. All work uses established project stack.

### Core (already installed)
| Library | Version | Purpose | Role in Phase |
|---------|---------|---------|---------------|
| better-sqlite3 | project version | SQLite driver | ALTER TABLE for new columns; staleness query |
| drizzle-orm | project version | ORM | `jobPostings:update` handler; staleness LEFT JOIN query |
| React | project version | UI | Click-to-edit inline fields; stale banner; orphaned notice |
| Electron IPC | — | Main/renderer bridge | New `jobPostings:update` channel |

### No New Packages Required
All phase requirements are met with existing dependencies.

---

## Architecture Patterns

### Pattern 1: IPC Update Handler
All entity update handlers follow the same shape: `ipcMain.handle('entity:update', async (_event, id, data) => db.update(table).set(data).where(eq(table.id, id)).returning())`. The `jobPostings:update` handler follows this exactly. The preload bridge and `Api` interface in `index.d.ts` must both be updated.

**Example (from jobPostings.ts pattern):**
```typescript
ipcMain.handle('jobPostings:update', async (_event, id: number, data: { company?: string; role?: string }) => {
  try {
    const result = await db
      .update(jobPostings)
      .set({ company: data.company, role: data.role })
      .where(eq(jobPostings.id, id))
      .returning()
    return result[0]
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
})
```

### Pattern 2: Click-to-Edit Inline Field
No existing pattern. New pattern for this phase. Use a controlled `<input>` that is conditionally shown/hidden based on an `isEditing` boolean. On blur or Enter, call the IPC handler and revert to display mode.

```tsx
// Pseudo-pattern for AnalysisResults metadata bar
const [editingCompany, setEditingCompany] = useState(false)
const [localCompany, setLocalCompany] = useState(raw.company)

// Render:
{editingCompany
  ? <input
      autoFocus
      value={localCompany}
      onChange={e => setLocalCompany(e.target.value)}
      onBlur={async () => {
        await window.api.jobPostings.update(raw.jobPostingId, { company: localCompany })
        setEditingCompany(false)
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
    />
  : <span onClick={() => setEditingCompany(true)}>{localCompany}</span>
}
```

### Pattern 3: Regex Auto-Extraction at Paste Time
Attach to the `onChange` handler of the rawText textarea in `NewAnalysisForm`. Only auto-fill when the target field is empty (do not overwrite user input). Run on every change so paste events are captured.

Common patterns to match (HIGH confidence from typical job posting formats):
```typescript
function extractCompany(text: string): string | null {
  // "Company: Acme Corp" or "Company Name: Acme Corp"
  const companyLabel = text.match(/^company(?:\s+name)?:\s*(.+)/im)
  if (companyLabel) return companyLabel[1].trim()
  // "About Acme Corp" as a section header
  const aboutLine = text.match(/^about\s+(.+)/im)
  if (aboutLine) return aboutLine[1].replace(/[.,!].*$/, '').trim()
  return null
}

function extractRole(text: string): string | null {
  // "Role: Senior Engineer" or "Position: ..." or "Job Title: ..."
  const roleLabel = text.match(/^(?:role|position|job\s+title):\s*(.+)/im)
  if (roleLabel) return roleLabel[1].trim()
  // First non-empty line if short (< 80 chars, likely a title)
  const firstLine = text.trim().split('\n')[0]?.trim()
  if (firstLine && firstLine.length < 80 && !/^(about|we are|join)/i.test(firstLine)) {
    return firstLine
  }
  return null
}
```
Note: Exact patterns are Claude's discretion per D-05.

### Pattern 4: Staleness Detection via Timestamp Comparison
**Key architectural finding:** `job_bullets` has NO `updated_at` column today. `template_variants` has `created_at` but no `updated_at`. This must be addressed.

**Recommended approach (per Claude's discretion guidance in CONTEXT.md):**

1. Add `updated_at` column to `job_bullets` table via `ensureSchema` ALTER TABLE.
2. Update the `bullets:update` IPC handler to stamp `updated_at` on every text change.
3. Add `updated_at` column to `template_variants` via `ensureSchema` ALTER TABLE.
4. Update `templates:setItemExcluded` IPC handler to stamp the variant's `updated_at`.

Staleness query in `jobPostings:getAnalysis` (raw SQL because it spans multiple tables):
```typescript
// After fetching analysis with createdAt:
// Check if any bullet in the variant's included jobs was updated after analysis.createdAt
const bulletStale = db.prepare(`
  SELECT 1 FROM job_bullets jb
  JOIN template_variant_items tvi ON tvi.bullet_id = jb.id AND tvi.variant_id = ?
  WHERE (tvi.excluded = 0 OR tvi.excluded IS NULL)
    AND jb.updated_at > ?
  LIMIT 1
`).get(variantId, analysisCreatedAt) != null

// Check if variant exclusion structure changed after analysis.createdAt
const variantStale = db.prepare(`
  SELECT 1 FROM template_variants WHERE id = ? AND updated_at > ? LIMIT 1
`).get(variantId, analysisCreatedAt) != null

const isStale = bulletStale || variantStale
```

Return `isStale: boolean` in the `jobPostings:getAnalysis` response; AnalysisResults renders the amber banner when true.

**Alternative simpler approach:** If adding `updated_at` to `job_bullets` is considered too invasive, use `analysis_bullet_overrides.createdAt` as a proxy — but this only detects overrides added after analysis, not base bullet edits. The schema change is the correct approach for full staleness detection.

### Pattern 5: Orphaned Override Detection (LEFT JOIN)
The `ai:getOverrides` handler currently does a straight SELECT on `analysis_bullet_overrides`. Per D-11, it should LEFT JOIN `job_bullets` and mark rows where `jb.id IS NULL` as orphaned.

```typescript
// In ai.ts — updated getOverrides handler
const rows = db.prepare(`
  SELECT abo.bullet_id, abo.override_text, abo.source, abo.suggestion_id,
         CASE WHEN jb.id IS NULL THEN 1 ELSE 0 END AS is_orphaned
  FROM analysis_bullet_overrides abo
  LEFT JOIN job_bullets jb ON jb.id = abo.bullet_id
  WHERE abo.analysis_id = ?
`).all(analysisId) as Array<{
  bullet_id: number
  override_text: string
  source: string
  suggestion_id: string | null
  is_orphaned: 0 | 1
}>
```

The `BulletOverride` type in `index.d.ts` must be extended with `isOrphaned: boolean`.

### Pattern 6: Log Submission from OptimizeVariant
`OptimizeVariant` currently accepts only `{ analysisId: number; onBack: () => void }` as props. `AnalysisTab` already passes `onLogSubmission` to `AnalysisResults`, but never to `OptimizeVariant`. Two changes are required:

1. `OptimizeVariant`: Add `onLogSubmission?: (analysisId: number) => void` to `OptimizeVariantProps`, add "Log Submission" button in the action bar.
2. `AnalysisTab`: Pass `onLogSubmission` through to `<OptimizeVariant>` at line 90-94.

The button must also pass `company` and `role` — but `AnalysisData` is already loaded in `OptimizeVariant` (fetched in `useEffect` on mount), so both fields are available from the `analysis` state.

### Recommended Project Structure (no changes)
```
src/
├── main/
│   ├── db/
│   │   └── index.ts          # Add ALTER TABLE for updated_at columns
│   └── handlers/
│       ├── jobPostings.ts    # Add jobPostings:update handler
│       ├── ai.ts             # Update getOverrides to LEFT JOIN, add isOrphaned
│       └── templates.ts      # Stamp template_variants.updated_at in setItemExcluded
├── renderer/src/components/
│   ├── AnalysisResults.tsx   # Inline editing, stale banner
│   ├── OptimizeVariant.tsx   # Add Log Submission button + prop
│   ├── NewAnalysisForm.tsx   # Regex extraction on rawText change
│   └── AnalysisTab.tsx       # Thread onLogSubmission to OptimizeVariant
└── preload/
    └── index.d.ts            # jobPostings.update, BulletOverride.isOrphaned
```

### Anti-Patterns to Avoid
- **Storing staleness in DB:** D-08 explicitly prohibits this. Always compute at read time.
- **Blocking actions on staleness:** D-09 says the banner is informational only — no disabled buttons, no forced re-analyze.
- **Hiding orphaned overrides:** D-10 says show them with strikethrough/muted style. Filtering them out silently would violate the requirement.
- **Triggering LLM at paste time:** D-06 is explicit — regex only, no LLM at NewAnalysisForm.
- **Mutating base bullets when user edits company/role inline:** D-03 updates `jobPostings` table only, not `jobs` (the experience jobs table).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inline editing state | Custom hook | Local `useState(isEditing)` per field | Two fields max, no abstraction needed |
| Regex parsing | LLM call | Simple regex per D-06 | LLM runs during analysis run already |
| Staleness flag storage | Computed column / trigger | Read-time timestamp comparison | D-08 explicit |
| IPC plumbing | Custom event bus | Existing `ipcMain.handle` pattern | Established in every handler file |

---

## Common Pitfalls

### Pitfall 1: `updated_at` Column Missing on Existing Databases
**What goes wrong:** `ALTER TABLE job_bullets ADD COLUMN updated_at integer` is applied at startup, but existing bullet rows have `updated_at = NULL`. The staleness query `jb.updated_at > analysisCreatedAt` returns NULL (not true) for unmodified bullets — which is correct behavior. BUT if a user edits a bullet and the handler doesn't stamp `updated_at`, the column stays NULL and staleness never fires for that row.
**Why it happens:** The `bullets:update` handler currently does `db.update(jobBullets).set({ text: data.text })` — it never sets `updated_at`.
**How to avoid:** Update `bullets:update` handler to also set `updated_at: new Date()`. Add the Drizzle schema field to `jobBullets` as well so Drizzle knows about it.

### Pitfall 2: `AnalysisTab` Doesn't Forward `onLogSubmission` to OptimizeVariant
**What goes wrong:** ANLYS-01 fails at runtime — clicking "Log Submission" in OptimizeVariant does nothing because the callback is undefined.
**Why it happens:** The prop is already wired for AnalysisResults (line 104 in AnalysisTab) but OptimizeVariant render (line 90-94) only passes `analysisId` and `onBack`.
**How to avoid:** In AnalysisTab, when rendering `<OptimizeVariant>`, also pass `onLogSubmission`.

### Pitfall 3: Inline Edit Reverts on Blur Without Persist
**What goes wrong:** User edits company name, clicks away, sees old value flash back before the IPC response updates state.
**Why it happens:** Optimistic local state is replaced by a re-fetch, or state is not tracked locally.
**How to avoid:** Use local state for the editing value (separate from `raw` in analysis). On successful persist, update local state — do not re-fetch the entire analysis.

### Pitfall 4: `isOrphaned` Not Declared in `BulletOverride` Interface
**What goes wrong:** TypeScript error in OptimizeVariant when reading `override.isOrphaned` — property does not exist on `BulletOverride`.
**Why it happens:** The type is declared in `index.d.ts` and the runtime type comes from `src/shared/overrides.ts`. Both must be updated.
**How to avoid:** Add `isOrphaned?: boolean` to `BulletOverride` in both `index.d.ts` and `src/shared/overrides.ts`. The `applyOverrides` utility should ignore orphaned overrides (bullet doesn't exist, so there's nothing to apply to).

### Pitfall 5: Staleness False Positive for Analysis-Only Variant Item Changes
**What goes wrong:** A user accepts a skill suggestion (writes to `analysis_skill_additions`) — this shouldn't mark the analysis as stale, but if `template_variants.updated_at` is stamped too broadly, it might.
**Why it happens:** `setItemExcluded` is the right target for stamping `template_variants.updated_at` — skill additions don't go through that handler.
**How to avoid:** Only stamp `template_variants.updated_at` inside `setItemExcluded`, not on skill acceptance handlers.

---

## Code Examples

### Existing: getAnalysis handler return shape (to be extended)
```typescript
// src/main/handlers/jobPostings.ts — getAnalysis currently returns:
return {
  id, jobPostingId, variantId, variantName, matchScore,
  keywordHits, keywordMisses, semanticMatches, gapSkills,
  suggestions, atsFlags, rawLlmResponse, status,
  scoreBreakdown, createdAt, company, role, rawText,
}
// Phase 19 adds:
// isStale: boolean
```

### Existing: BulletOverride type (to be extended)
```typescript
// src/preload/index.d.ts — current:
export interface BulletOverride {
  bulletId: number
  overrideText: string
  source: 'ai_suggestion' | 'manual_edit'
  suggestionId: string | null
}
// Phase 19 adds:
// isOrphaned: boolean
```

### Existing: OptimizeVariantProps (to be extended)
```typescript
// src/renderer/src/components/OptimizeVariant.tsx — current:
interface OptimizeVariantProps {
  analysisId: number
  onBack: () => void
}
// Phase 19 adds:
// onLogSubmission?: (analysisId: number) => void
```

### Existing: ensureSchema ALTER TABLE pattern
```typescript
// src/main/db/index.ts — Phase 19 adds to alterStatements:
'ALTER TABLE `job_bullets` ADD COLUMN `updated_at` integer',
'ALTER TABLE `template_variants` ADD COLUMN `updated_at` integer',
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bulk save / confirm dialog | Per-click IPC persist | Phase 18 | No batch state needed in OptimizeVariant |
| analysis_bullet_overrides inline in getAnalysis | Separate ai:getOverrides channel | Phase 17 | Override data fetched independently |

---

## Open Questions

1. **Should the stale banner also appear in AnalysisList (list view)?**
   - What we know: D-09 only specifies it in AnalysisResults. CONTEXT.md lists this as Claude's discretion.
   - What's unclear: Whether AnalysisList has access to variant/bullet timestamps to compute staleness per row cheaply.
   - Recommendation: Skip stale indicator in list view for Phase 19 — `jobPostings:list` would need to run one timestamp comparison per analysis row which is expensive with many analyses. Add only to AnalysisResults detail view (required) and revisit for list view later.

2. **What timestamp precision matters for SQLite?**
   - What we know: SQLite stores timestamps as Unix integers (seconds) in this project (`mode: 'timestamp'` with `unixepoch()` default). JavaScript `new Date()` has millisecond precision but the DB rounds to seconds.
   - What's unclear: Could a bullet edit in the same second as analysis creation be missed?
   - Recommendation: Use `>=` not `>` in staleness comparison, or store as milliseconds. Given the analysis run takes 10-15 seconds, this is unlikely to be a real problem with seconds precision. Use `>` (analysis always completes before user can edit).

---

## Environment Availability

Step 2.6: SKIPPED — phase is purely code/config changes to existing Electron/React codebase. No external tools, services, or runtimes beyond what the project already uses.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in project (no jest.config, no vitest.config, no test directory) |
| Config file | None — no test infrastructure exists |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLYS-01 | Log Submission button visible in OptimizeVariant | manual-only | N/A | N/A |
| ANLYS-02 | Regex extracts company/role from pasted text | unit (if framework added) | N/A | N/A |
| ANLYS-03 | Inline edit persists to jobPostings table | manual-only | N/A | N/A |
| ANLYS-04 | Stale banner shown when bullet edited after analysis | manual-only | N/A | N/A |
| ANLYS-05 | Orphaned override shows notice, not crash | manual-only | N/A | N/A |

### Sampling Rate
- **Per task commit:** Manual smoke test in running Electron app
- **Per wave merge:** Verify all 5 success criteria from phase description
- **Phase gate:** All 5 ANLYS requirements manually verified before `/gsd:verify-work`

### Wave 0 Gaps
No test framework exists in the project. Adding one is out of scope for Phase 19.
- [ ] Regex extraction logic (`extractCompany`, `extractRole`) is the only logic suitable for unit testing — could be extracted to a utility function and tested with a simple node script if desired, but is not required.

*(No existing test infrastructure — all validation is manual.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `src/main/db/schema.ts` — confirmed no `updated_at` on `job_bullets` or `template_variants`
- Direct code reading: `src/main/db/index.ts` — confirmed ALTER TABLE pattern for additive migrations
- Direct code reading: `src/renderer/src/components/AnalysisTab.tsx` — confirmed `onLogSubmission` is NOT passed to OptimizeVariant
- Direct code reading: `src/renderer/src/components/AnalysisResults.tsx` — confirmed "Log Submission" button already exists, company/role rendered as static text
- Direct code reading: `src/renderer/src/components/OptimizeVariant.tsx` — confirmed `OptimizeVariantProps` has no `onLogSubmission` prop
- Direct code reading: `src/renderer/src/components/NewAnalysisForm.tsx` — confirmed company/role fields exist, no extraction logic present
- Direct code reading: `src/main/handlers/jobPostings.ts` — confirmed no `jobPostings:update` handler exists today
- Direct code reading: `src/preload/index.d.ts` — confirmed `BulletOverride` has no `isOrphaned`, confirmed `jobPostings` API has no `update` method

### Secondary (MEDIUM confidence)
- D-11 from CONTEXT.md — LEFT JOIN approach for orphan detection (project decision, not external research needed)
- D-07/D-08 from CONTEXT.md — timestamp-based staleness detection strategy

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — patterns directly verified in source code
- Pitfalls: HIGH — identified from concrete gaps in current code (missing props, missing columns, missing handler)

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable project, no external dependencies changing)
