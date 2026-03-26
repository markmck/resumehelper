# Phase 18: Three-Layer Model Wiring - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the analysis_bullet_overrides table (from Phase 17) into the accept/dismiss flow, preview/export rendering pipeline, and submission snapshots. After this phase, accepting an AI suggestion writes to the override table (not base bullets), preview/export merges all three layers (base -> variant selection -> analysis overrides), and submissions capture the correct merged result.

</domain>

<decisions>
## Implementation Decisions

### Accept/Persist Flow
- **D-01:** Accepting a suggestion immediately persists to the overrides table per-click via `ai:acceptSuggestion(analysisId, bulletId, text)` -- no batch save pattern
- **D-02:** The current "Save & Apply" button is removed entirely -- the optimize screen becomes a review-and-decide flow; navigate away when done
- **D-03:** The variant duplication feature ("Save as new variant") is dropped from the optimize screen -- overrides are analysis-scoped, not variant-scoped, so variant duplication doesn't apply
- **D-04:** Skill accept flow is analysis-scoped only -- accepting a skill suggestion writes to `analysis_skill_additions` table (status: accepted), base skills table remains untouched

### Preview Context Switching
- **D-05:** `getBuilderData(variantId, analysisId?)` -- when analysisId is provided, main process fetches overrides and calls `applyOverrides()` before returning data. Renderer doesn't need to know about overrides.
- **D-06:** After each accept/dismiss in OptimizeVariant, re-fetch `getBuilderData(variantId, analysisId)` and push updated data to the preview iframe -- simple re-fetch, no optimistic local updates
- **D-07:** Both PDF and DOCX export paths support the analysisId parameter for override merging -- what you see in analysis preview is what you export

### Undo/Revert Mechanics
- **D-08:** Each accepted suggestion shows a per-bullet "Revert" button/icon. Clicking it calls `ai:dismissSuggestion` to delete the override row, reverting that bullet to base text.
- **D-09:** Reverted suggestion returns to "pending" state with the original suggested text still visible -- user can re-accept it later

### Snapshot Override Strategy
- **D-10:** `buildSnapshotForVariant(variantId, analysisId?)` -- when analysisId is provided, fetch overrides and merge via `applyOverrides()` before freezing. Merged text baked into `bullet.text` in the snapshot (self-contained, no re-apply needed).
- **D-11:** Accepted skill additions from `analysis_skill_additions` are also merged into the snapshot's skills array with their category -- snapshot captures the complete resume as it would appear in analysis context

### Claude's Discretion
- Exact UI placement and styling of the per-bullet revert button
- How the analysis status gets updated (e.g., auto-stamp as "reviewed" on first accept)
- Error handling for edge cases (e.g., bullet deleted between accept and preview refresh)
- Whether to show a brief toast/indicator on accept/dismiss for visual feedback

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Three-Layer Data Model
- `.planning/REQUIREMENTS.md` -- DATA-02 through DATA-07 define the six requirements for this phase
- `.planning/phases/17-schema-override-ipc-foundation/17-CONTEXT.md` -- Phase 17 decisions on table design, IPC handler strategy, shared utility

### Codebase Entry Points
- `src/shared/overrides.ts` -- `applyOverrides()` utility and `BulletOverride` type (implemented in Phase 17, not yet used)
- `src/main/handlers/ai.ts` -- `ai:acceptSuggestion`, `ai:dismissSuggestion`, `ai:getOverrides` IPC handlers (implemented in Phase 17, not yet called from renderer)
- `src/main/db/schema.ts` -- `analysisBulletOverrides` and `analysisSkillAdditions` table schemas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `applyOverrides()` in `src/shared/overrides.ts`: Pure function that merges bullet text with overrides -- ready to use in getBuilderData and buildSnapshotForVariant
- `ai:acceptSuggestion`/`ai:dismissSuggestion`/`ai:getOverrides` IPC handlers in `src/main/handlers/ai.ts`: Fully implemented, write/read from `analysis_bullet_overrides` table
- `window.api.ai.acceptSuggestion()`/`dismissSuggestion()`/`getOverrides()` in preload bridge: Already exposed, callable from renderer

### Established Patterns
- `getBuilderData(variantId)` in `src/main/handlers/templates.ts`: Fetches all content with variant exclusion flags -- extend with optional analysisId parameter
- `getBuilderDataForVariant(variantId)` in `src/main/handlers/export.ts`: Same pattern used for export -- must also support analysisId
- `buildSnapshotForVariant(variantId)` in `src/main/handlers/submissions.ts`: Freezes content at submission time -- extend with optional analysisId
- VariantPreview sends data to iframe via postMessage -- same pattern, just with potentially merged data

### Integration Points
- `src/renderer/src/components/OptimizeVariant.tsx`: Main rewire target -- remove bulk save, wire accept/dismiss to IPC handlers, remove variant duplication
- `src/renderer/src/components/VariantPreview.tsx`: Needs to pass analysisId to getBuilderData when in analysis context
- `src/main/handlers/export.ts`: PDF and DOCX export handlers need analysisId parameter support
- `src/main/handlers/submissions.ts`: buildSnapshotForVariant needs analysisId parameter, merge overrides + skill additions into snapshot
- `src/renderer/src/PrintApp.tsx`: No changes needed -- receives pre-merged data via postMessage

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 18-three-layer-model-wiring*
*Context gathered: 2026-03-26*
