# Phase 21: Variant UX + Cleanup - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Four discrete fixes: (1) Add a job-level toggle checkbox in the variant builder that includes/excludes all bullets at once, (2) fix variant card timestamps to use updatedAt instead of createdAt, (3) fix Modern template inline skills overflow with word-wrap CSS, (4) clean up stale "coming soon" references and wire the AnalysisList Submit button.

</domain>

<decisions>
## Implementation Decisions

### Job Toggle in Variant Builder (VARNT-01)
- **D-01:** Add a checkbox on the job header row in VariantBuilder, next to the company/role text. Matches the existing bullet checkbox pattern.
- **D-02:** Unchecking the job checkbox calls `setItemExcluded(variantId, 'job', jobId, true)` which already cascades to all bullets for that job (backend already supports this).
- **D-03:** When a job is toggled off, individual bullet checkboxes remain visible but are disabled/grayed out. User retains visibility into their bullet selections.

### Variant Card Timestamps (VARNT-05)
- **D-04:** Fix NewAnalysisForm variant cards to display `updatedAt` instead of `createdAt`. Fall back to `createdAt` when `updatedAt` is null (variants created before the migration).
- **D-05:** Add `updatedAt?: Date` to the `TemplateVariant` interface in `index.d.ts` if not already present.
- **D-06:** Verify `templates:list` handler returns the `updatedAt` field from the database.

### Modern Template Skills Fix (TMPL-01)
- **D-07:** Add `overflowWrap: 'break-word'` and `wordBreak: 'break-word'` to the inline skills container `<div>` in ModernTemplate.tsx. Skills wrap naturally within the column width.
- **D-08:** No layout restructuring — keep the comma-separated text approach, just fix the wrapping.

### Coming Soon Cleanup (CLNP-01)
- **D-09:** Keep the "From URL" disabled tab on NewAnalysisForm as-is — URL import is a planned future feature.
- **D-10:** Wire the disabled "Submit" button on AnalysisList (currently referencing "Phase 11") to the Log Submission flow. Enable it. Clicking navigates to SubmissionLogForm with the analysis pre-linked.
- **D-11:** Remove the "Coming in Phase 11" title text from the Submit button.

### Claude's Discretion
- Exact checkbox placement and styling on job header (align with existing bullet checkbox pattern)
- Whether to add a visual indicator (muted opacity, strikethrough) on excluded job headers
- Whether to scan for other "coming soon" instances beyond the two found

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — VARNT-01, VARNT-05, TMPL-01, CLNP-01

### Codebase Entry Points
- `src/renderer/src/components/VariantBuilder.tsx` — Variant builder with job headers (lines 281-304) and bullet toggles
- `src/main/handlers/templates.ts` — `setItemExcluded` handler already supports job-level cascade (lines 371-418)
- `src/renderer/src/components/NewAnalysisForm.tsx` — Variant cards using `createdAt` (line 397), "From URL" tab (lines 206-232)
- `src/renderer/src/components/templates/ModernTemplate.tsx` — Inline skills rendering (lines 222-231)
- `src/renderer/src/components/AnalysisList.tsx` — Disabled Submit button referencing Phase 11 (line 883)
- `src/preload/index.d.ts` — TemplateVariant interface (needs updatedAt field)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setItemExcluded` handler in `templates.ts`: Already cascades job exclusion to all bullets. No backend work needed for VARNT-01.
- `handleBulletToggle` in VariantBuilder: Existing pattern for exclusion toggle. Job toggle follows same pattern.
- `updatedAt` column on `templateVariants`: Added in Phase 19, stamped by `setItemExcluded`. Ready to use for timestamp fix.
- `onLogSubmission` callback: Already wired through AnalysisTab for OptimizeVariant. Same pattern for AnalysisList.

### Established Patterns
- Exclusion toggles: Checkboxes with `handleBulletToggle(jobId, bulletId, currentExcluded)` calling `setItemExcluded`.
- Template inline styles: All templates use React inline styles — no external CSS.
- Tab navigation: AnalysisTab routes between AnalysisList, AnalysisResults, OptimizeVariant, SubmissionLogForm via state.

### Integration Points
- `src/renderer/src/components/VariantBuilder.tsx` — Add job header checkbox and `handleJobToggle` method
- `src/renderer/src/components/NewAnalysisForm.tsx` — Change `variant.createdAt` to `variant.updatedAt || variant.createdAt`
- `src/renderer/src/components/templates/ModernTemplate.tsx` — Add CSS overflow properties to inline skills div
- `src/renderer/src/components/AnalysisList.tsx` — Wire Submit button to `onLogSubmission` callback
- `src/renderer/src/components/AnalysisTab.tsx` — May need to forward `onLogSubmission` to AnalysisList

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

*Phase: 21-variant-ux-cleanup*
*Context gathered: 2026-03-27*
