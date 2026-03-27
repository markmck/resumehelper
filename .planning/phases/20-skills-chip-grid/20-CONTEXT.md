# Phase 20: Skills Chip Grid - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the flat tag list for skills with a chip grid grouped by categories. Each category is a draggable block with an inline-editable name. Skills are chips that can be dragged between categories. New categories can be created. A separate `skill_categories` table provides first-class category entities with reorderable sort order. Existing tag data is migrated to the new model.

</domain>

<decisions>
## Implementation Decisions

### Category Data Model
- **D-01:** New `skill_categories` table with columns: id (PK), name (text), sortOrder (integer). Categories are first-class entities, not derived from tags.
- **D-02:** Skills get a `categoryId` FK (nullable) referencing `skill_categories.id`. Null = uncategorized.
- **D-03:** Single category per skill — the multi-tag concept is dropped. The `tags` column becomes vestigial after migration (can be removed or left as-is).
- **D-04:** Category ordering uses the `sortOrder` column on `skill_categories`. Categories are NOT draggable to reorder in this phase — order is fixed (by insertion order or sortOrder). Skills are the only draggable items.

### Chip Grid Layout
- **D-05:** Vertical stacked category blocks. Each category is a card with: drag handle area (visual only, not functional for reorder in this phase), inline-editable name input (uppercase, 11px), Rename/Delete action buttons, chip grid with wrap layout inside.
- **D-06:** Skills render as chips: inline-flex, 13px font, raised background, × delete button, grab cursor for drag.
- **D-07:** "+" Add" chip at the end of each category's grid for adding a skill to that category.
- **D-08:** "+" Add category" button at the bottom of all category blocks.
- **D-09:** Drop zone at bottom (dashed purple border) for creating a new category by dropping a skill into it.
- **D-10:** Hint text below: "Drag skills between categories to reorganize."

### Drag-and-Drop Behavior
- **D-11:** Skills can be dragged between categories using @dnd-kit. Dropping a skill in another category updates its categoryId.
- **D-12:** Categories are NOT draggable for reordering in this phase. The drag handle is visual but non-functional. Category reorder is deferred.
- **D-13:** Visual feedback during drag: chip gets `opacity: 0.5` and purple border. Drop target category gets a subtle highlight.

### Migration Strategy
- **D-14:** Migration runs in `ensureSchema()`: create `skill_categories` table, add `categoryId` column to skills, populate categories from unique first tags, set categoryId on each skill from its first tag. All in a transaction.
- **D-15:** First tag becomes the category, remaining tags are discarded. This matches how templates already group skills by `tags[0]`.
- **D-16:** Skills with no tags get categoryId = null (uncategorized). An "Uncategorized" group appears at the bottom of the grid.

### Claude's Discretion
- Whether to remove the `tags` column entirely or leave it as vestigial
- Exact chip padding/spacing values (follow mockup closely)
- How the "Add skill" flow works (inline input chip or modal)
- Whether uncategorized skills show in a special "Uncategorized" block or as loose chips at the bottom
- How category deletion handles skills in that category (move to uncategorized vs prompt)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — VARNT-02, VARNT-03, VARNT-04 define the three requirements for this phase

### Design Mockup
- `C:/Users/Mark/Downloads/skills_management_revised.html` — HTML mockup defining exact layout, styling, and interaction patterns for the chip grid

### Codebase Entry Points
- `src/main/db/schema.ts` — Current skills table schema (tags as JSON array)
- `src/main/handlers/skills.ts` — Current skill CRUD IPC handlers
- `src/renderer/src/components/SkillList.tsx` — Current skills UI (to be replaced)
- `src/renderer/src/components/SkillItem.tsx` — Current skill row item
- `src/renderer/src/components/SkillAddForm.tsx` — Current skill add form
- `src/renderer/src/components/TagInput.tsx` — Tag autocomplete (may be replaced/simplified)
- `src/renderer/src/components/templates/filterResumeData.ts` — Skills grouping for template rendering (currently uses tags[0])

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — Already installed in package.json. Ready for chip drag-and-drop.
- `ensureSchema()` pattern in `src/main/db/index.ts` — CREATE TABLE IF NOT EXISTS + ALTER TABLE for migrations.
- Design system tokens in `tokens.css` — Colors, spacing, typography matching the mockup.

### Established Patterns
- Skills CRUD: `skills:list`, `skills:create`, `skills:update`, `skills:delete` IPC handlers follow standard pattern.
- Variant builder skills: `VariantBuilder.tsx` groups skills by first tag with checkbox toggles. Must be updated to use categoryId.
- Template rendering: `filterResumeData.ts` groups skills by `tags[0]`. Must be updated to use category name.

### Integration Points
- `src/renderer/src/components/ExperienceTab.tsx` — Hosts SkillList component (line 183-184). Will host new SkillChipGrid.
- `src/main/handlers/templates.ts` — `getBuilderData` returns skills with tags. Must include category info.
- `src/renderer/src/components/VariantBuilder.tsx` — Skills section groups by tag. Must use categories.
- `src/renderer/src/components/templates/filterResumeData.ts` — Groups skills by `tags[0]`. Must use category name from joined data.

</code_context>

<specifics>
## Specific Ideas

- User provided an HTML mockup at `C:/Users/Mark/Downloads/skills_management_revised.html` defining the exact visual design: dark surface cards, uppercase category headers, chip styling with × buttons, + Add chip, + Add category button, drop zone for new category creation.
- Mockup uses exact design system tokens (--bg-base, --bg-surface, --bg-raised, --text-primary, etc.) matching the existing app theme.

</specifics>

<deferred>
## Deferred Ideas

- Category drag-to-reorder — deferred to a future phase or enhancement. The `sortOrder` column exists on `skill_categories` table but category blocks are not draggable in this phase.

</deferred>

---

*Phase: 20-skills-chip-grid*
*Context gathered: 2026-03-27*
