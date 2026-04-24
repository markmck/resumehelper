# Feature Research — v2.5 Portability & Debt Cleanup

**Domain:** Electron resume-management app — portability milestone (JSON export + configurable DB path + small UX/infra debt)
**Researched:** 2026-04-23
**Confidence:** HIGH

Scope is narrow and additive. Features fall into four categories driven by the milestone:

1. **Export JSON** (base + per-variant merged) — new user-facing feature
2. **DB Portability** (configurable SQLite location) — new user-facing feature
3. **DOCX Fix** (honor `showSummary`) — bug fix, no new UX
4. **Tech Debt** (orphan exports, vestigial props, test plumbing, flaky test) — internal only

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist once "Export JSON" is on the roadmap. Missing these = portability feature feels half-built.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Base "Export JSON" button in Experience tab header** | Symmetry: "Import JSON" and "Import PDF" already live there ([ExperienceTab.tsx:187](../../src/renderer/src/components/ExperienceTab.tsx)). Users expect the inverse button next to its siblings. | LOW | Reuse header button styling. Invokes `dialog.showSaveDialog` → reads all tables → writes resume.json (schema 1.0.0). No confirmation modal needed — safe read-only op. |
| **Per-variant "Export JSON" button in preview toolbar** | Sits next to `PDF` / `DOCX` buttons in VariantEditor ([line 562-603](../../src/renderer/src/components/VariantEditor.tsx)). Users who can PDF/DOCX a variant expect to JSON it too. | MEDIUM | Must merge three layers (base → variant exclusions → analysis overrides) via `applyOverrides()` — same pipeline as `getBuilderDataForVariant()` in [export.ts:16](../../src/main/handlers/export.ts). Output = resume.json shape, not BuilderData shape. Requires a BuilderData → resume.json transformer. |
| **Default filename uses profile name + variant name** | Already the pattern for PDF/DOCX (`${sanitize(profile.name)}_Resume_${sanitize(variant.name)}.pdf` — [VariantEditor.tsx:229](../../src/renderer/src/components/VariantEditor.tsx)). Users expect the same filename scheme with `.json`. | LOW | `_Resume_VariantName.json` for variant export; `profile.name.json` for base export. |
| **Success toast on export** | Existing PDF/DOCX pattern: `showToast('Resume exported as PDF')`. Users expect identical feedback. | LOW | `showToast('Resume exported as JSON')`. |
| **Silent on user-cancelled save dialog** | Existing pattern: `if (!result.canceled) showToast(...)`. No error when user clicks Cancel. | LOW | Handler returns `{ canceled: true }`; renderer skips toast. |
| **DB location picker in Settings (folder select, not file select)** | VS Code/Obsidian/Immich all expose data-folder-as-folder, not as a database file. Users think in "where my data lives", not "which .sqlite file". | LOW | `dialog.showOpenDialog({ properties: ['openDirectory'] })`. The file itself stays named `app.db`. |
| **Confirmation modal before moving DB** | Destructive-feeling operations need a confirm step. Matches existing ImportConfirmModal shape ([ImportConfirmModal.tsx](../../src/renderer/src/components/ImportConfirmModal.tsx)) — modal pattern already in project. | LOW | Modal states: source path, destination path, what will happen (copy → verify → switch → keep old as backup). Primary button "Move database". Cancel closes modal. |
| **Progress indication during move** | better-sqlite3 copy of a small resume DB is near-instant, but users still expect a spinner/"Moving..." state on the button during the IPC round-trip. | LOW | Same pattern as `{exporting === 'pdf' ? 'Exporting...' : 'PDF'}` — button label swaps to `Moving...` and disables. |
| **Error state with restore** | If copy or verify fails, revert: keep old DB active, show error toast, surface reason. Matches the rollback convention users expect from any "move my data" operation. | MEDIUM | Verify = open copied DB readonly, run sanity query (e.g. `SELECT COUNT(*) FROM profile` returns 1). If fail → don't update path setting, delete copied file, show error. Old DB untouched throughout. |
| **Old DB kept as `.bak` after successful switch** | Sane-default safety net. Users know file-copy migrations can fail silently; a `.bak` gives them a rescue point. | LOW | Rename old `app.db` → `app.db.bak` (or move to `old/app.db`) after successful switch. Documented in settings help text. |
| **Restart prompt after switch** | better-sqlite3 handle is opened once at startup ([db/index.ts:9](../../src/main/db/index.ts)). Swapping files under a live connection is fragile. Users are accustomed to "Restart app to apply" from VS Code settings changes and OS-level data migrations. | LOW–MEDIUM | After successful copy+verify+path-setting update, show "Restart ResumeHelper for the change to take effect" modal with "Restart now" / "Later" buttons. Use `app.relaunch(); app.exit()` on confirm. |
| **DOCX export respects showSummary toggle** | User already toggles `Summary` in VariantBuilder ([VariantBuilder.tsx:258](../../src/renderer/src/components/VariantBuilder.tsx)). PDF respects it (via print.html). DOCX not respecting it = silent data-correctness bug. | LOW | Pass `showSummary` through to `buildResumeDocx()`; omit summary paragraph when false. No UX change. |

