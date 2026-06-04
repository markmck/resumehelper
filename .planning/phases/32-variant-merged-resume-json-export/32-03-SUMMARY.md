---
phase: 32-variant-merged-resume-json-export
plan: 03
subsystem: main/handlers/export + preload + renderer/VariantEditor
tags: [export, resume-json, variant, ipc, ui]
requires:
  - "src/main/lib/variantResumeBuilder.ts: buildVariantResumeJson (Plan 32-02)"
  - "src/main/lib/baseResumeBuilder.ts: ExportValidationError (Phase 31)"
  - "src/main/lib/settings.ts: getSetting/setSetting (Phase 31)"
  - "src/shared/sanitizeFilename.ts: sanitize"
provides:
  - "src/main/handlers/export.ts: ipcMain.handle('export:variantJson', ...)"
  - "src/preload/index.ts: window.api.exportFile.variantJson()"
  - "src/preload/index.d.ts: exportFile.variantJson type signature"
  - "src/renderer/src/components/VariantEditor.tsx: JSON export button + unified PDF/DOCX/JSON styling"
affects: []
tech-stack:
  added: []
  patterns:
    - "Validate-first IPC handler (build before save dialog) mirroring Phase 31 export:json"
    - "Neutral-transparent peer-consistent button styling for export cluster"
key-files:
  created: []
  modified:
    - src/main/handlers/export.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
    - src/renderer/src/components/VariantEditor.tsx
decisions:
  - "Followed D-19 validate-first ordering exactly — ExportValidationError raises native dialog and returns { canceled: true, error: 'validation' } before any save-dialog opens"
  - "Renderer call site passes only (variant.id, filename) per D-20 — analysisId plumbing is wired end-to-end but call site intentionally omits it (matches current PDF/DOCX status quo)"
  - "DOCX button restyled to neutral-transparent per D-13 — drops var(--color-success), border:none, fontWeight:500. The only remaining var(--color-success) reference in VariantEditor.tsx is the unrelated score-badge color helper at line 26"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-04"
requirements: [JSON-07, JSON-08, JSON-10, JSON-11]
---

# Phase 32 Plan 03: Wire buildVariantResumeJson to Renderer Summary

One-liner: Added end-to-end JSON export wiring for variants — new `export:variantJson` IPC handler with Phase-31-style validate-first error UX, matching preload binding + type, JSON button in `VariantEditor` preview toolbar with verbatim JSON-11 tooltip, and unified neutral-transparent styling across PDF / DOCX / JSON peers (DOCX loses its success-green primary treatment).

## What Was Built

### `src/main/handlers/export.ts` (modified)
- Imported `buildVariantResumeJson` from `../lib/variantResumeBuilder`.
- Registered `ipcMain.handle('export:variantJson', ...)` as the last handler inside `registerExportHandlers()`.
- Ordering per D-19: (1) `await buildVariantResumeJson(db, variantId, analysisId)` → on `ExportValidationError` show `dialog.showErrorBox` with first 5 Zod issues and return `{ canceled: true, error: 'validation' }` (no save dialog opens); (2) read `lastExportDir`; (3) `dialog.showSaveDialog` with `{ name: 'JSON Files', extensions: ['json'] }`; (4) write file and persist `lastExportDir`. Identical structure to the existing `export:json` handler.

### `src/preload/index.ts` (modified)
- Added `variantJson: (variantId, defaultFilename, analysisId?) => ipcRenderer.invoke('export:variantJson', ...)` to the `exportFile` block, placed after the existing `json:` binding.

### `src/preload/index.d.ts` (modified)
- Added matching `variantJson` signature to the `exportFile` type: `Promise<{ canceled: boolean; filePath?: string; error?: string }>` — same shape as the existing `json` signature.

