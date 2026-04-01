---
phase: 22-ats-score-threshold
plan: 02
subsystem: frontend/optimize-variant
tags: [threshold, slider, score-ring, callout, ui, ipc]
dependency_graph:
  requires: [22-01]
  provides: [threshold slider UI, target arc, threshold-relative coloring, below-target callout]
  affects: [src/renderer/src/components/OptimizeVariant.tsx]
tech_stack:
  added: []
  patterns: [debounced IPC save via useRef+useCallback, threshold-aware score coloring, IIFE pattern for conditional callout]
key_files:
  created: []
  modified:
    - src/renderer/src/components/OptimizeVariant.tsx
decisions:
  - Used analysis.variantId (derived from loaded data) for setThreshold/getThreshold calls — variantId is not a prop, it comes from the analysis record
  - Removed unused ptsAvailable useMemo (was used by old "pts available" display removed per plan)
  - Callout heading uses &mdash; entity for em-dash in JSX (not literal —)
metrics:
  duration: ~5 min
  completed: 2026-04-01
  tasks_completed: 1
  files_modified: 1
  files_created: 0
---

# Phase 22 Plan 02: OptimizeVariant Threshold UI Summary

**One-liner:** Threshold slider with debounced IPC save, target arc tick on score ring, threshold-relative color bands, score delta display, and below-target callout with live-updating improvement suggestions wired into OptimizeVariant.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Wire threshold slider, target arc, score coloring, and below-target callout | ba56395 |

## What Was Built

**Task 1 — OptimizeVariant Threshold UI:**

- **Import:** Replaced local `getScoreColor` function (fixed 80/50 bands) with import from `../lib/scoreColor` (threshold-aware)
- **Threshold state:** `const [threshold, setThreshold] = useState(80)` — default 80 until DB value loads
- **Mount loading:** Added `window.api.templates.getThreshold(data.variantId)` call inside existing mount useEffect, guarded by `data.variantId != null`
- **Debounced save:** `saveThresholdRef` + `handleThresholdChange` callback — sets state immediately, debounces IPC at 300ms. Save only fires from `onChange`, never from useEffect (Pitfall 6 avoided)
- **Cleanup:** Separate useEffect clears debounce timer on unmount
- **ringColor:** Updated to `getScoreColor(computedScore, threshold)` — green at/above threshold, yellow within 15, red below
- **getScoreLabel:** Updated to accept `threshold` parameter, now threshold-relative (not fixed 80/50 bands)
- **Target arc tick:** Second `<circle>` in SVG with `strokeDasharray="6 308"` and `stroke="var(--color-accent)"` at threshold position
- **Score delta:** Replaced old badge `div` with inline `<p>` showing `+{scoreDelta} pts from accepted rewrites` in success green, weight 400
- **Threshold slider:** `<input type="range" min=0 max=100 step=5>` with accent color, 28px height, label "Target score"
- **Below-target callout:** IIFE pattern inside JSX renders only when `computedScore < threshold` AND at least one actionable item exists. Shows counts for pending rewrites, missing keywords, pending skills with pluralization
- **Cleanup:** Removed `ptsAvailable` useMemo that was only used by the old "pts available" display (replaced by the new callout)

## Deviations from Plan

**1. [Rule 1 - Cleanup] Removed unused ptsAvailable useMemo**
- **Found during:** Task 1 — after replacing the score delta section
- **Issue:** `ptsAvailable` was computed by a useMemo and rendered as "{N} pts available" — the plan replaced this display with the new score delta format and below-target callout. The variable became unused.
- **Fix:** Removed the unused useMemo entirely
- **Files modified:** src/renderer/src/components/OptimizeVariant.tsx
- **Commit:** ba56395

## Known Stubs

None — all functionality is fully wired.

## Self-Check: PASSED

- [x] OptimizeVariant imports `getScoreColor` from `'../lib/scoreColor'` (NOT local)
- [x] Local `getScoreColor` function definition removed
- [x] `const [threshold, setThreshold] = useState(80)` exists
- [x] Mount useEffect calls `window.api.templates.getThreshold(data.variantId)` guarded by null check
- [x] `handleThresholdChange` callback exists with debounced `setThreshold` IPC
- [x] `saveThresholdRef` is `useRef<ReturnType<typeof setTimeout> | null>(null)` with 300ms timeout
- [x] Cleanup effect clears `saveThresholdRef.current`
- [x] `ringColor` computed as `getScoreColor(computedScore, threshold)`
- [x] `getScoreLabel` accepts `threshold` parameter, threshold-relative bands
- [x] SVG contains second `<circle>` with `strokeDasharray="6 308"` and `stroke="var(--color-accent)"`
- [x] Score delta shows `+{scoreDelta} pts from accepted rewrites` (not old "+N points from accepted changes")
- [x] Slider renders `<input type="range" min={0} max={100} step={5}>` with `accentColor`
- [x] Slider label shows "Target score"
- [x] Below-target callout renders when `computedScore < threshold`
- [x] Callout hidden when all counts are 0
- [x] NO useEffect watching threshold state and triggering save
- [x] `npx tsc --noEmit` passes
