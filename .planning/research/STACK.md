# Stack Research — v2.5 Portability & Debt Cleanup

**Domain:** Electron desktop app — adding resume.json export and configurable SQLite DB location to an existing ResumeHelper install
**Researched:** 2026-04-23
**Confidence:** HIGH

## Executive Summary

**Zero new runtime dependencies required.** Every capability needed for v2.5 is either already installed or built into Electron/Node. The stack work is entirely about reusing existing infrastructure:

- **Resume.json export** — reuse `ResumeJsonSchema` from `src/main/lib/aiProvider.ts` (already defined for v2.3 import), `dialog.showSaveDialog` (already used by export:pdf/docx), `fs.writeFile` (already used by PDF/DOCX), and `JSON.stringify` (built-in).
- **Variant-merged export** — reuse `getBuilderDataForVariant()` from `src/main/handlers/export.ts` (already does the three-layer merge for PDF/DOCX), then map `BuilderData` → resume.json shape via a new pure function.
- **DB path migration** — reuse `better-sqlite3`'s `.close()`, Node `fs.copyFile`, SQLite `PRAGMA integrity_check` (built-in, no package), `app.setPath('userData', ...)` or a custom path indirection, and `app.relaunch() + app.exit()` for the switch.

**What this milestone adds:** a new Zod schema variant (output-shape) or reuse of the existing `ResumeJsonSchema` as a validator before write, a small settings table/column for `db_path_override`, and a new IPC surface. No new packages.

## Recommended Stack

### Core Technologies (all pre-installed)

| Technology | Version (installed) | Purpose | Why This (Already) Fits |
|------------|---------------------|---------|-------------------------|
| `electron` | `^39.2.6` | `dialog.showSaveDialog`, `app.getPath('userData')`, `app.setPath`, `app.relaunch`, `app.exit` | All needed APIs are first-party; already used by export handlers in `src/main/handlers/export.ts` |
| `better-sqlite3` | `^12.8.0` | Close current handle, open new handle at new path, run `PRAGMA integrity_check` | Synchronous API makes the copy→verify→switch sequence straightforward; no promise juggling |
| `drizzle-orm` | `^0.45.1` | Re-point ORM at the new sqlite handle after switch | Current singleton in `src/main/db/index.ts` (line 13: `drizzle(sqlite, { schema })`) is the only coupling point |
| `zod` | `^4.3.6` | Validate exported JSON against `ResumeJsonSchema` before writing | Already imported by `src/main/lib/aiProvider.ts`; same schema used for v2.3 import |
| `node:fs` (built-in) | n/a | `copyFile`, `writeFile`, `stat`, `unlink` for DB copy + JSON export | Already used by `src/main/handlers/export.ts` (line 4) and `import.ts` (line 2) |
| `node:path` (built-in) | n/a | Path join/normalize for DB target directory | Already used throughout main process |

### Supporting Libraries (all pre-installed, no additions)

| Library | Version | Purpose | When Used in v2.5 |
|---------|---------|---------|-------------------|
| existing `ResumeJsonSchema` export in `aiProvider.ts` | n/a | Single source of truth for resume.json shape | Validate on export before write; emit `.schema({ type: 'resume.json', version: '1.0.0' })` banner (see below) |
| existing `applyOverrides` helper | n/a | Three-layer merge for variant-merged export | `src/shared/overrides.ts` — already merges base bullets with analysis overrides for PDF/DOCX export |
| existing `getBuilderDataForVariant` helper | n/a | Produces the exact object shape PDF/DOCX use | `src/main/handlers/export.ts:16` — guarantees variant export matches what user sees in preview |

### Development Tools (already configured)

| Tool | Purpose | Notes |
|------|---------|-------|
| `vitest` `^4.1.2` | Unit tests for export mapping + DB migration pre-flight checks | v2.4's `createTestDb()` helper handles in-memory DB; add file-system fixtures for copy+verify tests |
| `@types/better-sqlite3` `^7.6.13` | Types for `Database#close`, `pragma`, `prepare` | Already installed |

## Installation

