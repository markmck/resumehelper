---
phase: 31-base-resume-json-export
plan: 03
subsystem: export
tags:
  - electron
  - ipc
  - export
  - renderer
  - ui
  - json

# Dependency graph
requires:
  - phase: 31-base-resume-json-export
    provides: "Plan 01 — app_settings k/v + getSetting/setSetting + sanitizeFilename shared module"
  - phase: 31-base-resume-json-export
    provides: "Plan 02 — buildBaseResumeJson(db) + ExportValidationError"
provides:
  - "export:json IPC handler with validation-first ordering (D-13)"
  - "Native error dialog on schema-invalid data (D-14, D-15) — no save dialog, no file written"
  - "lastExportDir shared across export:json, export:pdf, export:docx, export:snapshotPdf (D-09)"
  - "window.api.exportFile.json preload bridge + types (D-20)"
  - "Export JSON button in Experience tab header (D-19) — UI-SPEC §1 styling"
  - "ImportConfirmModal append-only italic note in both replace and append modes (D-17)"
  - "VariantEditor sanitize migrated to shared sanitizeFilename via alias import (D-12)"
affects:
  - "32-variant-merged-export — preload exportFile bridge pattern + lastExportDir reuse"
  - "33-tech-debt-cleanup — shared sanitizeFilename now sole source"
  - "34-configurable-db-location — app_settings k/v pattern proves out"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validation-first IPC handler: builder runs BEFORE showSaveDialog, no save UI on invalid data"
    - "Native dialog.showErrorBox for blocking user-actionable error surfaces"
    - "lastExportDir k/v shared across all export surfaces — single setting, multiple readers/writers"
    - "as const literal for type-narrowing error discriminator on IPC return"
    - "Preload bridge minus variantId for non-variant export channels"
    - "Shared util alias import (`as sanitize`) — zero call-site churn during migration"

key-files:
  created:
    - tests/unit/renderer/components/ImportConfirmModal.test.tsx
  modified:
    - src/main/handlers/export.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/components/ExperienceTab.tsx
    - src/renderer/src/components/ImportConfirmModal.tsx
    - src/renderer/src/components/VariantEditor.tsx

key-decisions:
  - "Validation BEFORE showSaveDialog (D-13) — users never pick a path for data that won't write"
  - "lastExportDir backfilled to all four export channels (json/pdf/docx/snapshotPdf), not just the new one (D-09 v2.5 consistency)"
  - "ImportConfirmModal note rendered unconditionally — D-17 says append/replace BOTH show it"
  - "VariantEditor uses `import { sanitizeFilename as sanitize }` alias to preserve existing call sites at lines 229/244 unchanged (D-12)"
  - "Renderer test uses jsdom + renderToString approach (no @testing-library/react dependency added) — mirrors STATE.md template-test convention"

patterns-established:
  - "Validation-first ordering: `builder → catch → showErrorBox → return` BEFORE `showSaveDialog`. No silent-save path."
  - "Error dialog body shape: `  • {path}: {message}` bullets, capped at 5 with `Math.min(5, issues.length)` count line, full list to console.error."
  - "Per-channel lastExportDir lifecycle: read with `getSetting(db, 'lastExportDir')` for `defaultPath`, write with `setSetting(db, 'lastExportDir', dirname(filePath))` after successful save."
  - "Renderer success-toast gate: `if (result.canceled) return; if (result.error) return; showToast(...)` — error toast suppressed because main already showed native dialog."

requirements-completed: [JSON-01, JSON-02, JSON-04, JSON-05, JSON-06]

# Metrics
duration: ~95min (including manual checkpoint verification)
completed: 2026-06-03
---

# Phase 31 Plan 03: Export Wiring Summary

**End-to-end JSON export shipped: Experience-tab button → preload bridge → validation-first IPC handler → native error dialog or native save dialog → lastExportDir-aware filesystem write, with cross-surface lastExportDir backfill to PDF/DOCX/snapshotPdf and an unconditional append-only note in ImportConfirmModal.**

## Performance

- **Duration:** ~95 min (includes Task 5 manual HUMAN-VERIFY checkpoint)
- **Started:** 2026-06-03 (Wave 2 of Phase 31)
- **Completed:** 2026-06-03
- **Tasks:** 5 (4 auto + 1 checkpoint:human-verify)
- **Files modified:** 6 + 1 new test = 7 total

## Accomplishments

