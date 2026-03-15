# Architecture Research

**Domain:** Resume management desktop application — v1.1 integration patterns
**Researched:** 2026-03-14
**Confidence:** HIGH (brownfield — all existing code inspected, integration points are concrete)

> **Scope:** This document supersedes the v1.0 architecture document for v1.1 planning purposes.
> It focuses on how four new features — projects CRUD, resume.json import, resume.json theme rendering,
> and tag autocomplete — integrate with the existing Electron + React + Drizzle ORM + SQLite architecture.

---

## Existing Architecture Snapshot (v1.0)

Before documenting integration points, the confirmed v1.0 shape:

```
RENDERER PROCESS
  App.tsx (tab switcher: experience | templates | submissions)
    ExperienceTab       → JobList, SkillList, ProfileSettings
    TemplatesTab        → VariantList, VariantEditor
      VariantEditor     → VariantBuilder (checkboxes), VariantPreview → ProfessionalLayout
    SubmissionsTab      → SubmissionAddForm, SnapshotViewer

  window.api (preload bridge — typed, contextBridge)
    jobs, bullets, skills, templates, submissions, profile, exportFile

IPC (ipcMain.handle / ipcRenderer.invoke)

MAIN PROCESS
  handlers/
    jobs.ts, bullets.ts, skills.ts, templates.ts,
    submissions.ts, profile.ts, export.ts
  db/
    schema.ts  — jobs, jobBullets, skills, templateVariants,
                 templateVariantItems, submissions, profile
    index.ts   — Drizzle singleton + ensureSchema() (CREATE TABLE IF NOT EXISTS)

PRINT FLOW (PDF export)
  export:pdf handler → hidden BrowserWindow → print.html → PrintApp.tsx
    → ProfessionalLayout → printToPDF()
```

Key characteristics confirmed in code:
- Schema additions use `ensureSchema()` (raw SQL `CREATE TABLE IF NOT EXISTS`) not file-based migrations
- Tags stored as `JSON.stringify(string[])` in `skills.tags` TEXT column
- `templateVariantItems` uses `itemType` + nullable foreign keys (`bulletId`, `skillId`, `jobId`)
- `BuilderData` type in `preload/index.d.ts` drives both VariantBuilder and ProfessionalLayout
- `ProfessionalLayout` accepts `jobs: BuilderJob[]` and `skills: BuilderSkill[]` — no projects yet
- PrintApp reads `variantId` from URL query string, fetches data via IPC, renders ProfessionalLayout

---

## Feature 1: Projects CRUD

### What Needs to Exist

Projects are structurally identical to jobs: a named item with a description date range and toggleable bullet points. The pattern is already proven by `jobs` + `jobBullets`.

### New vs Modified

| Layer | Change Type | What |
|-------|-------------|------|
| `schema.ts` | NEW tables | `projects`, `projectBullets` — mirror structure of `jobs`/`jobBullets` |
| `schema.ts` | MODIFIED | `templateVariantItems` — add nullable `projectId` FK column |
| `db/index.ts` | MODIFIED | Add `CREATE TABLE IF NOT EXISTS` SQL for both new tables; add `ALTER TABLE template_variant_items ADD COLUMN project_id INTEGER` via `ensureSchema()` |
| `handlers/projects.ts` | NEW | `projects:list`, `projects:create`, `projects:update`, `projects:delete` |
| `handlers/projectBullets.ts` | NEW | `projectBullets:create`, `projectBullets:update`, `projectBullets:delete`, `projectBullets:reorder` — identical API shape to `bullets.ts` |
| `handlers/index.ts` | MODIFIED | Register the two new handler files |
| `handlers/templates.ts` | MODIFIED | `templates:getBuilderData` — add project query and exclusion logic; `templates:setItemExcluded` — add `itemType === 'project'` branch |
| `handlers/export.ts` | MODIFIED | `getBuilderDataForVariant()` — add project fetching; DOCX builder — add Projects section |
| `preload/index.d.ts` | NEW types | `Project`, `ProjectWithBullets`, `BuilderProject`, `BuilderProjectBullet` |
| `preload/index.d.ts` | MODIFIED types | `BuilderData` — add `projects: BuilderProject[]`; `SubmissionSnapshot` — add `projects: BuilderProject[]` |
| `preload/index.ts` | NEW namespace | `window.api.projects`, `window.api.projectBullets` |
| `ExperienceTab.tsx` | MODIFIED | Add "Projects" section after Work History |
| NEW components | NEW | `ProjectList.tsx`, `ProjectItem.tsx`, `ProjectAddForm.tsx` — mirror `JobList/JobItem/JobAddForm` |
| `BulletList.tsx`, `BulletItem.tsx` | UNCHANGED | Already generic-enough for reuse IF refactored to accept `jobId`-agnostic props; otherwise copy pattern |
| `VariantBuilder.tsx` | MODIFIED | Add Projects section below Work History |
| `ProfessionalLayout.tsx` | MODIFIED | Add Projects section after Skills |
| `PrintApp.tsx` | MODIFIED | Pass `projects` from `builderData` to `ProfessionalLayout` |

