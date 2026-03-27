# Phase 20: Skills Chip Grid - Research

**Researched:** 2026-03-27
**Domain:** @dnd-kit drag-and-drop, SQLite schema migration, React chip grid UI
**Confidence:** HIGH

## Summary

Phase 20 replaces the existing flat `SkillList` component (tag-grouped rows) with a card-based chip grid where skills are grouped by first-class `skill_categories` entities. The data model shift is a two-step migration: (1) schema additions (new `skill_categories` table + `category_id` FK on `skills`), and (2) data migration populating those columns from the existing `tags` JSON array. The UI component is a new `SkillChipGrid` replacing `SkillList` in `ExperienceTab.tsx`.

Drag-and-drop is already solved: `@dnd-kit/core` (6.3.1), `@dnd-kit/sortable` (10.0.0), and `@dnd-kit/utilities` (3.2.2) are installed and used in `BulletList.tsx` and `JobList.tsx`. The chip-between-categories use case requires `DndContext` with multiple droppable containers — a different pattern from the sortable-list pattern already in the codebase. The project pattern uses `PointerSensor` + `closestCenter` collision detection; the cross-container variant uses `useDroppable` per category zone.

Four integration surfaces must be updated after the schema migration: (1) `skills:list` IPC handler (return `categoryId` + `categoryName`), (2) `templates:getBuilderData` (include category info in `BuilderSkill`), (3) `filterResumeData.ts` (replace `tags[0]` grouping with `categoryName`), and (4) `VariantBuilder.tsx` (replace `tags[0]` grouping with `categoryName`).

**Primary recommendation:** Implement in four focused plans: DB+migration, IPC+types, UI chip grid, downstream integration updates.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New `skill_categories` table with columns: id (PK), name (text), sortOrder (integer). Categories are first-class entities.
- **D-02:** Skills get a `categoryId` FK (nullable) referencing `skill_categories.id`. Null = uncategorized.
- **D-03:** Single category per skill. The `tags` column becomes vestigial after migration (can be removed or left as-is).
- **D-04:** Category ordering uses `sortOrder` column. Categories are NOT draggable to reorder in this phase.
- **D-05:** Vertical stacked category blocks. Each category is a card with: visual drag handle (non-functional), inline-editable name input (uppercase, 11px), Rename/Delete action buttons, chip grid with wrap layout inside.
- **D-06:** Skills render as chips: inline-flex, 13px font, raised background, × delete button, grab cursor for drag.
- **D-07:** "+ Add" chip at the end of each category's grid for adding a skill to that category.
- **D-08:** "+ Add category" button at the bottom of all category blocks.
- **D-09:** Drop zone at bottom (dashed purple border) for creating a new category by dropping a skill into it.
- **D-10:** Hint text below: "Drag skills between categories to reorganize."
- **D-11:** Skills can be dragged between categories using @dnd-kit. Dropping a skill in another category updates its categoryId.
- **D-12:** Categories are NOT draggable for reordering in this phase. The drag handle is visual but non-functional.
- **D-13:** Visual feedback during drag: chip gets `opacity: 0.5` and purple border. Drop target category gets a subtle highlight.
- **D-14:** Migration runs in `ensureSchema()`: create `skill_categories` table, add `categoryId` column to skills, populate categories from unique first tags, set categoryId on each skill from its first tag. All in a transaction.
- **D-15:** First tag becomes the category, remaining tags are discarded.
- **D-16:** Skills with no tags get categoryId = null (uncategorized). An "Uncategorized" group appears at the bottom of the grid.

### Claude's Discretion
- Whether to remove the `tags` column entirely or leave it as vestigial
- Exact chip padding/spacing values (follow mockup closely)
- How the "Add skill" flow works (inline input chip or modal)
- Whether uncategorized skills show in a special "Uncategorized" block or as loose chips at the bottom
- How category deletion handles skills in that category (move to uncategorized vs prompt)