### Differentiators (Beyond the Minimum)

Features that would *genuinely* differentiate this milestone. Note: with v2.5 scoped to portability + debt, there's little room for differentiation — this is infrastructure work, not a product expansion.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Export badge: "Standard resume.json (schema 1.0.0)"** | Signals compliance with the open [JSON Resume](https://jsonresume.org/schema) spec — differentiates from FlowCV (PDF-only) and many builders that use proprietary JSON shapes. Matters for the user persona who wants portability guarantees. | LOW | One-line label next to the button or in tooltip. Zero code impact on the export path itself. |
| **"Export variant" shows non-roundtrip warning in tooltip** | Variant export embeds analysis overrides and skips excluded items — re-importing would not reproduce the variant structure. Telling users this up front prevents confused bug reports later. | LOW | Tooltip or small help text: "Exports the final rendered resume. Re-importing creates new base entries — it won't recreate this variant." |
| **Copy-verify-switch migration with explicit step log** | Most desktop apps treat "move data folder" as a black-box restart. Showing the steps (Copying... → Verifying... → Switching...) surfaces the safety guarantees to the user and builds trust. Borrowed from the SQL Server admin pattern. | MEDIUM | Only valuable if user sees a ≥1s duration. For a ~1 MB DB, move is < 100ms and the steps collapse into "Done." Probably not worth the polish. |
| **"Reveal in Explorer" button next to DB path** | One-click way to see where the file actually lives. Standard pattern in Electron apps (VS Code, Obsidian). Reduces "where's my data?" support confusion. | LOW | `shell.showItemInFolder(dbPath)`. Tiny icon button inline with path label. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem attractive but add risk or scope without payoff for v2.5.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Roundtrip guarantee on variant JSON export** | "If I can export, I should be able to import back and get the same variant." | Variant state is *exclusions + overrides relative to base*. Exporting the merged view is export-only by design — round-tripping would require a non-standard schema extension, violating the JSON Resume spec and the "export = portable standard format" promise. | Document explicitly: variant export = final rendered view; base export = full DB. Import path stays INSERT-only into base. |
| **"Export all variants" bulk button** | Power-user ask. | N variants × one save dialog per file = UX friction, or one zip = new dependency and new error modes. No evidence user has asked for this. | Deferred. Revisit only if multiple users request it. |
| **Live DB swap without restart** | "Why make me restart?" | better-sqlite3 opens the handle at module load ([db/index.ts](../../src/main/db/index.ts)). Swapping DB files under a live `Database` instance risks WAL-file divergence, stale prepared statements, and open-file locks on Windows. The fix (close/reopen/rewire all singletons) is a full architectural change — out of scope for a debt-cleanup milestone. | Restart prompt. It's the VS Code, Obsidian, and SQL Server convention. Users accept it. |
| **Export variant as JSON Resume + custom extension field** | Preserve variant semantics ("which items are excluded") in the exported file. | Non-standard extensions break the portability promise and tempt us to build a sibling import path. Explicit base/variant separation (base = roundtrip-safe, variant = export-only) is cleaner. | Document the split. Encourage users who want "another variant" to import base, then build variants in-app. |
| **In-app DB viewer/browser** | "Let me see my data." | Reimplementing SQLite browsing. Out of scope; users can open `app.db` in DB Browser for SQLite if they need it. | "Reveal in Explorer" is enough. |
| **Auto-backup DB on schedule** | Safety. | New background subsystem with scheduling, retention, and failure modes. Much bigger than v2.5 debt cleanup. | Old-DB-as-`.bak` during move covers the one dangerous operation. Users can cloud-sync the userData folder themselves. |
| **Cloud sync / OneDrive integration** | Portability across machines. | Sync engines are a full product. Out of scope. | Configurable DB path in Settings *enables* the user to point at a OneDrive/Dropbox folder manually — that's the portability we're shipping. |
| **Merge mode for variant JSON import** | Symmetry with export. | Variant export is *not* re-importable by design (see first row). | Explicitly not supported. Spec should say so. |

