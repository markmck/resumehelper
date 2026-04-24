# Project Research Summary

**Project:** ResumeHelper — Milestone v2.5 Portability & Debt Cleanup
**Domain:** Electron desktop app (React 19 + TypeScript + Drizzle + better-sqlite3)
**Researched:** 2026-04-23
**Confidence:** HIGH

## Executive Summary

v2.5 is a narrow, **additive** milestone against a mature codebase: five target deliverables (base resume.json export, variant-merged resume.json export, configurable DB location, DOCX `showSummary` fix, four tech-debt items) with **zero new runtime dependencies**. Every capability required is either already installed (`zod`, `better-sqlite3`, Electron `dialog`/`app`/`shell`) or built into Node. The work is primarily about reusing existing infrastructure — `ResumeJsonSchema` (aiProvider.ts:47), `applyOverrides()` (shared/overrides.ts), `getBuilderDataForVariant()` (handlers/export.ts:16) — and carefully threading one new cross-cutting concern: persisting the DB path **outside** the DB itself in a `userData/db-location.json` bootstrap file.

Two cross-cutting risks dominate and recur across three of the four research files: **(1) a `showSummary` dual-source-of-truth** where HTML/PDF reads from `template_variant_items` (exclusion sentinel row) while DOCX reads only from `templateOptions` JSON and silently ignores the flag (docxBuilder.ts:59); and **(2) two parallel `getBuilderDataForVariant` implementations** — one in `handlers/export.ts` (no `summaryExcluded`, no skill-additions merge), another in `handlers/templates.ts` (returns `summaryExcluded`), with skill-addition merging living in a *third* place (`handlers/submissions.ts:166-186`). Fixing both is the **same underlying refactor** and it is the single highest-leverage Phase-1 action: reconcile the merge path into one function that both DOCX and the variant JSON export consume.

The recommended approach is a **5-phase roadmap** that front-loads the merge-path reconciliation (unblocking both variant export and the DOCX fix), parallelizes the independent streams (base export, tech debt), and sequences the DB relocation last because it touches module-level singletons imported by 20+ handler files. The chosen switch mechanism is `app.relaunch(); app.exit(0)` after copy+verify — not an in-process Proxy swap — because the singleton retrofit is out of scope for a debt-cleanup milestone and the UX cost of a ~1s restart matches VS Code/Obsidian conventions users already accept.

## Key Findings

### Recommended Stack

Stack work is **entirely additive reuse**: no new packages, zero installs. All APIs needed for v2.5 are present in `package.json` as of milestone start (verified). The single "new" storage mechanism is a 4-line JSON file alongside the DB for path override — not `electron-store`, not a new table.

**Core technologies (all pre-installed):**
- `electron@^39.2.6` — `dialog.showSaveDialog`, `showOpenDialog({properties:['openDirectory']})`, `app.relaunch()`, `app.exit()`, `shell.showItemInFolder` — already used by existing export handlers
- `better-sqlite3@^12.8.0` — `.close()`, `PRAGMA wal_checkpoint(TRUNCATE)`, `PRAGMA integrity_check` — sync API is the right fit for copy→verify→switch
- `zod@^4.3.6` — reuse existing `ResumeJsonSchema` (aiProvider.ts:47-112) as validator on export, same schema used for v2.3 import
- `drizzle-orm@^0.45.1` — no changes; `ensureSchema()` re-runs idempotently on reopen
- `node:fs/promises`, `node:path` — built-in, already used throughout main process

**What NOT to use:** `electron-store` (overkill for one setting), `fs-extra` (not installed), `app.setPath('userData', ...)` to move the DB (moves too much — only `app.db` relocates), `fs.copyFile` without prior WAL checkpoint (data loss), in-process Proxy DB hot-swap (singleton retrofit is out of scope).

### Expected Features

**Must have (v2.5 MVP — all P1):**
- Base `Export JSON` button in Experience tab header (next to Import JSON / Import PDF) — full DB dump, roundtrip-compatible with existing INSERT-only import
- Per-variant `JSON` button in VariantEditor preview toolbar (next to PDF / DOCX) — three-layer merge, export-only
- `Database Location` card in Settings with current-path label, Reveal-in-Explorer, Change-location flow with copy→verify→switch→backup→restart confirmation
- DOCX export honors `showSummary` (one-line fix in `buildResumeDocx` + thread the flag from `export:docx` handler)
- Tech-debt cleanup: orphan `TEMPLATE_LIST` export, vestigial `compact` prop, dead `tests/setup.ts`, `jobs.test.ts` race + broken `.where(undefined as any)` clause