### Deferred Ideas (OUT OF SCOPE)
- Category drag-to-reorder — deferred to a future phase. The `sortOrder` column exists but category blocks are not draggable in this phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VARNT-02 | Skills displayed as chip grid with drag-and-drop between categories | @dnd-kit cross-container DnD pattern; new SkillChipGrid component; category data model |
| VARNT-03 | User can rename skill categories inline | Inline `<input>` on category name with blur/enter commit; `skills:categories:update` IPC handler |
| VARNT-04 | User can add new skill categories and drag skills into them | "Add category" button + IPC create; drop zone on new category creates it on drop; D-09 |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DnD context, sensors, collision detection | Already installed; used in BulletList, JobList |
| @dnd-kit/sortable | 10.0.0 | SortableContext, arrayMove utilities | Already installed |
| @dnd-kit/utilities | 3.2.2 | CSS.Transform helper | Already installed |
| better-sqlite3 | (existing) | Synchronous SQLite for migration transaction | Project standard |
| Drizzle ORM | (existing) | Type-safe queries | Project standard |

### No New Installs Required
All DnD libraries are already in `package.json`. No new dependencies are needed for this phase.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main/
│   ├── db/
│   │   ├── schema.ts              # ADD: skillCategories table definition
│   │   └── index.ts               # ADD: ensureSchema additions + migration ALTER statements
│   └── handlers/
│       ├── skills.ts              # REPLACE: add category-aware handlers
│       └── skillCategories.ts     # NEW: CRUD handlers for skill_categories
├── renderer/src/components/
│   ├── SkillChipGrid.tsx          # NEW: replaces SkillList
│   ├── SkillList.tsx              # KEEP (unchanged, for reference/remove later)
│   └── ExperienceTab.tsx          # UPDATE: swap SkillList -> SkillChipGrid
├── preload/
│   ├── index.ts                   # ADD: skills.categories.* bridge methods
│   └── index.d.ts                 # ADD: SkillCategory interface, updated Skill/BuilderSkill
└── shared/                        # (no changes needed)
```

### Pattern 1: Cross-Container @dnd-kit (skills between categories)

The existing codebase uses `SortableContext` for within-list reordering (bullets, jobs). Cross-container drop requires a different approach: `useDroppable` per category container, with `DndContext` at the top level tracking which container is active.

**What:** Each category card registers as a droppable. Dragged skill chip uses `useDraggable`. On `onDragEnd`, compare `active.data.current.categoryId` vs `over.id` to determine if a category change occurred.

**When to use:** Skills dragged from one category block and dropped on another category block (or the "new category" drop zone).

**Example pattern (based on @dnd-kit docs):**
```typescript
// Source: @dnd-kit/core documentation
import { DndContext, DragEndEvent, useDroppable, useDraggable } from '@dnd-kit/core'

// In SkillChipGrid (parent):
function SkillChipGrid() {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const skillId = active.id as number
    const targetCategoryId = over.id === 'uncategorized' ? null : (over.id as number)
    const sourceCategoryId = active.data.current?.categoryId ?? null
    if (targetCategoryId !== sourceCategoryId) {
      // call IPC: skills:update(skillId, { categoryId: targetCategoryId })
    }
  }
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {categories.map(cat => <CategoryBlock key={cat.id} category={cat} skills={...} />)}
      <DropZoneNewCategory />
    </DndContext>
  )
}

// In CategoryBlock:
function CategoryBlock({ category, skills }) {
  const { setNodeRef, isOver } = useDroppable({ id: category.id })
  return (
    <div ref={setNodeRef} style={{ background: isOver ? 'rgba(139,92,246,0.06)' : undefined }}>
      {skills.map(s => <SkillChip key={s.id} skill={s} categoryId={category.id} />)}
    </div>
  )
}

