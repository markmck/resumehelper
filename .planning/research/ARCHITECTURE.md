# Architecture Research

**Domain:** Electron desktop app — v2.5 Portability & Debt Cleanup integration
**Researched:** 2026-04-23
**Confidence:** HIGH (all findings cross-referenced against source; no training-data assertions)

## Scope

This is **integration research** for a subsequent milestone, not a greenfield architecture study. The question is not "what should an Electron resume app look like?" but "how do five specific v2.5 features graft onto ResumeHelper's existing Electron + Drizzle + three-layer-merge architecture, and where are the friction points?"

Features analyzed:
1. Resume.json export — base (full DB dump)
2. Resume.json export — variant-merged (three-layer merge → serialize)
3. Configurable SQLite DB location (copy → verify → switch)
4. DOCX `showSummary` toggle honored
5. Tech debt cleanup (TEMPLATE_LIST, compact prop, tests/setup.ts, jobs.test.ts race)

## Current Architecture Snapshot (verified)

### Layer layout (relevant subset)

```
src/
├── main/
│   ├── index.ts                  # app.whenReady → registerAllHandlers → createWindow
│   ├── db/
│   │   ├── index.ts              # Singleton `db` + `sqlite` exports, ensureSchema() runs at import time
│   │   └── schema.ts             # Drizzle table definitions
│   ├── handlers/                 # ipcMain.handle wiring + extracted pure functions
│   │   ├── index.ts              # registerAllHandlers() — single registration list
│   │   ├── export.ts             # getBuilderDataForVariant(db, variantId, analysisId?) + export:pdf/docx/snapshotPdf
│   │   ├── import.ts             # import:parseResumeJson/confirmReplace/parseResumePdf/confirmAppend
│   │   ├── templates.ts          # ALSO has getBuilderDataForVariant (returns summaryExcluded) — DIVERGENCE
│   │   ├── settings.ts           # getAiSettings / setAiSettings / listModels / testAi
│   │   └── (jobs, bullets, skills, projects, profile, submissions, etc.)
│   └── lib/
│       ├── docxBuilder.ts        # buildResumeDocx() — pure function, 525 lines
│       ├── aiProvider.ts
│       ├── pdfResumePrompt.ts
│       └── jobPostingUrlPrompt.ts
├── shared/
│   └── overrides.ts              # applyOverrides(bullets, overrides) — the three-layer merge primitive
├── preload/
│   ├── index.ts                  # contextBridge exposing window.api namespaces
│   └── index.d.ts                # Source of truth for Builder* types
└── renderer/src/
    ├── PrintApp.tsx              # Single render target for preview + PDF export + snapshot
    ├── components/templates/
    │   ├── resolveTemplate.ts    # TEMPLATE_MAP + orphan TEMPLATE_LIST export
    │   ├── types.ts              # ResumeTemplateProps — has vestigial `compact?: boolean`
    │   └── (Classic|Modern|Jake|Minimal|Executive)Template.tsx
```

### Key patterns in play

| Pattern | Location | Implication for v2.5 |
|---------|----------|----------------------|
| Handler extraction `(db: Db, ...args)` | `src/main/handlers/*.ts` | New export functions MUST follow this — it's why 143 tests can run without IPC |
| Singleton `db` + `sqlite` from `src/main/db/index.ts` | Imported module-wide | **Blocker for DB relocation** — imports capture the reference at load time |
| `ensureSchema()` runs at module import | `src/main/db/index.ts:307` | Re-init on DB swap is non-trivial — see "DB connection lifecycle" below |
| `templateOptions` as JSON text column | `template_variants.templateOptions` | v2.5 settings will need a *different* storage mechanism (see Q5 answer) |
| Three-layer merge via `applyOverrides()` | `src/shared/overrides.ts` | **Reusable as-is** for variant-merged resume.json export |
| Snapshot payload shape | `export:snapshotPdf` handler, lines 310–353 | Already a resume-like JSON; overlaps with resume.json target shape |

## Answers to Integration Questions

### Q1. Where should resume.json export pure functions live?

**Recommendation:** Mirror the import pattern exactly.