### Schema Addition

```typescript
// schema.ts additions
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  url: text('url'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
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

`templateVariantItems` needs a new nullable column. Because the existing table was created with `CREATE TABLE IF NOT EXISTS`, adding `projectId` requires an ALTER TABLE in `ensureSchema()`:

```typescript
// db/index.ts — inside ensureSchema(), after CREATE TABLE statements
sqlite.exec(`
  ALTER TABLE template_variant_items ADD COLUMN project_id INTEGER
    REFERENCES projects(id) ON DELETE CASCADE;
`)
```

Wrap in a try/catch (or check `PRAGMA table_info`) because `ALTER TABLE ADD COLUMN` throws if the column already exists.

### Data Flow: Projects in Builder

```
VariantBuilder mounts
    |
    v
window.api.templates.getBuilderData(variantId)
    |
    v  [MODIFIED handler]
templates:getBuilderData
    ├── existing: jobs query + bullets + skills
    └── NEW: projects query + projectBullets
    → returns BuilderData { jobs, skills, projects }  [extended type]
    |
    v
VariantBuilder renders Work History + Skills + Projects sections
Each project checkbox calls setItemExcluded(variantId, 'project', projectId, excluded)
```

### Resume Section Placement

Projects render at the end of `ProfessionalLayout`, after Skills. This matches jsonresume convention (work, skills, projects) and the project requirement ("displayed at end of resume").

---

## Feature 2: resume.json Import

### What Needs to Exist

The user selects a `resume.json` file from disk. The app parses it and populates existing database tables (jobs, skills, projects, profile). No new tables required — this is a pure write path into existing data.

### resume.json Schema (confirmed)

Relevant sections that map to app tables:

| resume.json section | Maps to | Notes |
|---------------------|---------|-------|
| `basics` | `profile` table | name, email, phone, location, linkedin (from `profiles[0].url`) |
| `work[]` | `jobs` + `jobBullets` | `highlights[]` become bullets |
| `skills[]` | `skills` | `name` is skill name; `keywords[]` become tags |
| `projects[]` | `projects` + `projectBullets` | `highlights[]` become bullets; `name`, `description`, `url` map directly |

Fields that have no app equivalent (volunteer, education, awards, certificates, languages, references) are silently ignored during import.

### New vs Modified

| Layer | Change Type | What |
|-------|-------------|------|
| `handlers/import.ts` | NEW | `import:resumeJson` handler — dialog.showOpenDialog + fs.readFile + parse + insert |
| `handlers/index.ts` | MODIFIED | Register import handler |
| `preload/index.ts` | MODIFIED | Add `window.api.importFile.resumeJson()` |
| `preload/index.d.ts` | MODIFIED | Add `importFile` namespace to `Api` |
| `ExperienceTab.tsx` or new Settings area | MODIFIED/NEW | Import button triggers `window.api.importFile.resumeJson()`, shows result toast |

### Import Handler Logic

```
import:resumeJson handler
    |
    v