// In SkillChip:
function SkillChip({ skill, categoryId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: skill.id,
    data: { categoryId }
  })
  return (
    <span ref={setNodeRef} {...listeners} {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1, borderColor: isDragging ? 'var(--purple)' : 'transparent' }}>
      {skill.name}
    </span>
  )
}
```

### Pattern 2: ensureSchema Migration (existing project pattern)

Following the pattern from `src/main/db/index.ts`:

```typescript
// In ensureSchema() — add to the CREATE TABLE IF NOT EXISTS block:
CREATE TABLE IF NOT EXISTS \`skill_categories\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`name\` text NOT NULL,
  \`sort_order\` integer NOT NULL DEFAULT 0
);

// In alterStatements array — idempotent ALTER TABLEs:
'ALTER TABLE `skills` ADD COLUMN `category_id` integer REFERENCES `skill_categories`(`id`) ON DELETE set null',

// Data migration — runs ONCE, idempotent via INSERT OR IGNORE + UPDATE WHERE NULL:
const migrateTags = sqlite.transaction(() => {
  // 1. Collect unique first-tags from skills that have tags
  const rows = sqlite.prepare("SELECT DISTINCT json_extract(tags, '$[0]') as tag FROM skills WHERE tags != '[]' AND tags IS NOT NULL").all()
  // 2. Insert categories for each unique tag (INSERT OR IGNORE on name for idempotency)
  // (Note: skill_categories has no UNIQUE on name — use SELECT first to avoid duplicates)
  for (const row of rows) {
    if (!row.tag) continue
    const existing = sqlite.prepare("SELECT id FROM skill_categories WHERE name = ?").get(row.tag)
    if (!existing) {
      sqlite.prepare("INSERT INTO skill_categories (name, sort_order) VALUES (?, 0)").run(row.tag)
    }
  }
  // 3. Set category_id on each skill from its first tag
  sqlite.exec(`
    UPDATE skills
    SET category_id = (
      SELECT sc.id FROM skill_categories sc
      WHERE sc.name = json_extract(skills.tags, '$[0]')
    )
    WHERE category_id IS NULL AND tags != '[]'
  `)
})
migrateTags()
```

**Critical:** The migration must only run if `category_id` is null (idempotent guard). The `ALTER TABLE` is already guarded by the try/catch pattern.

### Pattern 3: Inline Category Rename

```typescript
// Follow existing project pattern — uncontrolled input, commit on blur/Enter:
function CategoryHeader({ category, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(category.name)
  const commit = () => {
    if (draft.trim() && draft.trim() !== category.name) {
      onRename(category.id, draft.trim())
    }
    setEditing(false)
  }
  return editing
    ? <input
        className="category-name-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        autoFocus
      />
    : <span className="category-name" onClick={() => setEditing(true)}>{category.name.toUpperCase()}</span>
}
```

### Pattern 4: New IPC Channels for Categories

Following project IPC naming convention (`domain:action`):

```typescript
// skillCategories.ts handler registrations:
ipcMain.handle('skills:categories:list', async () => { ... })
ipcMain.handle('skills:categories:create', async (_, data: { name: string }) => { ... })
ipcMain.handle('skills:categories:update', async (_, id: number, data: { name?: string; sortOrder?: number }) => { ... })
ipcMain.handle('skills:categories:delete', async (_, id: number) => { ... })

// skills:update extended to accept categoryId:
// existing: async (_, id: number, data: { name?: string; tags?: string[] })
// new:      async (_, id: number, data: { name?: string; tags?: string[]; categoryId?: number | null })
```

### Pattern 5: Updated Type Declarations (index.d.ts)

Following project pattern of duplicating runtime types in `index.d.ts`:

```typescript
// Add to preload/index.d.ts:
export interface SkillCategory {
  id: number
  name: string
  sortOrder: number
}

// Update Skill interface:
export interface Skill {
  id: number
  name: string
  tags: string[]      // vestigial — kept for backward compat
  categoryId: number | null
  categoryName: string | null
}

// Update BuilderSkill:
export interface BuilderSkill {
  id: number
  name: string
  tags: string[]      // vestigial
  categoryId: number | null
  categoryName: string | null
  excluded: boolean
}
```

