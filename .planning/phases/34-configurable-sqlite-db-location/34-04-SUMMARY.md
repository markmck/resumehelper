---
phase: 34-configurable-sqlite-db-location
plan: "04"
subsystem: ui
tags: [react, electron, sqlite, settings, modal]

# Dependency graph
requires:
  - phase: 34-configurable-sqlite-db-location
    provides: "window.api.dbLocation IPC bridge (Plans 03) — getCurrentPath, pickFolder (write-probe), relocate, listBackups, deleteOldestBackup, revealInExplorer, restart"
provides:
  - "DatabaseLocationCard — Settings card with path display, Reveal in Explorer, Change location flow, write-permission gate, restart-pending badge, Delete old backup"
  - "DbRelocateConfirmModal — 5-step (Copy/Verify/Switch/Backup/Restart) confirmation modal with app.db.bak safety note and per-step loading feedback"
  - "CloudPathWarningModal — non-blocking WAL-over-network warning with Proceed anyway / Cancel"
  - "RestartRequiredModal — Restart now / Later choice; Later triggers restart-pending badge"
  - "SettingsTab — DatabaseLocationCard mounted below AI Configuration card"
affects: [phase 34 phase-verification, v2.5 release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ImportConfirmModal skeleton reused for all three new modals (backdrop, Escape-to-cancel useEffect, stop-propagation, footer row)"
    - "idle/loading/success/error status-state machine from SettingsTab AI card reused in DatabaseLocationCard"
    - "Write-permission gate from pickFolder result blocks confirm modal before any relocation call"

key-files:
  created:
    - src/renderer/src/components/DbRelocateConfirmModal.tsx
    - src/renderer/src/components/CloudPathWarningModal.tsx
    - src/renderer/src/components/RestartRequiredModal.tsx
    - src/renderer/src/components/DatabaseLocationCard.tsx
  modified:
    - src/renderer/src/components/SettingsTab.tsx

key-decisions:
  - "All three modals are pure presentational components (no electron imports) — driven entirely by props from DatabaseLocationCard"
  - "Restart-pending badge copy strengthened to warn that changes made before restarting may not carry over (RESEARCH Pitfall 3 / Open Question 2)"
  - "Change button disabled while any modal is open (Pitfall 6 renderer guard); main-side _relocateInFlight is the backstop"
  - "Delete old backup button rendered conditionally on non-empty listBackups result and hidden when list drains to empty"

patterns-established:
  - "Modal skeleton reuse: new modals copy ImportConfirmModal's Escape/backdrop/stop-propagation/footer pattern rather than reinventing"
  - "Writable gate: pickFolder().writable check gates the confirm modal; inline danger-token <p> surfaces probeError, flow returns early"

requirements-completed: [DB-01, DB-02, DB-05, DB-06, DB-08, DB-09]

# Metrics
duration: ~90min (two auto tasks + human-verify smoke)
completed: 2026-06-04
---

# Phase 34 Plan 04: Settings DB Location UI + Manual Smoke Summary

**Database Location card with 5-step confirm modal, non-blocking cloud-path warning, restart-required modal, write-permission gate, and Delete-old-backup button — all mounted in SettingsTab and confirmed end-to-end via Electron manual smoke**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-06-04
- **Completed:** 2026-06-04
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 5

## Accomplishments

- Delivered the full user-facing DB relocation surface: path display, Reveal in Explorer, Change location, 5-step confirm modal, cloud-path warning, restart-required modal, restart-pending badge, and Delete old backup button
- Enforced write-permission gate (DB-02): read-only folder surfaces inline error, confirm modal is never shown, relocate is never called
- Manual Electron smoke (Task 3) approved by user across all 8 steps — covers DB-01/02/05/06/08/09 and confirms DB-07/DB-10 bootstrap override and RESEARCH A1 safeStorage smoke

## Task Commits

Each task was committed atomically:

1. **Task 1: Three DB relocation modals (confirm, cloud warning, restart)** - `f91d141` (feat)
2. **Task 2: DatabaseLocationCard + SettingsTab mount** - `c828795` (feat)
3. **Task 3: Electron manual smoke — full relocation flow** - APPROVED by user (human-verify checkpoint — no code commit)

**Plan metadata:** (docs commit — see finalization)

## Files Created/Modified

- `src/renderer/src/components/DbRelocateConfirmModal.tsx` — 5-step confirmation modal (Copy/Verify/Switch/Backup/Restart) with app.db.bak safety note and per-step activeStep loading label; reuses ImportConfirmModal skeleton
- `src/renderer/src/components/CloudPathWarningModal.tsx` — Non-blocking WAL-over-network warning with "Proceed anyway" / "Cancel"; reuses ImportConfirmModal skeleton
- `src/renderer/src/components/RestartRequiredModal.tsx` — "Restart now" / "Later" modal; reuses ImportConfirmModal skeleton
- `src/renderer/src/components/DatabaseLocationCard.tsx` — Settings card driving the full pick→(writable gate)→warn→confirm→relocate→restart flow via window.api.dbLocation; restart-pending badge; Delete old backup button conditional on listBackups result
- `src/renderer/src/components/SettingsTab.tsx` — Mounts `<DatabaseLocationCard />` below AI Configuration card

## Decisions Made

- All three modals are pure presentational components (no electron imports) — driven entirely by props from DatabaseLocationCard, keeping renderer/main boundary clean
- Restart-pending badge copy strengthened beyond the original D-20 plan to warn about potential data loss if changes are made before restarting (RESEARCH Pitfall 3)
- Change button disabled while any modal is open as Pitfall 6 renderer guard; main-side `_relocateInFlight` from Plan 03 is the backstop

## Manual Smoke Checkpoint (Task 3)

All 8 smoke steps approved by user:
1. Database Location card present below AI Configuration with current path, Reveal, Change
2. Reveal in Explorer opens the DB folder (DB-01)
3. Happy-path relocation: 5-step modal with app.db.bak note confirmed, restart-required modal appears (DB-05, DB-06)
4. Later path: restart-pending badge + Delete old backup present; manual restart shows new path with data intact (DB-07, DB-10 bootstrap override)
5. safeStorage smoke: API key survives DB move (RESEARCH A1)
6. Cloud-path warning appears for OneDrive/Dropbox, non-blocking with Proceed anyway/Cancel (DB-08)
7. Delete old backup removes .bak file, button hides when none remain (DB-09)
8. Negative (read-only folder): inline write-permission error, confirm modal never shown, no relocation (DB-02, DB-04)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 34 is now fully complete (Plans 01-04 all landed)
- All DB-01 through DB-10 requirements covered across the phase (DB-03/DB-04 main-process tests in Plan 02; DB-07/DB-10 confirmed via boot-override smoke in Plan 04)
- Ready for phase-level verification and v2.5 milestone close

---
*Phase: 34-configurable-sqlite-db-location*
*Completed: 2026-06-04*