```
src/main/handlers/export.ts
├── getBuilderDataForVariant(db, variantId, analysisId?)    # EXISTING
├── buildBaseResumeJson(db): ResumeJson                      # NEW — full DB dump
├── buildVariantResumeJson(db, variantId, analysisId?):      # NEW — uses getBuilderDataForVariant
│       ResumeJson
└── registerExportHandlers() registers:
    ├── export:resumeJsonBase         # NEW ipcMain.handle — save dialog + writeFile
    └── export:resumeJsonVariant      # NEW ipcMain.handle — save dialog + writeFile
```

**Why here, not a new file:**
- `export.ts` already owns the save-dialog + writeFile pattern for PDF/DOCX. Splitting resume.json into its own handler file would create a 4th export channel in the preload bridge for no modularity gain.
- `getBuilderDataForVariant` is already the upstream producer. `buildVariantResumeJson` is a thin serializer on top of its output.
- Mirrors `ResumeJson` interface already declared at the top of `import.ts` (lines 10–75) — that interface is the **de facto shape spec**. Lift it to `src/shared/resumeJson.ts` so both import and export reference the same type.

**Why NOT mirror `importResumeFromPdf` structurally:**
The PDF import has `parse` + `confirmAppend` as two IPC channels because the renderer shows a confirmation modal between them. Export has no such flow — it's a single save-dialog-then-write call. Two handlers (base/variant) is the right granularity.

### Q2. Reuse `applyOverrides()` for variant merge → serialize?

**Yes, but with a caveat.** The three-layer merge is already done inside `getBuilderDataForVariant` before data is returned (see `export.ts:181–195` and `templates.ts:299–313`). Do NOT re-merge — that function already produces the merged view used by preview/PDF/DOCX.

**Correct data flow for `buildVariantResumeJson`:**

```
buildVariantResumeJson(db, variantId, analysisId?)
  │
  ├── calls getBuilderDataForVariant(db, variantId, analysisId)
  │         → returns BuilderData with overrides already applied
  │         → includes `excluded: boolean` on every row
  │         → (in templates.ts version, also returns summaryExcluded)
  │
  ├── gets profile row + templateOptions
  │
  ├── filters out excluded items (.filter(x => !x.excluded))
  │
  └── serializes to ResumeJson shape:
        basics (from profile, applying summaryExcluded)
        work[] (from included jobs + included bullets)
        skills[] (from included skills, re-grouped by categoryName)
        projects[], education[], volunteer[], awards[],
        publications[], languages[], interests[], references[]
```

**Friction: there are TWO `getBuilderDataForVariant` functions.** One in `export.ts` (returns no `summaryExcluded`), one in `templates.ts` (returns it). The export path uses the export.ts version. This is pre-existing divergence — see `src/main/handlers/export.ts:16` vs `src/main/handlers/templates.ts:318`. **v2.5 will want the templates.ts version** (or reconcile them) so `summaryExcluded` round-trips. Tech debt already implicit here that the planner should flag.

### Q3. DB connection lifecycle on path change

**This is the hardest integration in the milestone.** The current architecture has two hard dependencies on DB being open at import time:

1. `src/main/db/index.ts:8-13` opens the DB **as module side-effect**:
   ```ts
   const dbPath = path.join(app.getPath('userData'), 'app.db')
   const sqlite = new Database(dbPath)
   export const db = drizzle(sqlite, { schema })
   ```
2. 18+ handler files do `import { db } from '../db'` (or `sqlite`) at the top. The references are **bound at import time**. Reassigning `db` in `db/index.ts` after a path change does NOT update these bindings — ES module exports are live bindings only for the module that declares them, and re-exporting a `let` works in theory but is brittle for consumers doing `const { db } = require(...)` style usage.

**Three viable designs, ranked:**

**(A) Proxy-wrapped export (recommended).** Change `src/main/db/index.ts` to export a Proxy that forwards all property access to an internal, replaceable `currentDb` reference. Consumers keep writing `import { db } from '../db'`. Add a `reopenDb(newPath: string)` function that:
```
1. currentDb → run any final flushes, then sqlite.close()
2. Copy old file → newPath (fs.copyFile)
3. Verify: open newPath read-only, PRAGMA integrity_check, SELECT COUNT(*) from jobs
4. On failure → restore original, throw
5. Open new Database(newPath), pragma WAL, run ensureSchema()
6. Replace currentDb internals (Proxy now forwards to the new instance)
7. Persist newPath in the dbPath setting (see Q5)
```
Minimal handler changes. Electron docs and better-sqlite3 docs both support this pattern (close + new Database on a different path).