- **`export:json` handler** with strict validation-first ordering: `buildBaseResumeJson(db)` runs BEFORE `dialog.showSaveDialog`. On `ExportValidationError`: shows `dialog.showErrorBox` titled "Export Failed: Invalid Resume Data" with up to 5 bulleted `{path}: {message}` issues and a "Showing first N of M issues" line, then returns `{ canceled: true, error: 'validation' as const }` — no save dialog, no file, no toast.
- **lastExportDir backfill across all four export surfaces** — `export:json`, `export:pdf`, `export:docx`, and `export:snapshotPdf` all read `getSetting(db, 'lastExportDir')` to compute `defaultPath` and write `setSetting(db, 'lastExportDir', dirname(filePath))` after a successful save. Shared state confirmed during Task 5 cross-surface verification.
- **`window.api.exportFile.json(defaultFilename)` preload bridge** wired with a `{ canceled, filePath?, error? }` return shape so renderer can distinguish user cancel from validation failure (already shown via native dialog).
- **"Export JSON" header button** in `ExperienceTab.tsx` as the third button after Import JSON / Import PDF, using UI-SPEC §1 verbatim styling (transparent background, 1px border, 36px height, gap-2, font-sans).
- **`handleExportJsonClick`** builds filename via `sanitizeFilename(profileData?.name || 'Resume') + '_Resume.json'`, awaits the preload bridge, and fires `showToast('Resume exported as JSON')` only on the non-canceled, non-error result branch.
- **`ImportConfirmModal` append-only italic note** — gray-tertiary italic paragraph above Cancel/Confirm buttons, copy verbatim from UI-SPEC: *"Re-importing previously exported data creates duplicates — import is append-only."* Rendered UNCONDITIONALLY (D-17) so it appears in both `mode === 'replace'` and `mode === 'append'`.
- **VariantEditor sanitize migration (D-12)** — inline regex at old lines 198-199 deleted, replaced with `import { sanitizeFilename as sanitize } from '../../../shared/sanitizeFilename'`. Call sites at ~229 and ~244 unchanged thanks to the alias.
- **Renderer test** in `tests/unit/renderer/components/ImportConfirmModal.test.tsx` — jsdom + renderToString approach (no `@testing-library/react` dependency added), 2 cases proving the note renders in BOTH modes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add export:json handler + backfill PDF/DOCX/snapshotPdf with lastExportDir** — `95398cb` (feat)
2. **Task 2: Expose exportFile.json via preload (impl + types)** — `00009d9` (feat)
3. **Task 3: Add Export JSON button + handler in ExperienceTab; migrate VariantEditor sanitize** — `8be839a` (feat)
4. **Task 4: ImportConfirmModal append-only note + 2-case renderer test** — `e47b15f` (feat)
5. **Task 5: HUMAN-VERIFY checkpoint** — no commit (user approval gate)

**Plan metadata commit:** see final commit landing this SUMMARY + STATE + ROADMAP — `docs(31-03): complete export wiring plan summary`

## Files Created/Modified

### Created
- `tests/unit/renderer/components/ImportConfirmModal.test.tsx` — 2 jsdom + renderToString tests proving the append-only note renders in both `replace` and `append` modes.

### Modified
- `src/main/handlers/export.ts` — added `export:json` handler (validation-first); backfilled `export:pdf`, `export:docx`, `export:snapshotPdf` with `getSetting`/`setSetting` for `lastExportDir`; added `buildBaseResumeJson` / `ExportValidationError` / `getSetting` / `setSetting` / `dirname` imports.
- `src/preload/index.ts` — added `json: (defaultFilename) => ipcRenderer.invoke('export:json', defaultFilename)` to the `exportFile` block.
- `src/preload/index.d.ts` — added `json` signature returning `Promise<{ canceled: boolean; filePath?: string; error?: string }>`.
- `src/renderer/src/components/ExperienceTab.tsx` — added `sanitizeFilename` import, `handleExportJsonClick` handler, and the "Export JSON" button as third element in the header flex row with UI-SPEC §1 verbatim styling.
- `src/renderer/src/components/ImportConfirmModal.tsx` — inserted italic gray `<p>` between the entry-count `</div>` and the button row, rendered unconditionally.
- `src/renderer/src/components/VariantEditor.tsx` — deleted inline `const sanitize = ...` regex; added `import { sanitizeFilename as sanitize } from '../../../shared/sanitizeFilename'`. Call sites unchanged via the alias.

## Decisions Made

- **lastExportDir backfilled to snapshotPdf as well as pdf/docx** — the plan §action(c) called this an "OPTIONALLY" item but recommended inclusion "for full v2.5 consistency"; we included it. Single shared k/v across every export surface now matches the D-09 mental model exactly.
- **`as const` discriminator on the validation-failure return** — `error: 'validation' as const` narrows the union return type so the renderer's `if (result.error) return` early-out type-checks without a string-literal cast.
- **Renderer test uses `renderToString` over `@testing-library/react`** — STATE.md key decisions log "renderToString over Testing Library for template tests" as the established v2.4 convention; we extended it here rather than add a new dev dependency. Substring assertion is sufficient because the note copy is a unique string with the U+2014 em-dash.
- **`type="button"` on the Export JSON button** — explicit per UI-SPEC accessibility note. Peer buttons (Import JSON / Import PDF) omit it; we matched UI-SPEC's recommendation for consistency on the new button without retrofitting the older ones.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural escalation. The temporary `GSD_FORCE_EXPORT_VALIDATION_FAIL=1` env-var-gated throw used during Task 5 check #2 was injected solely as a verification harness and reverted before close-out — `src/main/lib/baseResumeBuilder.ts` is back to the Plan 02 a6e3807 state.