---

## Feature Dependencies

```
[Base Export JSON]
    └──requires──> [BuilderData → resume.json transformer]
                       └──requires──> [All-entity SELECT (already exists in export.ts)]

[Variant Export JSON]
    └──requires──> [applyOverrides() merge (already exists — shared/overrides.ts)]
    └──requires──> [getBuilderDataForVariant() (already exists — export.ts:16)]
    └──requires──> [BuilderData → resume.json transformer] (shared with base export)

[DB Path Picker]
    └──requires──> [Settings persistence for dbPath (new electron-store or new JSON file alongside DB)]
    └──requires──> [Startup path resolution (replace hardcoded userData/app.db with settings.dbPath ?? default)]
    └──requires──> [Copy-verify-switch IPC handler]

[DOCX showSummary fix]
    └──requires──> [buildResumeDocx() accepts showSummary param (read existing docxBuilder.ts)]

[Tech Debt]
    └──(no user-facing dependencies)
```

### Dependency Notes

- **Base and Variant JSON export share a transformer.** Write it once: `toResumeJson(builderData, profile) → ResumeJson`. Variant path calls `getBuilderDataForVariant(db, variantId, analysisId)`, base path calls a new `getBaseBuilderData(db)` (no variantId, no exclusion filtering). Both feed the transformer.
- **DB path setting needs to persist OUTSIDE the SQLite DB itself.** Obvious reason: you can't read "where my DB is" from the DB you're trying to locate. Options: (1) `electron-store` (JSON file in `app.getPath('userData')`) or (2) plain `settings.json` alongside. Either works; the settings file always lives in userData, only the DB is relocatable.
- **The "restart after DB move" step has a soft dependency on startup path resolution.** If settings.json points to a missing path at startup (e.g. user moved the file externally), app must fall back gracefully — either to the default location or to an error screen with "locate DB" option. Edge case to flag.
- **DOCX showSummary is strictly additive.** Single code path in `docxBuilder.ts`; threading the flag through is trivial.

---

## MVP Definition

v2.5 **is** the MVP for this portability surface — there's no "v2.5.1" planned. The list below is what ships in the milestone.

### Launch With (v2.5)

- [ ] **Base resume.json export** — button in Experience tab header next to `Import JSON` / `Import PDF`. Filename = `${profileName}_Resume.json`. Toast on success.
- [ ] **Variant resume.json export** — button next to `PDF` / `DOCX` in VariantEditor preview toolbar. Filename = `${profileName}_Resume_${variantName}.json`. Three-layer merge. Toast on success.
- [ ] **Configurable DB location** — Settings card with: (a) current path label + "Reveal in Explorer", (b) `Change location...` button → folder picker → confirmation modal → copy-verify-switch → old file renamed to `.bak` → restart prompt.
- [ ] **DOCX honors showSummary** — threaded through `buildResumeDocx()`; no UI change.
- [ ] **Tech debt** — TEMPLATE_LIST export removed, `compact` prop removed from `ResumeTemplateProps`, `tests/setup.ts` deleted, `jobs.test.ts` race fixed.

### Explicitly NOT in v2.5