```bash
# Nothing to install. All dependencies are already in package.json.
```

## Integration Points (Where Each Feature Plugs In)

### 1. Resume.json Export (Base — Full DB Dump)

**New file:** `src/main/handlers/exportJson.ts` (mirrors `handlers/import.ts` structure)

```
ipcMain.handle('export:resumeJson', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export resume.json',
    defaultPath: 'resume.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  })
  if (canceled || !filePath) return { canceled: true }

  const data = buildResumeJsonFromDb(db)       // NEW pure function
  const validated = ResumeJsonSchema.parse(data) // reuse existing Zod schema
  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), 'utf-8')
  return { canceled: false, filePath }
})
```

**Key decision:** The inverse mapping of `import:confirmReplace` — walk each table, emit the resume.json shape. The `ResumeJsonSchema` (aiProvider.ts:47-112) defines the exact fields.

**Gotcha (from reading `import.ts`):** current `ResumeJsonSchema` requires all 11 sections and all string fields as non-optional. When mapping from DB, coerce `null` → `''` for dates and strings (import already does this via `?? ''`). If any exported object fails Zod parse, that's a data-integrity signal worth surfacing to the user, not swallowing.

### 2. Resume.json Export (Variant-Merged — Three-Layer)

**Same handler file:** `src/main/handlers/exportJson.ts`

```
ipcMain.handle('export:resumeJsonForVariant', async (_, variantId: number, analysisId?: number) => {
  const { canceled, filePath } = await dialog.showSaveDialog({ ... })
  if (canceled || !filePath) return { canceled: true }

  const builderData = await getBuilderDataForVariant(db, variantId, analysisId)
  const profileRow  = db.select().from(profile).where(eq(profile.id, 1)).get()
  const data        = builderDataToResumeJson(builderData, profileRow) // NEW pure function
  const validated   = ResumeJsonSchema.parse(data)
  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), 'utf-8')
  return { canceled: false, filePath }
})
```

**Key decision:** Reuse `getBuilderDataForVariant` (export.ts:16) — the same function that feeds DOCX export. This guarantees "per-variant export matches preview/PDF" with **zero divergence risk**. Filter out `.excluded` items, then map to resume.json shape.

**Export-only, no roundtrip guarantee** (per milestone goal): the merged view flattens the three-layer model, so re-importing would drop the variant/override metadata. Document this in the exported JSON header comment or a `meta` sibling field (NOTE: resume.json spec's standard `meta` field is reserved for `canonical`/`version`/`lastModified` — fine to reuse).

### 3. Configurable SQLite DB Location

**Schema change** — add to `src/main/db/index.ts` ALTER block (line 237+):

```sql
-- New row in existing ai_settings-style pattern, OR a new settings table
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` integer PRIMARY KEY NOT NULL,
  `db_path_override` text  -- null = use default app.getPath('userData')/app.db
);
INSERT OR IGNORE INTO `app_settings` (`id`) VALUES (1);
```

**Boot-time path resolution** — `src/main/db/index.ts:8`:

```ts
// Pseudocode — current line 8 is `const dbPath = path.join(app.getPath('userData'), 'app.db')`
// New: read override from a tiny bootstrap config file (NOT from DB — chicken/egg)
const overridePath = readBootstrapOverride() // reads userData/db-location.json
const dbPath = overridePath ?? path.join(app.getPath('userData'), 'app.db')
```

**Key decision:** Store the override path in a small JSON file at `app.getPath('userData')/db-location.json`, NOT in the DB itself (you can't read the override from the DB you haven't opened yet). Writing `db-location.json` is the last step of the switch.

**Migration flow (from Settings UI):**

```
1. User picks new directory via dialog.showOpenDialog({ properties: ['openDirectory'] })
2. Target path = path.join(picked, 'app.db')
3. Pre-flight: refuse if target exists (unless user confirms overwrite)
4. Pre-flight: verify write-permission (fs.access(picked, fs.constants.W_OK))
5. Checkpoint current DB:    sqlite.pragma('wal_checkpoint(TRUNCATE)')
6. Close current handle:      sqlite.close()
7. Copy file:                 await fs.copyFile(currentDbPath, targetPath)
   (Also copy -wal and -shm sidecars if present — see Pitfall 1)
