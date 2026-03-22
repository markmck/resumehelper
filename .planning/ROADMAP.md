# Roadmap: ResumeHelper

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-03-14)
- 🚧 **v1.1 Enhancements** - Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-14</summary>

### Phase 1: Foundation
**Goal**: Users can store and manage all professional experience in a structured local database, and the Electron IPC + Drizzle infrastructure is established correctly for all subsequent phases
**Depends on**: Nothing (first phase)
**Requirements**: EXP-01, EXP-02, EXP-03, EXP-04
**Success Criteria** (what must be TRUE):
  1. User can add a work history entry (company, role, dates, description bullets) and see it appear in the Experience Library
  2. User can edit and delete existing work history entries
  3. User can add, edit, and delete skills with category tags (e.g., "frontend", "C#")
  4. The app starts fresh on a clean install with migrations applied automatically — no manual setup required
**Plans:** 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md — Database schema (all 5 tables), Drizzle migration runner, IPC handlers, preload bridge
- [x] 01-02-PLAN.md — App shell, dark theme, Work History CRUD UI with inline editing and bullet drag-reorder
- [x] 01-03-PLAN.md — Skills CRUD UI with freeform tag input and tag-grouped display

### Phase 2: Template Variants
**Goal**: Users can create named resume variants that compose experience items from the database, and quickly customize a variant for a specific job application
**Depends on**: Phase 1
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04
**Success Criteria** (what must be TRUE):
  1. User can create a named template variant (e.g., "Frontend Focus") and see it in a variant list
  2. User can toggle individual experience items in or out of a variant and the change persists
  3. User can duplicate an existing variant as a starting point, then modify the copy independently
  4. User can delete a template variant without affecting experience items or other variants
**Plans:** 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md — Schema migration (discriminator model + layoutTemplate), IPC handlers, preload bridge
- [x] 02-02-PLAN.md — Template Builder UI: tab routing, sidebar, builder with checkboxes, resume preview

### Phase 3: Submissions
**Goal**: Users can log every job application with a frozen snapshot of the exact resume sent, and view all submissions in a scannable list with inline editing and snapshot viewing
**Depends on**: Phase 2
**Requirements**: SUB-01, SUB-02
**Success Criteria** (what must be TRUE):
  1. User can log a submission (company, role, date, which variant) and the resume content at that moment is frozen — editing the template afterward does not change the submission record
  2. User can view all submissions in a list showing company, role, date, variant name, and current status
**Plans:** 2/2 plans complete

Plans:
- [x] 03-01-PLAN.md — Schema migration (url + notes columns), IPC handlers with snapshot capture, preload bridge
- [x] 03-02-PLAN.md — Submissions tab UI: add form, table with inline editing, frozen snapshot viewer modal

### Phase 4: Export
**Goal**: Users can export any template variant as a properly formatted PDF or DOCX file ready to submit to employers
**Depends on**: Phase 3
**Requirements**: EXPRT-01, EXPRT-02
**Success Criteria** (what must be TRUE):
  1. User can export a template variant as a PDF and the file opens correctly with all experience items rendered and no content cut off
  2. User can export a template variant as a Word DOCX file with correct formatting and all experience items present
**Plans:** 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md — Profile table, ProfessionalLayout component, UI refactor (replace 3 layouts with 1 polished layout)
- [x] 04-02-PLAN.md — PDF export via printToPDF, DOCX export via docx library, export buttons on Preview tab

</details>

### 🚧 v1.1 Enhancements (In Progress)

**Milestone Goal:** Extend the experience database with projects, add tag autocomplete, support resume.json data import, and enable resume.json theme rendering for additional layout templates.

#### Phase 5: Projects and Tag Autocomplete
**Goal**: Users can manage projects in the Experience tab with toggleable bullets, and tag input fields suggest existing tags as they type
**Depends on**: Phase 4
**Requirements**: PROJ-01, PROJ-02, TAG-01
**Success Criteria** (what must be TRUE):
  1. User can add a project with a name and one or more bullet points, and the project appears in the Experience tab
  2. User can edit a project's name and bullets, and delete a project
  3. Tag input on skill entries shows a dropdown of existing tags as the user types, and clicking or pressing Enter on a suggestion inserts it
**Plans**: 2 plans

Plans:
- [ ] 05-01: Projects schema, CRUD handlers, IPC bridge, and Experience tab UI (ProjectList/ProjectItem/ProjectAddForm)
- [ ] 05-02: Tag autocomplete — extend TagInput with suggestions prop, portal dropdown, keyboard navigation

#### Phase 6: Projects in Export Pipeline and resume.json Import
**Goal**: Projects appear in template variants, resume preview, and all export formats; all resume.json entity types (education, volunteer, awards, publications, languages, interests, references) get full DB + UI + builder + export support; users can import existing resume data from a resume.json file
**Depends on**: Phase 5
**Requirements**: PROJ-03, PROJ-04, IMP-01, IMP-02
**Success Criteria** (what must be TRUE):
  1. User can toggle projects in or out of a template variant using the checkbox builder, and the selection persists
  2. Projects section appears in the resume preview and in exported PDF and DOCX files when projects are included in the variant
  3. User can import a resume.json file and see their existing jobs, skills, projects, and profile mapped into the app
  4. Import shows a summary of what will be replaced and requires confirmation before overwriting existing data
**Plans**: 5 plans

Plans:
- [ ] 06-01-PLAN.md — Wire projects into builder, preview, PDF/DOCX export, and submission snapshots
- [ ] 06-02-PLAN.md — DB schema, IPC handlers, and preload bridge for 7 new resume.json entities (education, volunteer, awards, publications, languages, interests, references)
- [ ] 06-03-PLAN.md — Experience tab collapsible sections + CRUD UI components for all 7 new entities
- [ ] 06-04-PLAN.md — Wire all 7 new entities into builder toggles, preview rendering, DOCX export, and snapshots
- [ ] 06-05-PLAN.md — resume.json import: file picker, confirmation modal, atomic replace-all transaction

#### Phase 7: resume.json Theme Rendering
**Goal**: Users can select from bundled resume.json themes to preview and export their resume with alternative layouts
**Depends on**: Phase 6
**Requirements**: THM-01, THM-02, THM-03
**Success Criteria** (what must be TRUE):
  1. User can select a bundled theme (e.g., "Even", "Class") from a layout selector in the variant editor
  2. The variant preview renders the selected theme's HTML layout inside an iframe in the Preview sub-tab
  3. PDF export uses the selected theme's HTML rendering when a theme layout is active, producing a correctly formatted file
**Plans**: TBD

Plans:
- [ ] 07-01: Install and configure jsonresume-theme-even and jsonresume-theme-class (asarUnpack, ESM/CJS verification), buildResumeJson() mapper, layout selector in VariantEditor
- [ ] 07-02: Theme preview (iframe srcdoc), theme PDF export path (temp file + win.loadFile + printToPDF), packaged binary test

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-14 |
| 2. Template Variants | v1.0 | 2/2 | Complete | 2026-03-14 |
| 3. Submissions | v1.0 | 2/2 | Complete | 2026-03-14 |
| 4. Export | v1.0 | 2/2 | Complete | 2026-03-14 |
| 5. Projects and Tag Autocomplete | v1.1 | 2/2 | Complete | 2026-03-15 |
| 6. Projects in Export Pipeline and Import | 1/5 | In Progress|  | - |
| 7. resume.json Theme Rendering | v1.1 | 0/2 | Not started | - |
