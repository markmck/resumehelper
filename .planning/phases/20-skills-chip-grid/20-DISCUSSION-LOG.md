# Phase 20: Skills Chip Grid - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 20-skills-chip-grid
**Areas discussed:** Category data model, Chip grid layout, Drag-and-drop behavior, Migration strategy

---

## Category Data Model

### Storage approach (initial)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep tags, first tag = category | No schema change, tags[0] is category | |
| Add explicit category column | New column on skills table | |
| Separate categories table | New skill_categories table | |

**User's choice:** Initially selected "Keep tags" but then reconsidered when asked about category ordering.

### Category ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Alphabetical | No ordering column needed | |
| By first skill's sortOrder | Requires sortOrder on skills | |
| Stored category order in settings | JSON settings for order | |

**User's choice:** "Maybe we do need a new table, I would like the skill categories to be able to reorganize"

### Revised storage approach

| Option | Description | Selected |
|--------|-------------|----------|
| Separate skill_categories table | id, name, sortOrder with FK on skills | :heavy_check_mark: |
| JSON category order in config | Keep tags, store order separately | |

**User's choice:** Separate skill_categories table

### Single vs multi-category

| Option | Description | Selected |
|--------|-------------|----------|
| Single category only | One category per skill via categoryId | :heavy_check_mark: |
| Category + keep tags | One category plus optional tags | |

**User's choice:** Single category only

---

## Chip Grid Layout

User provided HTML mockup: `C:/Users/Mark/Downloads/skills_management_revised.html`

The mockup defines:
- Vertical stacked category blocks (dark surface cards)
- Inline-editable uppercase category names with Rename/Delete buttons
- Chip grid with wrap layout, chips have × delete button
- "+" Add" chip at end of each category
- Drop zone for new category creation
- "+" Add category" button at bottom
- Hint text explaining drag behavior

No further questions needed — mockup is the design spec.

---

## Drag-and-Drop Behavior

### What is draggable

| Option | Description | Selected |
|--------|-------------|----------|
| Both skills and categories | Skills between categories, categories to reorder | |
| Skills only | Only skills draggable, categories fixed order | :heavy_check_mark: |

**User's choice:** Skills only, categories fixed

---

## Migration Strategy

### Multi-tag handling

| Option | Description | Selected |
|--------|-------------|----------|
| First tag becomes category, rest discarded | Matches existing template grouping | :heavy_check_mark: |
| Duplicate skill for each tag | Creates copies in multiple categories | |
| Prompt user to choose | Migration UI for multi-tagged skills | |

**User's choice:** First tag becomes category, rest discarded

---

## Claude's Discretion

- Whether to remove tags column or leave vestigial
- Exact chip padding/spacing
- Add skill flow (inline input or modal)
- Uncategorized skills display
- Category deletion behavior for contained skills

## Deferred Ideas

- Category drag-to-reorder (sortOrder column exists but not wired to DnD)
