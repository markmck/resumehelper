---
status: complete
phase: 05-projects-and-tag-autocomplete
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md]
started: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:12:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the application from scratch with `npm run dev`. App boots without errors, database tables for projects and project_bullets are created, and the main window loads successfully.
result: pass

### 2. Projects Section Visible
expected: In the Experience tab, scroll down past Skills. A "Projects" section is visible below Skills with an empty state or existing projects list.
result: pass

### 3. Add a New Project
expected: Click the add project input, type a project name, and submit. The new project appears in the Projects list with the name you entered.
result: pass

### 4. Edit Project Name Inline
expected: Click on an existing project name. It becomes an editable inline input. Change the name and press Enter or click away. The name updates and persists.
result: pass

### 5. Delete a Project
expected: Hover over a project to reveal a delete button. Click delete. The project is removed from the list.
result: pass

### 6. Add Bullets to a Project
expected: Within a project, add a new bullet point. The bullet appears under the project and persists after navigating away and back.
result: pass

### 7. Drag-Reorder Project Bullets
expected: With multiple bullets on a project, drag one bullet to a different position. The new order persists after refresh.
result: pass

### 8. Tag Autocomplete Dropdown
expected: Navigate to a skill's tag input. Start typing a character that matches existing tags across all skills. A dropdown of matching suggestions appears below the input.
result: pass

### 9. Keyboard Navigation in Autocomplete
expected: With the autocomplete dropdown open, press ArrowDown/ArrowUp to highlight suggestions. Press Enter to select the highlighted tag (it gets added). Press Escape to close the dropdown without adding anything.
result: pass

### 10. Click Suggestion to Add Tag
expected: With the autocomplete dropdown open, click on a suggestion. The tag is added to the skill. The dropdown closes. No blur/race issues (the click registers reliably).
result: pass

### 11. Used Tags Excluded from Suggestions
expected: If a skill already has a tag (e.g., "React"), that tag does not appear in the autocomplete suggestions for that same skill. It should still appear for other skills that don't have it.
result: pass

### 12. Tag Autocomplete on New Skills
expected: Create a new skill. In the new skill's tag input, start typing a character that matches existing tags from other skills. The autocomplete dropdown should appear with suggestions.
result: issue
reported: "New skills do not have autocomplete"
severity: major

## Summary

total: 12
passed: 11
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "New skills should show tag autocomplete suggestions from existing tags"
  status: failed
  reason: "User reported: New skills do not have autocomplete"
  severity: major
  test: 12
  root_cause: "SkillAddForm does not receive allTags prop and does not pass suggestions to TagInput (line 73 of SkillAddForm.tsx)"
  artifacts:
    - path: "src/renderer/src/components/SkillAddForm.tsx"
      issue: "TagInput rendered without suggestions prop"
    - path: "src/renderer/src/components/SkillList.tsx"
      issue: "Does not pass allTags to SkillAddForm"
  missing:
    - "Add allTags prop to SkillAddForm interface"
    - "Pass allTags from SkillList to SkillAddForm"
    - "Pass suggestions={allTags} to TagInput in SkillAddForm"
  debug_session: ""