### Anti-Patterns to Avoid
- **Using SortableContext for cross-container drop:** `SortableContext` is for reordering within one container. Cross-container drop requires `useDroppable` + `useDraggable` directly.
- **Mutating state before IPC confirms:** Pattern in codebase (see `handleSkillToggle`) is optimistic local state update then IPC. Follow this pattern — update `categoryId` locally in the skills array, then call IPC.
- **Non-idempotent migration:** Always guard migration with `WHERE category_id IS NULL` so re-runs on already-migrated data are no-ops.
- **Drizzle schema for migration:** The `schema.ts` Drizzle definitions are used at build time. The runtime `ensureSchema()` raw SQL is authoritative for the migration — keep them in sync.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag state management | Custom mousedown/mousemove listeners | @dnd-kit useDraggable/useDroppable | Electron pointer events, accessibility, touch support |
| Collision detection | Geometric intersection math | closestCenter or closestCorners from @dnd-kit/core | Edge cases with overlapping zones |
| Drag overlay | CSS transform on original element | DragOverlay component from @dnd-kit | Prevents layout shifts during drag |
| SQLite migration | Drizzle push/generate | ensureSchema() raw SQL pattern | Project uses this everywhere; Drizzle migrations unreliable on existing DBs |

**Key insight:** The codebase already has a working @dnd-kit integration in `BulletList.tsx`. The chip grid DnD is structurally different (cross-container) but uses the same primitives.

## Runtime State Inventory

> Included because this phase involves a data migration (schema change + data transformation).

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | SQLite `skills` table: `tags` column is JSON array, `category_id` column does not yet exist | Data migration: populate `skill_categories` from unique `tags[0]` values, set `category_id` on each skill row |
| Live service config | None — desktop Electron app, no external services | None |
| OS-registered state | None | None |
| Secrets/env vars | None relevant to this change | None |
| Build artifacts | `schema.ts` Drizzle definitions must be updated alongside `ensureSchema()` raw SQL — they diverge if one is updated without the other | Code edit: update both `schema.ts` and `ensureSchema()` in the same plan |

**Critical migration note:** The existing `tags` column is retained as vestigial (D-03 is discretionary). `filterResumeData.ts` and `VariantBuilder.tsx` both currently use `tags[0]` for skill grouping — these must be updated to use `categoryName` after migration, or templates will break silently.

## Common Pitfalls

### Pitfall 1: DragOverlay Missing — Ghosted Original Chip Stays Visible
**What goes wrong:** Without `DragOverlay`, the chip in its original position becomes invisible or distorted during drag while a floating copy renders.
**Why it happens:** @dnd-kit applies CSS transforms to the original element. In a flex-wrap grid this causes layout jumps.
**How to avoid:** Wrap `DndContext` children and add a `DragOverlay` that renders a clone of the chip while dragging.
**Warning signs:** Chips jump or leave empty gaps in the grid during drag.

### Pitfall 2: `useDroppable` id Collision with Skill ids
**What goes wrong:** Category ids (integers) and skill ids (integers) are used as DnD ids. If a skill id equals a category id, `over.id` is ambiguous.
**Why it happens:** @dnd-kit uses a flat id namespace.
**How to avoid:** Prefix droppable category ids: `category-${cat.id}` as string. Parse in `onDragEnd`. Keep draggable skill ids as plain integers.
**Warning signs:** Drop randomly assigns skill to wrong category.

### Pitfall 3: Migration Runs Multiple Times
**What goes wrong:** On every app startup `ensureSchema()` is called. If migration logic is not idempotent, it creates duplicate categories or resets category assignments.
**Why it happens:** `ensureSchema()` has no "already ran" flag — it relies on `IF NOT EXISTS` and `INSERT OR IGNORE`.
**How to avoid:** Guard migration with `WHERE category_id IS NULL` (only process skills not yet migrated). Use SELECT-first to avoid duplicate category creation.
**Warning signs:** Running app twice produces doubled category entries.

### Pitfall 4: schema.ts and ensureSchema() Drift
**What goes wrong:** `schema.ts` exports the Drizzle table definition. `ensureSchema()` has raw SQL. If `skillCategories` is added to `schema.ts` but not `ensureSchema()`, Drizzle queries fail at runtime because the table doesn't exist on existing DBs.
**Why it happens:** Drizzle migrations are unreliable on existing app DBs (per project precedent — `ensureSchema()` is the authoritative migration path).
**How to avoid:** Always update both files in the same plan. The raw SQL in `ensureSchema()` is what actually creates the table; `schema.ts` is for TypeScript types and Drizzle query building.