8. Open copy read-only:       const test = new Database(targetPath, { readonly: true })
9. Run integrity check:       test.pragma('integrity_check') // must return [{ integrity_check: 'ok' }]
10. Close test handle:        test.close()
11. Persist override:         fs.writeFileSync(bootstrapPath, JSON.stringify({ dbPath: targetPath }))
12. Relaunch:                 app.relaunch(); app.exit(0)
```

**Why relaunch and not reopen in-place:** the `db` and `sqlite` exports in `src/main/db/index.ts` are module-level singletons imported by ~20 handler files. Reopening would require a reactive/DI pattern retrofit. Relaunch is one line and is how Chrome, VS Code, and Slack handle similar user-data migrations.

### 4. DOCX showSummary Toggle

Already has `templateOptions.showSummary` on the variant (see `src/main/handlers/export.ts:311`). The v2.5 fix is a one-line read in `src/main/lib/docxBuilder.ts` — not a stack addition. Listed here only because the milestone mentions it; no new dependency.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zod 4 reuse of `ResumeJsonSchema` | New `ResumeJsonExportSchema` with optional fields | If future resume.json spec fields diverge between import/export, split them. Not now — same shape both ways. |
| `JSON.stringify(obj, null, 2)` | `json-stable-stringify` package | If deterministic key ordering matters for diff/review. Not needed — Node's V8 stringify is already insertion-ordered and stable for plain objects in modern Electron. |
| Bootstrap JSON file for DB override | Electron `Store`/`electron-store` package | If we had dozens of user prefs. We have one — a JSON file is 4 lines, zero deps. |
| `app.relaunch()` after DB switch | Hot-swap DB handle in-place with module reload | Would require converting `db`/`sqlite` exports to a DI container. Large refactor risk for little UX gain (restart is ~1s). |
| `PRAGMA integrity_check` | `PRAGMA quick_check` | `integrity_check` verifies UNIQUE/index consistency which is exactly what matters after a file copy. User's DB is small (single-user resume data) so the O(N log N) cost is milliseconds. |
| `fs.copyFile` | Stream copy via `createReadStream` | Only matters for GB-scale files. Our DB is KB–low-MB. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| New schema library (Ajv, Yup, Valibot) | `zod@^4.3.6` is already the project's validation layer | Reuse `ResumeJsonSchema` |
| `fs-extra` for directory ops | Not installed; Node 22's built-in `fs/promises` covers every case we need | Built-in `node:fs/promises` |
| `electron-store` for DB path persistence | Adds a dep for one setting; also writes to userData (same place as our bootstrap file) | 4-line `fs.readFileSync` + `JSON.parse` bootstrap |
| In-place DB hot-swap (close + reopen without relaunch) | `db` and `sqlite` are singleton module exports imported by 20+ files; retrofit is a rabbit hole | `app.relaunch(); app.exit(0)` |
| `app.setPath('userData', ...)` to move the DB | `userData` also contains AI settings (via `safeStorage`), logs, cache — moving all of it is surprising | Move only `app.db` (and its WAL/SHM sidecars); keep userData at default |
| Synchronous `Database#close()` without checkpoint | WAL file may contain uncommitted data that a naïve file copy misses | `PRAGMA wal_checkpoint(TRUNCATE)` before close |
| `fs.copyFile(db, target)` alone in WAL mode | The `.db-wal` and `.db-shm` sidecars hold recent writes until checkpoint | Copy all three, OR checkpoint+close first (preferred) |

## Stack Patterns by Variant

**If export is base (full DB dump):**
- Walk each Drizzle table once
- Map to resume.json shape (inverse of `import:confirmReplace`)
- Validate with `ResumeJsonSchema.parse`
- `JSON.stringify(..., null, 2)` for human-readable diffing