dialog.showOpenDialog({ filters: [{ name: 'JSON', extensions: ['json'] }] })
    |
    v
fs.readFile(filePath, 'utf8') → JSON.parse()
    |
    v
Validate: check for 'basics' or 'work' field — if absent, return { error: 'not a resume.json' }
    |
    v
Map basics → profile upsert (UPDATE WHERE id=1)
Map work[] → insert jobs + insert jobBullets (per highlights[])
Map skills[] → insert skills (keywords[] as JSON tags)
Map projects[] → insert projects + insert projectBullets (per highlights[])
    |
    v
Return { imported: { jobs: N, skills: N, projects: N } }
    |
    v
Renderer shows toast: "Imported 5 jobs, 12 skills, 3 projects"
```

**Transaction requirement:** Wrap all inserts in a `better-sqlite3` synchronous transaction to ensure atomicity. If any insert fails, nothing is committed.

```typescript
// handlers/import.ts sketch
const transaction = db.transaction((data: ResumeJson) => {
  if (data.basics) {
    db.update(profile).set({ name: data.basics.name, ... }).where(eq(profile.id, 1)).run()
  }
  for (const job of data.work ?? []) {
    const [newJob] = db.insert(jobs).values({ ... }).returning().all()
    for (const highlight of job.highlights ?? []) {
      db.insert(jobBullets).values({ jobId: newJob.id, text: highlight, sortOrder: i }).run()
    }
  }
  // same for skills and projects
})
transaction(parsedJson)
```

### No New Tables Needed

Import writes into the same tables as manual CRUD. The import handler is a bulk-write operation, not a new domain. After import, the Experience tab refreshes normally via existing `jobs:list`, `skills:list`, `projects:list` channels.

---

## Feature 3: resume.json Theme Rendering

### What the Theme Contract Is (confirmed)

Every jsonresume-compatible theme is an npm package that exports:
```javascript
module.exports = { render: function(resume) { return '<html>...</html>' } }
```
The `render` function receives the full resume.json object and returns a self-contained HTML string (no external dependencies — CSS is inlined).

### Integration Approach: Main Process Renders to HTML, Print Window Displays It

This is the critical architectural decision. There are two approaches:

**Approach A: Install theme as npm dependency (static, recommended for v1.1)**
- Install one or more themes as direct npm dependencies (e.g., `npm install jsonresume-theme-even`)
- In main process, `require()` the theme, call `theme.render(resumeJsonObject)`, get HTML string
- Load that HTML string into the hidden BrowserWindow via `win.loadURL('data:text/html,...')` or via a registered protocol
- Call `printToPDF()` as usual

**Approach B: User-supplied theme file (dynamic, complex)**
- User provides path to a theme's `index.js`
- Main process `require()`s it dynamically
- Security risk: arbitrary code execution; requires explicit user consent UX
- Out of scope for v1.1

**v1.1 uses Approach A.** One or two curated themes are bundled as npm dev dependencies.

### Loading HTML String into BrowserWindow

`win.loadURL('data:text/html,...')` has a size limit (~2MB URL). The safe approach for arbitrary HTML is a custom protocol or temp file:

```typescript
// export.ts — theme PDF flow
const themeHtml = theme.render(buildResumeJsonObject(variantId))
const tmpPath = path.join(app.getPath('temp'), `resume-theme-${Date.now()}.html`)
await fs.writeFile(tmpPath, themeHtml, 'utf8')
await win.loadURL(`file://${tmpPath}`)
// wait for did-finish-load or a settle delay
const pdf = await win.webContents.printToPDF({ ... })
await fs.unlink(tmpPath)  // cleanup
```

This avoids the data: URL size limit and doesn't require a custom protocol registration.

### Building the resume.json Object from App Data

A new helper function in main process maps app DB data to the resume.json shape:

```typescript
// handlers/export.ts (or a new helpers/resumeJsonBuilder.ts)
async function buildResumeJson(variantId: number): Promise<ResumeJson> {
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
  const builderData = await getBuilderDataForVariant(variantId)  // existing function, extended
  return {
    basics: {
      name: profileRow?.name,
      email: profileRow?.email,
      phone: profileRow?.phone,
      location: { address: profileRow?.location },
      profiles: profileRow?.linkedin
        ? [{ network: 'LinkedIn', url: profileRow.linkedin }]
        : [],
    },
    work: builderData.jobs
      .filter(j => !j.excluded)
      .map(j => ({
        name: j.company,
        position: j.role,
        startDate: j.startDate,
        endDate: j.endDate ?? undefined,
        highlights: j.bullets.filter(b => !b.excluded).map(b => b.text),
      })),
    skills: builderData.skills
      .filter(s => !s.excluded)
      .map(s => ({ name: s.name, keywords: s.tags })),
    projects: (builderData.projects ?? [])
      .filter(p => !p.excluded)
      .map(p => ({
        name: p.name,
        description: p.description ?? undefined,
        url: p.url ?? undefined,
        highlights: p.bullets.filter(b => !b.excluded).map(b => b.text),
      })),
  }
}
```

### New vs Modified

| Layer | Change Type | What |
|-------|-------------|------|
| `package.json` | MODIFIED | Add theme package(s) as dependencies (e.g., `jsonresume-theme-even`) |
| `handlers/export.ts` | MODIFIED | Add `export:pdf:theme` handler variant or extend `export:pdf` with `layoutTemplate` check |
| `helpers/resumeJsonBuilder.ts` (or inline) | NEW | `buildResumeJson(variantId)` function |
| `preload/index.ts` | MODIFIED | If a new IPC channel is added for theme export |
| `VariantEditor.tsx` | MODIFIED | Show theme layout option when `variant.layoutTemplate` is a theme name |
| `VariantPreview.tsx` | MODIFIED | For theme layouts, call `window.api.templates.renderTheme(variantId)` and display returned HTML in an iframe or dangerouslySetInnerHTML |

### Theme Preview in Renderer

For live preview of a theme layout, the renderer needs to display the rendered HTML. Options:

- **`<iframe srcDoc={html}>`** — sandboxed, safe, works with self-contained theme HTML. Preferred.
- **`dangerouslySetInnerHTML`** — risks style bleed into app CSS. Avoid.

The renderer calls a new IPC channel that returns the HTML string:
```
window.api.templates.renderThemePreview(variantId, themeName)
→ main: buildResumeJson(variantId) → theme.render(json) → return htmlString
→ renderer: <iframe srcDoc={htmlString} />
```

### Template Selection Plumbing

The existing `templateVariants.layoutTemplate` TEXT column (currently `'traditional'`) already holds a layout identifier. Theme names map to this column:

| `layoutTemplate` value | Renders with |
|------------------------|-------------|
| `'traditional'` | `ProfessionalLayout` (existing React component) |
| `'even'` | `jsonresume-theme-even` npm package |
| `'stackoverflow'` | `jsonresume-theme-stackoverflow` npm package |

No schema change needed. The column already exists. The export and preview handlers switch on this value.

---

## Feature 4: Tag Autocomplete

### Current State

`TagInput.tsx` is a fully self-contained component with no external data. It manages its own `inputValue` state and fires `onChange(tags[])` on commit. It already exposes `onInputChange?: (value: string) => void` as a callback hook — this was clearly designed for future autocomplete integration.

### Integration Point: Pure Renderer, No New IPC

Tag autocomplete does not require a new IPC channel. All existing tags are already available in the renderer:
- `SkillList` already fetches all skills via `window.api.skills.list()` on mount
- Each skill has a `tags: string[]` property
- Flattening and deduplicating these gives the complete tag corpus

The autocomplete data comes from the parent component (SkillList/SkillAddForm), not from a new backend call.

### New vs Modified

| Layer | Change Type | What |
|-------|-------------|------|
| `TagInput.tsx` | MODIFIED | Add `suggestions?: string[]` prop; render dropdown when `inputValue.length > 0 && filteredSuggestions.length > 0` |
| `SkillList.tsx` | MODIFIED | Derive `allTags: string[]` from loaded skills; pass to `SkillAddForm` and `SkillItem` |
| `SkillAddForm.tsx` | MODIFIED | Accept `suggestions?: string[]` prop; forward to `TagInput` |
| `SkillItem.tsx` | MODIFIED | Accept `suggestions?: string[]` prop; forward to `TagInput` |

### TagInput Autocomplete Contract

```typescript
// TagInput.tsx — extended props
interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  onInputChange?: (value: string) => void
  suggestions?: string[]      // NEW: all known tags from parent
  className?: string
}
```

Internal state additions:
- `filteredSuggestions`: `suggestions.filter(s => s.toLowerCase().startsWith(inputValue.toLowerCase()) && !tags.includes(s))`
- `showDropdown`: `inputValue.length > 0 && filteredSuggestions.length > 0`
- `activeIndex`: for keyboard navigation (ArrowUp/ArrowDown/Enter selects)

Selecting a suggestion calls the existing `addTag(suggestion)` function — no other logic changes.

### Dropdown Positioning

The dropdown must render below the input and above the container boundary. Since `TagInput` is used inside `SkillItem` rows in a scrollable list, use `position: absolute` with `z-index` rather than a portal. The parent container (`.flex.flex-wrap`) becomes `position: relative`.

### Keyboard Flow

- ArrowDown: move `activeIndex` down (wraps)
- ArrowUp: move `activeIndex` up (wraps)
- Enter (when dropdown visible): select `filteredSuggestions[activeIndex]`
- Escape: close dropdown, keep input value
- Tab: select top suggestion and commit (improves keyboard-only UX)

The existing `handleKeyDown` in `TagInput` is the right place to add these cases.

### Data Flow: Where Tags Come From

```
SkillList mounts
    |
    v
