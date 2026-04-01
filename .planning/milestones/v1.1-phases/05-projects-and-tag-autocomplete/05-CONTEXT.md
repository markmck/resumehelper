# Phase 5: Projects and Tag Autocomplete - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add projects section to the Experience tab (with name and toggleable bullet points, mirroring the jobs pattern) and extend TagInput with autocomplete suggestions from existing tags.

</domain>

<decisions>
## Implementation Decisions

### Projects Section
- Projects mirror the jobs/jobBullets pattern exactly: `projects` table + `projectBullets` table
- Each project has: name, bullet points (toggleable, orderable like job bullets)
- Projects section appears below Skills on the Experience tab
- Same UX patterns: inline add form, click-to-edit, immediate delete, drag-to-reorder bullets
- Enter on bullet saves and creates new bullet (auto-focus), empty bullets delete on blur
- Bullet points are individual DB records with sortOrder

### Tag Autocomplete
- Extend existing TagInput component with a suggestions dropdown
- Suggestions sourced from all existing tags across all skills (deduplicated, client-side)
- Dropdown appears below the input as user types, filtered by typed text
- Arrow keys to navigate suggestions, Enter to select, continue typing to create new
- Portal rendering for dropdown (avoids clipping/overflow issues)
- onMouseDown preventDefault on suggestion items (prevents blur-before-click race)

### Claude's Discretion
- Project fields beyond name + bullets (could add URL, dates, tech stack — but keep it simple for v1.1)
- Exact autocomplete dropdown styling
- Fuzzy vs prefix matching for tag suggestions
- Whether to show "Create new tag: X" option in dropdown when no match

</decisions>

<specifics>
## Specific Ideas

- Keep it consistent with existing Experience tab patterns
- Projects are the simplest addition — just another section with the same UX

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JobList.tsx` / `JobItem.tsx` / `JobAddForm.tsx` — direct template for ProjectList/ProjectItem/ProjectAddForm
- `BulletList.tsx` / `BulletItem.tsx` — reuse for project bullets (same component or shared)
- `TagInput.tsx` — extend with suggestions prop and dropdown
- `InlineEdit.tsx` — reuse for project name editing
- `ExperienceTab.tsx` — add Projects section below Skills

### Established Patterns
- IPC handlers in `src/main/handlers/` with `registerAllHandlers()`
- `CREATE TABLE IF NOT EXISTS` in `src/main/db/index.ts` — add projects + projectBullets tables
- Preload bridge: `window.api.{feature}.{action}()`

### Integration Points
- Add `projects` and `projectBullets` tables to `ensureSchema()` in db/index.ts
- New handlers in `src/main/handlers/projects.ts`
- New components in `src/renderer/src/components/`
- `templateVariantItems` needs `projectId` and `projectBulletId` nullable FK columns (for Phase 6)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-projects-and-tag-autocomplete*
*Context gathered: 2026-03-14*
