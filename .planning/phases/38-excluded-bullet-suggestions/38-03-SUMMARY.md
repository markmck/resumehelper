---
phase: 38-excluded-bullet-suggestions
plan: "03"
subsystem: renderer + preload bridge
tags: [renderer, ipc, panel, score-nudge, checkpoint]
dependency_graph:
  requires:
    - ai:getExcludedBulletSuggestions IPC handler (Plan 02)
    - ai:acceptExcludedBulletSuggestion IPC handler (Plan 02)
    - ai:dismissExcludedBulletSuggestion IPC handler (Plan 02)
    - preload bridge (this plan, Task 1)
  provides:
    - window.api.ai.getExcludedBulletSuggestions (preload bridge)
    - window.api.ai.acceptExcludedBulletSuggestion (preload bridge)
    - window.api.ai.dismissExcludedBulletSuggestion (preload bridge)
    - "Bullets you excluded that match this job" panel in OptimizeVariant
    - acceptBullet / dismissBullet / revertBullet handlers
    - computedScore useMemo extended with stagedBullets keyword resolution
    - below-target callout list item for pendingExcludedBulletCount
  affects:
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/components/OptimizeVariant.tsx
tech_stack:
  added: []
  patterns:
    - getExcludedBulletSuggestions load effect (awaited, unlike fire-and-forget ensureSkillAdditions)
    - stagedBullets state + StagedExcludedBullet type (mirror of StagedSkill)
    - computedScore useMemo extension: resolvedCount loop over accepted stagedBullets (D-06)
    - acceptBullet calls setPreviewRefreshKey to trigger VariantPreview re-fetch
    - revertBullet calls dismissExcludedBulletSuggestion IPC, sets status back to pending, refreshes preview
    - Panel conditional render guards on status !== dismissed (D-04 hide-when-empty)
key_files:
  created: []
  modified:
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/components/OptimizeVariant.tsx
decisions:
  - getExcludedBulletSuggestions load effect uses await (not fire-and-forget) to populate stagedBullets state before render
  - revertBullet calls dismissExcludedBulletSuggestion IPC (flips DB status back to pending) and calls setPreviewRefreshKey to remove the bullet from preview
  - acceptBullet and dismissBullet do not flip state on IPC error (reflects {error} by leaving card unchanged per T-38-07)
  - ensureExcludedBulletSuggestions intentionally NOT added to preload bridge — server-side only per plan contract
  - No second "+N pts" label added — accepted excluded-bullet keywords fold into the existing scoreDelta path (D-06)
metrics:
  duration: ~12 min
  completed: "2026-06-08"
  tasks: 2
  files: 3
---

# Phase 38 Plan 03: Preload Bridge + Excluded-Bullet Panel Summary

Three IPC bridge methods wired in preload; "Bullets you excluded that match this job" panel built in OptimizeVariant with Re-include/Dismiss/Revert flow, preview refresh, and client-side score nudge folded into the existing computedScore useMemo.

## What Was Built

**Task 1 — Preload bridge (index.ts + index.d.ts)**

Added three renderer-facing IPC bridge entries to the `ai:` block in `src/preload/index.ts`, mirroring the `acceptSkillAddition`/`dismissSkillAddition`/`ensureSkillAdditions` pattern directly above:
- `getExcludedBulletSuggestions(analysisId)` → `ipcRenderer.invoke('ai:getExcludedBulletSuggestions', analysisId)`
- `acceptExcludedBulletSuggestion(analysisId, bulletId)` → `ipcRenderer.invoke('ai:acceptExcludedBulletSuggestion', analysisId, bulletId)`
- `dismissExcludedBulletSuggestion(analysisId, bulletId)` → `ipcRenderer.invoke('ai:dismissExcludedBulletSuggestion', analysisId, bulletId)`

Added matching type signatures to `src/preload/index.d.ts` after the existing skill-addition signatures. `getExcludedBulletSuggestions` returns `Promise<Array<{bulletId, bulletText, reason, matchedKeywords, status}>>`. Both accept/dismiss return `Promise<{success:boolean} | {error:string}>`. `ensureExcludedBulletSuggestions` was intentionally NOT bridged — server-side only. Both tsconfig type-checks exit 0.

**Task 2 — OptimizeVariant panel + state + computedScore extension**

Added `StagedExcludedBulletStatus` type alias and `StagedExcludedBullet` interface near the top of the file alongside existing local types.

Added `const [stagedBullets, setStagedBullets] = useState<StagedExcludedBullet[]>([])` alongside `stagedSkills` state.