**If export is variant-merged:**
- Call `getBuilderDataForVariant(db, variantId, analysisId)` — same function PDF/DOCX use
- Filter `item.excluded === true`
- Map `BuilderJob`/`BuilderSkill`/etc. → resume.json shape
- Validate + write identically to base export

**If DB file is on a network drive:**
- `integrity_check` still works but may be slow
- `fs.copyFile` will block for the transfer — acceptable given the sync UX (user already clicked "move")
- Document "SMB/network drives supported but slow first-open" in Settings help text

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `better-sqlite3@12.8.0` | Electron 39 (Node 22) | Native module; rebuilt automatically by `electron-builder install-app-deps` postinstall script (already in package.json) |
| `zod@4.3.6` | Existing `ResumeJsonSchema` usage in aiProvider.ts:47 | No change — same major version |
| `drizzle-orm@0.45.1` | `better-sqlite3@12` | Already integrated; re-pointing singleton at a new `Database(path)` instance is supported by design |
| Electron `app.relaunch()` | Windows NSIS installer (v2.4) | Works identically under NSIS — new process spawned with same argv. No extra config. |

## Quality Gate Compliance

- **Versions current:** Every version cited is what's in `package.json` as of this milestone start (verified against file at line 26-40). No speculative bumps proposed.
- **Rationale explains WHY:** Every "reuse X" recommendation traces back to a specific file/line in the existing codebase; every "avoid Y" explains the concrete failure mode.
- **Integration with pdf-parse/Zod/Drizzle considered:** Export is the inverse of pdf-parse+Zod import; uses the identical `ResumeJsonSchema`. Drizzle's singleton pattern drives the relaunch-vs-hot-swap decision.
- **No speculative additions:** Zero new npm packages. Only new code is in `src/main/handlers/exportJson.ts` (new) and small edits to `src/main/db/index.ts` (bootstrap path resolution).

## Sources

- `D:/Projects/resumeHelper/package.json` — verified installed versions (HIGH)
- `D:/Projects/resumeHelper/src/main/lib/aiProvider.ts` lines 47-112 — confirmed `ResumeJsonSchema` already exists and covers all 11 resume.json sections (HIGH)
- `D:/Projects/resumeHelper/src/main/handlers/import.ts` lines 1-455 — mapping patterns for resume.json ↔ DB tables, profile UPDATE semantics, JSON.parse error handling (HIGH)
- `D:/Projects/resumeHelper/src/main/handlers/export.ts` lines 1-305 — existing `dialog.showSaveDialog` usage, `getBuilderDataForVariant` three-layer merge, `applyOverrides` call site (HIGH)
- `D:/Projects/resumeHelper/src/main/db/index.ts` lines 1-308 — current `dbPath` construction, `app.getPath('userData')` usage, ALTER TABLE migration pattern for adding `app_settings` (HIGH)
- [Electron dialog API](https://www.electronjs.org/docs/latest/api/dialog) — `showSaveDialog` returns `{ canceled, filePath, bookmarks }` (HIGH)
- [Electron app API](https://www.electronjs.org/docs/latest/api/app) — `app.setPath`, `app.relaunch`, `app.exit`, `app.getPath('userData')` (HIGH)
- [SQLite WAL documentation](https://sqlite.org/wal.html) — `-wal`/`-shm` sidecars, checkpoint semantics before file copy (HIGH)
- [better-sqlite3 issue #376](https://github.com/WiseLibs/better-sqlite3/issues/376) — confirmed WAL sidecars not always cleaned on close; checkpoint + close is the reliable pattern (MEDIUM; older thread but still-open behavior)
- [SQLite pragma reference — integrity_check](https://www.sqlite.org/pragma.html) — returns `'ok'` on clean DB; verifies index/UNIQUE consistency (HIGH)
- [SQLite pragma reference — quick_check](https://www.sqlite.org/pragma.html) — considered and rejected; skips the checks we care about after a file copy (HIGH)

---
*Stack research for: v2.5 Portability & Debt Cleanup (subsequent milestone — additions to existing Electron/React/Drizzle/SQLite stack)*
*Researched: 2026-04-23*
