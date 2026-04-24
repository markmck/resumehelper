# Pitfalls Research — v2.5 Portability & Debt Cleanup

**Domain:** Electron desktop app (React + TypeScript + Drizzle + better-sqlite3) — adding JSON export, DB path relocation, DOCX parity fix, and debt cleanup
**Researched:** 2026-04-23
**Confidence:** HIGH (codebase inspection + official SQLite/JSON Resume docs verified)

---

## Critical Pitfalls

### Pitfall 1: resume.json export silently loses profile fields the schema supports

**What goes wrong:**
The app's `profile` table stores only 6 fields: `name`, `email`, `phone`, `location` (flat string), `linkedin`, `summary`. The JSON Resume spec's `basics` object is richer: `label`, `image`, `url`, full `location` sub-object (`address`, `postalCode`, `city`, `countryCode`, `region`), and `profiles` as an array of `{network, username, url}`. A naive base export writes only what's in the DB, making the exported file appear "complete" but missing the data a resume.json consumer expects. Worse, a user who imports a rich resume.json, edits in the app, and re-exports will discover the non-linkedin profiles and address metadata were silently dropped during import (see `src/main/handlers/import.ts:149` — only `profiles[0].url` is kept).

**Why it happens:**
The import path was written for the subset of fields the schema UI exposes. Export is the first time this asymmetry becomes visible, so the missing fields feel like a regression even though the data was never in the DB.

**How to avoid:**
- Document in `PROJECT.md` and the export code that base export is "lossy-faithful" to the current DB schema — it emits exactly what the DB stores, nothing synthesized.
- Before export, emit schema `$schema` pointer (`https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json`) so downstream validators immediately flag truncation if the user expects spec parity.
- For `basics.location`, wrap the flat string in `{city: location}` rather than emitting a bare string (spec violation if kept flat).
- For `basics.url`, emit empty string or omit rather than silently mapping linkedin into it (the two concepts are distinct).
- In a comment on the export function, enumerate the known-dropped fields: `label`, `image`, `basics.url`, `location.address/postalCode/countryCode/region`, `profiles[1..]`, `profiles[].network`, `profiles[].username`, skill `level`, project `description/url/startDate/endDate`, etc.

