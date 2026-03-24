---
phase: 11-submission-pipeline
plan: 03
subsystem: ui
tags: [react, electron, ipc, submission, timeline, pdf-export]

# Dependency graph
requires:
  - phase: 11-submission-pipeline
    provides: IPC handlers (submissions.list, submissions.updateStatus, submissions.getEvents, submissions.update, submissions.delete), SubmissionsTab router, SubmissionListView, SubmissionLogForm

provides:
  - SubmissionDetailView: full detail page with pipeline bar, two-column layout, status update, notes editing, and snapshot export
  - SubmissionEventTimeline: vertical activity timeline showing all status changes with timestamps and notes
  - Complete submission pipeline UI: list -> detail -> log navigation fully wired
affects: [12-export-polish, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline styles with var(--token) for all new components — no Tailwind, no className"
    - "Detail view sticky right column via position:sticky + top var(--space-6)"
    - "SnapshotViewer modal rendered conditionally within detail view"
    - "Status updates trigger both submission reload and events reload for consistency"

key-files:
  created:
    - src/renderer/src/components/SubmissionDetailView.tsx
    - src/renderer/src/components/SubmissionEventTimeline.tsx
  modified:
    - src/renderer/src/components/SubmissionsTab.tsx

key-decisions:
  - "Activity timeline dots use absolute positioning on a relative container to center on the connecting vertical line"
  - "Back link styled as plain text with accent color — no button element — matching cross-tab navigation link style"

patterns-established:
  - "Timeline pattern: relative container with absolute ::before line, each entry has a colored dot and right-side content"
  - "Pipeline bar pattern: flexbox with space-between stage markers, absolute-positioned connecting lines between stages"

requirements-completed: [SUB-01, SUB-02, SUB-03, SUB-05]

# Metrics
duration: ~45min (including post-checkpoint UI fixes)
completed: 2026-03-24
---

# Phase 11 Plan 03: Submission Detail View Summary

**Submission detail view with 5-stage pipeline bar, two-column layout (details + activity timeline + notes, sticky snapshot card), status updates creating timeline entries, notes editing, SnapshotViewer modal, and PDF export**

## Performance

- **Duration:** ~45 min (including post-checkpoint UI refinement fixes)
- **Started:** 2026-03-24
- **Completed:** 2026-03-24
- **Tasks:** 2 (Task 1: implementation, Task 2: human-verify checkpoint — approved)
- **Files modified:** 3

## Accomplishments

- Built SubmissionDetailView with full 5-stage pipeline bar, done/current/future styling, and terminal-stage logic
- Built SubmissionEventTimeline component with colored dots, vertical connecting line, timestamps, and optional notes
- Wired SubmissionDetailView into SubmissionsTab router, completing the list -> detail -> back navigation flow
- Status updates via dropdown + "Update" button persist to DB and create timeline entries (reloads both submission and events)
- Notes are editable in-place with Save/Cancel — changes persist via submissions.update IPC
- "View Submitted Resume" opens SnapshotViewer modal with the frozen snapshot JSON
- "Export PDF" calls exportFile.snapshotPdf IPC and downloads a PDF file

## Task Commits

Each task was committed atomically:

1. **Task 1: SubmissionEventTimeline + SubmissionDetailView** - `8c8f3ba` (feat)
2. **Task 2: Verify complete submission pipeline flow** - Human-verified, approved by user

**Post-checkpoint UI fix commits:**
- `5dcd2b5` — fix(11-03): solid gray dots, consistent back link style, fixed sidebar scroll
- `9b3afca` — fix(11-03): pipeline bar alignment and activity timeline connecting line
- `fa1357c` — fix(11-03): center activity timeline dots on connecting line

## Files Created/Modified

- `src/renderer/src/components/SubmissionEventTimeline.tsx` — Vertical activity timeline, newest-first, with colored status dots and connecting line
- `src/renderer/src/components/SubmissionDetailView.tsx` — Full detail page: back link, header, pipeline bar, two-column layout (details + timeline + notes / snapshot card)
- `src/renderer/src/components/SubmissionsTab.tsx` — Replaced detail placeholder with SubmissionDetailView, wired onBack/onDelete props

## Decisions Made

- Timeline dot centering uses a wrapper div with `position: relative` and the vertical line as an absolutely-positioned child, ensuring dots align precisely on the line regardless of content height
- Back link uses plain text styling with `var(--color-accent)` (matching pattern from log form) rather than a button element

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed solid gray future-stage dots in pipeline bar**
- **Found during:** Task 2 verification (post-checkpoint)
- **Issue:** Future-stage dots appeared as solid gray circles instead of hollow/muted
- **Fix:** Corrected the CSS for future stage dots to use transparent fill with border
- **Files modified:** src/renderer/src/components/SubmissionDetailView.tsx
- **Committed in:** `5dcd2b5`

**2. [Rule 1 - Bug] Fixed back link style inconsistency**
- **Found during:** Task 2 verification (post-checkpoint)
- **Issue:** Back link styling was inconsistent with log form back link style
- **Fix:** Unified back link to plain text with accent color, matching log form pattern
- **Files modified:** src/renderer/src/components/SubmissionDetailView.tsx
- **Committed in:** `5dcd2b5`

**3. [Rule 1 - Bug] Fixed sidebar scrolling issue**
- **Found during:** Task 2 verification (post-checkpoint)
- **Issue:** Sidebar was not scrolling correctly when detail view was open
- **Fix:** Corrected overflow/height settings on the SubmissionsTab container
- **Files modified:** src/renderer/src/components/SubmissionsTab.tsx
- **Committed in:** `5dcd2b5`

**4. [Rule 1 - Bug] Fixed pipeline bar stage alignment**
- **Found during:** Task 2 verification (post-checkpoint)
- **Issue:** Pipeline bar connecting lines were misaligned with the stage dots
- **Fix:** Corrected absolute-positioned line placement relative to dot centers
- **Files modified:** src/renderer/src/components/SubmissionDetailView.tsx
- **Committed in:** `9b3afca`

**5. [Rule 1 - Bug] Fixed activity timeline connecting line and dot alignment**
- **Found during:** Task 2 verification (post-checkpoint)
- **Issue:** Vertical connecting line was not centered behind the timeline dots
- **Fix:** Adjusted positioning so dots are centered on the vertical line
- **Files modified:** src/renderer/src/components/SubmissionEventTimeline.tsx
- **Committed in:** `9b3afca`, `fa1357c`

---

**Total deviations:** 5 auto-fixed (all Rule 1 - Bug) — all UI alignment/styling issues discovered during human verification
**Impact on plan:** Fixes were all visual correctness issues. No scope creep.

## Issues Encountered

- Pipeline bar and timeline dot alignment required two rounds of fixes after initial implementation — CSS absolute positioning with connecting lines is fiddly and needed iteration to get the dots perfectly centered
- Sidebar overflow behavior under the detail view required a targeted fix to the SubmissionsTab container

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Complete submission pipeline (Plans 01-03) is fully working: list view, log form, detail view, cross-tab navigation, status updates, notes, snapshot viewer, PDF export
- Phase 11 is complete — all 3 plans delivered
- Ready for Phase 12 (export polish) whenever scheduled

---
*Phase: 11-submission-pipeline*
*Completed: 2026-03-24*
