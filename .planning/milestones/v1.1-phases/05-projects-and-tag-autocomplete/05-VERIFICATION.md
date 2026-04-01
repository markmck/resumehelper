---
phase: 05-projects-and-tag-autocomplete
verified: 2026-03-14T00:00:00Z
status: passed
score: 9/9 must-haves verified
gaps: []
human_verification:
  - test: "Add a project, enter a name, and verify it appears in the Experience tab below the Skills section"
    expected: "Project card appears with the entered name, below Skills, on the same scroll pane"
    why_human: "Cannot programmatically assert rendered DOM layout or visual positioning"
  - test: "Add a bullet to a project, press Enter, verify a new blank bullet appears with focus"
    expected: "New bullet input is created and focused automatically"
    why_human: "Auto-focus behavior requires a running browser context to verify"
  - test: "Drag a project bullet to reorder it, reload the app, verify the new order persists"
    expected: "Order is the same after reload"
    why_human: "DnD interaction and persistence across restarts require a running app"
  - test: "Type a partial tag name in a skill's tag input when other skills already have tags"
    expected: "Dropdown appears with matching suggestions; clicking one inserts the tag without the dropdown closing prematurely"
    why_human: "Blur-race fix and visual dropdown require a running browser"
  - test: "Press ArrowDown to highlight a suggestion, then press Enter"
    expected: "Highlighted suggestion is added as a tag; dropdown closes"
    why_human: "Keyboard navigation requires interactive browser context"
  - test: "Press Escape while dropdown is open"
    expected: "Dropdown closes, no tag is added, input value is cleared"
    why_human: "Requires interactive browser context"
---

# Phase 5: Projects and Tag Autocomplete — Verification Report

**Phase Goal:** Users can manage projects in the Experience tab with toggleable bullets, and tag input fields suggest existing tags as they type
**Verified:** 2026-03-14
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can add a project with a name and it appears in the Experience tab | VERIFIED | `ProjectList.tsx` calls `window.api.projects.create()`, appends to state; `ExperienceTab.tsx` renders `<ProjectList />` in Projects section |
| 2 | User can add bullet points to a project, Enter creates next bullet with auto-focus | VERIFIED | `ProjectBulletList.tsx` passes `onEnterKey={handleAddBullet}` to `BulletItem`; `BulletItem` fires `onEnterKey` via `onEnter` prop on `InlineEdit`; new bullet id stored in `focusBulletId` state, passed as `autoFocus` |
| 3 | User can edit a project name inline (click to edit, blur to save) | VERIFIED | `ProjectItem.tsx` renders `<InlineEdit value={project.name} onSave={handleNameUpdate} />` which calls `window.api.projects.update()` on save |
| 4 | User can delete a project and bullets are cascade-deleted | VERIFIED | `ProjectItem.tsx` calls `window.api.projects.delete()`; DB schema has `onDelete: 'cascade'` on `projectBullets.projectId` FK |
| 5 | User can drag-to-reorder bullets within a project | VERIFIED | `ProjectBulletList.tsx` uses `DndContext`/`SortableContext` from `@dnd-kit`; `handleDragEnd` calls `window.api.projectBullets.reorder()` |
| 6 | Empty bullet on blur deletes itself | VERIFIED | `BulletItem.tsx` `InlineEdit.onSave` calls `onDelete()` when `!v.trim()`; `alwaysFireSave` prop ensures save fires even on empty blur |
| 7 | Typing in a tag input shows a dropdown of existing tags filtered by typed text | VERIFIED | `TagInput.tsx` computes `filtered` from `suggestions` prop, `showDropdown` gates display; dropdown rendered via `createPortal` |
| 8 | Arrow keys navigate list, Enter selects highlighted suggestion | VERIFIED | `handleKeyDown` in `TagInput.tsx` handles `ArrowDown`, `ArrowUp`, `Enter` with `activeIndex >= 0` guard |
| 9 | Clicking a suggestion inserts it without blur race | VERIFIED | Each `<li>` has `onMouseDown={(e) => e.preventDefault()}` preventing blur-before-click |

**Score:** 9/9 truths verified

---

### Required Artifacts

#### Plan 05-01 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/main/db/schema.ts` | VERIFIED | `export const projects` table defined at line 38; `export const projectBullets` at line 44; FK columns `projectId`/`projectBulletId` added to `templateVariantItems` at lines 62-63 |
| `src/main/db/index.ts` | VERIFIED | `CREATE TABLE IF NOT EXISTS projects` at line 85; `CREATE TABLE IF NOT EXISTS project_bullets` at line 91 with cascade FK |
| `src/main/handlers/projects.ts` | VERIFIED | Exports `registerProjectHandlers()`; all 8 IPC channels implemented: `projects:list/create/update/delete` and `projectBullets:create/update/delete/reorder` |
| `src/renderer/src/components/ProjectList.tsx` | VERIFIED | Manages state, fetches via `window.api.projects.list()`, renders add button, empty state, `ProjectAddForm`, and `ProjectItem` list |
| `src/renderer/src/components/ProjectItem.tsx` | VERIFIED | Renders `InlineEdit` for name, hover delete button, and `ProjectBulletList` |
| `src/renderer/src/components/ProjectAddForm.tsx` | VERIFIED | Single name input with auto-focus via `useRef`/`useEffect`, form submit calls `onSave({ name: name.trim() })` |
| `src/renderer/src/components/ProjectBulletList.tsx` | VERIFIED | DnD sortable bullet list using `@dnd-kit`; calls `window.api.projectBullets.*`; reuses `BulletItem` |
| `src/renderer/src/components/ExperienceTab.tsx` | VERIFIED | Imports `ProjectList`; renders `<ProjectList />` inside a `<section>` with "Projects" heading after Skills section |

