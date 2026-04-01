# Phase 06: Projects in Export Pipeline and resume.json Import - Research

**Researched:** 2026-03-22
**Domain:** Electron/React desktop app — DB schema extension, export pipeline, full resume.json entity alignment, IPC import handler
**Confidence:** HIGH (all findings verified against actual codebase; resume.json spec verified against official schema)

## Summary

Phase 6 has three orthogonal workstreams that share the same extension pattern: (1) wire the already-persisted `projectId`/`projectBulletId` FK columns into the builder/preview/export pipeline, (2) create DB tables + Experience tab UI for six new resume.json sections (education, volunteer, awards, publications, languages, interests, references), and (3) add an `import:resumeJson` IPC handler that reads a file, shows a confirmation dialog in the renderer, and replaces all data atomically in a better-sqlite3 synchronous transaction.

The codebase already has the FK columns for projects on `templateVariantItems` (added via ALTER TABLE in Phase 5). Every new entity follows the identical four-layer pattern: schema (ensureSchema + Drizzle table), IPC handler, preload bridge, and renderer component. The builder, preview, and DOCX export layers all converge on `BuilderData` — extending that interface and `getBuilderDataForVariant` / `buildSnapshotForVariant` automatically propagates changes to preview and snapshot.

**Primary recommendation:** Follow the projects-as-jobs pattern exactly. Each new entity is a direct extension of the established stack; no new libraries are needed except `dialog.showOpenDialog` (already in Electron) for the file picker.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Projects section appears AFTER Skills on the resume (last experience section before minor sections)
- Formatted like jobs: bold project name as header, bulleted list of accomplishments below
- Section heading: "PROJECTS" (matches "WORK EXPERIENCE" and "SKILLS" style)
- Projects appear in PDF, DOCX, preview, and frozen submission snapshots — consistent across all outputs
- Same builder pattern as jobs: project-level checkbox + individual bullet checkboxes nested below
- Toggling project off disables all its bullets (same behavior as job toggle)
- Projects section positioned after Skills in the builder
- ALL resume.json sections get DB tables and Experience tab UI: education, volunteer, awards, publications, languages, interests, references
- Experience tab uses collapsible sections layout — all sections stacked vertically, each with expand/collapse toggle
- Existing sections (Jobs, Skills, Projects) keep their current UI but gain collapse/expand
- All new sections get item-level checkboxes (each education entry, each award, etc. individually toggleable)
- Sub-items (education courses[], interest keywords[]) are NOT individually toggleable — parent-level only
- Builder section order: Work, Skills, Projects, Education, then remaining minor sections (Claude decides exact order)
- Import button on Experience tab header ("Import from resume.json")
- Opens system file dialog to select .json file
- Replace-all strategy: delete ALL existing data, then insert from resume.json in a transaction
- Confirmation dialog shows summary counts with warning "This will replace all existing data"
- After successful import: success toast with counts, stay on Experience tab (data refreshes automatically)
- Maps ALL resume.json sections to their respective DB tables

### Claude's Discretion
- Exact resume section ordering for new sections (education, volunteer, awards, publications, languages, interests, references) in the exported resume
- How each new section renders on the resume (formatting, typography, layout details)
- resume.json schema validation approach (strict vs lenient)
- Error handling for malformed or partial resume.json files
- Collapsible section UI implementation details (animation, default expanded/collapsed state)
- How to handle resume.json fields that don't map cleanly (e.g., profiles[] in basics)

