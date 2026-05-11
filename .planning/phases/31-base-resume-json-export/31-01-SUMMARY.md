---
phase: 31-base-resume-json-export
plan: 01
subsystem: persistence/settings
tags:
  - sqlite
  - drizzle
  - settings
  - migration
  - shared-util
requires: []
provides:
  - app_settings k/v table (production + test DB + Drizzle migrator)
  - getSetting / setSetting helpers (src/main/lib/settings.ts)
  - sanitizeFilename shared module (src/shared/sanitizeFilename.ts)
affects:
  - downstream Plan 02 (JSON export — will use lastExportDir via getSetting)
  - downstream Plan 03 (renderer wiring — will replace VariantEditor inline sanitize)
tech-stack:
  added: []
  patterns:
    - hybrid Drizzle migration (3-touch: schema.ts + ensureSchema + tests/helpers/db.ts)
    - handler-extraction (db: Db first arg, no IPC/fs/dialog inside helper)
    - Drizzle onConflictDoUpdate for UPSERT
key-files:
  created:
    - src/main/lib/settings.ts
    - src/shared/sanitizeFilename.ts
    - tests/unit/main/lib/settings.test.ts
    - tests/unit/shared/sanitizeFilename.test.ts
    - drizzle/0004_app_settings.sql
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - tests/helpers/db.ts
    - drizzle/meta/_journal.json
decisions:
  - "String-only values in app_settings (D-08) — callers JSON.parse if structure needed"
  - "Hand-edited Drizzle migration file + journal entry (avoided interactive drizzle-kit generate per D-07)"
  - "VariantEditor call-site migration deferred to Plan 03 (D-12) — keeps file ownership clean across waves"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-11"
  tasks_completed: 3
  files_changed: 9
  tests_added: 6
---

# Phase 31 Plan 01: app_settings k/v table + sanitizeFilename promotion

One-liner: Landed `app_settings` k/v table across hybrid migration system (schema.ts + ensureSchema + tests/helpers/db.ts + drizzle 0004 + journal), shipped `getSetting`/`setSetting` UPSERT helpers, and promoted `sanitize` regex into shared `sanitizeFilename` module — unblocking Plans 02/03.

## What Shipped

- **app_settings table** (text primary key `key`, text NOT NULL `value`) reachable via three independent paths:
  - Drizzle ORM (`appSettings` export in `src/main/db/schema.ts`) for typed query authoring
  - Runtime `ensureSchema()` `CREATE TABLE IF NOT EXISTS` (handles existing installs)
  - `tests/helpers/db.ts createTestDb()` (in-memory test DB mirror)
  - Drizzle migrator file `drizzle/0004_app_settings.sql` + journal entry idx 4 (fresh installs)
- **`getSetting(db, key)`** — returns `string | undefined`; `select().from(appSettings).where(eq(...)).get()`
- **`setSetting(db, key, value)`** — UPSERT via `insert().values(...).onConflictDoUpdate({ target: appSettings.key, set: { value } })`. No UNIQUE collision.
- **`sanitizeFilename(s)`** — exact verbatim lift of regex from `VariantEditor.tsx:198-199` (`/\s+/g→_`, `/[^a-zA-Z0-9_-]/g→''`). Preserves filename parity across PDF/DOCX/JSON exporters.

## Tasks

| # | Task                                                                              | Commit    |
| - | --------------------------------------------------------------------------------- | --------- |
| 1 | Add appSettings table to schema + runtime/test ensureSchema mirrors + migration   | `58a8b34` |
| 2 | Create settings.ts k/v helpers + unit tests (RED `6a6e633` → GREEN `f928b8f`)     | `f928b8f` |
| 3 | Promote sanitize to src/shared/sanitizeFilename.ts (RED `c14c01c` → GREEN `4435870`) | `4435870` |

All Task 2 and Task 3 TDD cycles followed RED → GREEN. Task 1 has no dedicated test (schema/migration); functional verification is transitive — Task 2's settings.test.ts exercises the table via `createTestDb()` and proves all 3 migration touchpoints landed correctly.

## Verification

- `npm test -- --run tests/unit/main/lib/settings.test.ts` → 3 passed
- `npm test -- --run tests/unit/shared/sanitizeFilename.test.ts` → 3 passed
- `npm test -- --run tests/unit/main/lib/docxBuilder.test.ts` → 18 passed (no regression — proves `createTestDb()` still works with the new table)
- `npx tsc --noEmit` → 0 errors
- Combined run: 24 / 24 tests passed

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks followed prescribed action blocks; no auto-fixes (Rules 1-3) triggered; no architectural decisions needed (Rule 4).

## Decisions Made

- **String-only values (D-08):** No typed-value overloads or JSON helpers added. Callers that need structured data will `JSON.parse` at the call site. Keeps the helper surface minimal and explicit.
- **Hand-edited migration file + journal:** Avoided `npx drizzle-kit generate` (interactive, would prompt) per D-07's autonomous requirement. Migration file matches `0003_projects.sql` shape; journal entry mirrors prior entry verbatim with new `idx`/`when`/`tag`.
- **Deferred VariantEditor migration to Plan 03:** Per D-12, the call-site swap belongs with renderer wiring in the next wave — keeps file ownership clean across parallel agents.

## Threat Model Coverage

T-31-03 (Injection on setSetting) — `mitigate` disposition satisfied: implementation uses Drizzle's parameterized `.values({key, value})` + `onConflictDoUpdate({ target, set })`. No raw SQL concatenation introduced. Drizzle prepares the statement; key/value cannot escape the bound parameters. Other threats (T-31-01, -02, -04, -05) all `accept` — no mitigation required at this plan's surface.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries beyond what was already modeled.

## TDD Gate Compliance

Plan is not type:tdd at the plan level (type: execute), but per-task TDD gates were followed for Tasks 2 and 3:
- Task 2: `test(31-01)` commit `6a6e633` (RED) → `feat(31-01)` commit `f928b8f` (GREEN). No refactor needed.
- Task 3: `test(31-01)` commit `c14c01c` (RED) → `feat(31-01)` commit `4435870` (GREEN). No refactor needed.
- Task 1: schema/migration — no dedicated test by design (plan §behavior). Transitively verified by Task 2 tests + existing docxBuilder.test.ts (18 passed, no regression).

## Self-Check: PASSED

- src/main/db/schema.ts modified — appSettings export present (verified via Read tool earlier; commit 58a8b34)
- src/main/db/index.ts modified — CREATE TABLE IF NOT EXISTS app_settings present at line 174 (verified via Grep)
- tests/helpers/db.ts modified — mirror CREATE TABLE present (committed in 58a8b34)
- drizzle/0004_app_settings.sql created (verified via Write + commit)
- drizzle/meta/_journal.json — idx 4 / tag 0004_app_settings appended (committed in 58a8b34)
- src/main/lib/settings.ts created with getSetting/setSetting/onConflictDoUpdate (commit f928b8f)
- tests/unit/main/lib/settings.test.ts created with 3 it-blocks (commit 6a6e633)
- src/shared/sanitizeFilename.ts created (commit 4435870)
- tests/unit/shared/sanitizeFilename.test.ts created with 3 it-blocks (commit c14c01c)
- All 5 commits present in git log: 58a8b34, 6a6e633, f928b8f, c14c01c, 4435870
