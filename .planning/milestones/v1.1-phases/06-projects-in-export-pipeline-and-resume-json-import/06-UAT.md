---
status: complete
phase: 06-projects-in-export-pipeline-and-resume-json-import
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, direct execution of 06-03/04/05]
started: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the application from scratch with `npm run dev`. App boots without errors — all new tables are created automatically.
result: pass

### 2. Experience Tab Collapsible Sections
expected: Navigate to the Experience tab. You should see collapsible sections for all 11 categories. Primary sections expanded, minor sections collapsed. Clicking any section header toggles it.
result: pass

### 3. Add Education Entry
expected: Expand the Education section. Click "+ Add Education". Fill in institution, area, start date, end date. Save. The education entry appears in the list.
result: pass

### 4. Add Language Entry
expected: Expand the Languages section. Click "+ Add Language". Enter a language and fluency level. Save. The entry appears as "Language — Fluency".
result: pass

### 5. Projects in Template Builder
expected: Templates tab, Builder sub-tab. Projects section after Skills with project + bullet checkboxes. Toggling project off disables bullets.
result: pass

### 6. Projects in Resume Preview
expected: Preview sub-tab. Projects after Skills with heading "PROJECTS", bold names, bullet points.
result: pass

### 7. Projects in PDF Export
expected: Export PDF. Projects section appears after Skills matching preview.
result: pass

### 8. Projects in DOCX Export
expected: Export DOCX. PROJECTS section with name headers and bulleted highlights.
result: pass

### 9. Import Button Visible
expected: Experience tab shows "Import from resume.json" button in top-right.
result: pass

### 10. Import File Dialog
expected: Click import button, native file dialog opens filtered to .json, selecting file shows confirmation modal.
result: pass

### 11. Import Confirmation Modal
expected: Modal with title, amber warning, section counts list, Cancel and "Replace All Data" (red) buttons.
result: pass

### 12. Import Replaces Data Successfully
expected: Click Replace All Data, success toast with counts, Experience tab refreshes with imported data, previous data gone.
result: pass

### 13. New Entities in Template Builder
expected: After import, template Builder shows new entity sections with item checkboxes.
result: pass

### 14. New Entities in Resume Preview
expected: Preview shows Education, Volunteer, Awards, etc. sections with proper formatting.
result: pass

### 15. Skills Import Mapping
expected: When importing resume.json, skills[].keywords should become individual skill rows with skills[].name as their tag. E.g., { name: "Frontend", keywords: ["React", "TypeScript"] } should create skill "React" tagged "Frontend" and skill "TypeScript" tagged "Frontend".
result: pass

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0

## Gaps

[none — all issues resolved]