**(B) App relaunch after switch.** After copy + verify, persist new path, then `app.relaunch(); app.exit(0)`. Simpler but user-hostile: loses unsaved renderer state, analysis mid-scroll, etc.

**(C) Dependency-inject `db` into handlers at register time.** Most architecturally clean, but requires changing every `registerXHandlers()` signature and the 20+ files that import `db` directly. **Out of scope for a debt-cleanup milestone** — don't bundle this churn with v2.5.

**Caching gotchas identified:**
- `WAL` mode creates `app.db-wal` and `app.db-shm` sidecar files. Migration must copy all three (or checkpoint + copy main file only). Do `sqlite.pragma('wal_checkpoint(TRUNCATE)')` before copy.
- `better-sqlite3` holds OS file handles — on Windows, the source file can't be deleted while open. Close before fs.copyFile (not rename — we want to keep the backup).
- `ensureSchema()` runs ALTER TABLE in try/catch. Safe to re-run on the new file. File-based Drizzle migrations (`migrate(db, { migrationsFolder })` at `db/index.ts:300`) are also idempotent.
- `dialog.showOpenDialog({ properties: ['openDirectory'] })` is the right picker — user picks a folder, we append `app.db`. Don't let them pick a file; filenames must be consistent.
- On failure mid-migration, the original DB was closed but not yet replaced. Need a recovery path: reopen original before rethrowing.

**Data flow:**
```
Settings UI → dbPath:change IPC
    ↓
validate(newFolder) — writable? enough space?
    ↓
sqlite.pragma('wal_checkpoint(TRUNCATE)')
sqlite.close()
    ↓
fs.copyFile(oldPath, newPath)
fs.copyFile(oldPath + '-wal', newPath + '-wal')  # if exists
    ↓
verify: new Database(newPath, { readonly: true })
        → PRAGMA integrity_check
        → quick sanity SELECT
        → close
    ↓
ON FAILURE: reopen oldPath, return error
ON SUCCESS: open newPath writable, ensureSchema(),
            swap Proxy target, persist setting, return { success, oldPath (for backup toast) }
```

### Q4. Where is `showSummary` read in DOCX vs. HTML — divergence point

**Confirmed divergence located.** This is the critical finding:

**HTML/PDF path (working):**
- Storage: `template_variant_items` row with `item_type='summary'`, `excluded=1` (no `*_id` columns used)
- `src/main/handlers/templates.ts:315-318` — `getBuilderDataForVariant` detects the row and returns `summaryExcluded: boolean`
- `src/renderer/src/PrintApp.tsx:170-171` — `setShowSummary(!(builderData.summaryExcluded ?? false))`
- `src/renderer/src/components/templates/ClassicTemplate.tsx:121` (and all 5 templates) — `{showSummary && profile?.summary && (<div>...)}`

**DOCX path (broken / missing):**
- `src/main/handlers/export.ts:278-305` — `export:docx` handler builds `templateOptions` from `variant.templateOptions` JSON column, then calls `buildResumeDocx(builderData, profileRow, layoutTemplate, templateOptions)`
- `src/main/lib/docxBuilder.ts:55-60` — `buildResumeDocx` signature accepts `templateOptions: { marginTop, marginBottom, marginSides, skillsDisplay, accentColor }` — **no `showSummary` field**
- `src/main/lib/docxBuilder.ts:122-130` — unconditionally emits the summary paragraph if `profileRow?.summary` is truthy:
  ```ts
  ...(profileRow?.summary ? [
    new Paragraph({ children: [new TextRun({ text: profileRow.summary, ... })], ... }),
  ] : []),
  ```

**The root-cause asymmetry:** `showSummary` is stored in `template_variant_items` (as an exclusion row), NOT in `template_variants.templateOptions` (the JSON column). The DOCX handler reads the JSON column; the HTML handler reads via `getBuilderDataForVariant` which reads `template_variant_items`. The snapshot path (`export:snapshotPdf`, line 393) does have `showSummary` in its payload because the snapshot freezes merged state — that's the *only* DOCX-adjacent code that currently knows about the flag.

**Two-line fix, specifically:**

