---
phase: 13-pipeline-foundation
plan: 01
subsystem: ui
tags: [react, typescript, resume-templates, inline-styles]

# Dependency graph
requires: []
provides:
  - ResumeTemplateProps shared interface for all resume templates
  - filterResumeData() utility that filters excluded entities and groups skills
  - ClassicTemplate component with Times New Roman font and accentColor prop
  - resolveTemplate() registry with TEMPLATE_LIST for template picker UI
affects: [14-variant-preview, 15-template-options, 16-snapshot-pdf]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-template independent React components with shared ResumeTemplateProps type"
    - "All template styles use React inline CSSProperties (no external CSS or Tailwind)"
    - "filterResumeData called at top of each template component to strip excluded items before render"
    - "resolveTemplate registry pattern — add new templates to TEMPLATE_MAP, fallback to ClassicTemplate"

key-files:
  created:
    - src/renderer/src/components/templates/types.ts
    - src/renderer/src/components/templates/filterResumeData.ts
    - src/renderer/src/components/templates/ClassicTemplate.tsx
    - src/renderer/src/components/templates/resolveTemplate.ts
  modified: []

key-decisions:
  - "ClassicTemplate uses Times New Roman instead of ProfessionalLayout's Calibri/Segoe UI — ATS-friendly serif font"
  - "Summary renders as plain paragraph below contact line with no h2 heading — removes visual noise for ATS"
  - "accentColor prop defaults to #cccccc — controls section heading border color per template variant"
  - "filterResumeData also maps job/project bullets to filter excluded bullets — bullets pre-filtered before template render"

patterns-established:
  - "Template contract: ResumeTemplateProps is the single shared interface; all templates receive same prop shape"
  - "Registry pattern: resolveTemplate(key) returns component type; TEMPLATE_LIST drives picker UI"
  - "Filtering boundary: excluded items never reach template render — filterResumeData is the single gate"

requirements-completed: [TMPL-02, TMPL-03]

# Metrics
duration: 8min
completed: 2026-03-25
---

# Phase 13 Plan 01: Template Infrastructure Summary

**Four-file template foundation: ResumeTemplateProps contract, filterResumeData utility, ClassicTemplate (Times New Roman, no Summary heading, accentColor prop), and resolveTemplate registry**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-25T17:30:18Z
- **Completed:** 2026-03-25T17:38:00Z
- **Tasks:** 2
- **Files modified:** 4 created

## Accomplishments
- Shared `ResumeTemplateProps` interface imported by all templates, covering all 10 entity types plus accentColor/compact/skillsDisplay options
- `filterResumeData()` utility that strips excluded jobs, skills, projects, and all other entities — including excluded bullets within jobs and projects — and groups skills by first tag
- `ClassicTemplate` component: complete visual port of ProfessionalLayout with three locked differences (Times New Roman font, no Summary h2 heading, accentColor-driven border color)
- `resolveTemplate()` registry with fallback to ClassicTemplate for unknown keys, plus `TEMPLATE_LIST` for downstream template picker UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Create template types and filterResumeData utility** - `ac0cc35` (feat)
2. **Task 2: Create ClassicTemplate and resolveTemplate registry** - `867c6b7` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/renderer/src/components/templates/types.ts` - ResumeTemplateProps interface, imports Profile and all Builder* types
- `src/renderer/src/components/templates/filterResumeData.ts` - FilteredResumeData interface and filterResumeData() function
- `src/renderer/src/components/templates/ClassicTemplate.tsx` - Classic ATS resume template, all sections, Times New Roman
- `src/renderer/src/components/templates/resolveTemplate.ts` - resolveTemplate() and TEMPLATE_LIST exports

## Decisions Made
- ClassicTemplate uses `Times New Roman` instead of ProfessionalLayout's `Calibri/Segoe UI` — serif fonts render better in print/PDF for traditional ATS
- Summary section renders as plain `<div>` paragraph directly below contact line — no `<h2>Summary</h2>` heading to reduce visual noise
- `filterResumeData` maps job and project bullets to pre-filter excluded bullets, so templates never see excluded bullets in their render
- `accentColor` defaults to `#cccccc` inside the component signature; used in `borderBottom` on sectionHeadingStyle

## Deviations from Plan

None - plan executed exactly as written.

The plan's verify command (`npx tsc --noEmit src/renderer/src/components/templates/...`) produced JSX flag errors when invoked standalone, but this is expected behavior — running `npx tsc --project tsconfig.web.json --noEmit` against the full project config passes cleanly. No code changes were required.

## Issues Encountered
- Standalone `npx tsc --noEmit` on `.tsx` files without project config reports JSX flag errors — not a real error, just the verify command in the plan lacking `--project tsconfig.web.json`. Full project compile passes with zero errors.

## Next Phase Readiness
- Template infrastructure complete — all four files ready for Phase 14 (variant preview) to import and use
- `resolveTemplate` and `TEMPLATE_LIST` ready for TemplatesTab integration
- No blockers

---
*Phase: 13-pipeline-foundation*
*Completed: 2026-03-25*
