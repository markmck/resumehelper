# Phase 22: ATS Score Threshold Setting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 22-ats-score-threshold
**Areas discussed:** Where the threshold lives, How threshold affects the UI, Score color thresholds, Threshold feedback loop, Score recalculation, Threshold on submission, Slider UX details

---

## Where the threshold lives

| Option | Description | Selected |
|--------|-------------|----------|
| Settings page (global) | One threshold for all analyses — lives in ai_settings or a new settings table | |
| Per-variant setting | Each variant gets its own target score — stored on templateVariants table | ✓ |
| Both (global default + per-variant override) | Global default in settings, optionally override per variant | |

**User's choice:** Per-variant setting
**Notes:** Stored as DB column on templateVariants, default 80

### Sub-decisions

**UI location:** Optimize screen (OptimizeVariant), near the score display
**Input control:** Slider (0-100)
**Default value:** 80 (not null/off — starts with a reasonable target matching current green threshold)
**Persistence:** DB column on templateVariants
**Exact placement:** Near the score display metric card

---

## How threshold affects the UI

| Option | Description | Selected |
|--------|-------------|----------|
| Visual indicator only | Below-threshold analyses show a warning badge/icon but remain fully visible and accessible | ✓ |
| Dimmed/de-emphasized | Below-threshold rows are visually faded | |
| Filterable | Add a filter toggle: 'Show below threshold' | |

**User's choice:** Visual indicator only

### Sub-decisions

**Score badge:** Target line on score badge — ring/arc showing target alongside current score
**Analysis list:** No per-row above/below badges — threshold indicator only on OptimizeVariant

---

## Score color thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| Keep hardcoded | 80/50 thresholds stay fixed | |
| Colors follow the target | Green = at/above target, yellow = within 15, red = far below | ✓ |
| Fully configurable color bands | User sets green/yellow/red cutoff points independently | |

**User's choice:** Colors follow the target

### Sub-decisions

**Cross-variant views:** Analysis list falls back to fixed 80/50 bands (since it shows analyses across variants with different targets)

---

## Threshold feedback loop

| Option | Description | Selected |
|--------|-------------|----------|
| Color change only | Score badge turns yellow/red relative to target | |
| Color + text hint | Score badge changes color AND shows short message | |
| Color + actionable callout | Banner highlighting top 2-3 things to improve | ✓ |

**User's choice:** Color + actionable callout

### Sub-decisions

**Live updates:** Callout recalculates on each accept/dismiss — live, not static
**Celebration on target reached:** No — just the color change to green is sufficient

---

## Score recalculation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — recalculate on accept/dismiss | Re-run scoring logic with overridden bullets | |
| No — score stays fixed | matchScore is the initial assessment | |
| Estimated score adjustment | Heuristic: each accepted rewrite adds ~2-3 points | ✓ |

**User's choice:** Estimated score adjustment

### Sub-decisions

**Display format:** Original + delta — show "72 (+6)" not blended "78"

---

## Threshold on submission

| Option | Description | Selected |
|--------|-------------|----------|
| Soft warning | Show 'Below target (72/80)' notice on submission form | ✓ |
| No warning | Threshold is purely an optimize-screen tool | |
| Confirmation dialog | "Score is below target. Submit anyway?" with confirm/cancel | |

**User's choice:** Soft warning — informational only, user can submit anyway

---

## Slider UX details

| Option | Description | Selected |
|--------|-------------|----------|
| Continuous 0-100 | Free slide with numeric display | |
| Snap to 5s | Snaps to nearest 5, shows numeric value | ✓ |
| Snap to 10s | Coarser snapping, only round numbers | |

**User's choice:** Snap to 5s

### Sub-decisions

**Auto-save:** Yes — debounced save on change, consistent with existing margin sliders

---

## Claude's Discretion

- Exact slider styling and positioning
- Heuristic formula for estimated score delta
- Callout copy and specific improvement suggestions
- Debounce timing

## Deferred Ideas

None — discussion stayed within phase scope