## Threat Model Coverage

All `mitigate` dispositions from the plan's threat register are implemented as designed:

- **T-31-11 (path traversal via save dialog)** — `defaultFilename` is constructed in renderer from `sanitizeFilename(profileData?.name || 'Resume')` which strips `/`, `\`, `.`, `:`. Electron's `showSaveDialog` returns an OS-validated absolute path the user explicitly picked. **Mitigated.**
- **T-31-13 (injection via Zod issue paths in error dialog)** — `dialog.showErrorBox` renders body as plain text per Electron docs; `issues.slice(0, 5)` caps preview size. **Mitigated.**
- **T-31-16 (silent write of invalid data)** — Validation runs BEFORE `showSaveDialog`. Verified via Task 5 check #2: the temporary forced-throw produced the error dialog with no save dialog and no file on disk. **Mitigated.**
- **T-31-17 (DoS via runaway Zod issues list)** — `issues.slice(0, 5)` in the preview; full list goes to `console.error` only. Verified during Task 5 with a 6-issue synthetic payload — "Showing first 5 of 6 issues" line rendered correctly. **Mitigated.**
- **T-31-18 (schema injection via app_settings k/v)** — Drizzle parameterizes the UPSERT (proven in Plan 01 T-31-03). `dirname()` returns a plain string. **Mitigated.**

`accept` dispositions (T-31-12 overwrite, T-31-14 lastExportDir leak, T-31-15 sensitive data in user-initiated export) require no implementation work — behavior is as designed.

No `threat_flag` items introduced — this plan adds no new trust boundaries, network endpoints, or auth paths beyond what was modeled.

## Known Stubs

None — every code path is wired end-to-end. No placeholder data, no TODO comments, no `coming soon` text.

## Issues Encountered

None during automated tasks (1-4). During Task 5 the user used a temporary env-var-gated throw injection (`GSD_FORCE_EXPORT_VALIDATION_FAIL=1`) to exercise the validation-failure path because seeding invalid data through normal UI flows is intentionally difficult — the temp block was reverted immediately after the user typed "approved".

## User Setup Required

None — no external services, no environment variables, no manual configuration. All behavior is local to the user's profile and SQLite DB.

## Manual Verification (Task 5)

User confirmed all 5 manual checks pass:

1. **Happy path** — Button visible (third position), save dialog opens with `${ProfileName}_Resume.json` default, success toast fires, output JSON valid with no `null` / no empty-string optional fields.
2. **Validation failure** — Native error dialog rendered with correct title, 6-issue synthetic payload produced "Showing first 5 of 6 issues" line, NO save dialog appeared, NO file written, NO success toast.
3. **lastExportDir shared across surfaces** — Export JSON to folder A then PDF dialog also defaults to folder A; saving PDF to folder B then JSON dialog defaults to folder B. State shared across all surfaces.
4. **ImportConfirmModal note** — Italic gray note "Re-importing previously exported data creates duplicates — import is append-only." appears above Cancel/Confirm in BOTH replace and append modes.
5. **VariantEditor regression check** — PDF/DOCX export filenames unchanged after D-12 alias migration.

User resume-signal: **"approved"** for Task 5 — proceeding to close-out.

## Next Phase Readiness

**Plan 32-01+ (variant-merged JSON export) unblocked.** The patterns established here transfer directly:

- The validation-first handler shape is reusable for `export:variantJson` — just swap the builder.
- The lastExportDir k/v is already shared; no additional backfill needed.
- The preload bridge pattern (`window.api.exportFile.{type}`) extends with one more entry.
- VariantEditor already imports `sanitizeFilename`, so the variant export button can reuse it directly.

**Phase 31 overall** is complete (3/3 plans landed). Ready for phase verifier and milestone advance to Phase 32.

## Self-Check: PASSED

- Plan 31-03 task commits all reachable: `95398cb`, `00009d9`, `8be839a`, `e47b15f` (verified via `git log --oneline -10`)
- All 6 modified source files present and committed
- New test file `tests/unit/renderer/components/ImportConfirmModal.test.tsx` present and committed in `e47b15f`
- `src/main/lib/baseResumeBuilder.ts` confirmed reverted to Plan 02 state (no leftover env-var throw harness)
- Working tree shows only `package-lock.json` drift (electron-builder rebuild side-effect, unrelated, untouched)
- All 5 Task 5 manual verification checks confirmed by user

---
*Phase: 31-base-resume-json-export*
*Plan: 03*
*Completed: 2026-06-03*