1. `src/main/handlers/export.ts:299` (the `export:docx` handler):
   - Switch to using the `templates.ts` version of `getBuilderDataForVariant` (which returns `summaryExcluded`), OR add the same exclusion-lookup to the `export.ts` version (reconciling the divergence).
   - Pass `showSummary: !builderData.summaryExcluded` through templateOptions or a new param.

2. `src/main/lib/docxBuilder.ts`:
   - Widen `templateOptions` type to include `showSummary?: boolean` (default true).
   - Wrap the summary paragraph in `(showSummary ?? true) && profileRow?.summary ? [...] : []`.

**Build order consequence:** The variant-merged resume.json export (Q1/Q2) wants the same `summaryExcluded` value to know whether to emit `basics.summary`. So **reconcile the two `getBuilderDataForVariant` functions first** — fixing DOCX `showSummary` and enabling variant export are the *same* underlying refactor.

### Q5. Migration of settings table for new `dbPath` setting

**Do NOT add `dbPath` to the DB.** It has a chicken-and-egg problem: you can't store "where the DB lives" inside the DB you're about to relocate.

**Three storage options, recommendation bolded:**

**(A) `electron-store` or plain JSON in `app.getPath('userData')/config.json`.** ⭐ **Recommended.** The app-data directory is *always* stable (`%APPDATA%/<name>`) regardless of where the SQLite file moves. Matches Electron conventions. Read at app start, fall back to default path if missing. Zero DB coupling. `electron-store` is a thin wrapper; plain `fs.promises.writeFile` + `JSON.parse` is also fine for one setting.

**(B) Command-line arg or env var.** Awful UX; rules out a Settings UI toggle.

**(C) New row in `ai_settings`.** Works but conceptually wrong — can't read the setting until the DB is open, and we need the setting to decide which DB to open.

**What about other future settings?** There's no current `user_preferences` table. `ai_settings` is the only user-preference-like table. If v2.5+ adds more settings (theme, etc.), the JSON config file scales fine for a handful. If it grows past ~10 fields, consider migrating `ai_settings` out of the DB too, for the same "settings must survive DB swap" reason. **Not in v2.5 scope.**

**Migration implication for existing users:** None. First launch after v2.5 with no `config.json` → use default path (`userData/app.db`) → same behavior as today. User-visible migration = "Settings → DB location" UI only. Zero forced migration.

## New vs. Modified Files

### New files

| File | Purpose |
|------|---------|
| `src/shared/resumeJson.ts` | `ResumeJson` interface (lifted from `import.ts`), shared by import + export |
| `src/shared/resumeJsonBuilder.ts` *(optional)* | If `buildBaseResumeJson` / `buildVariantResumeJson` grow past ~150 lines, extract here; otherwise inline in `export.ts` |
| `src/main/config/appConfig.ts` | Read/write `userData/config.json` — owns `dbPath` setting |
| `src/renderer/src/components/SettingsDbLocation.tsx` | Settings UI section for DB location picker + migrate button |

### Modified files

