---
phase: 29-export-pipeline-tests
plan: "01"
subsystem: export
tags: [refactor, docx, test-infra, pure-function]
dependency_graph:
  requires: []
  provides: [buildResumeDocx-pure-function, docxBuilder-module, fflate-devdep, jsdom-devdep]
  affects: [src/main/handlers/export.ts, src/main/lib/docxBuilder.ts, vitest.config.ts]
tech_stack:
  added: [fflate@^0.8.2, jsdom@^29.0.2]
  patterns: [handler-extraction, pure-function-isolation]
key_files:
  created:
    - src/main/lib/docxBuilder.ts
  modified:
    - src/main/handlers/export.ts
    - vitest.config.ts
    - package.json
decisions:
  - buildResumeDocx accepts BuilderData (with required arrays) distinct from the preload index.d.ts BuilderData (optional arrays) — docxBuilder.ts exports its own interface
  - DOCX_MARGIN_DEFAULTS kept in export.ts import as it is still used by export:pdf and export:snapshotPdf handlers
metrics:
  duration: "3 min"
  completed: "2026-04-19"
  tasks_completed: 2
  files_changed: 4
---

# Phase 29 Plan 01: Install Test Deps + Extract buildResumeDocx Summary

Pure function extraction of the 480-line inline DOCX builder from the export:docx handler into a standalone `buildResumeDocx(builderData, profileRow, templateKey, templateOptions): Document` in `src/main/lib/docxBuilder.ts`, plus dev dependency setup (fflate, jsdom) and vitest .test.tsx support.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install fflate + jsdom; update vitest for .tsx | 0e2f005 | package.json, vitest.config.ts |
| 2 | Extract buildResumeDocx into docxBuilder.ts | e5c9dbf | src/main/lib/docxBuilder.ts, src/main/handlers/export.ts |

## What Was Built

**docxBuilder.ts** — New module in `src/main/lib/` containing:
- `export const DOCX_FONT_MAP` — per-template font name registry
- `export const DOCX_MARGIN_DEFAULTS` — per-template margin defaults in inches
- `export interface BuilderData` — typed container for all resume entity arrays
- `export function buildResumeDocx(builderData, profileRow, templateKey, templateOptions): Document` — pure function; accepts data inputs, returns a docx `Document`; no side effects, no IPC/db/dialog/fs dependencies

**export.ts** — `ipcMain.handle('export:docx', ...)` replaced with thin wiring:
- dialog.showSaveDialog → db reads (variant + profile + builderData) → buildResumeDocx → Packer.toBuffer → fs.writeFile
- Unused docx library imports removed (Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, TabStopPosition, HeadingLevel)

**vitest.config.ts** — `test.include` extended to `['tests/**/*.test.ts', 'tests/**/*.test.tsx']`; global `environment: 'node'` unchanged

## Verification

- `npx tsc --noEmit` exits 0
- `npx vitest run` — 101 tests passing (12 files, no regressions)
- fflate=^0.8.2, jsdom=^29.0.2 in devDependencies
- `grep -c 'test.tsx' vitest.config.ts` returns 1

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `src/main/lib/docxBuilder.ts` — FOUND
- commit 0e2f005 — FOUND
- commit e5c9dbf — FOUND