#### Plan 05-02 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/renderer/src/components/TagInput.tsx` | VERIFIED | Contains `createPortal` import (line 1); `suggestions?: string[]` prop in interface; portal dropdown with fixed positioning at lines 121-161 |
| `src/renderer/src/components/SkillList.tsx` | VERIFIED | `allTags` computed at line 66 via `[...new Set(skills.flatMap((s) => s.tags))]`; passed to each `<SkillItem allTags={allTags} ...>` at line 113 |
| `src/renderer/src/components/SkillItem.tsx` | VERIFIED | `allTags: string[]` in `SkillItemProps` interface; `suggestions={allTags}` passed to `<TagInput>` at line 35 |

---

### Key Link Verification

#### Plan 05-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ProjectList.tsx` | `window.api.projects` | IPC invoke | VERIFIED | Lines 25, 32, 40 use `window.api.projects.list/create/update/delete` |
| `ProjectBulletList.tsx` | `window.api.projectBullets` | IPC invoke | VERIFIED | Lines 52, 59, 69, 73 use `window.api.projectBullets.reorder/create/update/delete` |
| `src/main/handlers/projects.ts` | `src/main/db/schema.ts` | drizzle query | VERIFIED | `from(projects)` used at line 8; `from(projectBullets)` at line 11 |
| `src/preload/index.ts` | `src/main/handlers/projects.ts` | ipcRenderer.invoke | VERIFIED | `projects:` namespace defined at lines 86-99; matches all handler channel names |

#### Plan 05-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SkillList.tsx` | `SkillItem.tsx` | `allTags` prop | VERIFIED | `allTags={allTags}` at line 113 of `SkillList.tsx` |
| `SkillItem.tsx` | `TagInput.tsx` | `suggestions` prop | VERIFIED | `suggestions={allTags}` at line 35 of `SkillItem.tsx` |
| `TagInput.tsx` | `document.body` | `createPortal` | VERIFIED | `createPortal(..., document.body)` at line 160 of `TagInput.tsx` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PROJ-01 | 05-01 | User can add projects with name and toggleable bullet points | SATISFIED | `ProjectList` → `ProjectAddForm` → `window.api.projects.create`; `ProjectBulletList` manages bullets via `window.api.projectBullets.*` |
| PROJ-02 | 05-01 | User can edit and delete projects | SATISFIED | `ProjectItem` provides `InlineEdit` for name edit + delete button calling `window.api.projects.update/delete`; bullets editable via `BulletItem`/`InlineEdit` |
| TAG-01 | 05-02 | Tag input suggests existing tags as user types (autocomplete dropdown) | SATISFIED | `TagInput` with `suggestions` prop; portal dropdown; `allTags` computed in `SkillList` and threaded to `TagInput` |

No orphaned requirements: PROJ-01, PROJ-02, and TAG-01 are the only Phase 5 requirements in REQUIREMENTS.md and all are claimed in plan frontmatter.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/main/db/index.ts` | 50-62 | `template_variant_items` CREATE TABLE in `ensureSchema` does NOT include `project_id` or `project_bullet_id` columns | WARNING | On a fresh database, `ensureSchema` creates the table without those columns. The ALTER TABLE migration adds them afterward. If the migration silently fails (swallowed by the `catch` at line 111), those FK columns will be absent. This does not block Phase 5 goals (projects/bullets CRUD works without them) but is a reliability risk for Phase 6 (template builder integration). |

No placeholder stubs, empty implementations, or TODO comments found in any Phase 5 files.

---

### Human Verification Required

#### 1. Project appears below Skills in Experience tab

**Test:** Run `npm run dev`, navigate to Experience tab, add a project.
**Expected:** New project card appears in the Projects section, visually below the Skills section.
**Why human:** Cannot assert visual layout or scroll position programmatically.

#### 2. Enter key creates next bullet with auto-focus

**Test:** Open a project, click "+ Add bullet", type text, press Enter.
**Expected:** A new empty bullet input is created immediately below and receives keyboard focus automatically.
**Why human:** Auto-focus behavior requires a running browser context with real DOM events.

#### 3. Drag-to-reorder persists across reload

**Test:** Drag a bullet to a new position, close and reopen the app, verify order is retained.
**Expected:** Bullet order matches the dragged order after reload.
**Why human:** Requires DnD interaction and cross-session persistence check in a running app.

#### 4. Tag autocomplete dropdown appears and click works without blur race

**Test:** Add two skills with different tags. In a third skill's tag input, type the first letter of an existing tag.
**Expected:** Dropdown appears with matching tags. Clicking a suggestion inserts it and the dropdown closes normally (no flicker or missed click).
**Why human:** Visual dropdown and click-vs-blur race require a live browser context.

#### 5. Arrow key navigation and Enter selection

**Test:** With dropdown open, press ArrowDown twice, then Enter.
**Expected:** Second suggestion is highlighted after two ArrowDown presses; pressing Enter inserts it and closes dropdown.
**Why human:** Keyboard event sequences require interactive browser context.

#### 6. Escape closes dropdown without adding tag

**Test:** With dropdown open, press Escape.
**Expected:** Dropdown closes; no tag is added; input text remains.
**Why human:** Requires interactive browser context.

---

### Gaps Summary

No gaps. All must-haves from both plans are implemented and wired. All three required requirement IDs (PROJ-01, PROJ-02, TAG-01) are satisfied by the codebase.

One warning-level observation: the `ensureSchema` DDL for `template_variant_items` does not include the `project_id`/`project_bullet_id` columns added by this phase. These come only from the ALTER TABLE migration, which is wrapped in a silent try/catch. This is not a blocker for Phase 5 goals but should be addressed before Phase 6 ships, to ensure those FK columns are reliably present on fresh installs.

---

_Verified: 2026-03-14T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
