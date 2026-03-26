# Phase 18: Three-Layer Model Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 18-three-layer-model-wiring
**Areas discussed:** Accept/persist timing, Preview context switching, Undo/revert mechanics, Snapshot override strategy

---

## Accept/Persist Timing

### When should accepting a suggestion persist?

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate per-click | Clicking accept/dismiss immediately calls IPC handler. No bulk save step. Each action is atomic. | :heavy_check_mark: |
| Keep batch save pattern | Accept/dismiss stays local state. A 'Save' button writes all pending accepts at once. | |
| Immediate + confirmation toast | Same as immediate but with brief toast feedback on each action. | |

**User's choice:** Immediate per-click
**Notes:** None

### Save button disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it entirely | No save step needed. Navigate away when done reviewing. | :heavy_check_mark: |
| Keep as 'Done reviewing' | Repurpose to stamp analysis status only. | |

**User's choice:** Remove it entirely
**Notes:** None

### Variant duplication

| Option | Description | Selected |
|--------|-------------|----------|
| Drop it | Overrides are analysis-scoped. Variant duplication doesn't apply. | :heavy_check_mark: |
| Keep as separate action | Move to variant list as independent feature. | |

**User's choice:** Drop it
**Notes:** None

### Skill accept scope

| Option | Description | Selected |
|--------|-------------|----------|
| Analysis-scoped only | Writes to analysis_skill_additions. Base skills untouched. | :heavy_check_mark: |
| Write to both | Accept writes to both analysis table and base skills. | |

**User's choice:** Analysis-scoped only
**Notes:** None

---

## Preview Context Switching

### How should preview know about overrides?

| Option | Description | Selected |
|--------|-------------|----------|
| Pass analysisId to data fetcher | getBuilderData(variantId, analysisId?) -- main process merges. | :heavy_check_mark: |
| Merge in renderer | Renderer fetches overrides separately and applies client-side. | |
| Separate preview endpoint | New IPC handler for analysis preview. | |

**User's choice:** Pass analysisId to data fetcher
**Notes:** None

### Live preview update strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch on accept/dismiss | Re-call getBuilderData after each persist. Preview always matches DB. | :heavy_check_mark: |
| Optimistic local update | Swap text in-memory, reconcile on next full fetch. | |

**User's choice:** Re-fetch on accept/dismiss
**Notes:** None

### Export override support

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, both PDF and DOCX | Both export paths support analysisId for merged text. | :heavy_check_mark: |
| PDF only, DOCX later | Wire PDF first, DOCX separately. | |
| No -- export uses base only | Overrides only in preview. | |

**User's choice:** Yes, both PDF and DOCX
**Notes:** None

---

## Undo/Revert Mechanics

### How should undo work?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-bullet revert button | Each accepted suggestion shows revert icon. Calls dismissSuggestion. | :heavy_check_mark: |
| Toggle behavior on accept button | Accept button toggles between accepted/pending states. | |
| Undo-all button | Single reset button for all overrides in analysis. | |

**User's choice:** Per-bullet revert button
**Notes:** None

### Revert target state

| Option | Description | Selected |
|--------|-------------|----------|
| Back to pending | Suggestion returns to pending with original text visible. Can re-accept. | :heavy_check_mark: |
| Dismissed state | Suggestion collapses/hides after revert. | |

**User's choice:** Back to pending
**Notes:** None

---

## Snapshot Override Strategy

### How should snapshots handle overrides?

| Option | Description | Selected |
|--------|-------------|----------|
| Bake merged text into bullet.text | applyOverrides() merges before freezing. Snapshot is self-contained. | :heavy_check_mark: |
| Store overrides separately | Base text + overrides array. Re-apply at render time. | |
| Store both merged and raw | Bake merged + keep raw overrides as metadata. | |

**User's choice:** Bake merged text into bullet.text
**Notes:** None

### Snapshot API extension

| Option | Description | Selected |
|--------|-------------|----------|
| Optional analysisId parameter | buildSnapshotForVariant(variantId, analysisId?). Explicit control. | :heavy_check_mark: |
| Always check for latest analysis | Auto-find most recent analysis. Implicit. | |

**User's choice:** Optional analysisId parameter
**Notes:** None

### Skill additions in snapshot

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, merge into skills array | Accepted skill additions appended to snapshot skills. | :heavy_check_mark: |
| No, skills snapshot stays base-only | Only base skills in snapshot. | |

**User's choice:** Yes, merge into skills array
**Notes:** None

---

## Claude's Discretion

- Exact UI styling of per-bullet revert button
- Analysis status auto-stamping behavior
- Error handling for edge cases (deleted bullets, concurrent access)
- Whether to show visual feedback (toast/indicator) on accept/dismiss

## Deferred Ideas

None -- discussion stayed within phase scope
