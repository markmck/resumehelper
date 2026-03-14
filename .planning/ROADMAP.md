# Roadmap: ResumeHelper

## Overview

Build a local-first Electron desktop app for managing structured resume content. The work follows strict dependency ordering: the experience database is the root of everything — templates reference it, submissions snapshot it, and exports render from it. Four phases deliver a complete v1: a populated experience library, named template variants for quick tailoring, a submission log for pipeline visibility, and PDF/DOCX export to actually apply.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Database schema + Experience Library CRUD (completed 2026-03-14)
- [x] **Phase 2: Template Variants** - Named resume variants with experience item toggling (completed 2026-03-14)
- [ ] **Phase 3: Submissions** - Submission log with pipeline tracking
- [ ] **Phase 4: Export** - PDF and DOCX export from variants and snapshots

## Phase Details

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
- [ ] 01-01-PLAN.md — Database schema (all 5 tables), Drizzle migration runner, IPC handlers, preload bridge
- [x] 01-02-PLAN.md — App shell, dark theme, Work History CRUD UI with inline editing and bullet drag-reorder
- [ ] 01-03-PLAN.md — Skills CRUD UI with freeform tag input and tag-grouped display

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
- [ ] 02-01-PLAN.md — Schema migration (discriminator model + layoutTemplate), IPC handlers, preload bridge
- [ ] 02-02-PLAN.md — Template Builder UI: tab routing, sidebar, builder with checkboxes, resume preview

### Phase 3: Submissions
**Goal**: Users can log every job application with the exact resume variant used and track each application's pipeline status
**Depends on**: Phase 2
**Requirements**: SUB-01, SUB-02
**Success Criteria** (what must be TRUE):
  1. User can log a submission (company, role, date, which variant) and the resume content at that moment is frozen — editing the template afterward does not change the submission record
  2. User can view all submissions in a list showing company, role, date, variant name, and current status
**Plans**: TBD

Plans:
- [ ] 03-01: Submission log + snapshot storage (SubmissionService with JSON snapshot on insert)
- [ ] 03-02: Submissions list UI with status display

### Phase 4: Export
**Goal**: Users can export any template variant as a properly formatted PDF or DOCX file ready to submit to employers
**Depends on**: Phase 3
**Requirements**: EXPRT-01, EXPRT-02
**Success Criteria** (what must be TRUE):
  1. User can export a template variant as a PDF and the file opens correctly with all experience items rendered and no content cut off
  2. User can export a template variant as a Word DOCX file with correct formatting and all experience items present
**Plans**: TBD

Plans:
- [ ] 04-01: PDF export via webContents.printToPDF() with resume renderer page
- [ ] 04-02: DOCX export via docx library in main process

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete    | 2026-03-14 |
| 2. Template Variants | 2/2 | Complete   | 2026-03-14 |
| 3. Submissions | 0/2 | Not started | - |
| 4. Export | 0/2 | Not started | - |