| File | Change | Reason |
|------|--------|--------|
| `src/main/db/index.ts` | Wrap `db`/`sqlite` exports in Proxy; add `reopenDb(newPath)`, `getCurrentDbPath()`; read initial path from `appConfig` | Enable path switching (Q3) |
| `src/main/handlers/export.ts` | Add `buildBaseResumeJson`, `buildVariantResumeJson`; register `export:resumeJsonBase`, `export:resumeJsonVariant`; fix `export:docx` to pass `showSummary` | Q1, Q2, Q4 |
| `src/main/handlers/templates.ts` | Reconcile `getBuilderDataForVariant` with `export.ts` version OR have `export.ts` call into it | Remove duplication; unblock Q2 + Q4 |
| `src/main/lib/docxBuilder.ts` | Add `showSummary?: boolean` to `templateOptions`; gate summary paragraph emission | Q4 |
| `src/main/handlers/settings.ts` | Add `settings:getDbPath`, `settings:setDbPath` handlers (which call `reopenDb`) | Wire Q3+Q5 |
| `src/main/handlers/import.ts` | Import `ResumeJson` from `src/shared/resumeJson.ts` instead of local declaration | Dedup with export |
| `src/preload/index.ts` | Add `window.api.export.resumeJsonBase/Variant`, `window.api.settings.getDbPath/setDbPath` | IPC bridge |
| `src/preload/index.d.ts` | Add types for new API surface | TypeScript |
| `src/renderer/src/components/templates/resolveTemplate.ts` | **Remove** `TEMPLATE_LIST` export (orphan, confirmed unused outside this file) | Debt cleanup |
| `src/renderer/src/components/templates/types.ts:28` | **Remove** `compact?: boolean` from `ResumeTemplateProps` | Debt cleanup (confirmed vestigial) |
| `tests/setup.ts` | Either **delete** (file is currently orphaned — not referenced in `vitest.config.ts`'s `setupFiles` which doesn't exist) or wire it via `test.setupFiles: ['./tests/setup.ts']` in `vitest.config.ts` | Debt cleanup |
| `tests/unit/handlers/jobs.test.ts` | Investigate race under `--pool=threads`; likely root cause is shared in-memory DB state bleeding across parallel test files since `createTestDb()` uses `:memory:` per-call but the vestigial `tests/setup.ts` mocks `src/main/db` with a single shared instance | Debt cleanup |
| `vitest.config.ts` | Wire `setupFiles` if keeping `tests/setup.ts`; OR add `pool: 'forks'` / `poolOptions.threads.singleThread: true` as a band-aid if deletion alone doesn't fix the race | Debt cleanup |

### Notable non-changes

- `src/shared/overrides.ts` — `applyOverrides()` unchanged. Already does what variant export needs.
- `src/main/db/schema.ts` — No schema changes. `dbPath` lives outside DB. `showSummary` storage stays in `template_variant_items` (no migration needed).
- Renderer template components — DOCX is a separate builder; `showSummary` fix is main-process only.

## Suggested Build Order

Optimize for (a) unblocking dependencies early, (b) maximizing parallelizable tech-debt work.

### Phase 1 (sequential — foundational)

1. **Reconcile the two `getBuilderDataForVariant` functions.**
   - Pick the `templates.ts` version (returns `summaryExcluded`).
   - Make `export.ts` call it instead of duplicating.
   - This single refactor unblocks both DOCX `showSummary` and variant-merged resume.json export.
   - Risk: low — 143 existing tests will catch regressions in exclusion handling.

2. **Lift `ResumeJson` interface to `src/shared/resumeJson.ts`.**
   - Used by both import and export. Single source of truth.

### Phase 2 (parallelizable)

These three work streams do not touch each other after Phase 1:

- **Stream A — Resume.json export:** `buildBaseResumeJson`, `buildVariantResumeJson`, IPC wiring, Settings/Variant-builder UI button.
- **Stream B — DOCX showSummary:** `docxBuilder.ts` type widening + conditional; `export:docx` handler passes the flag through.
- **Stream C — Tech debt (all independent):** TEMPLATE_LIST removal, compact prop removal, tests/setup.ts decision, jobs.test.ts race.

### Phase 3 (sequential — highest risk)

4. **Configurable DB location.**
   - Must be last because it touches module-level side effects (`src/main/db/index.ts`) that every handler imports.
   - Implement Proxy wrapper + `reopenDb()` + `appConfig` + settings UI.
   - Gate with thorough testing on Windows specifically (handle-locking semantics differ from POSIX).

### Rationale for NOT doing DB relocation first

Even though it looks foundational, doing it first creates merge pain: every other stream touches handler files, and those files import `db`. Changing the `db` export shape mid-milestone causes conflicts. Do DB relocation after the export work stabilizes.

## Patterns to Follow

### Pattern 1: Handler extraction with `Db` first param

**Already established (v2.4).** All new export functions must follow this. Example from `settings.ts:13`:

```typescript
export function getAiSettings(db: Db) {
  const row = db.select().from(aiSettings).where(eq(aiSettings.id, 1)).get()
  ...
}

// Registration:
ipcMain.handle('settings:getAi', () => getAiSettings(db))
```

Apply verbatim to `buildBaseResumeJson(db)`, `buildVariantResumeJson(db, variantId, analysisId?)`, `reopenDb(newPath)`.

### Pattern 2: Shared types in `src/shared/`

**Established.** `src/shared/overrides.ts` declares `BulletOverride` + `applyOverrides()` and both main + renderer import it. Apply the same for `ResumeJson`.