### Pitfall 5: filterResumeData.ts Uses tags[0] — Silent Template Break
**What goes wrong:** After migration, skills have `categoryName` but `tags` array may be `[]` or stale. `filterResumeData.ts` groups by `tags[0]` — after migration, ungrouped skills all fall into "Other" group.
**Why it happens:** `filterResumeData.ts` was written before the category model existed.
**How to avoid:** Update `filterResumeData.ts` to use `categoryName ?? 'Other'` in the same phase as the migration, not as an afterthought.
**Warning signs:** Resume preview shows all skills under "Other" after the feature ships.

### Pitfall 6: VariantBuilder skillGroups Uses tags[0]
**What goes wrong:** `VariantBuilder.tsx` line 203-208 builds `skillGroups` using `tags[0]`. After migration, this breaks the variant builder skills section grouping.
**Why it happens:** Same root cause as filterResumeData — pre-category code.
**How to avoid:** Update `VariantBuilder.tsx` in the same wave as filterResumeData.

### Pitfall 7: BuilderSkill Interface Change Breaks getBuilderData
**What goes wrong:** `getBuilderData` in `templates.ts` constructs `skillsWithExcluded` with only `{ id, name, tags, excluded }`. After adding `categoryId`/`categoryName` fields to `BuilderSkill`, the handler must JOIN against `skill_categories` to populate them.
**Why it happens:** The handler does `db.select().from(skills)` — no join. Existing `BuilderSkill` type will diverge from what the handler returns.
**How to avoid:** Update `getBuilderData` to LEFT JOIN `skill_categories` on `skills.categoryId` and include `categoryId` and `categoryName` in the returned skill objects.

## Code Examples

Verified from codebase:

### Existing @dnd-kit Sensor Setup (from BulletList.tsx)
```typescript
// Source: src/renderer/src/components/BulletList.tsx
import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
)
```

### ensureSchema ALTER TABLE Pattern (from src/main/db/index.ts)
```typescript
// Source: src/main/db/index.ts lines 229-255
const alterStatements = [
  'ALTER TABLE `skills` ADD COLUMN `category_id` integer REFERENCES `skill_categories`(`id`) ON DELETE set null',
  // ... other alters
]
for (const sql of alterStatements) {
  try { sqlite.exec(sql) } catch { /* column already exists */ }
}
```

### Optimistic State Update Pattern (from VariantBuilder.tsx / handlers)
```typescript
// Source: src/renderer/src/components/VariantBuilder.tsx line 105-113
const handleSkillToggle = async (skill: BuilderSkill): Promise<void> => {
  const newExcluded = !skill.excluded
  setBuilderData((prev) => {
    if (!prev) return prev
    return { ...prev, skills: prev.skills.map((s) => s.id === skill.id ? { ...s, excluded: newExcluded } : s) }
  })
  await window.api.templates.setItemExcluded(variantId, 'skill', skill.id, newExcluded)
}
```

### Mockup CSS Classes (from skills_management_revised.html)
```css
/* Source: C:/Users/Mark/Downloads/skills_management_revised.html */
.category-block { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:8px; padding:16px; margin-bottom:12px; }
.chip { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:4px; font-size:13px; background:var(--bg-raised); color:var(--text-secondary); cursor:grab; border:1px solid transparent; }
.chip.dragging { opacity:0.5; border-color:var(--purple); }
.chip-grid { display:flex; flex-wrap:wrap; gap:6px; min-height:32px; padding:4px; border-radius:6px; }
.chip-grid.drop-target { background:rgba(139,92,246,0.06); border:1px dashed rgba(139,92,246,0.3); }
.add-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:4px; font-size:12px; color:var(--text-muted); cursor:pointer; border:1px dashed var(--border-default); background:transparent; }
.add-category { display:flex; align-items:center; justify-content:center; gap:6px; padding:12px; border:1px dashed var(--border-default); border-radius:8px; color:var(--text-muted); font-size:13px; cursor:pointer; }
/* Drop zone new category block: */
/* border-style:dashed; border-color:rgba(139,92,246,0.2); background:rgba(139,92,246,0.03) */
```