window.api.skills.list() → skills: Skill[]
    |
    v
allTags = [...new Set(skills.flatMap(s => s.tags))].sort()
    |
    v
<SkillAddForm suggestions={allTags} ... />
<SkillItem suggestions={allTags} ... />  ← for each skill in list
    |
    v
TagInput receives suggestions, filters on inputValue
```

No additional IPC calls. The tag corpus is derived from data already loaded.

---

## Cross-Feature: BuilderData Type Extension

All four features converge on `BuilderData`. The existing type must be extended:

```typescript
// preload/index.d.ts — additions

export interface ProjectBullet {
  id: number
  projectId: number
  text: string
  sortOrder: number
}

export interface ProjectWithBullets {
  id: number
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  url: string | null
  createdAt: Date
  bullets: ProjectBullet[]
}

export interface BuilderProjectBullet {
  id: number
  text: string
  sortOrder: number
  excluded: boolean
}

export interface BuilderProject {
  id: number
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  url: string | null
  excluded: boolean
  bullets: BuilderProjectBullet[]
}

// MODIFIED — add projects field
export interface BuilderData {
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]   // NEW
}

// MODIFIED — add projects field to frozen snapshot
export interface SubmissionSnapshot {
  layoutTemplate: string
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]   // NEW (optional for backward compat with v1.0 snapshots)
}
```

`SubmissionSnapshot` should treat `projects` as optional (`projects?: BuilderProject[]`) so existing v1.0 snapshots (which have no projects key) remain renderable in `SnapshotViewer`.

---

## Recommended Build Order

Dependencies determine order. Each feature depends on what comes before it.

```
Step 1: Projects schema + handlers + basic UI
  - Add projects + projectBullets tables to schema.ts and ensureSchema()
  - Add projectId column to templateVariantItems
  - handlers/projects.ts, handlers/projectBullets.ts
  - Extend getBuilderData and setItemExcluded in templates.ts
  - ProjectList, ProjectItem, ProjectAddForm components
  - ExperienceTab: add Projects section
  - BuilderData type extended

  RATIONALE: Projects must exist in DB before any other feature can reference them.
  Tag autocomplete needs skills only (independent), but themes and import both
  benefit from projects being ready.