### Pattern 3: Settings survive DB swap — store outside DB

**New pattern for v2.5.** Any setting that controls *where data lives* or *whether the DB is reachable* cannot live in the DB. Write to `app.getPath('userData')/config.json`.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding `dbPath` to `ai_settings` or a new DB table

**Why bad:** Chicken-and-egg — can't query the DB to find out where the DB is.
**Do instead:** JSON file in `userData/` (see Q5).

### Anti-Pattern 2: Re-running `applyOverrides()` inside the export serializer

**Why bad:** `getBuilderDataForVariant` already merges. Second merge is a no-op at best, a double-override-application bug at worst.
**Do instead:** Trust the BuilderData. Filter by `excluded` and serialize.

### Anti-Pattern 3: Storing `showSummary` in both `template_variant_items` AND `templateOptions` JSON

**Why bad:** Two sources of truth. Current asymmetry already hurts — don't entrench it.
**Do instead:** Keep `template_variant_items` exclusion row as the single storage. DOCX reads it via the reconciled `getBuilderDataForVariant` (Phase 1, step 1).

### Anti-Pattern 4: Using `app.relaunch()` for DB path change

**Why bad:** Discards renderer state (unsaved edits, scroll position, active analysis). User-hostile.
**Do instead:** In-process reopen via Proxy-wrapped exports.

### Anti-Pattern 5: Forgetting WAL sidecars in copy

**Why bad:** `better-sqlite3` + WAL creates `app.db-wal` and `app.db-shm`. Copying only `app.db` while WAL contains uncheckpointed writes = data loss.
**Do instead:** `sqlite.pragma('wal_checkpoint(TRUNCATE)')` before copy, then close, then copy the main file. After checkpoint-truncate the WAL file is empty and safe to ignore.

## Data Flow: DB Migration (definitive sequence)

```
[Settings UI] User clicks "Change DB location"
    ↓ dialog.showOpenDialog({ properties: ['openDirectory'] })
    ↓ newFolder
    ↓ IPC: settings:setDbPath(newFolder)

[Main: setDbPath handler]
    ↓ newPath = path.join(newFolder, 'app.db')
    ↓ validate: newPath !== currentPath; folder writable; >10MB free
    ↓
[reopenDb(newPath)]
    ↓ sqlite.pragma('wal_checkpoint(TRUNCATE)')
    ↓ sqlite.close()           # Windows: releases file handle
    ↓ fs.copyFile(currentPath, newPath)
    ↓ verify = new Database(newPath, { readonly: true })
    ↓ verify.pragma('integrity_check')  → expect 'ok'
    ↓ verify.prepare('SELECT COUNT(*) FROM jobs').get()  # sanity
    ↓ verify.close()
    ↓ if verification fails:
    │    new Database(currentPath)  # reopen original
    │    throw
    ↓ newSqlite = new Database(newPath)
    ↓ newSqlite.pragma('journal_mode = WAL')
    ↓ ensureSchema() against newSqlite
    ↓ Proxy target ← newSqlite / drizzle(newSqlite, { schema })
    ↓ appConfig.set('dbPath', newPath)
    ↓ return { success: true, backupPath: currentPath }

[Settings UI]
    ↓ Toast: "DB moved. Backup at {backupPath}. Delete when confident."
```

## Integration Points

### External

| Service | Integration | Notes |
|---------|-------------|-------|
| `dialog.showSaveDialog` | resume.json export | Reuse existing pattern from `export:pdf` / `export:docx` |
| `dialog.showOpenDialog({ properties: ['openDirectory'] })` | DB path picker | New |
| `safeStorage` | Not used by v2.5 | Only AI key encryption uses it today |
| OS file system | Copy + handle-release | Windows-specific handle behavior — test on Windows |

### Internal boundaries

| Boundary | Communication | v2.5 consideration |
|----------|---------------|--------------------|
| Main ↔ Renderer | IPC via preload `contextBridge` | 4 new channels (2 export, 2 settings) |
| `src/shared/` ↔ main + renderer | Direct import | `resumeJson.ts` new module; `overrides.ts` reused |
| `export.ts` ↔ `templates.ts` | Currently duplicated `getBuilderDataForVariant` | **Must reconcile in Phase 1, step 1** |
| `db/index.ts` module singleton ↔ 18+ consumer handlers | Named imports | Proxy wrapping preserves call sites |

