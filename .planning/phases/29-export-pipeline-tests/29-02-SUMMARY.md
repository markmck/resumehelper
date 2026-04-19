---
phase: 29-export-pipeline-tests
plan: "02"
subsystem: export-pipeline
tags: [tests, docx, xml, export]
dependency_graph:
  requires: [29-01]
  provides: [docxBuilder-unit-tests]
  affects: [src/main/lib/docxBuilder.ts]
tech_stack:
  added: []
  patterns: [unzipSync-xml-assertion, test.each-parameterized-templates]
key_files:
  created:
    - tests/unit/main/lib/docxBuilder.test.ts
  modified: []
decisions:
  - "Font assertions use w:ascii= attribute (not w:val=) — docx library serializes fonts via w:rFonts with w:ascii/w:cs/w:hAnsi attributes"
  - "Section heading assertion uses WORK EXPERIENCE (not EXPERIENCE) — matches actual builder output"
metrics:
  duration: "3min"
  completed: "2026-04-19"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 29 Plan 02: DOCX Builder Unit Tests Summary

**One-liner:** DOCX builder unit tests asserting per-template fonts, default margins, override precedence, and content via unzipped XML inspection across all 5 templates.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Per-template font and margin assertions via XML | 7c5a7f8 | tests/unit/main/lib/docxBuilder.test.ts |

## What Was Built

Created `tests/unit/main/lib/docxBuilder.test.ts` with 14 tests covering:

- **5 font tests** (`test.each` over classic/modern/jake/minimal/executive): asserts `w:ascii="${expectedFont}"` appears in deserialized `word/document.xml` XML. Uses `DOCX_FONT_MAP` as source of truth.
- **5 margin tests** (`test.each`): asserts `w:top=`, `w:bottom=`, `w:left=`, `w:right=` twip values (inches × 1440) in the sectPr of deserialized XML. Uses `DOCX_MARGIN_DEFAULTS` as source of truth.
- **1 override test**: asserts `marginTop=0.5, marginBottom=0.5, marginSides=0.3` overrides produce correct twip values (720, 720, 432), winning over classic defaults (1440 each).
- **3 content tests**: profile name + contact info, section headings (WORK EXPERIENCE / SKILLS / EDUCATION / PROJECTS), job bullet text + company + role.

Inline `unzipDocxXml` helper runs `Packer.toBuffer(doc)` → `unzipSync` → decode `word/document.xml` as UTF-8 string. All XML assertions are direct string containment checks — no XML parsing overhead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed font XML attribute from w:val to w:ascii**
- **Found during:** Task 1 verification
- **Issue:** Plan specified `w:val="${expectedFont}"` as the font assertion, but the docx library serializes font names via `<w:rFonts w:ascii="Georgia" w:cs="Georgia" .../>` — `w:val` is used for other attributes (justification, border style, etc.), not font names
- **Fix:** Changed assertion to `w:ascii="${expectedFont}"` which correctly matches the serialized XML
- **Files modified:** tests/unit/main/lib/docxBuilder.test.ts
- **Commit:** 7c5a7f8

## Test Results

```
Tests  14 passed (14)
  - uses correct font for classic template
  - uses correct font for modern template
  - uses correct font for jake template
  - uses correct font for minimal template
  - uses correct font for executive template
  - applies correct default margins for classic template
  - applies correct default margins for modern template
  - applies correct default margins for jake template
  - applies correct default margins for minimal template
  - applies correct default margins for executive template
  - templateOptions margin overrides take precedence over defaults
  - contains profile name and contact info
  - contains section headings
  - contains job bullet text
```

## Known Stubs

None — all tests assert against real DOCX XML output from the actual `buildResumeDocx` function.

## Self-Check: PASSED

- `tests/unit/main/lib/docxBuilder.test.ts`: FOUND
- Commit `7c5a7f8`: FOUND
- 14 tests passing: VERIFIED