### Deferred Ideas (OUT OF SCOPE)
- Drag-to-reorder resume sections on the exported resume (custom section ordering per variant)
- Education courses[] as individually toggleable items in builder (currently parent-level only)
- Interest keywords[] as individually toggleable items in builder (currently parent-level only)
- Merge import strategy (add new alongside existing instead of replace-all)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-03 | User can toggle projects in/out of template variants (checkbox builder) | `templateVariantItems` already has `project_id` and `project_bullet_id` FK columns. `setItemExcluded` handler needs project/projectBullet branches added. `getBuilderDataForVariant` in templates.ts needs projects added. `BuilderData` interface needs `projects: BuilderProject[]`. `VariantBuilder.tsx` needs project section added after skills. |
| PROJ-04 | Projects appear in resume preview and PDF/DOCX export | `ProfessionalLayout.tsx` needs projects prop and rendering block. `PrintApp.tsx` needs to pass projects. `VariantPreview.tsx` auto-picks up via ProfessionalLayout. DOCX export handler needs PROJECTS section block. `buildSnapshotForVariant` in submissions.ts needs projects. |
| IMP-01 | User can import resume data from a resume.json file (maps to jobs, skills, projects, profile) | New IPC handler `import:resumeJson` using `dialog.showOpenDialog` for file picker, fs.readFile to read JSON, better-sqlite3 synchronous transaction for atomic replace-all across all tables. Returns parsed summary counts to renderer. |
| IMP-02 | Import shows a confirmation before overwriting existing data | Renderer-side: after receiving parsed summary from IPC, show confirmation modal with counts ("5 jobs, 12 skills...") and warning text, requiring user click to proceed. A second IPC call `import:confirmReplace` triggers the actual delete+insert transaction. |
</phase_requirements>

## Standard Stack

### Core (already in use — no new installations)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | in use | Synchronous SQLite — required for transactions | All DB work; transactions MUST be synchronous |
| drizzle-orm | in use | Query builder + schema types | Existing pattern |
| electron ipcMain/ipcRenderer | in use | Main↔renderer communication | Established pattern |
| docx | in use | DOCX generation | Export handler already uses it |
| React useState/useEffect | in use | Component state | All UI components |

### No New Libraries Needed
The file picker uses `dialog.showOpenDialog` (already imported in export.ts as `dialog` from `electron`). JSON parsing is built-in. Transactions use `sqlite.transaction()` (better-sqlite3 built-in).

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure Extensions
```
src/main/
├── db/
│   ├── index.ts          # Add ensureSchema CREATE TABLE IF NOT EXISTS blocks + ALTER TABLE statements
│   └── schema.ts         # Add Drizzle table definitions for 7 new entities
├── handlers/
│   ├── templates.ts      # Extend getBuilderData + setItemExcluded for projects + all new entities
│   ├── export.ts         # Extend getBuilderDataForVariant + DOCX sections
│   ├── submissions.ts    # Extend buildSnapshotForVariant for projects + new entities
│   └── import.ts         # NEW: registerImportHandlers() with import:resumeJson
src/renderer/src/
├── components/
│   ├── ExperienceTab.tsx       # Add Import button + collapsible wrappers to all sections
│   ├── VariantBuilder.tsx      # Add Projects section + all new entity sections
│   ├── ProfessionalLayout.tsx  # Add Projects + new entity rendering blocks
│   ├── PrintApp.tsx            # Pass projects + new entities to ProfessionalLayout
│   ├── VariantPreview.tsx      # Pass projects + new entities through
│   ├── SnapshotViewer.tsx      # Pass projects + new entities to ProfessionalLayout
│   ├── EducationList.tsx       # NEW: following ProjectList pattern
│   ├── VolunteerList.tsx       # NEW
│   ├── AwardList.tsx           # NEW
│   ├── PublicationList.tsx     # NEW
│   ├── LanguageList.tsx        # NEW (simple flat items)
│   ├── InterestList.tsx        # NEW (item + keywords[] display)
│   ├── ReferenceList.tsx       # NEW (simple flat items)
│   └── ImportConfirmModal.tsx  # NEW: shows counts, warning, confirm/cancel
src/preload/
├── index.ts     # Add new entity namespaces + import namespace
└── index.d.ts   # Add new entity interfaces + extended BuilderData + SubmissionSnapshot
```

### Pattern 1: Extending BuilderData (central data contract)

`BuilderData` in `index.d.ts` is the single interface flowing through builder, preview, print, and snapshot. Add each new entity as an optional array (to avoid breaking existing snapshots):