**Warning signs:**
- User imports a rich resume.json and notices their GitHub/Twitter profile disappeared.
- A resume.json validator (e.g., [resume-cli validate](https://github.com/jsonresume/resume-cli)) reports schema violations on exported files.

**Phase to address:** Phase 30 (Resume.json Base Export) — scope must explicitly call out lossy fidelity. Do NOT promise round-trip.

---

### Pitfall 2: Date format mismatch — app uses `YYYY-MM`, spec wants ISO 8601 with no silent coercion

**What goes wrong:**
The app stores dates as `YYYY-MM` strings (see `truncDate` in `import.ts:77`). JSON Resume spec requires ISO 8601, which formally is `YYYY-MM-DD` with `YYYY-MM` accepted in practice. More concerning: the app stores `endDate` as NULL for current positions, but spec expects either an ISO date or omission of the key. Emitting `"endDate": null` triggers validation failures in strict consumers, while emitting `"endDate": ""` is double-wrong.

**Why it happens:**
Drizzle returns NULL for unset `endDate` columns; a naive `JSON.stringify` serializes that as `null`. The code author assumes "null ~= missing" but the spec treats them differently.

**How to avoid:**
- In the export builder, use a field-filtering serializer: if the column is null/empty, OMIT the key entirely rather than emitting `null` or `""`.
- For dates, keep `YYYY-MM` — it validates as ISO 8601 date — but document the precision limit in the exported file's lineage comment if emitted.
- Write a unit test: import a resume.json with full `YYYY-MM-DD` dates, re-export, assert the dates round-trip as `YYYY-MM` (acknowledged precision loss) and no keys become `null`.

**Warning signs:**
- Running exported file through `resume-cli validate` or `ajv` against the official schema produces "type: expected string, got null" errors.
- User's published jsonresume.org theme renders "null" in date fields.

**Phase to address:** Phase 30 (Base Export) — the JSON builder utility must use omit-over-null semantics from day one, before variant-merged export depends on it.

---

### Pitfall 3: Variant-merged export silently drops accepted skill additions

**What goes wrong:**
Accepted skill additions live in `analysis_skill_additions` (status='accepted'), NOT in the `skills` table. The submission snapshot code (`submissions.ts:166-186`) knows to pull them in, but a new `exportVariantJson(variantId, analysisId)` function written from scratch will reuse `getBuilderDataForVariant` (which does NOT merge skill additions — see `export.ts:16-209`) and emit a resume missing the exact skills the user accepted via AI suggestions. The result is a JSON export that doesn't match the PDF the user just saved.

**Why it happens:**
`getBuilderDataForVariant` merges bullet overrides (three-layer bullet merge) but skill additions live in a separate table with a separate merge code path, and that path currently only runs inside `buildSnapshotForVariant`. The asymmetry is invisible to someone looking at `getBuilderDataForVariant` and assuming "this is the merged view."

**How to avoid:**
- Extract a single merged-view builder function (e.g., `buildMergedBuilderData(db, variantId, analysisId)`) that does BOTH bullet overrides AND skill additions. Call it from `getBuilderDataForVariant`, `buildSnapshotForVariant`, AND the new JSON export.
- Add an integration test: create a variant, run an analysis, accept a skill addition and a bullet override, then verify the JSON export contains both. Test should fail if either merge is missing.
- In the export handler, add an assertion: if `analysisId` is passed but the returned skills don't include any accepted additions from that analysis (and the DB has some), log an error. This catches the "merge path forgotten" regression in the next feature that reuses the code.

**Warning signs:**
- Unit-test scenario: variant with 5 base skills + 2 accepted additions should export 7 skills, not 5.
- User reports: "The PDF has React in it but the JSON export doesn't."

**Phase to address:** Phase 31 (Variant-Merged JSON Export) — REFACTOR merge helper FIRST (pre-plan or plan 31-01), then build export on top of it.

---

### Pitfall 4: Variant-merged export ignores job-level and summary toggles because they live in `template_variant_items`, not `templateOptions`

**What goes wrong:**
`showSummary` is stored as a sentinel row in `template_variant_items` where `item_type='summary'` (see `submissions.ts:43-48`). Job-level exclusions are also in that table (`item_type='job'`). A variant-merged JSON export that only reads `templateOptions` JSON will emit the profile summary AND all jobs even when the user toggled them off — because those toggles are driven by DB rows, not the JSON column.

**Why it happens:**
The original design put some toggles in `templateOptions` (JSON column: `accentColor`, `skillsDisplay`, margins) and others in `template_variant_items` (per-row excluded flag). There's no single source-of-truth for "what to include in this variant." The dual-home pattern was fine when the only consumers were the renderer (PrintApp) and the DOCX builder, because both go through `getBuilderDataForVariant` which consults both. But a new JSON export function written from scratch may only reach for one.

**How to avoid:**
- Reuse `getBuilderDataForVariant` as the authoritative "give me the filtered dataset" function. It already computes `excludedJobIds`, `excludedBulletIds`, etc., from `template_variant_items`.
- For the summary toggle specifically, replicate the `summaryRow` lookup from `buildSnapshotForVariant:42-48` verbatim. DO NOT read `variant.templateOptions.showSummary` as the primary source — that value is only populated AT SNAPSHOT TIME and may be stale on the variant row.
- In the JSON export: if `showSummary === false`, delete `basics.summary` from the output object (omit, not empty string).
- Write a test: toggle off job-level on a variant, export, verify the job is absent from `work[]`.

**Warning signs:**
- User toggles off a job in the variant builder, exports JSON, the excluded job still appears.
- User toggles off the summary, exports JSON, summary still present.

**Phase to address:** Phase 31 — test matrix must include all four toggle types (summary, job, bullet, skill) exclusion + one inclusion.

---

### Pitfall 5: SQLite DB copy without WAL checkpoint corrupts target on relocation

**What goes wrong:**
The app runs `PRAGMA journal_mode = WAL` (see `src/main/db/index.ts:11`). In WAL mode, a write lives in the `.db-wal` sidecar file until checkpointed into the main `.db`. If the user picks a new DB location and the app naively does `fs.copyFile(oldPath, newPath)`, the copy captures the main DB WITHOUT the uncommitted WAL tail — recent writes (the last analysis run, the last accept/dismiss click) are silently lost in the copied DB. If the user then switches and deletes the old DB, that data is gone.

**Why it happens:**
SQLite docs explicitly warn: "If a database file is separated from its WAL file, transactions that were previously committed to the database might be lost, or the database file might become corrupted." ([sqlite.org/wal.html](https://sqlite.org/wal.html)) The dev usually doesn't notice because the WAL was empty in testing.

**How to avoid:**
- Before copying, run `PRAGMA wal_checkpoint(TRUNCATE);` on the source DB. This flushes ALL pages from WAL into main and truncates the WAL to zero bytes. The main DB file then contains everything committed.
- Prefer SQLite's backup API (`sqlite.backup(newPath)` in better-sqlite3) over `fs.copyFile`. The backup API handles concurrent writes correctly, locks appropriately, and produces a consistent copy.
- If using `fs.copyFile`, close the DB handle first (`sqlite.close()`), copy, then reopen — but this requires the app to have no active writes mid-copy (achievable because we run single-process).
- NEVER copy the `.db-wal` and `.db-shm` files separately — the shm file is process-specific (contains pointers to the current process's mapped memory) and should not travel.

**Warning signs:**
- User moves DB, relaunches, discovers their last analysis is missing.
- `better-sqlite3` throws "database disk image is malformed" after reopening a copied DB.
- Copy operation "succeeds" but the new DB is missing recent rows.

**Phase to address:** Phase 32 (Configurable DB Location) — the copy step MUST use either `wal_checkpoint(TRUNCATE)` + `fs.copyFile` OR the backup API. This is non-negotiable and should be tested with a scenario that writes, copies mid-transaction, and asserts row count on the target.

---

### Pitfall 6: DB relocation holds open handle — Windows file locking blocks the copy and the switch

**What goes wrong:**
On Windows, `better-sqlite3` keeps an exclusive file handle on the open DB. If the user clicks "Move DB" and the app tries to `fs.copyFile` or delete the old file while the handle is open, Windows returns `EBUSY` / `EPERM`. Linux is forgiving (allows read copies while file is open); Windows is not. Worse, after a failed copy, the app may end up with a partially-written new file AND an intact old file AND no clear way to recover.

**Why it happens:**
The close → copy → open dance is easy to forget, and Electron main-process errors during DB operations often appear as unhandled promise rejections that surface as "silent failures" in the UI.

**How to avoid:**
- Sequence: (1) Show confirm dialog → (2) Checkpoint WAL → (3) Close DB handle (`sqlite.close()`) → (4) Copy source to target → (5) VERIFY target (open it read-only, run `PRAGMA integrity_check`, count a few tables) → (6) Delete source OR rename to `.bak` → (7) Update persisted config (user's chosen path) → (8) Reopen DB at new path.
- Make step 6 OPT-IN: default behavior is to keep the old DB as `.bak` for safety. Add "Delete original" as an explicit checkbox in the dialog.
- If any step fails after step 4, roll back: delete the partial target, reopen the source, and surface the error. Do NOT leave the app in an "orphan handles, partial copies" state.
- Use a try/finally that guarantees the DB is reopened at SOME path (source if rollback, target if success).

**Warning signs:**
- `EBUSY` errors during copy on Windows.
- App hangs/crashes after the "Move" button is clicked.
- Target file exists but is 0 bytes or malformed after a failed copy.

**Phase to address:** Phase 32 — the orchestration (checkpoint → close → copy → verify → switch) needs to be its own named function with explicit error boundaries. Add an integration test using a tempfile that simulates `EBUSY` mid-copy.

---

### Pitfall 7: User picks network drive / NAS — WAL mode breaks silently

**What goes wrong:**
SQLite's WAL mode requires shared-memory (`.db-shm`) coordination, which doesn't work over NFS, SMB, or other network filesystems. The SQLite docs ([sqlite.org/wal.html](https://sqlite.org/wal.html)) warn: "All processes using a database must be on the same host computer; WAL does not work over a network filesystem." The app sets WAL unconditionally. If the user picks a NAS or OneDrive path, one of two things happens: (a) SQLite silently falls back to some journaling mode but locking is fragile and corruption risk is high, or (b) write operations intermittently fail with "database is locked" or produce corrupted data. fcntl file locking is broken on many NFS implementations, so even writes that APPEAR to succeed may race.

**Why it happens:**
OneDrive, Dropbox, and Google Drive folders look like local paths — the user thinks `C:\Users\Me\OneDrive\ResumeHelper\app.db` is fine but it's a synced filesystem with its own locking semantics. Worst case: OneDrive grabs the file for sync mid-write and the DB is corrupted.

**How to avoid:**
- In the DB-relocation dialog, detect and WARN for known-risky paths:
  - Network UNC paths (`\\server\share\...`)
  - Paths containing `OneDrive`, `Dropbox`, `Google Drive`, `iCloud`
  - Mapped network drives (on Windows, check `GetDriveType` — `DRIVE_REMOTE`)
- Show a modal: "This location appears to be a synced or network folder. Your DB may corrupt if a sync service modifies files while the app is running. Are you sure?" — NOT a hard block; the user owns the choice.
- Add to the Settings screen a persistent banner if the current DB is at a risky path.
- Alternative if the user insists: offer "DELETE journal mode" instead of WAL for network paths (slower, but safer on netFS). Requires `PRAGMA journal_mode = DELETE` at open time based on path heuristic.

**Warning signs:**
- "database is locked" errors when two app sessions run simultaneously (e.g., user opens the app on two devices synced via OneDrive).
- Intermittent "malformed database" errors after cloud sync runs.
- Data rollback where recent rows vanish after the cloud service resolves conflicts.

**Phase to address:** Phase 32 — path heuristic warning should ship in the first plan of this phase, not as polish.

---

### Pitfall 8: DOCX `showSummary` divergence — the toggle was never wired into `buildResumeDocx`

**What goes wrong:**
In `src/main/lib/docxBuilder.ts:123`, the summary paragraph is conditionally emitted based on `profileRow?.summary` being truthy. The `templateOptions.showSummary` boolean is passed into `buildResumeDocx` via the options bag but is NEVER destructured or read. Every HTML template (`ClassicTemplate.tsx:121`, `ModernTemplate.tsx:117`, etc.) checks `showSummary && profile?.summary`. DOCX exports with the toggle "off" still include the summary; HTML/PDF exports do not. The user's job-specific variant that hides the summary leaks it into the Word doc.

**Why it was missed in the first place:**
Two reasons, both traceable from the code:
1. The DOCX builder predates the `showSummary` toggle. When `showSummary` was added in v2.1 (as a per-variant control), only the HTML templates were touched — the DOCX builder lives in the MAIN process (`src/main/lib/`) and uses a different code path that was out-of-sight during that PR.
2. `templateOptions` is destructured in `buildResumeDocx:59` but only `marginTop`, `marginBottom`, `marginSides`, `skillsDisplay`, `accentColor` are pulled out. `showSummary` is silently discarded because TypeScript doesn't complain about unused object properties.

The retrospective v2.1 lesson #1 ("Test the deletion path — when removing code, verify what else depended on the deleted infrastructure") applies here in mirror: when ADDING code, verify what else should honor it.

**How to avoid the drift returning:**
- Add `showSummary` to the destructured options in `buildResumeDocx:59`, default to `true`.
- Guard the summary paragraph emission: `...(showSummary && profileRow?.summary ? [...] : [])`.
- Verify in `buildSnapshotForVariant` that the snapshot's `templateOptions.showSummary` reflects the `template_variant_items` summary sentinel (it does — see `submissions.ts:48-53`).
- Add a parameterized test: for each of [HTML render, PDF export, DOCX export], toggle `showSummary` and assert summary presence. One test matrix, three backends.
- Document in `types.ts` as a comment: "All template render paths (HTML/PDF/DOCX) MUST honor this flag."

**Warning signs:**
- User toggles off summary, exports DOCX, summary appears.
- Diff between PDF and DOCX visual output for the same variant.

**Phase to address:** Phase 33 (DOCX showSummary fix) — single-plan phase, but test must cover HTML parity so future drift is caught.

---

### Pitfall 9: Removing `TEMPLATE_LIST` breaks stale imports that type-check but aren't in grep results

**What goes wrong:**
`TEMPLATE_LIST` is exported from `src/renderer/src/components/templates/resolveTemplate.ts:21` but grep finds zero readers in `src/`. BUT: the export could be reached via (a) dynamic imports using the module as a namespace, (b) re-exports through barrel files, (c) JSX string-prop lookups that don't grep as an identifier, (d) Nyquist planning/verification templates or scripts that reference it by name. A blind deletion based on `grep TEMPLATE_LIST` passing with no results can hide a single obscure consumer.

**Why it happens:**
The v2.1 retrospective notes: "Template dropdown accidentally deleted — Plan 16-01 removed the template dropdown along with the old themes code. The plan didn't account for the new dropdown sharing infrastructure with the old one." This is the same class of mistake — assuming grep visibility equals usage visibility.

**How to avoid:**
- Before deletion, run ALL of: `rg "TEMPLATE_LIST"` in the entire workspace including `.claude/`, `dist/`, `src/preload/`, `tests/`, `scripts/`. Grep the built output too if any dev tools reference it.
- Check barrel files (`index.ts`, `index.tsx`) for `export * from './resolveTemplate'` and verify no downstream uses it.
- Delete, run `tsc --noEmit`, run `vitest`, manually exercise the variant builder to build a variant from scratch (which is where TEMPLATE_LIST would plausibly be consumed by a dropdown).
- Commit the deletion ISOLATED — one commit, one change. If UAT surfaces a regression, revert is trivial.

**Warning signs:**
- Variant builder's template dropdown shows only "classic" or fails to render templates.
- Runtime error "TEMPLATE_LIST is not defined" in a rarely-exercised code path.

**Phase to address:** Phase 34 (Tech debt cleanup) — first plan of the phase, isolated commit.

---

### Pitfall 10: Removing `compact` prop breaks template JSX that spreads `...props`

**What goes wrong:**
`compact?: boolean` is in `ResumeTemplateProps` (`types.ts:28`). Grep finds only the type definition — no runtime reader. BUT every template spreads `...props` into `filterResumeData({ profile, accentColor, skillsDisplay, showSummary, ...props })` (see `ClassicTemplate.tsx:28`, etc.). If `filterResumeData` internally reads `compact`, or if any test harness passes `compact={true}`, removing the prop type will cause TS compile errors in currently-valid test files.

**Why it happens:**
"Grep for readers" is incomplete when props flow through spread operators. The type system is the only thing catching it after removal, but only for call sites that use the named prop.

**How to avoid:**
- Before removal, grep the ENTIRE codebase (including `.claude/worktrees/` if active) for `compact=` and `compact:` with content output. Confirmed: only the type definition has it (`types.ts:28`).
- Check `filterResumeData` source — does it read `props.compact`? If yes, the prop is NOT vestigial, it's implicitly used.
- Remove, run `tsc --noEmit`, manually render each of the 5 templates in the variant builder, run all tests.
- If `filterResumeData` destructures `compact`, remove from BOTH places in one commit.

**Warning signs:**
- TypeScript error on template test fixtures after removal.
- Rendered output looks different on one template (if `compact` was silently altering layout).

**Phase to address:** Phase 34 — second plan or combined with TEMPLATE_LIST.

---

### Pitfall 11: `tests/setup.ts` deletion breaks nothing BUT `vitest.config.ts` may already reference it

**What goes wrong:**
`tests/setup.ts` exists and mocks `src/main/db` globally. The v2.4 retrospective says: "tests/setup.ts dead file — created in Phase 26 as 'for future use' but never wired. Handler tests use direct injection instead. Should have been omitted." But verify: `vitest.config.ts` lines 11-23 do NOT reference `setupFiles`, so the file is loaded but never auto-run as a setup. Deleting it should be safe. HOWEVER: individual test files may `import from '../../setup'` or similar — grep first.

**Why it happens:**
A "setup" file that's not in `setupFiles` may still be imported directly from test files that copy-pasted an early pattern. Fresh developers writing tests see the file and assume it should be imported.

**How to avoid:**
- Before deleting: `rg "tests/setup|from.*setup'" tests/` to catch any test file that directly imports it.
- Before deleting: check `vitest.config.ts` for any `setupFiles`, `globalSetup`, or `globals` references that name it. Currently absent, but verify.
- The mock it provides (`vi.mock('../../src/main/db')`) may be unused (handler tests take `db` as a param) but could silently affect tests that DO import `../db` transitively. Run the full suite before and after deletion and compare results.
- If deletion passes, add a lint or docblock comment to `tests/helpers/db.ts` stating "this is the DB strategy; no global setup needed."

**Warning signs:**
- Test count changes after deletion (some tests were relying on the mock).
- Previously green tests fail with "Cannot find module ../../src/main/db" — an indirect importer was depending on the mock.

**Phase to address:** Phase 34 — third plan, after TEMPLATE_LIST and compact. Low risk but verify no cascade.

---

### Pitfall 12: `jobs.test.ts` race — the existing code has a latent bug AND the "race" is likely worker-pool shared state

**What goes wrong:**
Look at `tests/unit/handlers/jobs.test.ts:18`:
```ts
await db.update(jobBullets).set({ sortOrder: 2 }).where(undefined as any)
```
This is NOT a race, it's broken code: `.where(undefined)` in Drizzle updates ALL rows (it's equivalent to no WHERE clause). The cast `as any` hides the type error. The test "passes" because the subsequent assertion doesn't depend on sortOrder being correct — but the test body lies about what it's testing.

The race DESCRIPTION in the project ("Race condition in jobs.test.ts under concurrent thread pool") suggests the real symptom is that when vitest runs tests in parallel threads, one thread's `createTestDb()` output interleaves with another. This is NOT possible with `:memory:` DBs since each call creates a distinct private in-memory instance. So what's the actual race?

Two likely root causes:
1. **The global `vi.mock('../../src/main/db')` in `tests/setup.ts`** is loaded per test file but the mock factory runs once per worker. If it's shared state via module-level `createTestDb()` (`tests/setup.ts:10` calls `createTestDb()` at top level), two tests in the SAME worker share one DB. Tests insert rows, query, and step on each other's state.
2. **The `await db.update(...).where(undefined)` update-all** in the second test DOES mutate DB state. If that DB is shared across test cases in the worker, subsequent tests see pre-polluted rows.

Re-introducing a different race: if the "fix" is to move `createTestDb()` to a per-test `beforeEach` hook but forget that `vi.mock` caches the module-level db, we'd fix one layer and leave the mock pointing at a stale DB.

**Why it happens:**
Module-level mocks that instantiate state (not just mock functions) are a known anti-pattern. The test INSIDE each `it` calls `createTestDb()` correctly to get a fresh DB, but handlers imported from `src/main/handlers/jobs.ts` will pick up the mocked `db` from `tests/setup.ts` — NOT the per-test DB.

BUT: looking at the test file, each `it` calls handlers directly with the per-test `db` argument (e.g., `listJobs(db)`). Good. So handlers aren't using the mock. BUT: if `src/main/handlers/jobs.ts` module-time imports `../db` (which calls `vi.mock → createTestDb()` once), any module-level code in `jobs.ts` that runs against `db` at import time would use the mock's singleton DB.

**How to avoid (and how NOT to re-introduce):**
- Fix the `.where(undefined)` bug first — replace with proper Drizzle filter or delete the line if its purpose is unclear. Read the test intent, write a correct version.
- Delete `tests/setup.ts` (per the v2.4 retrospective) — handler tests don't need the mock since they use the `db: Db` first-param pattern. The global mock is likely the race source. Verify by running tests with `--pool=threads --poolOptions.threads.singleThread=false` before and after.
- If removing the mock breaks tests, the true fix is one of: (a) use `vi.mock` with a factory that returns fresh DB per import (not singleton), (b) use `vi.doMock` per test file for true isolation, (c) inject `db` into all handler call sites (which is already the pattern).
- Do NOT "fix" by serializing tests (`poolOptions.singleThread`) — that hides the bug and slows the suite.
- Write a regression test that runs the same handler test twice in a loop — if the second iteration fails due to state from the first, the isolation is still broken.

**Warning signs:**
- Tests pass individually but fail in the suite.
- Tests pass on first run, fail on second (`vitest --run` twice in quick succession).
- Test output shows more rows than seeded — the DB is accumulating state.
- `poolOptions.threads` changes alter pass/fail outcome.

**Phase to address:** Phase 34 — last plan of the phase, because it depends on removing `tests/setup.ts` first. Should include running the full suite 3× in a row on CI-equivalent pool settings to prove no flakiness.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Emit `null` for missing JSON fields instead of omitting | Faster to write — just `JSON.stringify(row)` | Schema validators fail; consumers see `null` as a literal value | Never — always omit optional fields |
| Copy DB files without checkpointing WAL | One-liner `fs.copyFile(src, dest)` | Silent data loss of last few transactions | Never for user data; OK for dev scratch DBs |
| Two sources of truth for one toggle (`template_variant_items` + `templateOptions.showSummary`) | Started as incremental feature addition | Drift between consumers that read different sources | Only in transitional phases with explicit migration ticket |
| "Keep for future use" dead files (tests/setup.ts) | No immediate breakage | Future devs re-import, reintroduce coupling | Never — delete, resurrect via git if needed |
| Using `vi.mock` for DB with module-level instantiation | Easy to set up global stub | Cross-test state pollution in same worker | Never for anything with writable state; OK for pure function mocks |
| Exporting `TEMPLATE_LIST` "just in case" a UI needs it | Preempts one line of future work | Confuses grep, makes deletion scary | Never — add on first use |
| `compact?: boolean` prop added for "consistency" | Matches shape of related types | Dead code that grows complexity of type | Never — add when first template needs it |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| JSON Resume schema | Treating the schema as a strict round-trip target | Document as one-way "lossy-faithful" export; surface what's dropped |
| JSON Resume dates | Emitting `"endDate": null` for ongoing positions | OMIT the endDate key entirely — jsonresume spec treats missing key as "ongoing" |
| JSON Resume basics.location | Emitting location as a flat string | Wrap as object: `{city: flatLocationString}` (spec requires object) |
| better-sqlite3 WAL + relocation | `fs.copyFile` an open, WAL-mode DB | Checkpoint TRUNCATE → close → copy → verify → reopen |
| better-sqlite3 + network paths | Allowing any user-selected path | Detect UNC / OneDrive / Dropbox / mapped drives; warn before copy |
| Electron file dialogs | Not pre-validating target directory (exists, writable) | `fs.access(parentDir, fs.constants.W_OK)` before opening dialog; validate after pick |
| Vitest + better-sqlite3 | Global `vi.mock` of the db module with instantiated DB | Per-test `createTestDb()`; inject db as first handler param |
| docx library + templateOptions | Destructuring only "used" options, discarding others | Explicit destructure with documented defaults for EVERY option the HTML honors |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Checkpointing on every write before DB copy | Slow copy for large DBs | Only `wal_checkpoint(TRUNCATE)` once immediately before copy | Not a perf issue at current scale (single-user, sub-MB DB) |
| Reading entire DB into JSON for export | Memory spike on huge resumes | Stream JSON via incremental writer | Only breaks at 100+ jobs/bullets — beyond realistic single-user scope |
| Synchronous `fs.copyFileSync` blocks Electron main | UI freezes during DB move | Use async `fs.promises.copyFile` or SQLite backup API | Any DB > 10 MB or slow target disk |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exporting JSON with API key (from ai_settings) accidentally included | Credential leak if user shares export | Hard-code allowlist of tables to export; NEVER emit `ai_settings` or `analysis_bullet_overrides.raw_llm_response` |
| Allowing DB relocation without confirming the user owns the target path | Overwrite user's unrelated SQLite DB at `app.db` (very rare but possible) | Default target filename MUST be distinctive (e.g., `resumehelper.db`); warn on name collision |
| JSON export includes `submissions.notes` free text | May contain HR names, salary details — privacy concern if shared | Document that variant-merged export does NOT include submission data; base export similarly excludes `submissions` table |
| `.db.bak` orphan files pile up after relocations | Disk fills on user's chosen drive; `.bak` may contain stale credentials | Surface `.bak` cleanup in UI after successful switch; never auto-delete |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Move DB" button with no confirmation | Accidental click loses data | Two-step: Pick location → Confirm modal with "I understand" checkbox before executing |
| JSON export with no indication of what's included | User doesn't know if accepted suggestions are baked in | Filename includes analysis ID or "-merged" suffix; download toast summarizes "base" vs "variant-merged" |
| Silent WAL checkpoint before copy | User sees "copying..." for long time with no progress | Emit progress events: "Preparing database..." → "Copying..." → "Verifying..." → "Switching..." |
| No undo for DB move | User moves to wrong drive, can't easily revert | Keep `.bak` of source file until user explicitly deletes; add "Revert to previous location" button for 7 days |
| showSummary fix without migration for existing snapshots | Old DOCX exports rebuilt from snapshots still show summary incorrectly | Snapshot replay (re-export from snapshot) MUST honor `snapshot.templateOptions.showSummary` — add test |

---

## "Looks Done But Isn't" Checklist

- [ ] **Base JSON export:** Validates against official resume-schema JSON Schema via ajv — verify a round-trip import-export-import path doesn't crash.
- [ ] **Base JSON export:** Uses key-omission for missing fields (no `null`s, no `""` for optional strings) — grep export output for `"null"` and empty string values.
- [ ] **Base JSON export:** Emits `$schema` pointer so downstream tools auto-discover.
- [ ] **Variant-merged export:** Accepted skill additions from `analysis_skill_additions` present — test with analysis that has accepted skills.
- [ ] **Variant-merged export:** Job-level exclusions honored — test with a variant where `template_variant_items` has `item_type='job', excluded=1`.
- [ ] **Variant-merged export:** `showSummary=false` omits `basics.summary` — test.
- [ ] **Variant-merged export:** Bullet overrides applied — content matches what the PDF shows.
- [ ] **DB relocation:** `PRAGMA integrity_check` runs on target before switching — proves copy integrity.
- [ ] **DB relocation:** DB handle closed before copy on Windows — no EBUSY in production.
- [ ] **DB relocation:** Config persisted to a LOCATION OUTSIDE the DB (userData JSON or similar) — otherwise path is stored in the DB we just moved.
- [ ] **DB relocation:** Rollback on failure at step 4+ reverts gracefully — test with tempfile simulating `EBUSY`.
- [ ] **DB relocation:** Network/cloud path detection warning — test with UNC path and a OneDrive-shaped path.
- [ ] **DOCX showSummary:** Toggle off → export DOCX → open in Word → confirm no summary paragraph.
- [ ] **DOCX showSummary:** Parameterized test covers HTML, PDF, and DOCX with both toggle states (4 cases per template × 5 templates = 20 assertions).
- [ ] **TEMPLATE_LIST removal:** Full workspace grep (including `.claude/` `dist/` `scripts/`) produces zero results post-delete.
- [ ] **TEMPLATE_LIST removal:** Variant builder template dropdown still functions — manual click-through.
- [ ] **compact removal:** `filterResumeData` does NOT read `props.compact` (verify by reading source, not inference).
- [ ] **tests/setup.ts removal:** Full suite runs 3 consecutive times, same result (pass count exact).
- [ ] **jobs.test.ts race:** `.where(undefined as any)` replaced with correct WHERE clause or test intent clarified.
- [ ] **jobs.test.ts race:** Suite runs with `--pool=threads --poolOptions.threads.singleThread=false` passes 10 consecutive times.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| DB relocation lost last N writes (WAL not checkpointed) | HIGH | Restore `.bak` of original source; redo any analysis/accept clicks since the move. Prevention is mandatory. |
| DB corrupted on NAS | HIGH | Last resort: SQLite `.recover` CLI on `.bak`; export to JSON; reimport fresh. Prevent by path heuristic. |
| JSON export is invalid (null fields) | LOW | Patch serializer to omit, ship fix, re-export — no data loss, just re-run. |
| Variant-merged export missing accepted skills | LOW | Fix merge helper; re-export. User's PDF was correct, only JSON is wrong — no downstream consumer damaged. |
| Removed TEMPLATE_LIST broke variant builder | LOW | git revert the deletion commit; no data affected. |
| DOCX showSummary incorrect in existing snapshots | MEDIUM | Snapshots are immutable by design; re-exports from snapshot will be wrong until fix is deployed. Accept as "historical exports may show summary; new exports respect toggle." |
| jobs.test.ts flake masking a real bug | MEDIUM | Serialize tests temporarily (`singleThread: true`) while the real race is debugged; do not merge the serialization as the fix. |

---

## Pitfall-to-Phase Mapping

Proposed phase structure (roadmap will finalize):
- **Phase 30** — Resume.json Base Export
- **Phase 31** — Resume.json Variant-Merged Export
- **Phase 32** — Configurable DB Location with Copy/Verify/Switch
- **Phase 33** — DOCX showSummary Toggle Honor
- **Phase 34** — Tech Debt Cleanup (TEMPLATE_LIST, compact, setup.ts, jobs.test.ts)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Base export loses fields silently | Phase 30 | Unit test: import rich resume.json, re-export, diff and document deltas |
| 2. Null vs omit in JSON | Phase 30 | Grep export output for `:null` and `:""` — should be zero matches on optional fields |
| 3. Variant merge drops skill additions | Phase 31 | Test: variant + analysis with accepted skill → JSON export contains skill |
| 4. Toggle sources of truth diverge (summary/job) | Phase 31 | Test: toggle off summary/job → JSON export honors it |
| 5. WAL not checkpointed before copy | Phase 32 | Test: write, checkpoint, copy, open target, verify last write present |
| 6. Open handle blocks copy on Windows | Phase 32 | Integration test with explicit close → copy → reopen sequence |
| 7. Network/cloud path breaks DB | Phase 32 | UI test: simulate UNC/OneDrive path selection → warning appears |
| 8. DOCX showSummary ignored | Phase 33 | Parameterized test across HTML+PDF+DOCX with toggle on/off |
| 9. TEMPLATE_LIST deletion cascades | Phase 34-01 | Full workspace grep + manual template dropdown smoke test |
| 10. compact prop deletion breaks spreads | Phase 34-01 | tsc + vitest full run + render each of 5 templates |
| 11. tests/setup.ts deletion hides mock dependency | Phase 34-02 | Full suite diff pre/post; 3× consecutive runs same result |
| 12. jobs.test.ts race / broken where clause | Phase 34-03 | 10× consecutive runs pass with default thread pool; `.where()` replaced with intent-revealing query |

---

## Sources

- `D:\Projects\resumeHelper\.planning\PROJECT.md` — constraints, decisions, current state
- `D:\Projects\resumeHelper\.planning\RETROSPECTIVE.md` — v2.1-v2.4 lessons (especially v2.4 tests/setup.ts note and v2.1 deletion path lesson)
- `D:\Projects\resumeHelper\src\main\db\index.ts` — ensureSchema pattern, WAL mode setting
- `D:\Projects\resumeHelper\src\main\handlers\export.ts` — `getBuilderDataForVariant` merge path (bullet overrides only)
- `D:\Projects\resumeHelper\src\main\handlers\submissions.ts` — `buildSnapshotForVariant` with skill additions merge + summary sentinel lookup
- `D:\Projects\resumeHelper\src\main\lib\docxBuilder.ts` — missing `showSummary` destructure (line 59)
- `D:\Projects\resumeHelper\src\renderer\src\components\templates\resolveTemplate.ts` — `TEMPLATE_LIST` orphan export
- `D:\Projects\resumeHelper\src\renderer\src\components\templates\types.ts` — vestigial `compact` prop
- `D:\Projects\resumeHelper\src\main\handlers\import.ts` — partial basics mapping (linkedin-only profile)
- `D:\Projects\resumeHelper\tests\setup.ts` — the dead file referenced in v2.4 retrospective
- `D:\Projects\resumeHelper\tests\unit\handlers\jobs.test.ts` — the `.where(undefined as any)` bug
- [JSON Resume Schema](https://jsonresume.org/schema) — field list and nullability
- [jsonresume/resume-schema on GitHub](https://github.com/jsonresume/resume-schema) — canonical JSON Schema
- [SQLite WAL documentation](https://sqlite.org/wal.html) — WAL + network filesystem warnings, backup safety
- [SQLite Over a Network](https://sqlite.org/useovernet.html) — locking caveats on NFS/CIFS
- [SQLite wal_checkpoint_v2](https://sqlite.org/c3ref/wal_checkpoint_v2.html) — TRUNCATE mode semantics
- [better-sqlite3 Issue #376](https://github.com/WiseLibs/better-sqlite3/issues/376) — WAL/SHM cleanup behavior

---
*Pitfalls research for: v2.5 Portability & Debt Cleanup*
*Researched: 2026-04-23*
