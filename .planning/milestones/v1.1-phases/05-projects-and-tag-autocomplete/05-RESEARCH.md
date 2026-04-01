# Phase 5: Projects and Tag Autocomplete - Research

**Researched:** 2026-03-14
**Domain:** Electron + React + better-sqlite3/drizzle-orm — extending an established CRUD + DnD pattern
**Confidence:** HIGH (no external dependencies needed; all patterns already exist in codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Projects mirror the jobs/jobBullets pattern exactly: `projects` table + `projectBullets` table
- Each project has: name, bullet points (toggleable, orderable like job bullets)
- Projects section appears below Skills on the Experience tab
- Same UX patterns: inline add form, click-to-edit, immediate delete, drag-to-reorder bullets
- Enter on bullet saves and creates new bullet (auto-focus), empty bullets delete on blur
- Bullet points are individual DB records with sortOrder
- Tag autocomplete: extend existing TagInput component with a suggestions dropdown
- Suggestions sourced from all existing tags across all skills (deduplicated, client-side)
- Dropdown appears below the input as user types, filtered by typed text
- Arrow keys to navigate suggestions, Enter to select, continue typing to create new
- Portal rendering for dropdown (avoids clipping/overflow issues)
- onMouseDown preventDefault on suggestion items (prevents blur-before-click race)
- `templateVariantItems` needs `projectId` and `projectBulletId` nullable FK columns (for Phase 6)

### Claude's Discretion
- Project fields beyond name + bullets (keep simple for v1.1)
- Exact autocomplete dropdown styling
- Fuzzy vs prefix matching for tag suggestions
- Whether to show "Create new tag: X" option in dropdown when no match

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-01 | User can add projects with name and toggleable bullet points | DB schema + IPC handler + UI component patterns fully established in jobs/bullets |
| PROJ-02 | User can edit and delete projects | InlineEdit + delete button pattern directly reusable from JobItem |
| TAG-01 | Tag input suggests existing tags as user types (autocomplete dropdown) | TagInput extension with portal rendering; existing skills data is the suggestion source |
</phase_requirements>

---

## Summary

This phase is a near-pure replication exercise for the projects section: the jobs/jobBullets pattern is fully established in `src/main/handlers/jobs.ts`, `src/main/handlers/bullets.ts`, and the corresponding UI components. The only schema novelty is adding `projects` and `projectBullets` tables to `ensureSchema()` in `src/main/db/index.ts`, plus two nullable FK columns on `templateVariantItems` (`project_id`, `project_bullet_id`) that Phase 6 will use.

The tag autocomplete is a contained extension of `TagInput.tsx`. The suggestions source is the existing skills data already fetched by `SkillList` — no new IPC channel is needed. The key implementation concern is the blur-before-click race condition (the dropdown closes before the click registers), which is solved by `onMouseDown preventDefault` on each suggestion item, a well-established React pattern.

The schema approach uses `CREATE TABLE IF NOT EXISTS` in `ensureSchema()` for new tables, and a new Drizzle migration SQL file for the ALTER TABLE additions to `templateVariantItems`. This mirrors the pattern already used for the `submissions` URL/notes columns in `drizzle/0001_breezy_the_leader.sql`.

**Primary recommendation:** Copy the jobs/bullets pattern verbatim for projects. Extend TagInput with a controlled dropdown, portal-rendered via `ReactDOM.createPortal`, positioned with `getBoundingClientRect`. Keep tag matching as prefix/substring filter (simple, fast, no library needed).

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 + drizzle-orm | existing | DB layer | Already used throughout |
| @dnd-kit/core + @dnd-kit/sortable | existing | Drag-to-reorder bullets | Already used in BulletList |
| react + react-dom | existing | UI + portal rendering | `ReactDOM.createPortal` for dropdown |
| electron ipcMain/ipcRenderer | existing | IPC bridge | All handlers use this pattern |

### No New Dependencies Required
All libraries needed for this phase are already installed. The autocomplete dropdown needs only `ReactDOM.createPortal` (part of react-dom), `useRef` for positioning, and `useState` for open/active index state.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure
New files to create (mirroring existing):
```
src/main/
├── db/schema.ts              # Add projects + projectBullets table definitions
├── db/index.ts               # Add CREATE TABLE IF NOT EXISTS for both tables
├── handlers/projects.ts      # registerProjectHandlers() — mirrors jobs.ts + bullets.ts
└── handlers/index.ts         # Add registerProjectHandlers() call

drizzle/
└── 0003_projects.sql         # ALTER TABLE template_variant_items ADD COLUMN project_id / project_bullet_id

src/renderer/src/components/
├── ProjectList.tsx            # Mirrors JobList.tsx
├── ProjectItem.tsx            # Mirrors JobItem.tsx (name only, no dates)
├── ProjectAddForm.tsx         # Simpler than JobAddForm (name field only)
└── TagInput.tsx               # Extend in-place with suggestions prop + dropdown

src/preload/
├── index.ts                  # Add projects namespace
└── index.d.ts                # Add Project, ProjectWithBullets, ProjectBullet types
```

### Pattern 1: Schema Extension (ensureSchema)
**What:** Add tables inline in `ensureSchema()` — no migration file needed for new tables
**When to use:** New tables on first install or upgrade; existing users get them automatically

```typescript
// src/main/db/index.ts — append inside sqlite.exec(` ... `)
CREATE TABLE IF NOT EXISTS \`projects\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`name\` text NOT NULL,
  \`sort_order\` integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS \`project_bullets\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`project_id\` integer NOT NULL,
  \`text\` text NOT NULL,
  \`sort_order\` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE cascade
);
```

### Pattern 2: ALTER TABLE via Drizzle Migration File
**What:** New nullable FK columns on `templateVariantItems` require ALTER TABLE — cannot be done with CREATE TABLE IF NOT EXISTS
**When to use:** Adding columns to existing tables on existing user databases

```sql
-- drizzle/0003_projects.sql
ALTER TABLE `template_variant_items` ADD `project_id` integer REFERENCES `projects`(`id`) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `template_variant_items` ADD `project_bullet_id` integer REFERENCES `project_bullets`(`id`) ON DELETE cascade;
```

The `migrate()` call in `ensureSchema()` already handles this. The try/catch wrapper means it won't fail if the migration was already applied.

### Pattern 3: IPC Handler (projects.ts)
**What:** Register IPC channels for projects CRUD + bullets CRUD under `projects:*` and `projectBullets:*` namespaces

```typescript
// src/main/handlers/projects.ts
import { ipcMain } from 'electron'
import { db } from '../db'
import { projects, projectBullets } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:list', async () => {
    const allProjects = await db.select().from(projects).orderBy(asc(projects.sortOrder))
    const result = await Promise.all(
      allProjects.map(async (project) => {
        const bullets = await db
          .select()
          .from(projectBullets)
          .where(eq(projectBullets.projectId, project.id))
          .orderBy(asc(projectBullets.sortOrder))
        return { ...project, bullets }
      }),
    )
    return result
  })

  ipcMain.handle('projects:create', async (_, data: { name: string }) => {
    const rows = await db.insert(projects).values({ name: data.name, sortOrder: 0 }).returning()
    return rows[0]
  })

  ipcMain.handle('projects:update', async (_, id: number, data: { name?: string }) => {
    const rows = await db.update(projects).set(data).where(eq(projects.id, id)).returning()
    return rows[0]
  })

  ipcMain.handle('projects:delete', async (_, id: number) => {
    await db.delete(projects).where(eq(projects.id, id))
  })

  ipcMain.handle('projectBullets:create', async (_, data: { projectId: number; text: string; sortOrder: number }) => {
    const rows = await db.insert(projectBullets).values(data).returning()
    return rows[0]
  })

  ipcMain.handle('projectBullets:update', async (_, id: number, data: { text?: string }) => {
    const rows = await db.update(projectBullets).set(data).where(eq(projectBullets.id, id)).returning()
    return rows[0]
  })

  ipcMain.handle('projectBullets:delete', async (_, id: number) => {
    await db.delete(projectBullets).where(eq(projectBullets.id, id))
  })

  ipcMain.handle('projectBullets:reorder', async (_, _projectId: number, orderedIds: number[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(projectBullets).set({ sortOrder: i }).where(eq(projectBullets.id, orderedIds[i]))
    }
  })
}
```

### Pattern 4: Preload Bridge Extension
**What:** Add `projects` and `projectBullets` namespaces to `window.api` — mirrors existing bullets/jobs pattern

```typescript
// src/preload/index.ts — add to api object
projects: {
  list: () => ipcRenderer.invoke('projects:list'),
  create: (data: { name: string }) => ipcRenderer.invoke('projects:create', data),
  update: (id: number, data: { name?: string }) => ipcRenderer.invoke('projects:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('projects:delete', id),
},
projectBullets: {
  create: (data: { projectId: number; text: string; sortOrder: number }) =>
    ipcRenderer.invoke('projectBullets:create', data),
  update: (id: number, data: { text?: string }) => ipcRenderer.invoke('projectBullets:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('projectBullets:delete', id),
  reorder: (projectId: number, orderedIds: number[]) =>
    ipcRenderer.invoke('projectBullets:reorder', projectId, orderedIds),
},
```

### Pattern 5: BulletList Reuse for Project Bullets
**What:** `BulletList` is tightly coupled to `jobId` and `window.api.bullets.*` — needs a projectBullets-aware variant
**Options:**
1. Create `ProjectBulletList.tsx` as a copy of `BulletList.tsx` that calls `window.api.projectBullets.*` — simplest, most explicit
2. Generalize `BulletList.tsx` with props for the API calls — more complex, premature abstraction

**Recommendation:** Option 1 (copy). The components are ~100 lines each. Premature generalization adds cognitive overhead. Phase 6 may need different bullet behavior for projects.

### Pattern 6: TagInput Autocomplete with Portal
**What:** Extend `TagInput` with `suggestions` prop and a portal-rendered dropdown

Key implementation points:
- Add `suggestions?: string[]` prop to TagInput
- Compute `filtered = suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s))`
- Track `activeIndex` (keyboard navigation) and `open` (dropdown visible) with useState
- On ArrowDown/ArrowUp in handleKeyDown: update activeIndex, prevent default
- On Enter: if activeIndex >= 0, call `addTag(filtered[activeIndex])` instead of `addTag(inputValue)`
- Use `onMouseDown={(e) => e.preventDefault()}` on each suggestion `<li>` — this is CRITICAL to prevent blur firing before click
- Render dropdown via `ReactDOM.createPortal(dropdownJSX, document.body)`
- Position dropdown: use `inputRef.current.getBoundingClientRect()` to get `top`, `left`, `width`

```typescript
// TagInput.tsx — key additions
import { createPortal } from 'react-dom'

// In props:
suggestions?: string[]

// In component body:
const [activeIndex, setActiveIndex] = useState(-1)
const [dropdownOpen, setDropdownOpen] = useState(false)
const containerRef = useRef<HTMLDivElement>(null)

const filtered = (suggestions ?? []).filter(
  (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
)
const showDropdown = dropdownOpen && filtered.length > 0 && inputValue.length > 0

// In handleKeyDown (before existing checks):
if (showDropdown && e.key === 'ArrowDown') {
  e.preventDefault()
  setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
  return
}
if (showDropdown && e.key === 'ArrowUp') {
  e.preventDefault()
  setActiveIndex((i) => Math.max(i - 1, -1))
  return
}
if (showDropdown && e.key === 'Enter' && activeIndex >= 0) {
  e.preventDefault()
  addTag(filtered[activeIndex])
  setActiveIndex(-1)
  return
}
if (e.key === 'Escape') {
  setDropdownOpen(false)
  setActiveIndex(-1)
  return
}

// In handleChange, also set dropdownOpen(true)

// Dropdown JSX via portal:
const rect = containerRef.current?.getBoundingClientRect()
const dropdown = showDropdown && rect ? createPortal(
  <ul style={{
    position: 'fixed',
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
    // ... styling
  }}>
    {filtered.map((s, i) => (
      <li
        key={s}
        onMouseDown={(e) => e.preventDefault()}  // CRITICAL
        onClick={() => { addTag(s); setActiveIndex(-1) }}
        style={{ background: i === activeIndex ? '#3f3f46' : '#27272a' }}
      >
        {s}
      </li>
    ))}
  </ul>,
  document.body
) : null
```

Where does `suggestions` come from in `SkillList`? Pass `allTags` down:
- `SkillList` already has `skills` state; compute `allTags = [...new Set(skills.flatMap(s => s.tags))]`
- Pass as prop to `SkillItem` → `SkillItem` passes to `TagInput`
- OR: lift allTags up to ExperienceTab and thread down — but SkillList already owns the data, so compute there

### Anti-Patterns to Avoid
- **Generalizing BulletList prematurely:** Don't add a generic `apiNamespace` prop to BulletList. Copy the component instead.
- **Global state for tag suggestions:** Tags are local to the Experience tab. Don't add a Redux/Zustand store. Pass as props.
- **Migration-only schema management for new tables:** New tables go in `ensureSchema()` CREATE TABLE IF NOT EXISTS, not in a migration file. Migration files are for ALTER TABLE only.
- **Synchronous IPC handlers using async drizzle with transactions:** better-sqlite3 is synchronous. If you ever need a transaction, use `sqlite.transaction()` (the raw client), not drizzle's async transaction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-to-reorder bullets | Custom mouse event tracking | @dnd-kit/sortable (already installed) | Already works in BulletList/BulletItem |
| Portal rendering | Manual DOM manipulation | `ReactDOM.createPortal` | Built into react-dom |
| Inline editing | Custom focus/blur management | `InlineEdit.tsx` (already exists) | Handles edit/save/escape/enter/blur |
| Dropdown positioning | CSS absolute/relative | `getBoundingClientRect()` + fixed position | Portal escapes all scroll/overflow parents |
| Schema migrations | Hand-crafted migration runner | Drizzle migrate + existing try/catch wrapper | Already handles idempotency |

---

## Common Pitfalls

### Pitfall 1: blur-before-click race condition in autocomplete
**What goes wrong:** User clicks a suggestion; the input's `onBlur` fires first, closing the dropdown and discarding the click
**Why it happens:** Browser fires blur before mousedown → click sequence completes
**How to avoid:** Add `onMouseDown={(e) => e.preventDefault()}` to every suggestion `<li>`. This prevents the input from losing focus during the mousedown, so the click event fires while the dropdown is still visible.
**Warning signs:** Suggestions disappear on click without adding the tag

### Pitfall 2: ALTER TABLE on existing v1.0 databases
**What goes wrong:** Drizzle migration for new columns runs against a database that already has the tables but not the columns; SQLite ALTER TABLE only supports `ADD COLUMN`, not conditional adds
**Why it happens:** SQLite has no `ADD COLUMN IF NOT EXISTS`
**How to avoid:** The try/catch around `migrate(db, ...)` in `ensureSchema()` already swallows errors if Drizzle's journal is confused. Test by running against a copy of a v1.0 `app.db` (not just a fresh install). The migration should be idempotent — if the column already exists, SQLite will error and the try/catch catches it.
**Warning signs:** App crashes on startup for existing users; fresh installs work fine

### Pitfall 3: BulletList reuse coupling
**What goes wrong:** Passing `projectId` to the existing `BulletList` requires changing its props and all `window.api.bullets.*` calls inside it, risking regression for job bullets
**Why it happens:** BulletList.tsx hardcodes `window.api.bullets.*`
**How to avoid:** Create `ProjectBulletList.tsx` as an explicit copy. Do not modify `BulletList.tsx`.

### Pitfall 4: Portal dropdown z-index / stacking context
**What goes wrong:** Dropdown appears behind other elements despite high z-index
**Why it happens:** A parent element has a CSS transform or `isolation: isolate`, creating a new stacking context
**How to avoid:** Use `position: fixed` (not `absolute`) on the portal dropdown with `zIndex: 9999`. Inline styles (not Tailwind) to avoid Tailwind v4 reliability issues. Test by opening dropdown while scroll position is non-zero.

### Pitfall 5: Drizzle schema.ts vs ensureSchema() divergence
**What goes wrong:** Adding tables to schema.ts for drizzle-orm type inference but forgetting to add them to ensureSchema(), or vice versa
**Why it happens:** Two places define the schema
**How to avoid:** Always update both in the same task. The pattern: schema.ts for TypeScript types and drizzle query builder, db/index.ts for the actual `CREATE TABLE IF NOT EXISTS` DDL.

### Pitfall 6: ExperienceTab Skills section closing tag
**What goes wrong:** Adding Projects section below Skills requires modifying `ExperienceTab.tsx` — the Skills `<section>` currently has no `style={{ marginBottom }}` since it's last
**Why it happens:** Last section in the layout doesn't need bottom margin
**How to avoid:** Add `style={{ marginBottom: '48px' }}` to the Skills section when adding Projects below it (matches existing section spacing).

---

## Code Examples

### Drizzle schema additions (schema.ts)
```typescript
// Source: mirrors existing jobBullets pattern in src/main/db/schema.ts
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const projectBullets = sqliteTable('project_bullets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})
```

Updated `templateVariantItems` in schema.ts (add two nullable FK columns):
```typescript
export const templateVariantItems = sqliteTable('template_variant_items', {
  // ... existing columns ...
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  projectBulletId: integer('project_bullet_id').references(() => projectBullets.id, { onDelete: 'cascade' }),
})
```

### ProjectItem (name only, simpler than JobItem)
```typescript
// Mirrors src/renderer/src/components/JobItem.tsx
// Key difference: no date fields, only `name` via InlineEdit
function ProjectItem({ project, onUpdate, onDelete }): React.JSX.Element {
  const handleNameUpdate = async (name: string): Promise<void> => {
    const updated = await window.api.projects.update(project.id, { name })
    onUpdate({ ...project, ...updated })
  }
  const handleDelete = async (): Promise<void> => {
    await window.api.projects.delete(project.id)
    onDelete(project.id)
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3.5 group/project">
      <div className="flex items-start justify-between gap-3">
        <InlineEdit
          value={project.name}
          onSave={handleNameUpdate}
          placeholder="Project name"
          className="text-base font-semibold text-zinc-100"
        />
        <button onClick={handleDelete} className="... opacity-0 group-hover/project:opacity-100">×</button>
      </div>
      <ProjectBulletList projectId={project.id} initialBullets={project.bullets} />
    </div>
  )
}
```

### ProjectAddForm (simpler than JobAddForm — name only)
```typescript
// Single text input, no dates
function ProjectAddForm({ onSave, onCancel }): React.JSX.Element {
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim() })
  }
  // ... form JSX
}
```

### ExperienceTab — adding Projects section
```typescript
// src/renderer/src/components/ExperienceTab.tsx
// Change Skills section to add marginBottom, add Projects after:
<section style={{ marginBottom: '48px' }}>  {/* was: no style */}
  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider" style={{ marginBottom: '16px' }}>Skills</h2>
  <SkillList />
</section>

<section>
  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider" style={{ marginBottom: '16px' }}>Projects</h2>
  <ProjectList />
</section>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| File-based migrations only | ensureSchema() + selective migrations | New tables are safe for fresh + existing installs |
| Generic portals with absolute positioning | Fixed positioning + getBoundingClientRect | Works regardless of scroll position |

**Deprecated/outdated in this codebase context:**
- Drizzle file migrations for new tables: don't use for Phase 5. Only use for ALTER TABLE.

---

## Open Questions

1. **Project sort order strategy**
   - What we know: `job_bullets` use integer `sort_order`; jobs are ordered by `startDate` desc
   - What's unclear: Should projects have a user-defined sort order (drag-to-reorder at the project level, not just bullets)?
   - Recommendation: Add `sort_order` column to `projects` table now (default 0) even if drag-to-reorder at project level isn't implemented in this phase. Cheaper to add now than via ALTER TABLE later. Render projects in insertion order (id asc) for v1.1.

2. **Tag suggestion source in ExperienceTab**
   - What we know: `SkillList` owns `skills` state; `allTags` must be passed to `TagInput` as suggestions
   - What's unclear: Should `allTags` be computed in `SkillList` (passed down to SkillItem → TagInput) or lifted to ExperienceTab?
   - Recommendation: Compute in `SkillList` and thread down to `SkillItem` then `TagInput`. SkillList already owns the data. No state lifting needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in project source — no test files in `src/`, no jest/vitest config |
| Config file | None — Wave 0 gap |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | Add project with name; add bullet to project | manual-only (Electron IPC) | — | ❌ |
| PROJ-02 | Edit project name; delete project; bullets cascade-delete | manual-only (Electron IPC) | — | ❌ |
| TAG-01 | Typing in TagInput shows filtered suggestions; arrow+Enter selects | manual-only (browser UI) | — | ❌ |

**Note:** All three requirements are UI/IPC behaviors in an Electron renderer. Unit testing the IPC handlers in isolation would require a test harness with a mock SQLite database. The project has no existing test infrastructure. For v1.1, manual smoke testing is the practical validation path.

Manual verification checklist (to be formalized in VERIFY):
- [ ] Projects section renders below Skills on Experience tab
- [ ] Add project — name field auto-focuses, Save creates record
- [ ] Click project name to edit inline; blur saves
- [ ] Delete project — bullets cascade-delete (verify via DB or absence in UI)
- [ ] Add bullet to project — Enter creates next bullet with focus
- [ ] Empty bullet on blur deletes
- [ ] Drag bullet within project — sort order persists on reload
- [ ] TagInput shows dropdown after typing 1+ characters when suggestions prop provided
- [ ] Arrow keys navigate suggestions; Enter selects
- [ ] Clicking suggestion adds tag (no blur race)
- [ ] Dropdown closes on Escape
- [ ] Tags already in the list are excluded from suggestions

### Wave 0 Gaps
- No test framework installed. For this phase, manual verification is sufficient.
- If automated tests are desired: `npm install --save-dev vitest @vitest/ui` + vitest config

*(If automated testing is added in a future phase, handler unit tests would need a test SQLite DB fixture.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/main/db/schema.ts` — table structure
- Direct code inspection: `src/main/db/index.ts` — ensureSchema() + migrate() pattern
- Direct code inspection: `src/main/handlers/jobs.ts`, `bullets.ts` — IPC handler patterns
- Direct code inspection: `src/renderer/src/components/BulletList.tsx`, `BulletItem.tsx`, `JobItem.tsx` — UI component patterns
- Direct code inspection: `src/renderer/src/components/TagInput.tsx` — component to extend
- Direct code inspection: `src/preload/index.ts`, `index.d.ts` — bridge pattern and type structure
- Direct code inspection: `drizzle/0001_breezy_the_leader.sql` — ALTER TABLE migration pattern
- React documentation (training data, HIGH): `ReactDOM.createPortal` API is stable since React 16

### Secondary (MEDIUM confidence)
- onMouseDown preventDefault pattern for dropdown: well-established React pattern documented in multiple authoritative sources; prevents blur-before-click; no library citation needed

### Tertiary (LOW confidence)
- None — all findings are from direct codebase inspection or stable React APIs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, patterns already working in codebase
- Architecture: HIGH — directly derived from existing code by inspection
- Pitfalls: HIGH — ALTER TABLE risk documented by project's own STATE.md; other pitfalls from direct code analysis

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (stable — no external dependencies changing)