Step 2: Tag autocomplete
  - TagInput.tsx: add suggestions prop + dropdown render
  - SkillList.tsx: derive allTags, pass down
  - SkillAddForm.tsx, SkillItem.tsx: forward suggestions

  RATIONALE: Pure renderer change. No IPC, no schema. Can be done at any point
  but placed early because it's low-risk and high-visibility UX polish.

Step 3: ProfessionalLayout + VariantBuilder + PrintApp: projects support
  - ProfessionalLayout.tsx: add Projects section
  - VariantBuilder.tsx: add Projects section
  - PrintApp.tsx: pass projects to ProfessionalLayout
  - export.ts DOCX: add Projects section to DOCX builder

  RATIONALE: Depends on Step 1 (projects in BuilderData). Must complete before
  any export (PDF/DOCX) correctly reflects projects.

Step 4: resume.json import
  - handlers/import.ts: dialog, parse, transaction write
  - preload bridge: importFile namespace
  - UI: import button in ExperienceTab

  RATIONALE: Depends on Step 1 (projects table exists to receive imported projects).
  Import writes to existing tables — no new schema needed beyond Step 1.

Step 5: resume.json theme rendering
  - npm install chosen theme(s)
  - helpers/resumeJsonBuilder.ts: buildResumeJson()
  - export.ts: theme PDF export path (tmp file → BrowserWindow → printToPDF)
  - VariantPreview.tsx: iframe preview for theme layouts
  - VariantEditor.tsx: layout selector to set variant.layoutTemplate

  RATIONALE: Depends on Steps 1 and 3 (projects must be in BuilderData for
  accurate theme rendering). Most complex feature — placed last.
