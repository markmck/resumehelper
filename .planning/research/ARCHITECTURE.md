# Architecture Research

**Domain:** Windows installer packaging (NSIS via electron-builder) + test suites for Electron + Drizzle + AI integration
**Researched:** 2026-04-03
**Confidence:** HIGH — based on direct codebase inspection + verified documentation patterns

---

## System Overview: What v2.4 Adds to Existing Architecture

This milestone introduces two orthogonal concerns that do not touch the existing app data model or rendering pipeline:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXISTING APP (unchanged data model, IPC surface, rendering pipeline)    │
│                                                                          │
│  src/main/                   src/renderer/                               │
│  ├── db/ (Drizzle + SQLite)  ├── PrintApp.tsx                            │
│  ├── handlers/ (20 IPC)      ├── components/ (50+ React components)      │
│  └── lib/ (AI, prompts)      └── components/templates/ (5 templates)     │
│                                                                          │
│  src/shared/overrides.ts — applyOverrides(), BulletOverride types        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ v2.4 adds:
           ┌─────────────────┴──────────────────────────┐
           │                                            │
┌──────────▼──────────────┐              ┌──────────────▼───────────────┐
│  INSTALLER (build-time) │              │  TEST SUITES (dev-time)       │
│                         │              │                               │
│  electron-builder.yml   │              │  tests/                       │
│  ├── nsis config        │              │  ├── data-layer/              │
│  ├── productName/appId  │              │  ├── export-pipeline/         │
│  └── win: target        │              │  └── ai-integration/          │
│                         │              │                               │
│  Produces:              │              │  vitest.config.ts             │
│  resumehelper-setup.exe │              │  __mocks__/electron.ts        │
└─────────────────────────┘              └───────────────────────────────┘
```

Neither concern requires schema changes, new IPC handlers, or renderer component changes.

---

## Component 1: Windows Installer

### What Already Exists

The project already has `electron-builder` configured and `build:win` script defined in `package.json`. The existing `electron-builder.yml` has a partial NSIS section:

```yaml
# Current state in electron-builder.yml:
nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
```

This is a **one-click installer** by default (electron-builder's default). It silently installs without a wizard UI.

### What Needs to Change

The requirement specifies "install wizard" — this means `oneClick: false`, which triggers electron-builder's assisted installer mode with a multi-step wizard showing license, install directory selection, and Start Menu options.

**Required changes to `electron-builder.yml`:**

```yaml
appId: com.resumehelper.app           # Change from placeholder com.electron.app
productName: ResumeHelper             # Change from lowercase resumehelper

win:
  executableName: ResumeHelper
  target:
    - target: nsis
      arch:
        - x64

nsis:
  oneClick: false                      # ENABLES wizard mode
  perMachine: false                    # Install per-user by default (no UAC prompt)
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: false         # Optional — don't force desktop icon
  createStartMenuShortcut: true
  shortcutName: ResumeHelper
  uninstallDisplayName: ResumeHelper
  artifactName: ${productName}-${version}-setup.${ext}
  deleteAppDataOnUninstall: false      # Preserve user's resume data on uninstall