### `src/renderer/src/components/VariantEditor.tsx` (modified, 4 edits)
1. Extended `exporting` state union from `'pdf' | 'docx' | null` to `'pdf' | 'docx' | 'json' | null` (D-15).
2. Added `handleExportJson` immediately after `handleExportDocx`. Filename: `${sanitize(profile.name || 'Resume')}_Resume_${sanitize(variant.name)}.json` (JSON-10/D-21). Invokes `window.api.exportFile.variantJson(variant.id, filename)` (analysisId omitted per D-20). On success: `showToast('Resume exported as JSON')` (D-16).
3. Restyled DOCX button to neutral-transparent — dropped `border: 'none'`, `backgroundColor: 'var(--color-success)'`, `color: 'var(--color-text-on-accent, #fff)'`, `fontWeight: 500`; replaced with PDF's `border: '1px solid var(--color-border-default)'`, `backgroundColor: 'transparent'`, `color: 'var(--color-text-secondary)'` (D-13).
4. Inserted new JSON button after DOCX, identical style to PDF/DOCX, with native `title` attribute carrying the JSON-11 tooltip verbatim (with em-dash `—`).

Resulting preview-toolbar export cluster: `[PDF] [DOCX] [JSON]` — all three peer-consistent.

## Verification

- `npx tsc --noEmit -p .` — exit 0 (no new errors at any step).
- `npx vitest run tests/unit/main/lib/variantResumeBuilder.test.ts tests/unit/main/lib/baseResumeBuilder.test.ts` — 12/12 pass.
- `npx vitest run` (full suite) — 192/192 pass, 22 test files, no regressions.
- Acceptance grep checks (Task 3): `handleExportJson` 1x, `window.api.exportFile.variantJson(variant.id, filename)` 1x, `showToast('Resume exported as JSON')` 1x, JSON-11 tooltip verbatim 1x, `exporting === 'json' ? 'Exporting...' : 'JSON'` 1x, `exporting === 'docx' ? 'Exporting...' : 'DOCX'` 1x, `useState<'pdf' | 'docx' | 'json' | null>` 1x.
- `var(--color-success)` remaining matches in `VariantEditor.tsx`: 1 (line 26, `scoreBadgeColor` helper) — confirmed OUTSIDE the export-button JSX region (lines ~561-625). DOCX button no longer references it.
- Acceptance grep checks (Task 1): `import { buildVariantResumeJson }` 1x, `'export:variantJson'` 1x, `await buildVariantResumeJson(db, variantId, analysisId)` 1x, `console.error('[export:variantJson]` 1x, `'export:json'` still 1x (base export untouched).
- Acceptance grep checks (Task 2): `variantJson:` in `index.ts` 1x, `invoke('export:variantJson'` 1x, `variantJson` in `index.d.ts` 1x.

## Deviations from Plan

None — plan executed exactly as written.

### Authentication Gates

None.

### Out-of-scope Items Deferred

None.

## Decisions Made

- Followed D-19 validate-first ordering exactly — `ExportValidationError` raises native dialog and returns `{ canceled: true, error: 'validation' }` before any save dialog opens. No partial-file state possible.
- The single remaining `var(--color-success)` occurrence in `VariantEditor.tsx` (line 26 `scoreBadgeColor`) is unrelated to the export-button cluster and intentionally untouched — it colors the match-score badge in the Builder pane header.

## Next Step

Manual smoke test (user's responsibility, out-of-band per plan `<verification>`): launch app → open a variant → confirm `[PDF] [DOCX] [JSON]` all render the same neutral-transparent style → hover JSON → see JSON-11 tooltip verbatim → click JSON → save dialog opens at last-used export directory with `${profileName}_Resume_${variantName}.json` default → save → see toast "Resume exported as JSON" → open file and confirm valid JSON Resume with merged variant data and no `meta` key.

## Self-Check: PASSED

- FOUND: src/main/handlers/export.ts (modified)
- FOUND: src/preload/index.ts (modified)
- FOUND: src/preload/index.d.ts (modified)
- FOUND: src/renderer/src/components/VariantEditor.tsx (modified)
- FOUND: commit 9a0d570 `feat(32-03): add export:variantJson IPC handler`
- FOUND: commit 7f464e0 `feat(32-03): expose window.api.exportFile.variantJson preload binding`
- FOUND: commit 1cbf2db `feat(32-03): add JSON export button and unify export button styles in VariantEditor`
- VERIFIED: `npx tsc --noEmit -p .` exit 0
- VERIFIED: `npx vitest run` 192/192 pass
