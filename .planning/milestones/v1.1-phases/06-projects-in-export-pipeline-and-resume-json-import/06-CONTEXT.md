# Phase 6: Projects in Export Pipeline and resume.json Import - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire projects into the template variant builder, preview, and all export formats. Add DB tables and Experience tab UI for ALL resume.json sections (education, volunteer, awards, publications, languages, interests, references). Wire all new sections into the builder, preview, and export pipeline. Import resume.json files with full section mapping and replace-with-confirmation flow.

**Scope expansion from original roadmap:** Phase 6 now covers full resume.json entity alignment, not just projects + core-4 import. All resume.json spec sections get first-class support.

</domain>

<decisions>
## Implementation Decisions

### Projects in Resume Layout
- Projects section appears AFTER Skills on the resume (last experience section before minor sections)
- Formatted like jobs: bold project name as header, bulleted list of accomplishments below
- Section heading: "PROJECTS" (matches "WORK EXPERIENCE" and "SKILLS" style)
- Projects appear in PDF, DOCX, preview, and frozen submission snapshots — consistent across all outputs

### Projects in Builder UX
- Same pattern as jobs: project-level checkbox + individual bullet checkboxes nested below
- Toggling project off disables all its bullets (same behavior as job toggle)
- Projects section positioned after Skills in the builder

### Full resume.json Entity Alignment
- ALL resume.json sections get DB tables and Experience tab UI:
  - education (institution, area, studyType, startDate, endDate, score, courses[])
  - volunteer (organization, position, startDate, endDate, summary, highlights[])
  - awards (title, date, awarder, summary)
  - publications (name, publisher, releaseDate, url, summary)
  - languages (language, fluency)
  - interests (name, keywords[])
  - references (name, reference)
- Experience tab uses collapsible sections layout — all sections stacked vertically, each with expand/collapse toggle
- Existing sections (Jobs, Skills, Projects) keep their current UI but gain collapse/expand

### Builder Toggles for New Sections
- All sections get item-level checkboxes (each education entry, each award, etc. individually toggleable)
- Sub-items (education courses[], interest keywords[]) are NOT individually toggleable — parent-level only
- Builder section order by importance/frequency: Work, Skills, Projects, Education, then remaining sections (Claude decides exact order for minor sections)

### resume.json Import
- Import button on Experience tab header ("Import from resume.json")
- Opens system file dialog to select .json file
- Replace-all strategy: delete ALL existing data, then insert from resume.json in a transaction
- Confirmation dialog shows summary counts: "5 jobs, 12 skills, 3 projects, 2 education entries..." with warning "This will replace all existing data"
- After successful import: success toast with counts, stay on Experience tab (data refreshes automatically)
- Maps ALL resume.json sections to their respective DB tables

### Claude's Discretion
- Exact resume section ordering for new sections (education, volunteer, awards, publications, languages, interests, references) in the exported resume
- How each new section renders on the resume (formatting, typography, layout details)
- resume.json schema validation approach (strict vs lenient)
- Error handling for malformed or partial resume.json files
- Collapsible section UI implementation details (animation, default expanded/collapsed state)
- How to handle resume.json fields that don't map cleanly (e.g., profiles[] in basics)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VariantBuilder.tsx`: Has Work History + Skills checkbox sections — extend with Projects and all new sections following same pattern
- `ProfessionalLayout.tsx`: Has Work Experience + Skills sections — extend with Projects and all new sections
- `export.ts`: Has `getBuilderDataForVariant()` that fetches jobs + skills with exclusions — extend to include projects and all new entities
- `export.ts` DOCX builder: Has Work Experience + Skills sections — extend with all new sections
- `PrintApp.tsx`: Uses ProfessionalLayout for PDF rendering — will automatically pick up new sections
- `SnapshotViewer.tsx`: Uses ProfessionalLayout — will automatically pick up new sections
- `templateVariantItems` table: Already has `projectId` and `projectBulletId` FK columns from Phase 5 migration
- Job/Bullet CRUD pattern: `JobList.tsx`, `JobItem.tsx`, `JobAddForm.tsx`, `BulletList.tsx` — template for new entity CRUD components
- `InlineEdit.tsx`: Reusable for inline editing in new entity components

### Established Patterns
- IPC handlers in `src/main/handlers/` with `register*Handlers()` pattern
- `CREATE TABLE IF NOT EXISTS` in `src/main/db/index.ts` ensureSchema
- Preload bridge: `window.api.{entity}.{action}()` with typed Api interface
- Inline styles for layout spacing (Tailwind v4 unreliable)
- `BuilderData` interface + `getBuilderDataForVariant()` for variant rendering

### Integration Points
- `BuilderData` interface needs projects + all new entity types with excluded flags
- `SubmissionSnapshot` interface needs projects + all new entities for frozen snapshots
- `templateVariantItems` needs new FK columns for each new entity type (education, volunteer, awards, etc.)
- `ensureSchema()` needs CREATE TABLE IF NOT EXISTS for all new tables
- `ExperienceTab.tsx` needs collapsible section wrappers around existing + new sections
- `Api` interface in `preload/index.d.ts` needs new entity namespaces

</code_context>

<specifics>
## Specific Ideas

- User wants the Experience tab organized like resume generators (e.g., latexresu.me) — clean section-based layout with collapsible areas
- Full resume.json spec alignment is the goal — "if it's in the resume.json spec, it should be in our Experience tab"
- Keep UX consistent: every entity follows the same add/edit/delete/toggle patterns established in v1.0

</specifics>

<deferred>
## Deferred Ideas

- Drag-to-reorder resume sections on the exported resume (custom section ordering per variant)
- Education courses[] as individually toggleable items in builder (currently parent-level only)
- Interest keywords[] as individually toggleable items in builder (currently parent-level only)
- Merge import strategy (add new alongside existing instead of replace-all)

</deferred>

---

*Phase: 06-projects-in-export-pipeline-and-resume-json-import*
*Context gathered: 2026-03-22*
