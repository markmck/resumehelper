---
phase: 05-projects-and-tag-autocomplete
plan: 02
subsystem: ui
tags: [react, typescript, portal, autocomplete, TagInput]

# Dependency graph
requires:
  - phase: 04-skills-tab
    provides: TagInput component and SkillList/SkillItem components to extend

provides:
  - TagInput with autocomplete dropdown via createPortal and fixed positioning
  - allTags computed in SkillList and threaded through SkillItem to TagInput
  - Keyboard navigation (ArrowDown/Up, Enter, Escape) for suggestion selection
  - Blur-race-condition fix via onMouseDown preventDefault on suggestion items

affects:
  - 05-01-projects (parallel plan, shares SkillList/SkillItem but no direct conflict)
  - 06-template-variants (any future tag usage in templates)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Portal dropdown: createPortal to document.body with fixed positioning via getBoundingClientRect()
    - Blur-race prevention: onMouseDown e.preventDefault() on dropdown items to prevent blur-before-click
    - Prop threading: allTags computed at list level, passed down through item to input component
    - Inline styles for dropdown positioning (Tailwind v4 unreliable for fixed/absolute placement)

key-files:
  created: []
  modified:
    - src/renderer/src/components/TagInput.tsx
    - src/renderer/src/components/SkillList.tsx
    - src/renderer/src/components/SkillItem.tsx

key-decisions:
  - "Use createPortal to document.body for dropdown to avoid overflow:hidden clipping by parent containers"
  - "onMouseDown preventDefault on li items is the canonical fix for blur-before-click race in React dropdowns"
  - "allTags computed at SkillList level (deduplicated via Set) so all SkillItems share the same suggestion pool"
  - "suggestions prop is optional — TagInput degrades gracefully with no dropdown when prop absent"

patterns-established:
  - "Portal dropdown: use containerRef + getBoundingClientRect() for fixed positioning, never rely on CSS z-index alone"
  - "Autocomplete state: activeIndex (-1 = none), dropdownOpen, filtered list computed inline from props"

requirements-completed:
  - TAG-01

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 5 Plan 02: Tag Autocomplete Summary

**Portal-rendered tag autocomplete dropdown with keyboard navigation, click-safe blur handling, and allTags prop-threading from SkillList through SkillItem to TagInput**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T00:00:00Z
- **Completed:** 2026-03-14T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- TagInput extended with optional `suggestions` prop — autocomplete activates only when provided, existing behavior unchanged
- Portal dropdown renders via `createPortal` to `document.body` with `position: fixed` + `getBoundingClientRect()` for correct positioning regardless of parent overflow or scroll
- Arrow key navigation, Enter to select highlighted suggestion, Escape to close dropdown without adding tag
- `onMouseDown={(e) => e.preventDefault()}` on each `<li>` eliminates the blur-before-click race condition
- `allTags` computed once in SkillList via `[...new Set(skills.flatMap(s => s.tags))]` and threaded through SkillItem as `suggestions` prop to TagInput
- Tags already on the current skill are excluded from suggestions by the existing `!tags.includes(s)` filter

## Task Commits

Each task was committed atomically:

1. **Task 1: Add suggestions prop and portal dropdown to TagInput** - `81554b8` (feat)
2. **Task 2: Wire allTags from SkillList through SkillItem to TagInput** - `ae00296` (feat)

## Files Created/Modified

- `src/renderer/src/components/TagInput.tsx` - Added suggestions prop, activeIndex/dropdownOpen state, containerRef, keyboard navigation handlers, onBlur, portal dropdown with inline styles
- `src/renderer/src/components/SkillList.tsx` - Added allTags computation after computeGroups(), passed allTags to each SkillItem
- `src/renderer/src/components/SkillItem.tsx` - Added allTags to SkillItemProps, destructured in function signature, passed as suggestions to TagInput

## Decisions Made

- `createPortal` to `document.body` chosen over CSS positioning to guarantee dropdown is never clipped by ancestor `overflow: hidden` containers
- `onMouseDown preventDefault` pattern used (not `onMouseLeave` or timeout hacks) — this is the correct React solution for blur-before-click
- Dropdown uses all inline styles per project convention — Tailwind v4 is unreliable for dynamic positioning/spacing
- `allTags` deduplicated at source via `Set` so suggestion list is clean even when skills share tags

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tag autocomplete is fully functional and can be verified by running `npm run dev`
- Typing any character in a TagInput shows filtered suggestions from all existing tags
- Plan 05-01 (Projects tab) runs in parallel and does not depend on this plan's output
- Ready for Phase 6 (template variants) — tag data is now consistent and well-categorized

---
*Phase: 05-projects-and-tag-autocomplete*
*Completed: 2026-03-14*