```

---

## Component Diagram: v1.1 State

```
App.tsx
  ExperienceTab.tsx
    ProfileSettings.tsx         (unchanged)
    JobList.tsx                 (unchanged)
    ProjectList.tsx             [NEW]
      ProjectItem.tsx           [NEW]
      ProjectAddForm.tsx        [NEW]
        BulletList.tsx          (unchanged — reused)
    SkillList.tsx               [MODIFIED — derives allTags]
      SkillItem.tsx             [MODIFIED — forwards suggestions]
        TagInput.tsx            [MODIFIED — autocomplete dropdown]
      SkillAddForm.tsx          [MODIFIED — forwards suggestions]
        TagInput.tsx            [MODIFIED]

  TemplatesTab.tsx
    VariantEditor.tsx           [MODIFIED — layout selector for theme]
      VariantBuilder.tsx        [MODIFIED — projects section]
      VariantPreview.tsx        [MODIFIED — iframe for theme layouts]
        ProfessionalLayout.tsx  [MODIFIED — projects section]

  SubmissionsTab.tsx            (unchanged)
    SnapshotViewer.tsx          (unchanged — projects: optional in snapshot)

PrintApp.tsx                    [MODIFIED — pass projects]
  ProfessionalLayout.tsx        [MODIFIED]
