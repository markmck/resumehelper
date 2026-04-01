# Phase 22: ATS Score Threshold Setting - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Let users set a minimum match score target per variant so they can focus tailoring effort on high-match postings. The threshold drives visual feedback on the optimize screen and adaptive score coloring across the app.

</domain>

<decisions>
## Implementation Decisions

### Threshold Storage
- **D-01:** Threshold is a per-variant setting, stored as an integer column on `templateVariants` table
- **D-02:** Default value is 80 for new variants
- **D-03:** Persists in DB across sessions — not session state

### Threshold UI Location
- **D-04:** Slider lives on the OptimizeVariant screen, near the score display (not on variant card or settings page)
- **D-05:** Slider is 0-100 range, snaps to increments of 5
- **D-06:** Auto-saves on change with debounce — consistent with existing template control sliders (margin sliders)

### Score Display
- **D-07:** Score badge on OptimizeVariant shows a target reference mark (ring/arc indicating "target: 80" alongside current score)
- **D-08:** Threshold indicator only appears on OptimizeVariant — analysis list does NOT show per-row above/below badges

### Score Color Logic
- **D-09:** On OptimizeVariant, score colors follow the variant's target: green = at/above target, yellow = within 15 of target, red = far below target
- **D-10:** Analysis list view falls back to fixed 80/50 color bands (since it's cross-variant)
- **D-11:** Submission list and other cross-variant views also use fixed 80/50 bands

### Score Recalculation
- **D-12:** matchScore from initial analysis stays fixed in DB — no AI re-scoring on accept/dismiss
- **D-13:** Estimated score adjustment: each accepted rewrite adds a heuristic ~2-3 points
- **D-14:** Display format: "72 (+6)" showing original base score plus estimated delta from accepted rewrites

### Feedback Loop
- **D-15:** When score (including estimated adjustment) is below target, show an actionable callout below the score highlighting top improvements (e.g., "3 unaccepted rewrites, 5 missing keywords")
- **D-16:** Callout updates live on each accept/dismiss — recalculates remaining improvement suggestions
- **D-17:** No special celebration/animation when crossing the target — green color change is sufficient

### Submission Warning
- **D-18:** Soft warning on submission form when estimated score is below the variant's target — "Below target (72/80)"
- **D-19:** Warning is informational only — user can submit anyway, no blocking dialog

### Claude's Discretion
- Exact slider styling and positioning near score badge
- Heuristic formula for estimated score adjustment per accepted rewrite
- Callout copy and specific improvement suggestions shown
- Debounce timing for auto-save

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Score display and color logic
- `src/renderer/src/components/AnalysisResults.tsx` — Current score badge, getScoreColor/getScoreBg functions, ScoreBreakdown interface
- `src/renderer/src/components/AnalysisList.tsx` — Analysis list score display, getScoreColor/getScoreBgColor, sort-by-score logic

### Optimize screen (threshold slider host)
- `src/renderer/src/components/OptimizeVariant.tsx` — Where the threshold slider and target reference mark will live

### Schema and data layer
- `src/main/db/schema.ts` — analysisResults.matchScore column, templateVariants table (new column target)
- `src/main/handlers/ai.ts` — Analysis creation and scoring, IPC handlers

### Existing slider pattern
- Template controls margin sliders (in VariantEditor or template controls) — pattern for debounced auto-save slider

### Submission flow
- `src/renderer/src/components/SubmissionLogForm.tsx` — Where soft warning will appear

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getScoreColor(score)` / `getScoreBg(score)` in AnalysisResults.tsx and AnalysisList.tsx — need refactoring to accept optional threshold parameter for target-relative coloring
- Template controls margin sliders — pattern for range input with debounced auto-save
- Design system CSS variables (--color-success, --color-warning, --color-danger) — existing color tokens

### Established Patterns
- Per-click IPC: accept/dismiss rewrites use individual IPC calls, no batch save — score delta should update in the same render cycle
- Debounced slider save: margin sliders debounce writes to DB — reuse this pattern for threshold slider
- Drizzle schema + migration: add column to templateVariants, generate migration SQL

### Integration Points
- `templateVariants` table: new `score_threshold` integer column with default 80
- OptimizeVariant component: add slider near score metric card, wire to variant IPC
- AnalysisResults score badge: refactor to support target reference mark
- SubmissionLogForm: add conditional warning banner when score < threshold
- Shared `getScoreColor`: extract to utility, make threshold-aware for OptimizeVariant context

</code_context>

<specifics>
## Specific Ideas

- Score display should show "72 (+6)" format — base score plus estimated delta, not a blended single number
- Target mark on score badge as a ring/arc visual reference, not just text
- Actionable callout should be specific: "3 unaccepted rewrites, 5 missing keywords" — not generic "improve your score"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-ats-score-threshold*
*Context gathered: 2026-04-01*