```typescript
// Source: existing pattern in src/preload/index.d.ts
export interface BuilderProject {
  id: number
  name: string
  excluded: boolean
  bullets: BuilderBullet[]
}

export interface BuilderEducation {
  id: number
  institution: string
  area: string
  studyType: string
  startDate: string
  endDate: string | null
  excluded: boolean
}

// ... similar for volunteer, award, publication, language, interest, reference

export interface BuilderData {
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]          // NEW
  education: BuilderEducation[]       // NEW
  volunteer: BuilderVolunteer[]       // NEW
  awards: BuilderAward[]              // NEW
  publications: BuilderPublication[]  // NEW
  languages: BuilderLanguage[]        // NEW
  interests: BuilderInterest[]        // NEW
  references: BuilderReference[]      // NEW
}
```

### Pattern 2: templateVariantItems FK extension

The existing `templateVariantItems` table uses a single-row-per-exclusion pattern. Each new toggleable entity type needs:
1. A new FK column on `templateVariantItems` (via ALTER TABLE ADD COLUMN in `ensureSchema`)
2. A new `itemType` string value (e.g., `'education'`, `'award'`)
3. A new branch in `setItemExcluded` handler
4. New lookup in `getBuilderDataForVariant`

For entities without sub-items (awards, publications, languages, interests, references), no cascade logic is needed — just the top-level toggle. For education and volunteer (which have courses[]/highlights[]), the decision is parent-level only (no sub-item toggles per locked decisions).

```typescript
// Pattern for adding education FK column (ALTER TABLE in ensureSchema)
const alterStatements = [
  // existing:
  'ALTER TABLE `template_variant_items` ADD COLUMN `project_id` integer REFERENCES `projects`(`id`) ON DELETE cascade',
  'ALTER TABLE `template_variant_items` ADD COLUMN `project_bullet_id` integer REFERENCES `project_bullets`(`id`) ON DELETE cascade',
  // new phase 6:
  'ALTER TABLE `template_variant_items` ADD COLUMN `education_id` integer REFERENCES `education`(`id`) ON DELETE cascade',
  'ALTER TABLE `template_variant_items` ADD COLUMN `volunteer_id` integer REFERENCES `volunteer`(`id`) ON DELETE cascade',
  'ALTER TABLE `template_variant_items` ADD COLUMN `award_id` integer REFERENCES `awards`(`id`) ON DELETE cascade',
  'ALTER TABLE `template_variant_items` ADD COLUMN `publication_id` integer REFERENCES `publications`(`id`) ON DELETE cascade',
  'ALTER TABLE `template_variant_items` ADD COLUMN `language_id` integer REFERENCES `languages`(`id`) ON DELETE cascade',
  'ALTER TABLE `template_variant_items` ADD COLUMN `interest_id` integer REFERENCES `interests`(`id`) ON DELETE cascade',
  'ALTER TABLE `template_variant_items` ADD COLUMN `reference_id` integer REFERENCES `references`(`id`) ON DELETE cascade',
]
for (const sql of alterStatements) {
  try { sqlite.exec(sql) } catch { /* column already exists */ }
}
```

### Pattern 3: replace-all import transaction

better-sqlite3 transactions MUST be synchronous. The import uses `sqlite.transaction()` directly:

```typescript
// Source: better-sqlite3 docs / established pattern in this codebase
ipcMain.handle('import:resumeJson', async (_, filePath: string) => {
  const raw = await fs.readFile(filePath, 'utf-8')
  const data = JSON.parse(raw)
  // Parse + count sections
  const counts = {
    jobs: (data.work ?? []).length,
    skills: (data.skills ?? []).length,
    projects: (data.projects ?? []).length,
    education: (data.education ?? []).length,
    // ...
  }
  return { counts, parsed: data }  // return to renderer for confirmation
})

ipcMain.handle('import:confirmReplace', (_, parsed: ResumeJsonPayload) => {
  // synchronous transaction — MUST use sqlite.transaction() not async/await
  const doImport = sqlite.transaction(() => {
    sqlite.exec('DELETE FROM job_bullets')
    sqlite.exec('DELETE FROM jobs')
    sqlite.exec('DELETE FROM skills')
    sqlite.exec('DELETE FROM projects')
    sqlite.exec('DELETE FROM project_bullets')
    sqlite.exec('DELETE FROM education')
    // ... delete all new tables
    // ... insert from parsed data
  })
  doImport()
})
```

