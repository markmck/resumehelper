# Phase 19: Analysis Submission Flow - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to log a submission directly from the analysis screen with company and role pre-filled, auto-extract company/role from pasted job posting text via simple regex, allow inline editing of company/role on existing analyses, surface stale analyses with a warning indicator, and handle orphaned overrides gracefully.

</domain>

<decisions>
## Implementation Decisions

### Log Submission Placement
- **D-01:** "Log Submission" button appears on both AnalysisResults and OptimizeVariant screens. Both pre-fill company, role, variantId, and analysisId.
- **D-02:** Clicking "Log Submission" from OptimizeVariant navigates to the existing SubmissionLogForm (same form, same flow as from AnalysisResults). No inline form or modal.

### Inline Company/Role Editing
- **D-03:** Company and role fields are click-to-edit inline in the AnalysisResults metadata bar. Changes persist to the jobPostings table via an update IPC handler.
- **D-04:** Not editable in the AnalysisList table — only in the detailed AnalysisResults view.

### Company/Role Auto-Extraction
- **D-05:** Simple regex/heuristic extraction at paste-time in NewAnalysisForm. Parse common patterns from pasted text ('Company: X', 'About X', header lines, 'Role: Y', 'Position: Y'). Auto-fill the company and role fields. User can still override.
- **D-06:** No additional LLM call at paste-time. The LLM extraction that happens during analysis run is unchanged.

### Stale Analysis Detection
- **D-07:** An analysis is stale when any bullet text in the variant's included jobs was edited, or variant exclusion structure changed, after the analysis was created. Compare analysis.createdAt against relevant updatedAt timestamps.
- **D-08:** Staleness is computed on-demand when analysis is viewed (no stored column). Derived at read time by comparing timestamps. Always accurate, no sync issues.
- **D-09:** Stale indicator is a yellow/amber warning badge or banner on AnalysisResults: "Analysis may be outdated — resume content changed since this analysis ran." Includes a "Re-analyze" button. Does NOT block any actions — user can still submit or optimize.

### Orphaned Override Handling
- **D-10:** When a bullet referenced by an override has been deleted, show the orphaned suggestion with a strikethrough/muted style and a notice: "Original bullet was deleted." Don't crash, don't hide it.
- **D-11:** Detection via LEFT JOIN at load time — when loading overrides for an analysis, LEFT JOIN against jobBullets. If bullet row is NULL, the override is orphaned. Mark in returned data so renderer shows the notice.
- **D-12:** Override rows are cleaned up by ON DELETE CASCADE when the bullet is deleted from the database. The orphaned state is transient — visible only if the override was loaded before the cascade ran (e.g., analysis was already open).

### Claude's Discretion
- Exact regex patterns for company/role extraction from job posting text
- Warning badge styling (exact colors, icon, positioning)
- Strikethrough styling for orphaned overrides
- Whether the stale banner appears in AnalysisList as well (e.g., small icon in the list row)
- updatedAt column addition to jobBullets if one doesn't exist (needed for staleness comparison)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ANLYS-01 through ANLYS-05 define the five requirements for this phase

### Prior Phase Context
- `.planning/phases/18-three-layer-model-wiring/18-CONTEXT.md` — Phase 18 decisions on override table wiring, snapshot merging, IPC handler patterns

### Codebase Entry Points
- `src/renderer/src/components/AnalysisResults.tsx` — Analysis results view with existing "Log Submission" button and job metadata bar
- `src/renderer/src/components/OptimizeVariant.tsx` — Optimize view where second "Log Submission" button goes
- `src/renderer/src/components/SubmissionLogForm.tsx` — Existing submission form with pre-fill from linked analysis
- `src/renderer/src/components/NewAnalysisForm.tsx` — Analysis creation form where auto-extraction happens
- `src/main/handlers/jobPostings.ts` — Job posting CRUD handlers
- `src/main/handlers/ai.ts` — Analysis handler with existing LLM company/role extraction
- `src/main/db/schema.ts` — jobPostings, analysisResults, analysisBulletOverrides table schemas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SubmissionLogForm` in `src/renderer/src/components/SubmissionLogForm.tsx`: Already handles linked analysis pre-fill, border highlights, variant selection. Reuse directly for OptimizeVariant flow.
- `submissions:getAnalysisById` in `src/main/handlers/submissions.ts`: Already fetches analysis with joined jobPosting data for form pre-fill.
- `callJobParser()` in AI handler: Extracts structured data from job posting text during analysis — patterns here inform regex approach.
- `ON DELETE CASCADE` on analysisBulletOverrides.bulletId → jobBullets.id: Orphaned overrides are auto-cleaned at DB level.

### Established Patterns
- Click-to-edit inline fields: Not established yet — new pattern for this phase. AnalysisResults currently renders company/role as static text.
- IPC update handlers: Pattern of `ipcMain.handle('entity:update', ...)` with `db.update().set().where()` is well-established.
- Badge/indicator styling: Design system tokens available (`--color-warning`, `--color-text-secondary`).

### Integration Points
- `src/renderer/src/components/OptimizeVariant.tsx`: Add "Log Submission" button with navigation to SubmissionLogForm
- `src/renderer/src/components/AnalysisResults.tsx`: Make company/role fields inline-editable; add stale analysis warning banner
- `src/renderer/src/components/NewAnalysisForm.tsx`: Add regex extraction on paste into rawText field
- `src/main/handlers/jobPostings.ts`: Add `jobPostings:update` IPC handler for inline edits
- `src/main/handlers/ai.ts` or `src/main/handlers/jobPostings.ts`: Add staleness check query (compare timestamps)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-analysis-submission-flow*
*Context gathered: 2026-03-27*