```

---

## Anti-Patterns to Avoid in v1.1

### Anti-Pattern 1: Fetching Tag Corpus via New IPC Channel

**What people do:** Add a `tags:list` IPC channel that queries all unique tags from the DB.

**Why it's wrong:** The renderer already has all skills loaded. A round trip to main for data the renderer already holds adds latency and complexity.

**Do this instead:** Derive `allTags` from the already-loaded `skills` array in `SkillList`. Pass as a prop.

### Anti-Pattern 2: Using dangerouslySetInnerHTML for Theme Preview

**What people do:** Render the theme HTML string directly into the React component tree.

**Why it's wrong:** Theme CSS bleeds into the app's dark UI. Theme JavaScript (if any) executes in the app's context. Theme IDs/classes collide with Tailwind.

**Do this instead:** Render in an `<iframe srcDoc={html}>`. The iframe creates a separate browsing context with its own CSS scope.

### Anti-Pattern 3: Blocking the Main Thread During Import

**What people do:** Parse and insert resume.json synchronously in the IPC handler without `await`.

**Why it's wrong:** better-sqlite3 IS synchronous, but the IPC handler still runs on the main thread. For large imports (50+ jobs, 200+ bullets), this freezes the UI briefly. More importantly, a missing `transaction()` wrapper means partial imports if any insert fails midway.

**Do this instead:** Wrap all import inserts in a `db.transaction()`. Even though better-sqlite3 transactions are synchronous, they are atomic — a failure rolls back all inserts, leaving the DB clean.

### Anti-Pattern 4: ALTER TABLE Without Error Handling

**What people do:** Call `ALTER TABLE template_variant_items ADD COLUMN project_id INTEGER` in `ensureSchema()` without protecting against "column already exists".

**Why it's wrong:** SQLite throws `table X already has column Y` if the column exists. On any app start after first migration, this crashes `ensureSchema()`.

**Do this instead:** Wrap the ALTER TABLE in a try/catch, or check `PRAGMA table_info(template_variant_items)` first and skip if the column exists.

```typescript
// Safe ALTER TABLE pattern
try {
  sqlite.exec(`ALTER TABLE template_variant_items ADD COLUMN project_id INTEGER
    REFERENCES projects(id) ON DELETE CASCADE`)
} catch {
  // Column already exists — normal on subsequent starts
}
```

### Anti-Pattern 5: Duplicating getBuilderDataForVariant

**What people do:** Copy the function from `templates.ts` into `export.ts` and maintain two separate implementations.

**Why it's wrong:** v1.0 already has this duplication — `getBuilderDataForVariant` is defined in both `handlers/export.ts` and `handlers/templates.ts` with identical logic. When projects are added, both copies must be updated, and the second one will be missed.

**Do this instead:** Extract `getBuilderDataForVariant` to a shared helper file (e.g., `main/helpers/builderData.ts`) and import it in both handlers. This is the correct fix for the existing v1.0 duplication too.

---

## Integration Points Summary

| Feature | New IPC Channels | Modified IPC Channels | New DB Tables | Modified DB Tables | New Components | Modified Components |
|---------|-----------------|----------------------|---------------|-------------------|----------------|---------------------|
| Projects CRUD | `projects:*`, `projectBullets:*` | `templates:getBuilderData`, `templates:setItemExcluded`, `export:docx` | `projects`, `projectBullets` | `templateVariantItems` (+projectId col) | `ProjectList`, `ProjectItem`, `ProjectAddForm` | `ExperienceTab`, `VariantBuilder`, `ProfessionalLayout`, `PrintApp` |
| resume.json import | `import:resumeJson` | — | — | — | import button in ExperienceTab | `ExperienceTab` |
| Theme rendering | `templates:renderThemePreview` | `export:pdf` (theme path) | — | — | — | `VariantEditor`, `VariantPreview` |
| Tag autocomplete | — | — | — | — | — | `TagInput`, `SkillList`, `SkillItem`, `SkillAddForm` |

---

## Sources

- Existing codebase (confirmed via inspection): `src/main/db/schema.ts`, `src/main/db/index.ts`, `src/main/handlers/*.ts`, `src/preload/index.ts`, `src/preload/index.d.ts`, all renderer components
- [JSON Resume schema — docs.jsonresume.org](https://docs.jsonresume.org/schema) — projects section structure (HIGH confidence)
- [JSON Resume theme development contract — jsonresume.org](https://jsonresume.org/theme-development) — render function signature confirmed: `module.exports = { render(resume) { return htmlString } }` (HIGH confidence)
- [jsonresume-theme-boilerplate — GitHub](https://github.com/jsonresume/jsonresume-theme-boilerplate) — export shape confirmation (HIGH confidence)
- better-sqlite3 transaction docs — synchronous transaction wrapper confirmed (HIGH confidence, from existing code patterns in codebase)

---

*Architecture research for: ResumeHelper v1.1 integration (projects, import, themes, tag autocomplete)*
*Researched: 2026-03-14*