### Pattern 4: Collapsible section in ExperienceTab

The existing Profile section already uses a collapsible pattern:

```typescript
// Source: src/renderer/src/components/ExperienceTab.tsx (existing)
const [sectionOpen, setSectionOpen] = useState(true) // default expanded

<button
  onClick={() => setSectionOpen(prev => !prev)}
  className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300 transition-colors"
  style={{ marginBottom: sectionOpen ? '16px' : '0' }}
>
  <span style={{ display: 'inline-block', transform: sectionOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
  Section Name
</button>
{sectionOpen && <SectionList />}
```

Apply this pattern to ALL sections (Jobs, Skills, Projects are currently non-collapsible and get upgraded; new sections get it by default). Profile section already has it.

### Pattern 5: ProfessionalLayout section rendering

Projects render exactly like jobs — bold name header, date range right-aligned, bullets below. New minor sections (education, volunteer, awards, etc.) render with the same `sectionHeadingStyle` (uppercase, gray, bottom border):

```typescript
// Source: src/renderer/src/components/ProfessionalLayout.tsx (existing style)
const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#333333',
  borderBottom: '1px solid #cccccc',
  paddingBottom: '3px',
  marginBottom: '10px',
  marginTop: '18px',
}
```

Recommended resume section order (Claude's discretion): Work Experience → Skills → Projects → Education → Volunteer → Awards → Publications → Languages → Interests → References

### Anti-Patterns to Avoid

- **Async transactions:** `sqlite.transaction()` only works synchronously. Never use `await` inside a transaction callback.
- **Missing `if (!item.excluded) continue` guard:** The exclusion query fetches all rows for a variant; only rows where `excluded = true` should be added to the excluded sets.
- **Drizzle schema diverging from ensureSchema:** Both `schema.ts` (Drizzle types) and `db/index.ts` (runtime CREATE TABLE) must be updated together or Drizzle queries will fail at runtime.
- **Forgetting templateVariantItems FK in Drizzle schema.ts:** The ALTER TABLE adds the column to SQLite but Drizzle's schema.ts also needs the column definition for type-safe queries.
- **SubmissionSnapshot not extended:** `buildSnapshotForVariant` in `submissions.ts` mirrors `getBuilderDataForVariant` in `templates.ts` — both must be extended together or snapshots will be missing projects/new entities.
- **PrintApp.tsx not passing new props:** PrintApp fetches BuilderData and passes individual arrays to ProfessionalLayout. When ProfessionalLayout gains new props, PrintApp must pass them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table delete+insert | Custom try/catch rollback | `sqlite.transaction()` | Synchronous, atomic, built-in to better-sqlite3 |
| System file picker | Custom file dialog UI | `dialog.showOpenDialog` (Electron) | Native OS dialog, already imported in export.ts |
| JSON file reading | Manual XHR/fetch in renderer | `fs.promises.readFile` in main process via IPC | Renderer has no filesystem access; IPC + main handles it |
| Confirmation dialog | Electron `dialog.showMessageBox` | Custom React modal | `showMessageBox` is blocking and less flexible for counts display; existing Toast/modal patterns in codebase are better suited |
| Schema migrations | Drizzle file-based migrations | `ALTER TABLE ADD COLUMN` in try/catch + `CREATE TABLE IF NOT EXISTS` | Established pattern for this desktop app; file migrations have known issues with pre-existing tables |

**Key insight:** The entire import flow runs in two IPC round-trips: first call parses and returns counts (for confirmation), second call (after user confirms) runs the synchronous transaction. This avoids passing large JSON blobs across IPC twice while keeping the confirmation UX clean.

## Common Pitfalls

### Pitfall 1: Resume section order in resume.json spec vs app field names
**What goes wrong:** resume.json uses `work` for jobs (not `jobs`), `skills[].keywords` for skill tags (not `tags`), and `projects[].highlights` for bullets (not `bullets`).
**Why it happens:** The app's internal model predates resume.json alignment.
**How to avoid:** Import mapping layer: `data.work` → jobs table, `data.skills[i].keywords` → tags JSON string, `data.projects[i].highlights` → project_bullets rows.
**Warning signs:** Import completes but no data appears for some sections.

### Pitfall 2: Existing templateVariantItems rows for deleted entities
**What goes wrong:** After replace-all import, old `templateVariantItems` rows reference deleted entity IDs. ON DELETE CASCADE handles rows where the FK column is set, but the `itemType` check in `setItemExcluded` could accumulate stale rows.
**Why it happens:** Replace-all deletes entity rows; cascade deletes their `templateVariantItems` entries — but only if the FK column was populated (not null).
**How to avoid:** The import transaction should also `DELETE FROM template_variant_items` to fully reset all variant exclusions, since the new entities will have different IDs.

### Pitfall 3: both getBuilderDataForVariant copies must be kept in sync
**What goes wrong:** `getBuilderDataForVariant` is defined in BOTH `src/main/handlers/export.ts` (local copy) AND `src/main/handlers/templates.ts` (authoritative). They were duplicated intentionally.
**Why it happens:** The export handler inlines the function rather than importing from templates.ts.
**How to avoid:** Update BOTH copies when extending BuilderData with projects. Consider noting this duplication but do not refactor it (out of scope).

### Pitfall 4: better-sqlite3 `.transaction()` callback cannot use `await`
**What goes wrong:** TypeScript allows writing `async` lambdas inside `.transaction()` but better-sqlite3 ignores the returned promise and the transaction completes before the async operations run.
**Why it happens:** better-sqlite3 is synchronous by design; the transaction wrapper checks for synchronous completion only.
**How to avoid:** Use synchronous `db.select().from(x).all()`, `db.insert(x).values(y).run()` inside transactions — never `await`.

### Pitfall 5: resume.json date format mismatch
**What goes wrong:** resume.json uses ISO 8601 dates (`2020-01-01` or `2020-01`). The app stores dates as text strings. If resume.json contains full ISO dates (`2020-01-01`) and the UI expects `YYYY-MM` format, display will be inconsistent.
**Why it happens:** resume.json spec allows full dates but the app uses month-precision.
**How to avoid:** In the import mapper, truncate ISO dates to `YYYY-MM` format: `date.slice(0, 7)`.

### Pitfall 6: Drizzle schema.ts vs ensureSchema column type for new FK columns
**What goes wrong:** `templateVariantItems` in `schema.ts` lists specific FK columns (bulletId, skillId, etc.) but the Drizzle schema must also list the new columns or queries using `.where(eq(templateVariantItems.educationId, x))` will fail with TypeScript errors.
**Why it happens:** ALTER TABLE adds the column to SQLite but TypeScript doesn't know about it unless schema.ts is updated.
**How to avoid:** Add all new FK columns to the Drizzle `templateVariantItems` table definition in schema.ts simultaneously with the ALTER TABLE statements.

## Code Examples

Verified patterns from existing codebase:

### Adding a new entity type to setItemExcluded
```typescript
// Source: src/main/handlers/templates.ts — existing job branch pattern
} else if (itemType === 'project') {
  await db.delete(templateVariantItems).where(
    and(
      eq(templateVariantItems.variantId, variantId),
      eq(templateVariantItems.itemType, 'project'),
      eq(templateVariantItems.projectId, itemId),
    ),
  )
  if (excluded) {
    await db.insert(templateVariantItems).values({
      variantId, itemType: 'project', projectId: itemId, excluded: true,
    })
  }
  // Cascade to project bullets (mirrors job→bullet cascade)
  const bulletRows = await db.select({ id: projectBullets.id })
    .from(projectBullets).where(eq(projectBullets.projectId, itemId))
  const bulletIds = bulletRows.map(b => b.id)
  if (bulletIds.length > 0) {
    await db.delete(templateVariantItems).where(
      and(
        eq(templateVariantItems.variantId, variantId),
        eq(templateVariantItems.itemType, 'projectBullet'),
        inArray(templateVariantItems.projectBulletId, bulletIds),
      ),
    )
    if (excluded) {
      await db.insert(templateVariantItems).values(
        bulletIds.map(pbId => ({ variantId, itemType: 'projectBullet', projectBulletId: pbId, excluded: true }))
      )
    }
  }
}
```

### Projects section in ProfessionalLayout
```typescript
// Source: mirrors existing job section in src/renderer/src/components/ProfessionalLayout.tsx
{includedProjects.length > 0 && (
  <section>
    <h2 style={sectionHeadingStyle}>Projects</h2>
    {includedProjects.map(project => {
      const bullets = project.bullets.filter(b => !b.excluded)
      return (
        <div key={project.id} style={{ pageBreakInside: 'avoid', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '2px' }}>
            {project.name}
          </div>
          {bullets.length > 0 && (
            <ul style={{ listStyleType: 'disc', paddingLeft: '1.2em', margin: 0 }}>
              {bullets.map(b => (
                <li key={b.id} style={{ fontSize: '11px', color: '#1a1a1a', lineHeight: '1.5', marginBottom: '2px' }}>
                  {b.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    })}
  </section>
)}
```

### resume.json import IPC — two-step pattern
```typescript
// Step 1: parse and return counts (no DB write yet)
ipcMain.handle('import:parseResumeJson', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import resume.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths[0]) return { canceled: true }
  const raw = await fs.readFile(filePaths[0], 'utf-8')
  const data = JSON.parse(raw)
  return {
    canceled: false,
    counts: {
      jobs: (data.work ?? []).length,
      skills: (data.skills ?? []).length,
      projects: (data.projects ?? []).length,
      education: (data.education ?? []).length,
      volunteer: (data.volunteer ?? []).length,
      awards: (data.awards ?? []).length,
      publications: (data.publications ?? []).length,
      languages: (data.languages ?? []).length,
      interests: (data.interests ?? []).length,
      references: (data.references ?? []).length,
    },
    data,  // pass parsed JSON to renderer; renderer sends back on confirm
  }
})

// Step 2: perform atomic replace-all (synchronous transaction)
ipcMain.handle('import:confirmReplace', (_, parsed) => {
  const doImport = sqlite.transaction(() => {
    // Delete in child-first order to avoid FK constraint violations
    sqlite.prepare('DELETE FROM template_variant_items').run()
    sqlite.prepare('DELETE FROM job_bullets').run()
    sqlite.prepare('DELETE FROM jobs').run()
    sqlite.prepare('DELETE FROM skills').run()
    sqlite.prepare('DELETE FROM project_bullets').run()
    sqlite.prepare('DELETE FROM projects').run()
    sqlite.prepare('DELETE FROM education').run()
    // ... delete all other new tables
    // Insert profile basics
    if (parsed.basics) {
      sqlite.prepare(`UPDATE profile SET name=?, email=?, phone=?, location=?, linkedin=? WHERE id=1`)
        .run(parsed.basics.name ?? '', parsed.basics.email ?? '',
             parsed.basics.phone ?? '', parsed.basics.location?.city ?? '',
             parsed.basics.profiles?.[0]?.url ?? '')
    }
    // Insert work → jobs + job_bullets
    for (const job of (parsed.work ?? [])) {
      const result = sqlite.prepare(
        `INSERT INTO jobs (company, role, start_date, end_date, created_at) VALUES (?,?,?,?,unixepoch())`
      ).run(job.name ?? '', job.position ?? '', (job.startDate ?? '').slice(0, 7), job.endDate ? job.endDate.slice(0, 7) : null)
      let sortOrder = 0
      for (const highlight of (job.highlights ?? [])) {
        sqlite.prepare(`INSERT INTO job_bullets (job_id, text, sort_order) VALUES (?,?,?)`)
          .run(result.lastInsertRowid, highlight, sortOrder++)
      }
    }
    // ... similar for all other sections
  })
  doImport()
})
```

### Drizzle schema extension for new tables
```typescript
// Source: mirrors existing patterns in src/main/db/schema.ts
export const education = sqliteTable('education', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  institution: text('institution').notNull(),
  area: text('area').notNull().default(''),
  studyType: text('study_type').notNull().default(''),
  startDate: text('start_date').notNull().default(''),
  endDate: text('end_date'),
  score: text('score').default(''),
  courses: text('courses').notNull().default('[]'),  // JSON string like skills.tags
})

export const awards = sqliteTable('awards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  date: text('date'),
  awarder: text('awarder').notNull().default(''),
  summary: text('summary').notNull().default(''),
})
// languages, interests, references similarly simple
// volunteer mirrors jobs (organization, position, dates, highlights[])
// publications mirrors awards (name, publisher, releaseDate, url, summary)
```

## resume.json Field Mapping Reference

| resume.json field | App table/column | Notes |
|-------------------|-----------------|-------|
| `basics.name` | `profile.name` | Direct |
| `basics.email` | `profile.email` | Direct |
| `basics.phone` | `profile.phone` | Direct |
| `basics.location.city` | `profile.location` | App stores city only |
| `basics.profiles[0].url` | `profile.linkedin` | First profile URL (lenient) |
| `work[].name` | `jobs.company` | resume.json uses `name` not `company` |
| `work[].position` | `jobs.role` | resume.json uses `position` not `role` |
| `work[].startDate` | `jobs.start_date` | Truncate to `YYYY-MM` |
| `work[].endDate` | `jobs.end_date` | Truncate to `YYYY-MM`; null if absent |
| `work[].highlights[]` | `job_bullets.text` | One row per highlight |
| `skills[].name` | `skills.name` | Direct |
| `skills[].keywords[]` | `skills.tags` | JSON stringified |
| `projects[].name` | `projects.name` | Direct |
| `projects[].highlights[]` | `project_bullets.text` | One row per highlight |
| `education[].institution` | `education.institution` | Direct |
| `education[].area` | `education.area` | Direct |
| `education[].studyType` | `education.study_type` | Direct |
| `education[].startDate` | `education.start_date` | Truncate to `YYYY-MM` |
| `education[].endDate` | `education.end_date` | Truncate to `YYYY-MM` |
| `education[].score` | `education.score` | Direct |
| `education[].courses[]` | `education.courses` | JSON stringified (not individually toggleable) |
| `volunteer[].organization` | `volunteer.organization` | Direct |
| `volunteer[].position` | `volunteer.position` | Direct |
| `awards[].title` | `awards.title` | Direct |
| `awards[].date` | `awards.date` | Keep as-is (less precision needed) |
| `publications[].name` | `publications.name` | Direct |
| `languages[].language` | `languages.language` | Direct |
| `languages[].fluency` | `languages.fluency` | Direct |
| `interests[].name` | `interests.name` | Direct |
| `interests[].keywords[]` | `interests.keywords` | JSON stringified |
| `references[].name` | `references.name` | Direct |
| `references[].reference` | `references.reference` | Direct (the text of the reference) |
| `certificates[]` | (not mapped) | Not in locked decisions; skip silently |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| File-based Drizzle migrations | `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` try/catch | v1.0 decision | ALTER TABLE for new columns must use try/catch, not schema migrations |
| Inline styles for spacing | Still inline styles (Tailwind v4 unreliable for spacing) | v1.0 decision | Never use `m-*`/`p-*` Tailwind classes for spacing; use `style={{ margin: '...' }}` |
| Separate builder function in export.ts | Duplicate of templates.ts `getBuilderDataForVariant` | Existing | Must update BOTH copies; they are intentionally separate |

## Open Questions

1. **`import:confirmReplace` — pass full parsed data back from renderer or re-read file?**
   - What we know: The first IPC call (`import:parseResumeJson`) reads the file and returns counts + parsed data. The renderer shows confirmation. On confirm, it needs to trigger the actual insert.
   - What's unclear: Re-reading the file is safer (file couldn't have changed in 2 seconds) but simpler to pass the already-parsed object back via IPC.
   - Recommendation: Pass parsed data back via IPC as the `import:confirmReplace` argument. Keep it simple; the data is already in memory in the renderer from the first call. File is small.