**Should have (polish — P2, optional):**
- `$schema` pointer in exported JSON (improves downstream validator UX, zero cost)
- "Reveal in Explorer" next to DB path label (standard Electron convention)
- Network/cloud-folder warning modal when user picks OneDrive/Dropbox/UNC path (heuristic, not a hard block)

**Defer (explicitly out of scope):**
- Variant JSON roundtrip / import (violates JSON Resume spec, tempts sibling import path)
- "Export all variants" bulk/zip (N×dialog friction or new dep)
- Live in-process DB swap without restart (requires Proxy retrofit across 20+ handler imports)
- In-app DB browser, scheduled auto-backup, cloud sync integration

### Architecture Approach

Five features graft onto existing Electron/Drizzle/SQLite architecture via one foundational refactor plus four additive layers. The **central architectural finding** is that the codebase currently has three parallel "what goes into a rendered variant?" code paths — `handlers/export.ts:16` (PDF/DOCX consumer, merges bullet overrides only), `handlers/templates.ts:318` (preview consumer, also returns `summaryExcluded`), and `handlers/submissions.ts:166-186` (snapshot consumer, also merges skill additions). v2.5 must unify these into a single authoritative `buildMergedBuilderData(db, variantId, analysisId?)` before the variant JSON export can be trusted.

**Major components:**
1. **`src/shared/resumeJson.ts` (new)** — lifted `ResumeJson` interface (from import.ts:10-75), single source of truth for both import and export
2. **`src/shared/resumeJsonBuilder.ts` or inlined in export.ts (new)** — `buildBaseResumeJson(db)` and `buildVariantResumeJson(db, variantId, analysisId?)` pure functions; both emit the same shape; validate with `ResumeJsonSchema.parse` before write
3. **Unified merge helper** — consolidates bullet overrides + skill additions + summary/job exclusions into one function; called by DOCX export, variant JSON export, snapshot builder, and PrintApp data loader
4. **`src/main/config/appConfig.ts` (new)** — reads/writes `userData/db-location.json`; owns the `dbPath` setting; read at boot before DB opens
5. **`src/main/db/index.ts` (modified)** — bootstrap path resolution (`readBootstrapOverride() ?? default`); no Proxy wrapper; relaunch after switch
6. **Settings UI — `DatabaseLocationCard` (new)** — second card in SettingsTab, below AI Configuration; folder picker → confirmation modal → progress state → restart prompt
7. **`src/main/lib/docxBuilder.ts` (modified)** — widen `templateOptions` to include `showSummary?: boolean` (default `true`); wrap summary paragraph in conditional (one-line destructure + one-line guard)

### Critical Pitfalls

Top five, drawn from PITFALLS.md and cross-referenced against architecture/feature findings:

1. **DOCX `showSummary` divergence (Pitfall 8)** — flag is stored in `template_variant_items` (sentinel row) but DOCX reads `variant.templateOptions` JSON column only. Fix: reconcile merge helper in Phase 1, destructure `showSummary` in `buildResumeDocx:59`, wrap paragraph emission. Test parameterized across HTML + PDF + DOCX so drift cannot return.

2. **Variant export silently drops accepted skill additions (Pitfall 3)** — `getBuilderDataForVariant` in `export.ts` does NOT merge accepted rows from `analysis_skill_additions` (only `submissions.ts` does). Naive reuse produces a JSON that doesn't match the PDF the user just saved. Fix: unified merge helper in Phase 1; integration test with variant + analysis + accepted skill asserts both bullet override and skill addition appear in JSON output.

3. **WAL checkpoint missing before DB copy (Pitfall 5)** — app runs `PRAGMA journal_mode = WAL`; a naive `fs.copyFile` captures the main `.db` but not the `.db-wal` tail, silently losing the last few transactions. Fix: `PRAGMA wal_checkpoint(TRUNCATE)` → `sqlite.close()` → `fs.copyFile` → verify (readonly open + `integrity_check`) → reopen at new path or rollback. Non-negotiable for Phase 34.

4. **Null vs. omit in exported JSON (Pitfall 2)** — Drizzle returns `null` for unset `endDate`; naive `JSON.stringify` emits `"endDate": null`, which strict JSON Resume validators reject. Fix: field-filtering serializer that OMITS keys for null/empty values; YYYY-MM precision retained (valid ISO 8601); unit test runs export through `resume-cli validate` or equivalent ajv check.