- "Export all variants" bulk/zip
- In-app DB browser
- Scheduled auto-backups
- Cloud sync integration
- Variant JSON roundtrip / import

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Base resume.json export | HIGH — headline feature | LOW | P1 |
| Variant resume.json export | HIGH — headline feature | MEDIUM — needs transformer + merge reuse | P1 |
| DB location picker + migration | HIGH — blocks multi-machine use | MEDIUM — copy/verify/switch + restart flow | P1 |
| DOCX showSummary fix | MEDIUM — correctness bug | LOW | P1 |
| Tech debt cleanup | LOW (user) / HIGH (dev) | LOW | P1 |
| "Reveal in Explorer" next to DB path | LOW–MEDIUM polish | LOW | P2 |
| Schema/version badge on export | LOW polish | LOW | P2 |
| Migration step log (Copying... Verifying...) | LOW polish | MEDIUM | P3 — skip |

Everything in the Active list of PROJECT.md is P1 — there's no "should we do this?" question, only "how do we present it?"

---

## Detailed UX Behaviors (for Requirements author)

### Base Export JSON

- **Trigger:** `Export JSON` button in Experience tab header, right of `Import PDF`.
- **Dialog:** `dialog.showSaveDialog({ title: 'Export Resume as JSON', defaultPath: '${profileName}_Resume.json', filters: [{ name: 'JSON Files', extensions: ['json'] }] })`.
- **Behavior:**
  - Read all DB tables (profile, jobs+bullets, skills+categories, projects+bullets, education, volunteer, awards, publications, languages, interests, references).
  - Transform to JSON Resume schema 1.0.0 shape (see [jsonresume.org/schema](https://jsonresume.org/schema)).
  - Write via `fs.writeFile(filePath, JSON.stringify(data, null, 2))`.
- **Success state:** `showToast('Resume exported as JSON')`.
- **Cancel state:** no toast, no state change (mirrors PDF/DOCX pattern).
- **Error state:** `showToast('Export failed: ${err.message}')`.
- **Loading state:** button shows `Exporting...` during operation; disabled; other export buttons in same toolbar untouched.

### Variant Export JSON

- **Trigger:** `JSON` button in VariantEditor preview toolbar, right of `DOCX`. Treated as peer of PDF/DOCX.
- **Dialog:** `defaultPath: '${profileName}_Resume_${variantName}.json'`.
- **Behavior:**
  - Call `getBuilderDataForVariant(db, variantId, analysisId)` — already produces merged three-layer view.
  - Transform to resume.json; write as above.
  - Variant name included in filename only (not embedded in JSON content — export matches spec).
- **Feedback:** Same toast/cancel/error pattern as base.
- **Edge case:** If `variantName` is empty, fall back to `Untitled`.

### DB Location Settings Card

Place in `SettingsTab.tsx` as **second card**, below AI Configuration. Heading: `Database Location`.

**Field layout:**

```
┌─ Database Location ────────────────────────────────────┐
│                                                        │
│  CURRENT LOCATION                                      │
│  C:\Users\Mark\AppData\Roaming\resume-helper\app.db    │
│  [Reveal in Explorer]                                  │
│                                                        │
│  [Change location...]                                  │
│                                                        │
│  Your resume data lives in a single SQLite file.       │
│  Move it to a synced folder (OneDrive, Dropbox) to     │
│  access from multiple machines.                        │
└────────────────────────────────────────────────────────┘
```

**`Change location...` flow:**

1. Click → folder picker opens (`properties: ['openDirectory']`).
2. User selects folder → confirmation modal appears:

   ```
   ┌─ Move database ──────────────────────────────────┐
   │                                                  │
   │  From: C:\Users\Mark\AppData\...\app.db          │
   │  To:   D:\OneDrive\ResumeHelper\app.db           │
   │                                                  │
   │  What will happen:                               │
   │  1. Copy database file to new location           │
   │  2. Verify the copy opens and reads correctly    │
   │  3. Switch to the new location                   │
   │  4. Rename old file to app.db.bak (kept as       │
   │     backup — delete manually when ready)         │
   │  5. Restart ResumeHelper                         │
   │                                                  │
   │  If anything fails, nothing changes.             │
   │                                                  │
   │  [Cancel]                        [Move database] │
   └──────────────────────────────────────────────────┘
   ```

3. Confirm → button becomes `Moving...`, disabled.
4. IPC handler:
   - `fs.copyFile(oldPath, newPath)` — if fails, show error toast, no changes.
   - Open copied DB read-only, `SELECT COUNT(*) FROM profile` (expect 1), close — if fails, delete `newPath`, show error toast, no changes.
   - Update settings file: `{ dbPath: newPath }`.
   - Rename `oldPath` → `oldPath + '.bak'`.
   - Return success.
5. Restart modal appears:

   ```
   ┌─ Restart required ───────────────────────────────┐
   │                                                  │
   │  Database moved successfully. Restart            │
   │  ResumeHelper to use the new location.           │
   │                                                  │
   │  [Restart later]                  [Restart now]  │
   └──────────────────────────────────────────────────┘
   ```

6. `Restart now` → `app.relaunch(); app.exit(0)`.
7. `Restart later` → modal closes; Settings card shows new path but a banner: `Restart required for changes to take effect`.

**Edge cases requirements should cover:**

- Destination path already contains `app.db` → warn, require explicit "Replace" button in confirm modal.
- Destination path = source path → picker should prevent OR confirm modal should skip (no-op).
- Destination folder not writable → catch at copy step, show error.
- Settings file points to missing path on next startup → fall back to default location, show one-time notice on first render ("Previous database location not found. Using default.").
- User manually moves `app.db` externally → same fallback behavior.
- WAL files (`app.db-wal`, `app.db-shm`) must be copied alongside the main file OR we force a checkpoint before copying (per [SQLite backup best practice](https://sqlite.org/backup.html) — writer must be quiesced for file-level copy to be consistent). Easiest: `sqlite.pragma('wal_checkpoint(TRUNCATE)')` before copy, then copy only `app.db`. Flag this in requirements so the author surfaces it.

### DOCX showSummary

- **Trigger:** User toggles Summary checkbox in VariantBuilder ([line 256-260](../../src/renderer/src/components/VariantBuilder.tsx)).
- **Current behavior (bug):** PDF respects toggle (print.html reads `showSummary`), DOCX always includes summary regardless.
- **Expected behavior:** DOCX omits the Summary paragraph when `showSummary === false`.
- **Implementation:** `buildResumeDocx(builderData, profile, layoutTemplate, templateOptions)` already reads `templateOptions.showSummary`; check whether it's being *used* in the DOCX builder. If not wired, wire it. If partially wired, complete it. (Requires reading docxBuilder.ts — not in this research scope.)
- **No UI change.**

### Tech Debt

All four items are internal. No user-visible behavior. Requirements should just list:

- Remove orphan `TEMPLATE_LIST` export from `resolveTemplate.ts`.
- Remove vestigial `compact` prop from `ResumeTemplateProps`.
- Delete dead `tests/setup.ts` (or wire into vitest config if it's meant to run).
- Fix race in `jobs.test.ts` — likely shared in-memory SQLite across threads; use per-test isolation or pool=forks.

---

## Competitor Feature Analysis

| Feature | JSON Resume registry | Reactive Resume | FlowCV | Our Approach |
|---------|----------------------|-----------------|--------|--------------|
| JSON export of full resume | Raw JSON/YAML/TEXT via registry URL | `Export → JSON` button in right sidebar (top-level menu) | Not available (PDF-only, per search results) | **Button in Experience tab header + button in variant toolbar. Two distinct scopes.** |
| Schema compliance | JSON Resume 1.0.0 (they *are* the spec) | JSON Resume 1.0.0 with known roundtrip bugs ([Issue #2364](https://github.com/AmruthPillai/Reactive-Resume/issues/2364)) | N/A | JSON Resume 1.0.0. Base export is roundtrip-safe (uses existing INSERT-only append import). Variant export is explicitly export-only. |
| Variant/tailored export | N/A (single resume) | N/A (single active resume) | N/A | **Differentiator: per-variant merged export — no other tool has this because no other tool has the three-layer model.** |
| Configurable storage location | N/A (web-hosted gist) | N/A (web app or self-hosted container) | N/A (web) | Electron-native. **Differentiator vs. web tools: works offline, user owns the file, swappable folder.** |
| Data folder restart prompt | N/A | N/A | N/A | Standard Electron/VS Code/Obsidian convention. Low-risk, high-familiarity. |

**Takeaway:** The JSON export feature itself is commoditized (every serious builder has it). What matters is the *variant-merged* export, which is uniquely enabled by our three-layer data model. The DB-location feature has no web-app equivalent and is straightforward desktop-app table stakes.

---

## Sources

- [Reactive Resume — Exporting your resume](https://docs.rxresu.me/guides/exporting-your-resume) — confirms right-sidebar JSON button pattern.
- [Reactive Resume — JSON Resume Schema](https://docs.rxresu.me/guides/json-resume-schema) — schema compliance.
- [Reactive Resume Issue #2364 — export/import roundtrip failures](https://github.com/AmruthPillai/Reactive-Resume/issues/2364) — cautionary tale on schema mismatch; reinforces our "base export = roundtrip, variant export = export-only" split.
- [JSON Resume — Schema 1.0.0](https://jsonresume.org/schema) — authoritative schema spec.
- [JSON Resume Docs](https://docs.jsonresume.org/schema) — canonical field list.
- [Obsidian Forum — How do I move the vault to another location?](https://forum.obsidian.md/t/how-do-i-move-the-vault-to-another-location/637) — confirms "vault switcher + move dialog" is accepted pattern for desktop data-folder moves.
- [Obsidian — Manage vaults](https://help.obsidian.md/Files+and+folders/Manage+vaults) — vault location UX.
- [VS Code — Settings Sync](https://code.visualstudio.com/docs/configure/settings-sync) — symbolic link / portable mode as the usual answer for "change settings location"; reinforces that explicit "pick a folder" is the simpler UX for our case.
- [Electron Issue #24536 — userData folder still created after setPath](https://github.com/electron/electron/issues/24536) — flags that `app.setPath()` must run before `app.whenReady()` and still leaves default folder artifacts. Informs the "restart to apply" decision.
- [How to store user data in Electron (Cameron Nokes)](https://cameronnokes.com/blog/how-to-store-user-data-in-electron/) — confirms userData default locations per OS.
- [electron-store](https://github.com/sindresorhus/electron-store) — standard pattern for the meta-settings file (where we record `dbPath`).
- [SQLite Backup API](https://sqlite.org/backup.html) — authoritative: "close writing connections or use backup API + ensure checkpoint before filesystem copy." Informs the WAL-checkpoint step before `fs.copyFile`.
- [SQLite Forum — Backup via file system backup software](https://sqlite.org/forum/info/796a192a95ac35b9) — reinforces WAL quiescence requirement.
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) — WAL mode and connection lifecycle.
- [Move system databases — SQL Server docs](https://learn.microsoft.com/en-us/sql/relational-databases/databases/move-system-databases) — copy → verify → switch → delete-original pattern is standard.
- Existing codebase:
  - [ExperienceTab.tsx](../../src/renderer/src/components/ExperienceTab.tsx) (Import button placement — line 187)
  - [VariantEditor.tsx](../../src/renderer/src/components/VariantEditor.tsx) (PDF/DOCX toolbar — lines 562-603)
  - [SettingsTab.tsx](../../src/renderer/src/components/SettingsTab.tsx) (Settings card pattern)
  - [ImportConfirmModal.tsx](../../src/renderer/src/components/ImportConfirmModal.tsx) (modal shape to mirror for DB-move confirm)
  - [export.ts](../../src/main/handlers/export.ts) (getBuilderDataForVariant — line 16; uses applyOverrides at line 10/192)
  - [import.ts](../../src/main/handlers/import.ts) (resume.json parse/append structure to mirror for export)
  - [db/index.ts](../../src/main/db/index.ts) (hardcoded `userData/app.db` — line 8; the string to replace)

---

*Feature research for: v2.5 Portability & Debt Cleanup — ResumeHelper*
*Researched: 2026-04-23*