2. **Collapsible default state for new sections**
   - What we know: Profile is collapsed by default; Jobs/Skills/Projects are currently not collapsible.
   - What's unclear: Should rare sections (references, languages) default to collapsed to reduce visual noise?
   - Recommendation: Jobs, Skills, Projects default expanded (primary sections); Education, Volunteer default expanded; Awards, Publications, Languages, Interests, References default collapsed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in repository |
| Config file | None — Wave 0 gap |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-03 | Project toggled excluded → templateVariantItems row inserted | unit | N/A | ❌ Wave 0 |
| PROJ-03 | Project toggled off → all project bullets also excluded | unit | N/A | ❌ Wave 0 |
| PROJ-04 | Projects in BuilderData appear in ProfessionalLayout HTML | unit | N/A | ❌ Wave 0 |
| IMP-01 | resume.json work[] maps to jobs rows with correct field names | unit | N/A | ❌ Wave 0 |
| IMP-01 | Import transaction is atomic (failure leaves DB unchanged) | unit | N/A | ❌ Wave 0 |
| IMP-02 | Confirmation modal shows correct counts before DB write | manual-only | manual | N/A |

### Sampling Rate
- **Per task commit:** No automated test suite configured
- **Per wave merge:** Manual smoke test: import sample resume.json, verify all sections appear
- **Phase gate:** Manual verification of all success criteria before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test framework installed — if automated tests desired: `npm install -D vitest @vitest/ui`
- [ ] Sample `resume.json` test fixture file for manual import testing (create once, reuse)