### Token Mapping (project tokens.css vs mockup CSS vars)
The mockup uses its own CSS variable names (`--bg-surface`, `--bg-raised`, `--purple`, etc.). The project uses `var(--color-*)` tokens from `tokens.css`. The component must use project tokens:

| Mockup Var | Project Token |
|------------|---------------|
| `--bg-surface` | `var(--color-surface)` or inline `#141416` |
| `--bg-raised` | `var(--color-raised)` or inline `#1c1c1f` |
| `--text-secondary` | `var(--color-text-secondary)` |
| `--text-tertiary` | `var(--color-text-tertiary)` |
| `--text-muted` | `var(--color-text-muted)` |
| `--border-subtle` | `var(--color-border-subtle)` |
| `--purple` | `#8b5cf6` (used directly in codebase, e.g., `accentColor: '#8b5cf6'`) |

Verify exact token names against `tokens.css` during implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — project has no test config files or test directories |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VARNT-02 | Skills display as chip grid grouped by category | manual | N/A | N/A |
| VARNT-02 | Dragging skill to another category updates categoryId | manual | N/A | N/A |
| VARNT-03 | Category name renamed inline on click | manual | N/A | N/A |
| VARNT-04 | "Add category" creates new category | manual | N/A | N/A |
| VARNT-04 | Dropping skill on "new category" drop zone creates category | manual | N/A | N/A |

### Wave 0 Gaps
None — no test framework exists in the project. All validation is manual (Electron app smoke test).

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is code and SQLite schema changes only)

## Open Questions

1. **Token Names in tokens.css**
   - What we know: Mockup uses `--bg-surface`, `--bg-raised`, etc. Project uses `var(--color-*)` pattern.
   - What's unclear: Exact mapping — are the names `--color-surface` or `--color-bg-surface`?
   - Recommendation: Read `tokens.css` (or `src/renderer/src/assets/tokens.css`) at implementation time and use the exact project token names. Fallback: use inline hex values from mockup (acceptable given existing codebase precedent of inline hex values like `accentColor: '#8b5cf6'`).

2. **Category Delete Behavior for Skills**
   - What we know: D-03 says skills with `categoryId = null` go to "Uncategorized". CONTEXT marks this as Claude's Discretion.
   - What's unclear: Should deleting a category set its skills to `categoryId = null` (ON DELETE SET NULL — already declared in FK) or prompt user?
   - Recommendation: Use `ON DELETE SET NULL` on the FK (already planned in D-02). No user prompt needed — skills simply become uncategorized. Clean and consistent.

3. **"Add skill" Flow Inside a Category**
   - What we know: Mockup shows "+ Add" chip inside each category grid. D-07 locked. CONTEXT marks the flow as Claude's Discretion.
   - What's unclear: Inline input chip vs global "Add skill" header button flow.
   - Recommendation: Inline input chip within the category that transforms into a text input on click. On Enter: call `skills:create` with that categoryId. On Escape: revert to "+ Add" chip. This matches the mockup most closely and avoids a modal.

## Sources

### Primary (HIGH confidence)
- Codebase direct reads: `src/main/db/index.ts`, `src/main/handlers/skills.ts`, `src/main/handlers/templates.ts`, `src/renderer/src/components/BulletList.tsx`, `src/renderer/src/components/VariantBuilder.tsx`, `src/renderer/src/components/filterResumeData.ts`, `src/preload/index.ts`, `src/preload/index.d.ts`, `src/main/db/schema.ts`
- HTML mockup: `C:/Users/Mark/Downloads/skills_management_revised.html`
- CONTEXT.md decisions D-01 through D-16

### Secondary (MEDIUM confidence)
- @dnd-kit cross-container pattern: documented in @dnd-kit official docs. `useDroppable` + `useDraggable` for cross-container is the canonical approach.

### Tertiary (LOW confidence)
- None — all findings are from codebase or official libraries already in use.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @dnd-kit already installed and used in project
- Architecture: HIGH — directly derived from existing code patterns
- Pitfalls: HIGH — identified from direct codebase analysis of integration surfaces
- Migration: HIGH — follows established ensureSchema() pattern

**Research date:** 2026-03-27
**Valid until:** 2026-06-01 (stable codebase, no fast-moving dependencies)
