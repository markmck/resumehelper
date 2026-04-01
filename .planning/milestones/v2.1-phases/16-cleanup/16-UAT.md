---
status: resolved
phase: 16-cleanup
source: 16-01-SUMMARY.md, 16-02-SUMMARY.md
started: 2026-03-26T13:00:00Z
updated: 2026-03-26T13:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running instance. Start the app from scratch. App boots without errors in the terminal or DevTools console. Main window loads with sidebar navigation visible.
result: pass

### 2. Old Theme Dropdown Removed from Settings
expected: Navigate to the Settings tab. The Appearance card with the "Default Theme" dropdown (Even/Class/Elegant) should be completely gone. Only the AI Provider card remains.
result: pass

### 3. Old Theme Dropdown Removed from Variant Builder
expected: Open the Variant Builder (click any variant). The old theme selector dropdown that listed Even/Class/Elegant should be gone. Template selection now lives only in the preview header.
result: pass (retest after 16-03)

### 4. Template Selection in Preview Header Still Works
expected: In the Variant Builder, use the template dropdown in the preview header to switch between Classic, Modern, Jake, Minimal, and Executive. Preview re-renders immediately on each selection.
result: pass (retest after 16-03)

### 5. Normal PDF Export Works
expected: From the Variant Builder, click Export PDF. Save dialog appears, select location, PDF saves successfully. The output matches the preview.
result: pass

### 6. Snapshot Viewer Renders via Iframe
expected: Navigate to a submission that has a snapshot. Click to view the snapshot. The snapshot content renders in an embedded iframe showing the resume with the Classic template styling (Georgia font, serif). No blank iframe or errors.
result: pass

### 7. Snapshot PDF Export Works
expected: From a submission snapshot view, click to export the snapshot as PDF. Save dialog appears, file saves without error. The PDF contains the resume content rendered with the Classic template.
result: pass (retest after snapshot margin + profile freeze fixes)

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Template selection dropdown visible in preview header"
  status: resolved
  test: 3
  resolved_by: "Plan 16-03 Task 1"

- truth: "Template dropdown in preview header allows switching between 5 templates with immediate re-render"
  status: resolved
  test: 4
  resolved_by: "Plan 16-03 Task 1"

- truth: "Snapshot PDF export margins match the snapshot viewer when exporting from analysis screen"
  status: resolved
  test: 7
  resolved_by: "Snapshot margin fix + frozen profile + templateOptions in snapshot"