*(Note: This project has no test infrastructure. All validation is manual. This is consistent with prior phases.)*

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/main/db/schema.ts`, `src/main/db/index.ts`, `src/main/handlers/templates.ts`, `src/main/handlers/export.ts`, `src/main/handlers/submissions.ts`, `src/main/handlers/projects.ts`, `src/main/handlers/index.ts`, `src/preload/index.ts`, `src/preload/index.d.ts`, `src/renderer/src/components/ExperienceTab.tsx`, `src/renderer/src/components/VariantBuilder.tsx`, `src/renderer/src/components/ProfessionalLayout.tsx`, `src/renderer/src/components/PrintApp.tsx`, `src/renderer/src/components/VariantPreview.tsx`, `src/renderer/src/components/SnapshotViewer.tsx`, `src/renderer/src/components/ProjectList.tsx`, `src/renderer/src/components/ProjectItem.tsx`, `src/renderer/src/components/JobItem.tsx`, `src/renderer/src/components/Toast.tsx`
- resume.json official schema: https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json — verified field names, section names, array structures

### Secondary (MEDIUM confidence)
- better-sqlite3 synchronous transaction pattern — verified from existing code usage in `templates.ts` (`sqlite.transaction()`)
- Electron `dialog.showOpenDialog` for file picker — already used as `dialog.showSaveDialog` in export.ts; `showOpenDialog` is symmetric

### Tertiary (LOW confidence)
- None — all critical claims verified from codebase or official schema

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; entire stack verified from codebase
- Architecture: HIGH — patterns taken directly from working existing code
- Field mapping: HIGH — resume.json schema fetched from official source
- Pitfalls: HIGH — identified from actual code anomalies (two copies of getBuilderDataForVariant, synchronous transaction requirement, etc.)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable project; no external dependencies to expire)