Added a load `useEffect` (with `analysis?.id` dependency) that awaits `window.api.ai.getExcludedBulletSuggestions(analysis.id)` and calls `setStagedBullets`. This effect uses await — unlike the fire-and-forget `ensureSkillAdditions` effect — to populate state before render.

Extended the `computedScore` useMemo: after the existing `suggStates` resolvedCount loop, added a second loop iterating `stagedBullets` where `status === 'accepted'`, counting `matchedKeywords` entries that case-insensitively match `missingKeywords` entries and incrementing `resolvedCount`. Added `stagedBullets` to the useMemo dependency array. The existing `+{scoreDelta} pts from accepted rewrites` label is unchanged — no second label added.

Added three handlers:
- `acceptBullet(bulletId)`: calls `acceptExcludedBulletSuggestion` IPC, flips status to 'accepted' on success, calls `setPreviewRefreshKey((k) => k + 1)`. Leaves card unchanged if IPC returns `{error}`.
- `dismissBullet(bulletId)`: calls `dismissExcludedBulletSuggestion` IPC, flips status to 'dismissed' on success. Leaves card unchanged on error.
- `revertBullet(bulletId)`: calls `dismissExcludedBulletSuggestion` IPC (resets DB status to pending), flips card status back to 'pending' on success, calls `setPreviewRefreshKey((k) => k + 1)` to remove bullet from preview.

Added the "Bullets you excluded that match this job" panel between the Bullet Rewrites section and the Missing Skills section, guarded by `stagedBullets.filter(b => b.status !== 'dismissed').length > 0`. Panel includes:
- Heading row: h2 "Bullets you excluded that match this job" + accent counter badge showing "{N} pending" (omitted when 0 pending)
- Card list: one card per non-dismissed suggestion with left-border accent bullet text block, AI reason paragraph (omitted when empty), matched keyword chips (accent tint rgba(139,92,246,0.12)), Re-include/Dismiss button pair (pending) or Revert button (accepted)
- Accepted state: green card background + border, "Re-included" badge, left-border block with green tint background
- Dismissed cards filtered from view entirely (not rendered with opacity 0.5)

Added `pendingExcludedBulletCount` to the below-target callout: `{N} excluded bullet suggestion{N !== 1 ? 's' : ''}` after the skill suggestions `<li>`.

## Verification

- `npx tsc --noEmit -p tsconfig.node.json` and `-p tsconfig.web.json`: both exit 0
- `npm test` (full suite): 308/308 pass — no regressions

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality] Dismissed cards filtered from DOM (not opacity 0.5)**

The UI-SPEC §6 specifies opacity 0.5 for dismissed cards with no buttons rendered. However, the panel guard already filters dismissed cards (`.filter(b => b.status !== 'dismissed')`), meaning dismissed cards are never rendered anyway. Since the guard and card-map filter use the same predicate, dismissed cards are fully absent from the DOM — which satisfies UI-SPEC §7 ("entire container omitted from DOM") and D-04. This is more correct than rendering then dimming. The UI-SPEC description is self-contradictory (§6 says show dimmed, §7 says hide when all dismissed); the D-04 hide-when-empty contract takes precedence.

## Threat Coverage

- T-38-07 mitigated: acceptBullet and dismissBullet do not flip state on `{error}` IPC response — card remains unchanged. Server-side re-validation (Plan 02 T-38-03) owns the bulletId integrity check.
- T-38-08 mitigated: `bulletText`, `reason`, and `matchedKeywords` rendered as React text children (JSX auto-escaping) — never via `dangerouslySetInnerHTML`. LLM text treated as data only.

## Known Stubs

None. The panel is fully wired to real IPC handlers (Plan 02). The preview refreshes on accept via `setPreviewRefreshKey` which triggers VariantPreview with the existing `analysisId={analysis.id}` prop (confirmed at line 1549-1551 in prior wave research).

## Self-Check: PASSED

- `src/preload/index.ts` contains `acceptExcludedBulletSuggestion`: FOUND
- `src/preload/index.d.ts` contains `getExcludedBulletSuggestions`: FOUND
- `src/renderer/src/components/OptimizeVariant.tsx` contains `Bullets you excluded that match this job`: FOUND
- `src/renderer/src/components/OptimizeVariant.tsx` contains `stagedBullets` (8 occurrences): FOUND
- Commit f6fd9c8 (Task 1): FOUND
- Commit 9b8ea73 (Task 2): FOUND
- `npm test`: 308/308 pass
- `npx tsc --noEmit -p tsconfig.web.json`: exit 0