5. **Windows file-handle lock blocks DB copy (Pitfall 6)** — better-sqlite3 holds exclusive handle on open DB; `fs.copyFile` fails with `EBUSY` if the handle isn't released first. Fix: strict sequence checkpoint → close → copy → verify → swap-bootstrap-path → `app.relaunch()`; rollback on any step with `try/finally` that reopens source path.

Two more deserve flagging for Phase 34 planning: **Pitfall 7** (network/OneDrive path breaks WAL silently — detect UNC and cloud-folder names, warn not block) and **Pitfall 12** (`jobs.test.ts` has a latent `.where(undefined as any)` bug that does update-all, and the alleged "race" is almost certainly the global `vi.mock` in the dead `tests/setup.ts` — fix by deleting setup.ts first, then fixing the WHERE clause, then running the suite 10× to prove stability).

### Cross-Cutting Reconciliations

Three places where researcher outputs needed reconciliation:

**A. Variant-merged export + skill additions — ARCHITECTURE vs. PITFALLS.** Architecture said "reuse `applyOverrides()` / `getBuilderDataForVariant` — already merges." Pitfalls said "that only merges bullet overrides; accepted skill additions live in `analysis_skill_additions` and only `buildSnapshotForVariant` merges those." **PITFALLS is correct.** The merge helper must unify the snapshot's skill-addition merge with the export path. Architecture's Q2 answer is right in spirit (reuse the merged view, don't re-merge) but understates that the current merged view itself is incomplete for skill additions. Phase 30 refactor consolidates both.

**B. DB switch mechanism — STACK vs. ARCHITECTURE.** Stack recommended `app.relaunch(); app.exit(0)` as the one-line answer. Architecture proposed Proxy-wrapped `db`/`sqlite` exports to avoid relaunch (Option A), with relaunch as Option B "user-hostile." **STACK wins for v2.5.** Proxy retrofit is exactly the kind of singleton churn this milestone should not bundle with debt cleanup, and `app.relaunch()` is the Chrome/VS Code/Obsidian convention users accept. Architecture's Option A is a good candidate for a future milestone if user feedback demands seamless swap.

**C. `showSummary` fix scope — single-line vs. refactor.** Stack called it "one-line read in docxBuilder.ts." Architecture said "two-line fix" (docxBuilder + handler pass-through). Pitfalls flagged it needs the reconciled merge helper. **All three are correct at different layers.** The physical code change in `docxBuilder.ts` is one line of destructure + one line of guard. The handler (`export:docx`) must switch to the merged builder (which returns `summaryExcluded`). The merge helper reconciliation is the underlying refactor. All three happen in Phase 30 together.

## Implications for Roadmap

### Canonical Phase Sequence

### Phase 30: Merge-Helper Reconciliation + DOCX showSummary Fix

**Rationale:** Reconcile the three parallel merge paths first. Unblocks variant JSON export and the DOCX `showSummary` fix is the natural verification that the reconciliation works end-to-end.

**Delivers:**
- Unified `buildMergedBuilderData(db, variantId, analysisId?)` consolidating bullet overrides, skill additions, and summary/job exclusions
- `summaryExcluded` available on the merged view consumed by DOCX
- `buildResumeDocx` destructures `showSummary` (default true) and gates summary paragraph
- `ResumeJson` interface lifted to `src/shared/resumeJson.ts` (prep for Phases 31-32)
- Parameterized test: HTML + PDF + DOCX × summary on/off × all 5 templates

### Phase 31: Base Resume.json Export

**Rationale:** Simpler than variant-merged (no merge path); validates the `ResumeJson` shape + writer before adding the variant layer on top.

**Delivers:**
- `buildBaseResumeJson(db)` pure function — walks all 11 entity tables
- `export:resumeJsonBase` IPC handler + preload bridge
- `Export JSON` button in Experience tab header, filename `${profileName}_Resume.json`
- Zod validation via `ResumeJsonSchema.parse` before write
- Field-omission semantics: no `null` or `""` for optional fields
- Documented as **"lossy-faithful export"**

### Phase 32: Variant-Merged Resume.json Export

**Rationale:** Depends on Phase 30 (unified merge helper) and Phase 31 (`ResumeJson` shape + writer).

**Delivers:**
- `buildVariantResumeJson(db, variantId, analysisId?)` — calls unified merge helper, filters excluded items, maps to ResumeJson
- `export:resumeJsonVariant` IPC handler + preload bridge
- `JSON` button in VariantEditor preview toolbar (peer of PDF / DOCX)
- Tooltip: "Exports the final rendered resume. Re-importing creates new base entries."
- Test matrix: all four toggle types (summary, job, bullet, skill) × excluded + included

### Phase 33: Tech Debt Cleanup

**Rationale:** Parallelizable with Phases 31/32 after Phase 30 lands.

**Delivers (four plans in dependency order):**
- 33-01: Remove orphan `TEMPLATE_LIST` export (full-workspace grep)
- 33-02: Remove vestigial `compact` prop (tsc + vitest + 5-template render)
- 33-03: Delete `tests/setup.ts` (grep for direct imports; run full suite 3× pre/post)
- 33-04: Fix `jobs.test.ts` — replace `.where(undefined as any)`; run suite 10× consecutive

### Phase 34: Configurable SQLite DB Location

**Rationale:** Highest-risk integration — module-level singleton plus Windows file-handle semantics plus WAL sidecar correctness. Last to avoid blocking other work.

**Delivers:**
- `src/main/config/appConfig.ts` — reads/writes `userData/db-location.json`
- Bootstrap path resolution in `src/main/db/index.ts`
- `settings:setDbPath` handler — validates, checkpoints WAL, closes, copies, verifies, writes bootstrap, renames old → `.bak`, `app.relaunch()`
- `Database Location` card in SettingsTab
- Confirmation + restart-required modals
- Network/cloud path heuristic warning
- Rollback on any step; no partial-state orphans
- Tempfile-based integration tests for checkpoint→copy→verify sequence

### Parallelization Map

| Can run in parallel | After | Because |
|---------------------|-------|---------|
| Phase 31 + Phase 33 | Phase 30 | No file overlap; shape lifted by Phase 30 unblocks Phase 31 |
| Phase 32 + Phase 33 | Phase 31 | Phase 32 depends on shape proven in Phase 31 |
| Phase 33-01, 33-02 | Phase 30 | No interdep |
| Phase 33-03 | Phase 33-01, 33-02 | Isolate each debt commit |
| Phase 33-04 | Phase 33-03 | Removing setup.ts likely fixes the race |
| **Phase 34** | **Phases 30, 31, 32, 33** | Touches module singletons; last |

## Resolved Open Questions

1. **Variant-merged export needs skill-addition merging**, not just `applyOverrides`. Phase 30 unifies them.
2. **DB path lives outside the DB** — `userData/db-location.json` bootstrap file.
3. **`app.relaunch(); app.exit(0)`** is the chosen switch mechanism (not Proxy).
4. **DOCX `showSummary`** = one-line destructure + one-line guard in `buildResumeDocx:59` + handler switch to merged builder (all in Phase 30).

## Remaining Open Questions

1. **Filename conventions** — propose `${profileName}_Resume.json` and `${profileName}_Resume_${variantName}.json`
2. **NAS / OneDrive graceful degradation** — recommend warn-but-allow
3. **Exported JSON meta flag** — include `{meta: {source, variant, exportedAt}}` in variant exports?
4. **Lossy-faithful documentation surface** — code comment + release notes (not UI)
5. **Base export INSERT-on-reimport** — duplicate risk; acknowledge in modal?
6. **Old DB cleanup UX** — user-initiated only, not auto-expire

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified; zero new packages |
| Features | HIGH | UX patterns validated against existing codebase |
| Architecture | HIGH | Every file reference verified to line numbers |
| Pitfalls | HIGH | WAL/EBUSY/network grounded in official SQLite docs |

**Overall confidence:** HIGH

## Sources

See detailed research files:
- `.planning/research/STACK.md` — dependency audit + integration points
- `.planning/research/FEATURES.md` — feature landscape + UX specs + competitor matrix
- `.planning/research/ARCHITECTURE.md` — integration analysis + file-level change map
- `.planning/research/PITFALLS.md` — 12 pitfalls + looks-done-but-isn't checklist

**Primary docs:** Electron dialog/app/shell API, SQLite WAL docs, SQLite Over a Network, JSON Resume Schema 1.0.0.

---
*Research completed: 2026-04-23*
*Ready for roadmap: yes*