## Tech Debt Mapping (to files, with confidence)

| Debt item | File + line | Confidence | Notes |
|-----------|-------------|------------|-------|
| Orphan `TEMPLATE_LIST` export | `src/renderer/src/components/templates/resolveTemplate.ts:21-26` | HIGH — grep confirmed only this file references it | Safe to delete the export; the `TEMPLATE_MAP` stays |
| Vestigial `compact` prop | `src/renderer/src/components/templates/types.ts:28` | HIGH — prop defined in `ResumeTemplateProps` but no template component consumes it | Delete line 28; TS will surface any hidden consumers |
| Dead `tests/setup.ts` | `tests/setup.ts` + `vitest.config.ts` | HIGH — `vitest.config.ts` has no `setupFiles` entry; the file is orphaned and only mocked DB leaks if accidentally imported | Delete the file. Individual tests already call `createTestDb()` per test. |
| `jobs.test.ts` race under thread pool | `tests/unit/handlers/jobs.test.ts` + `vitest.config.ts` | MEDIUM — likely interaction between orphaned `tests/setup.ts` mock and per-test `createTestDb()` calls | Deleting `tests/setup.ts` likely fixes the race. Verify with `npm test` before and after. Fallback: `poolOptions.threads.singleThread: true`. |

## Scaling Considerations

Not a growth-scaling question (desktop app, 1 user). But v2.5 has three *correctness-scaling* risks:

| Concern | Risk at typical use | Mitigation |
|---------|---------------------|------------|
| Large DB files during migration copy | 50MB DB with lots of analyses | `fs.copyFile` is atomic; no streaming needed at this scale |
| Variant export missing override round-trip | User edits bullets via AI, exports resume.json, re-imports → would lose override-vs-base distinction | Document explicitly: variant export is export-only (already noted in PROJECT.md Active). Re-import creates a new base with overrides flattened in. |
| Concurrent DB operations during reopenDb | Renderer makes IPC call mid-swap | Proxy target swap is synchronous. In-flight IPC completes on old handle before swap; new calls use new handle. Brief (<1s) UI freeze acceptable. |

## Sources

**Primary (this codebase — all paths absolute):**
- `D:/Projects/resumeHelper/src/main/db/index.ts` (lines 1-13 for singleton pattern, 307 for ensureSchema)
- `D:/Projects/resumeHelper/src/main/handlers/export.ts` (lines 16-209 for getBuilderDataForVariant, 278-305 for export:docx)
- `D:/Projects/resumeHelper/src/main/handlers/templates.ts` (lines 290-332 for the parallel getBuilderDataForVariant returning summaryExcluded)
- `D:/Projects/resumeHelper/src/main/handlers/import.ts` (lines 10-75 for ResumeJson interface)
- `D:/Projects/resumeHelper/src/main/handlers/settings.ts` (lines 13-60 for handler-extraction pattern)
- `D:/Projects/resumeHelper/src/main/handlers/index.ts` (registerAllHandlers aggregation)
- `D:/Projects/resumeHelper/src/main/lib/docxBuilder.ts` (lines 55-60 for signature, 122-130 for unconditional summary emission)
- `D:/Projects/resumeHelper/src/shared/overrides.ts` (applyOverrides definition)
- `D:/Projects/resumeHelper/src/renderer/src/PrintApp.tsx` (lines 170-171 for showSummary read)
- `D:/Projects/resumeHelper/src/renderer/src/components/templates/resolveTemplate.ts` (line 21 for TEMPLATE_LIST orphan)
- `D:/Projects/resumeHelper/src/renderer/src/components/templates/types.ts` (line 28 for compact prop)
- `D:/Projects/resumeHelper/tests/setup.ts` (orphaned per vitest.config.ts missing setupFiles)
- `D:/Projects/resumeHelper/vitest.config.ts` (no setupFiles entry confirms orphan)
- `D:/Projects/resumeHelper/.planning/PROJECT.md` (v2.5 target features and Key Decisions context)

**No external sources required** — this is integration analysis against a known codebase; all answers derive from code inspection.

---
*Architecture integration research for v2.5 Portability & Debt Cleanup*
*Researched: 2026-04-23*