```

**Critical: `appId` and `electronApp.setAppUserModelId()`**

The `appId` in `electron-builder.yml` must match what `electronApp.setAppUserModelId()` in `src/main/index.ts` is called with. Currently the main process calls:
```typescript
electronApp.setAppUserModelId('com.electron')  // placeholder — must update
```
This should be updated to match the real appId: `com.resumehelper.app`.

### asarUnpack Cleanup

The existing `electron-builder.yml` includes dead references in `asarUnpack`:

```yaml
# These packages were removed in v2.1 (old resume.json themes — see PROJECT.md Key Decisions)
# but are still in asarUnpack. They should be removed:
- node_modules/jsonresume-theme-even/**
- node_modules/@jsonresume/jsonresume-theme-class/**
- node_modules/jsonresume-theme-elegant/**
```

The `better-sqlite3` asarUnpack entry must stay — it is a native module and cannot run inside asar.

### Build Output Location

electron-vite outputs to `out/` and electron-builder packages from there. The `build:win` script already chains them:
```json
"build:win": "npm run build && electron-builder --win"
```

No new scripts needed. The installer artifact will be written to `dist/` by default.

---

## Component 2: Test Suites

### The Core Challenge: Electron Runtime vs. Node Runtime

The main process code (`src/main/`) imports from `electron` (ipcMain, safeStorage, app, BrowserWindow, dialog) and from `better-sqlite3` (a native module compiled for Electron's Node version). Tests must run without a full Electron process.

**Two viable strategies:**

| Strategy | How | When to Use |
|----------|-----|-------------|
| **Pure Node with mocks** | Mock `electron` module, use `:memory:` SQLite, run in Node | Unit tests — data layer, pure logic, Zod schemas |
| **Electron as Node** | `ELECTRON_RUN_AS_NODE=1` + Electron binary + Vitest | Integration tests needing real better-sqlite3 |

For this project, **pure Node with mocks is sufficient** for 90% of coverage. The data layer functions can be extracted and tested directly against an in-memory SQLite instance; `electron` imports need mocking only for the IPC registration side.

### Test Structure

```
tests/
├── data-layer/
│   ├── overrides.test.ts          # applyOverrides() — pure function, zero dependencies
│   ├── deriveOverallScore.test.ts # deriveOverallScore() — pure function
│   ├── db-operations.test.ts      # Drizzle queries against :memory: SQLite
│   ├── three-layer-merge.test.ts  # getBuilderDataForVariant() with mock db
│   └── ipc-handlers.test.ts       # Handler registration + return shape tests
│
├── export-pipeline/
│   ├── snapshot-shape.test.ts     # buildSnapshotForVariant() output structure
│   ├── docx-generation.test.ts    # DOCX output against known variant data
│   └── template-rendering.test.ts # React template components render to HTML
│
└── ai-integration/
    ├── zod-schemas.test.ts        # JobParserSchema, ResumeScorerSchema parse/reject
    ├── score-derivation.test.ts   # deriveOverallScore() edge cases and weights
    ├── prompt-builders.test.ts    # buildJobParserPrompt(), buildScorerPrompt() output
    └── ai-provider-mocks.test.ts  # callJobParser() / callResumeScorer() with mocked AI SDK
```

### Mock Infrastructure

**`__mocks__/electron.ts`** — required by Vitest `vi.mock('electron')`:

```typescript
// tests/__mocks__/electron.ts
export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeHandler: vi.fn(),
}
export const app = {
  getPath: vi.fn().mockReturnValue('/tmp/test-data'),
  isPackaged: false,
}
export const safeStorage = {
  isEncryptionAvailable: vi.fn().mockReturnValue(true),
  encryptString: vi.fn((s: string) => Buffer.from(s)),
  decryptString: vi.fn((b: Buffer) => b.toString()),
}
export const dialog = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
}
export const BrowserWindow = vi.fn()
export const shell = { openExternal: vi.fn() }
```

**In-memory DB helper** for data layer tests:

```typescript
// tests/helpers/test-db.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../../src/main/db/schema'

export function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle(sqlite, { schema })
  // Run CREATE TABLE statements (copy ensureSchema() logic or import the function)
  return { db, sqlite }
}
```

The `better-sqlite3` `:memory:` path creates a fresh in-memory DB per test — no file I/O, no cleanup needed. This works in Node (not Electron runtime) because `better-sqlite3` has both a Node build and an Electron build. Tests run against the Node build.

### Vitest Configuration

A separate `vitest.config.ts` at project root, separate from `electron.vite.config.ts`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      electron: resolve('tests/__mocks__/electron.ts'),
    },
  },
})
```

The `electron` alias in `resolve.alias` is the key — it redirects any `import ... from 'electron'` to the mock file, so handler files can be imported and tested without the Electron runtime.

**Note on `better-sqlite3` in tests:** The node-compiled build of `better-sqlite3` installed via npm runs fine in Node (Vitest default). Only the Electron-packaged asar build requires Electron's Node. Tests import `better-sqlite3` directly and get the Node build — this works correctly.

### Handler Testing Pattern

IPC handlers cannot be directly invoked by channel name in tests. The recommended pattern is to **extract business logic** from handler registration:

```typescript
// TESTABLE PATTERN — business logic separate from IPC wiring:
// src/main/handlers/templates.ts

export async function getBuilderDataForVariant(variantId: number, analysisId?: number) {
  // ... pure data logic ...
}

export function registerTemplateHandlers() {
  ipcMain.handle('templates:getBuilderData', (_, variantId, analysisId) =>
    getBuilderDataForVariant(variantId, analysisId)
  )
  // ...
}

// In test:
import { getBuilderDataForVariant } from '../../src/main/handlers/templates'
// test this function directly — no IPC involved
```

The `export.ts` handler already does this — `getBuilderDataForVariant` is exported as a named function and used by both the IPC handler and `ai.ts` handlers. This pattern should be followed for any function needing test coverage.

### AI Integration Test Pattern

AI tests should mock the Vercel AI SDK, not make real API calls:

```typescript
// tests/ai-integration/ai-provider-mocks.test.ts
vi.mock('ai', () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      title: 'Senior Engineer',
      company: 'ACME Corp',
      required_skills: ['TypeScript', 'React'],
      preferred_skills: [],
      experience_years: 5,
      education_requirement: null,
      key_responsibilities: ['Build features'],
      keywords: ['TypeScript', 'React', 'Node'],
    }
  }),
  generateText: vi.fn(),
}))
```

Zod schema tests are pure and need no mocking:
```typescript
// Tests that JobParserSchema rejects invalid input, accepts valid input
// Tests that deriveOverallScore() applies correct weights and clamps to 0-100
// Tests that buildJobParserPrompt() includes rawText in the prompt string
```

### Template Rendering Tests

React template components (`ClassicTemplate.tsx` etc.) render HTML. They can be tested with `@testing-library/react` or by using Vitest's `jsdom` environment:

```typescript
// vitest.config.ts for renderer tests (separate config or per-file override):
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { ClassicTemplate } from '../../src/renderer/src/components/templates/ClassicTemplate'

// Test: renders without crash given minimal props
// Test: profile name appears in output
// Test: excluded bullets are not rendered
```

Template tests are the most isolated — they have no IPC dependency.

---

## Component Boundaries: New vs. Modified

### New Items

| Item | Type | Location | Purpose |
|------|------|----------|---------|
| `vitest.config.ts` | Config | project root | Vitest environment, globals, electron alias |
| `tests/__mocks__/electron.ts` | Mock module | `tests/__mocks__/` | Intercepts all `import from 'electron'` |
| `tests/helpers/test-db.ts` | Test helper | `tests/helpers/` | In-memory Drizzle DB for data tests |
| `tests/setup.ts` | Test setup | `tests/` | vi.mock() calls, global setup |
| `tests/data-layer/*.test.ts` | Test files | `tests/data-layer/` | DB ops, three-layer merge, IPC handler logic |
| `tests/export-pipeline/*.test.ts` | Test files | `tests/export-pipeline/` | Snapshot shape, DOCX, template rendering |
| `tests/ai-integration/*.test.ts` | Test files | `tests/ai-integration/` | Zod schemas, score derivation, prompt builders |

### Modified Items

| Item | Change | Risk |
|------|--------|------|
| `electron-builder.yml` | `oneClick: false`, wizard options, productName, appId | Low — build config only, no runtime impact |
| `src/main/index.ts` | Update `setAppUserModelId` to match new `appId` | Low — one line change |
| `package.json` | Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom` to devDependencies; add `test` script | Low — dev only |
| `src/main/handlers/*.ts` | Extract business logic to named exports for testability | Medium — refactor pattern, must verify no behavior change |

### Unchanged Items

The following do NOT need modification for this milestone:

- All schema / DB migration logic (`src/main/db/`)
- All IPC channel names and signatures (`src/preload/index.ts`)
- All React components in `src/renderer/src/components/`
- The rendering pipeline (`print.html`, `PrintApp.tsx`)
- The three-layer merge logic (`src/shared/overrides.ts`)
- The AI provider and Zod schemas (`src/main/lib/aiProvider.ts`)

---

## Data Flow Changes

### Build Pipeline (installer)

```
npm run build:win
    ↓
npm run build (typecheck + electron-vite build)
    ↓ produces: out/main/index.js, out/renderer/, out/preload/index.js
electron-builder --win
    ↓ reads: electron-builder.yml (nsis config, asarUnpack, extraResources)
    ↓ packs: out/ + node_modules into asar (better-sqlite3 excluded via asarUnpack)
    ↓ generates: dist/ResumeHelper-{version}-setup.exe
```

The `drizzle/` folder is copied as `extraResources` so file-based migrations still work in production.

### Test Execution Flow

```
npm run test
    ↓
vitest (node environment, resolve.alias electron → mock)
    ↓
tests/setup.ts (vi.mock calls, global beforeAll)
    ↓
┌──────────────────┬───────────────────┬────────────────────┐
│  data-layer/     │  export-pipeline/ │  ai-integration/   │
│                  │                   │                     │
│  creates :memory:│  renders template │  mocks 'ai' SDK    │
│  SQLite via      │  components with  │  verifies Zod      │
│  test-db helper  │  @testing-library │  schemas + prompts │
│                  │  or renderToString│                     │
└──────────────────┴───────────────────┴────────────────────┘
```

---

## Architectural Patterns

### Pattern 1: Electron Mock via resolve.alias

**What:** Map `import ... from 'electron'` to a handwritten mock file via Vitest's `resolve.alias`. Avoids brittle `vi.mock('electron')` hoisting issues documented in Vitest issues.

**When to use:** All test files that import main-process handler files (which transitively import from 'electron').

**Trade-offs:** The alias approach is compile-time — deterministic, no hoisting surprises. Downside: the mock is always applied in the test environment, not toggleable per-test. Fine for this codebase.

### Pattern 2: In-Memory SQLite for DB Tests

**What:** Create a `new Database(':memory:')` for each test suite (or each test via `beforeEach`). Run the same `CREATE TABLE IF NOT EXISTS` DDL that `ensureSchema()` runs. Use real Drizzle queries against real (in-memory) SQLite.

**When to use:** Any test that exercises Drizzle queries, three-layer merge logic, or data shaping.

**Trade-offs:** Tests are slightly slower than pure mock-based tests but verify real SQL behavior. No cleanup required (in-memory DB is discarded when process ends). The Node-compiled `better-sqlite3` works fine in Vitest's node environment.

### Pattern 3: Export Business Logic for Testability

**What:** Move the logic body of complex IPC handlers into named exported functions. The `ipcMain.handle()` call becomes a thin wrapper:

```typescript
export async function getBuilderDataForVariant(variantId: number, analysisId?: number) { ... }
export function registerTemplateHandlers() {
  ipcMain.handle('templates:getBuilderData', (_, v, a) => getBuilderDataForVariant(v, a))
}
```

**When to use:** Any handler whose logic needs test coverage. Already done for `getBuilderDataForVariant` in `export.ts` — follow the same pattern for `submissions.ts`, `templates.ts`, `ai.ts`.

**Trade-offs:** Slightly more verbose handler files. Worth it — this is the standard pattern for testable Node services.

### Pattern 4: Wizard Installer via oneClick: false

**What:** Setting `oneClick: false` in electron-builder NSIS config switches from the default silent one-click install to a multi-page wizard. Pages shown: Welcome → License (if provided) → Install Directory → Start Menu → Install → Finish.

**When to use:** Any app where users need to know where it's installed (e.g., to find the SQLite DB file, or because IT departments require non-silent installs).

**Trade-offs:** Slightly more friction for end user. Appropriate here because the app stores its SQLite DB in `app.getPath('userData')` — a user might want to know that. Also required by the milestone spec.

---

## Anti-Patterns

### Anti-Pattern 1: Testing IPC Handlers Via Channel Name

**What people do:** Try to invoke `ipcMain.handle` by looking up registered channels and calling the callback directly.

**Why bad:** IPC channel registration is a side effect of calling `registerXHandlers()`. Relying on it in tests creates ordering dependencies and requires Electron runtime. The channel string is an implementation detail, not the contract.

**Do this instead:** Export the business logic function and call it directly. The IPC registration is thin and doesn't need its own test.

### Anti-Pattern 2: `vi.mock('electron')` Without Factory

**What people do:** Call `vi.mock('electron')` at the top of test files and define mock functions with `vi.fn()` inside the factory.

**Why bad:** Vitest issues [#425](https://github.com/vitest-dev/vitest/issues/425) and [#4166](https://github.com/vitest-dev/vitest/issues/4166) document that `vi.fn()` inside `vi.mock` factories can cause initialization errors due to hoisting. Inconsistent across Vitest versions.

**Do this instead:** Use `resolve.alias` in `vitest.config.ts` to point `electron` to a static `__mocks__/electron.ts` file. No factory function, no hoisting issue.

### Anti-Pattern 3: Running better-sqlite3 Tests via Electron Binary

**What people do:** Use `ELECTRON_RUN_AS_NODE=1` with the Electron binary to run Vitest, to get the Electron-compiled native module.

**Why bad:** Slow (Electron binary startup), more CI setup complexity, harder to debug. Node-compiled `better-sqlite3` from `npm install` works fine in Vitest node environment for `:memory:` testing.

**Do this instead:** Use Node environment Vitest with `new Database(':memory:')`. Reserve Electron-binary testing for E2E tests only (out of scope for this milestone).

### Anti-Pattern 4: Real AI API Calls in Tests

**What people do:** Write tests that call `callJobParser()` or `callResumeScorer()` without mocking the AI SDK.

**Why bad:** Flaky (network-dependent), slow (LLM calls are 1-5 seconds), expensive (burns API credits), and tests external behavior not under the project's control.

**Do this instead:** Mock the `ai` package via `vi.mock('ai', ...)`. Test the prompt construction, schema validation, and score derivation — everything the codebase owns. Leave LLM response fidelity to manual smoke testing.

### Anti-Pattern 5: One-Click NSIS With productName as Lowercase

**What people do:** Keep the default `productName: resumehelper` and `oneClick: true` because it "works."

**Why bad:** One-click silently installs without user confirmation — poor UX for a desktop productivity app. Lowercase product name appears as "resumehelper" in Add/Remove Programs and the Start Menu, which looks unpolished.

**Do this instead:** Set `productName: ResumeHelper`, `oneClick: false`, `allowToChangeInstallationDirectory: true`.

---

## Build Order Recommendation

Dependencies flow vertically. Do installer config first because it has zero dependencies and is a self-contained YAML change.

```
Phase 1 — Installer Config (no code dependencies, verifiable immediately)
  1. Update electron-builder.yml:
     - productName: ResumeHelper
     - appId: com.resumehelper.app
     - oneClick: false + wizard options
     - Remove dead jsonresume asarUnpack entries
  2. Update src/main/index.ts: setAppUserModelId('com.resumehelper.app')
  3. Run: npm run build:win → verify .exe generates and installer wizard works

Phase 2 — Test Infrastructure (unblocks all test writing)
  1. npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom happy-dom
  2. Create vitest.config.ts with electron alias
  3. Create tests/__mocks__/electron.ts
  4. Create tests/helpers/test-db.ts with in-memory DB helper
  5. Create tests/setup.ts
  6. Add "test" and "test:coverage" scripts to package.json

Phase 3 — Data Layer Tests (depends on Phase 2 infrastructure only)
  Tests to write:
  - applyOverrides() pure function (zero setup)
  - deriveOverallScore() pure function (zero setup)
  - Drizzle CRUD operations via test-db helper
  - getBuilderDataForVariant() with seeded in-memory DB
  Refactoring needed: ensure business logic is exported from handlers

Phase 4 — AI Integration Tests (depends on Phase 2, can run parallel to Phase 3)
  Tests to write:
  - Zod schema parsing (JobParserSchema, ResumeScorerSchema, ResumeJsonSchema)
  - buildJobParserPrompt() / buildScorerPrompt() output content
  - deriveOverallScore() weight verification and edge cases
  - callJobParser() with mocked 'ai' package

Phase 5 — Export Pipeline Tests (depends on Phase 2, can run parallel to Phases 3-4)
  Tests to write:
  - Template component renders with minimal props (jsdom environment)
  - DOCX FONT_MAP and MARGIN_DEFAULTS match TEMPLATE_DEFAULTS (cross-reference test)
  - Snapshot structure has expected fields
  Note: Full PDF generation tests require Electron (out of scope) — test DOCX and structure only
```

---

## Integration Points Summary

### Files to Create (net-new)

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest config with electron mock alias, node environment |
| `tests/__mocks__/electron.ts` | Static mock for all electron imports |
| `tests/helpers/test-db.ts` | In-memory SQLite + Drizzle factory for tests |
| `tests/setup.ts` | Global test setup (vi.mock declarations, matchers) |
| `tests/data-layer/overrides.test.ts` | applyOverrides() pure function tests |
| `tests/data-layer/deriveScore.test.ts` | deriveOverallScore() tests |
| `tests/data-layer/db-operations.test.ts` | Drizzle query integration tests |
| `tests/data-layer/three-layer-merge.test.ts` | getBuilderDataForVariant() tests |
| `tests/export-pipeline/template-rendering.test.ts` | Template React components render tests |
| `tests/export-pipeline/snapshot-shape.test.ts` | Snapshot structure validation |
| `tests/export-pipeline/docx-generation.test.ts` | DOCX output tests (no PDF — requires Electron) |
| `tests/ai-integration/zod-schemas.test.ts` | Schema parse/reject tests |
| `tests/ai-integration/prompt-builders.test.ts` | Prompt content tests |
| `tests/ai-integration/score-derivation.test.ts` | Score formula edge cases |
| `tests/ai-integration/ai-provider-mocks.test.ts` | callJobParser() with mocked SDK |

### Files to Modify (existing files that change)

| File | Change | Impact |
|------|--------|--------|
| `electron-builder.yml` | productName, appId, oneClick, wizard options, asarUnpack cleanup | Build-time only |
| `src/main/index.ts` | Update `setAppUserModelId` string | One line, runtime |
| `package.json` | Add vitest devDependencies + test scripts | Dev-time only |
| `src/main/handlers/export.ts` | Already exports `getBuilderDataForVariant` — no change needed | — |
| `src/main/handlers/submissions.ts` | Export `buildSnapshotForVariant` if not already exported | Low risk refactor |
| `src/main/handlers/templates.ts` | Export `getBuilderData` logic if needed for tests | Low risk refactor |

### Files with Zero Changes Needed

- `src/main/db/schema.ts` — no new tables
- `src/main/db/index.ts` — no schema changes
- `src/preload/index.ts` — no new IPC channels
- `src/shared/overrides.ts` — already tested as pure functions
- `src/main/lib/aiProvider.ts` — tested by importing directly with mocked `ai` package
- All renderer components — no feature changes
- `electron.vite.config.ts` — build config unchanged

---

## Sources

- Direct code inspection: `electron-builder.yml` — current NSIS config and asarUnpack
- Direct code inspection: `src/main/index.ts` — `electronApp.setAppUserModelId('com.electron')` placeholder
- Direct code inspection: `package.json` — existing scripts, no test runner present
- Direct code inspection: `src/main/db/index.ts` — `ensureSchema()` with `CREATE TABLE IF NOT EXISTS` pattern
- Direct code inspection: `src/main/handlers/ai.ts` — `safeStorage` usage, imports from `electron`
- Direct code inspection: `src/main/handlers/export.ts` — `getBuilderDataForVariant` already exported
- Direct code inspection: `src/main/lib/aiProvider.ts` — `callJobParser`, `callResumeScorer`, Zod schemas
- Direct code inspection: `src/shared/overrides.ts` — `applyOverrides()` pure function
- [electron-builder NSIS docs](https://www.electron.build/nsis.html) — oneClick, perMachine, allowToChangeInstallationDirectory options
- [Vitest mock issues #425 and #4166](https://github.com/vitest-dev/vitest/issues/425) — vi.mock('electron') hoisting problems; resolve.alias approach preferred
- WebSearch: better-sqlite3 `:memory:` works in Node (non-Electron) test environment — MEDIUM confidence (multiple community sources, no official Electron docs contradicting)
- WebSearch: electron-builder NSIS `oneClick: false` triggers wizard mode — HIGH confidence (official docs + multiple community examples)

---
*Architecture research for: v2.4 Windows installer + test suites on Electron + Drizzle + React*
*Researched: 2026-04-03*
