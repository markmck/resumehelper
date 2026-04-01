---
phase: 23-import-resume-from-existing-pdf
plan: "01"
subsystem: main-process
tags: [pdf-import, ai-extraction, ipc, backend]
dependency_graph:
  requires: []
  provides: [import:parseResumePdf, import:confirmAppend, callResumeExtractor, ResumeJsonSchema]
  affects: [src/main/handlers/import.ts, src/main/lib/aiProvider.ts, src/preload/index.ts]
tech_stack:
  added: [pdf-parse]
  patterns: [generateObject with Zod schema, safeStorage.decryptString, sqlite.transaction INSERT-only]
key_files:
  created:
    - src/main/lib/pdfResumePrompt.ts
  modified:
    - package.json
    - src/main/lib/aiProvider.ts
    - src/main/handlers/import.ts
    - src/preload/index.ts
    - src/preload/index.d.ts
decisions:
  - Use raw SQL for AI settings read in import.ts (consistent with existing sqlite pattern in that file)
  - confirmAppend is INSERT-only — no DELETE statements (append semantics, preserves existing data)
  - Check AI config before file dialog to avoid opening dialog then immediately failing
  - pdfText.trim().length < 100 guard rejects image-only PDFs
metrics:
  duration: "~2 min"
  completed: "2026-04-01"
  tasks: 2
  files: 5
---

# Phase 23 Plan 01: PDF Import Backend Pipeline Summary

PDF import backend pipeline using pdf-parse + AI generateObject: ResumeJsonSchema Zod schema, callResumeExtractor function, parseResumePdf and confirmAppend IPC handlers with full preload bindings.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install pdf-parse, Zod schema, callResumeExtractor | a9e5b8a | package.json, pdfResumePrompt.ts, aiProvider.ts |
| 2 | parseResumePdf + confirmAppend handlers + preload | 10e6cf9 | import.ts, index.ts, index.d.ts |

## What Was Built

**Task 1: pdf-parse + AI extraction infrastructure**
- Installed `pdf-parse@^2.4.5` dependency
- Created `src/main/lib/pdfResumePrompt.ts` exporting `buildPdfResumeParserPrompt(pdfText)` — returns `{ system, prompt }` with extraction guidelines (date format, field mapping, omit missing sections)
- Added `ResumeJsonSchema` Zod schema to `aiProvider.ts` covering all 11 resume.json sections: basics, work, skills, projects, education, volunteer, awards, publications, languages, interests, references
- Added `ResumeJsonParsed` type alias and `callResumeExtractor` function following identical pattern to `callJobParser` (getModel + generateObject with temperature: 0)

**Task 2: IPC handlers + preload bindings**
- `import:parseResumePdf` handler: validates AI config first (returns error if no API key), opens PDF file dialog, reads buffer, extracts text via pdf-parse (rejects image-only PDFs with < 100 chars), decrypts API key via safeStorage, calls callResumeExtractor, returns counts + data
- `import:confirmAppend` handler: INSERT-only sqlite.transaction for all 11 entity types; profile uses CASE WHEN to fill empty fields only; no DELETE statements
- Preload `index.ts`: added `parsePdf` and `confirmAppend` bindings to `import_` namespace
- Preload `index.d.ts`: typed declarations for both new bindings
- TypeScript compiles clean: `npx tsc --noEmit` exits 0

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both handlers are fully wired. The renderer UI (plan 23-02) will call these handlers.

## Self-Check: PASSED

- All 5 modified/created files verified present on disk
- Both task commits (a9e5b8a, 10e6cf9) verified in git log
