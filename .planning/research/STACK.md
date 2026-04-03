# Stack Research

**Domain:** Desktop resume management app — PDF/DOCX export, resume templating, AI-assisted job matching
**Researched:** 2026-03-13 (v1.0), updated 2026-03-14 (v1.1 additions), updated 2026-03-23 (v2.0 AI analysis additions), updated 2026-03-25 (v2.1 template rendering additions), updated 2026-03-26 (v2.2 three-layer data model + skills chip UI), updated 2026-04-03 (v2.4 Windows installer + test suites)
**Confidence:** HIGH for v2.4 installer section (electron-builder config read directly). MEDIUM for test framework section (Vitest/Electron interaction patterns from community sources, ai/test mock API shape needs in-project verification).

---

## v2.4 Additions — Windows Installer (NSIS) and Test Suites

These additions cover: finishing the NSIS installer configuration (already partially set up), adding Vitest for unit/integration tests across the data layer, export pipeline, and AI integration, and establishing mocking patterns for Electron IPC, the database, and the AI SDK. The base app stack is unchanged — no new production dependencies.

---

### Windows Installer — electron-builder NSIS (Already Installed, Needs Configuration)

**electron-builder** is already in `devDependencies` at `^26.0.12` and `electron-builder.yml` already has a partial `nsis:` section. The v2.4 work is configuration completion, not new installation.

**Current state of `electron-builder.yml` NSIS block:**

```yaml
nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
```

**What is missing for a complete installer:**

1. **`appId`** — currently set to `com.electron.app` (generic default). Must change to a stable reverse-domain ID (e.g., `com.resumehelper.app`) before shipping. Changing `appId` after users install will break uninstallation and auto-update.

2. **`productName`** — currently `resumehelper` (no spaces). Should be `ResumeHelper` (display name) to match the Start Menu shortcut label.

3. **`win.icon`** — not configured. NSIS requires a `.ico` file. Must add `build/icon.ico`.

4. **Installer mode** — `nsis.oneClick` defaults to `true` (silent install, no wizard). For a user-facing installer with explicit install location and Start Menu shortcut options, set `oneClick: false` and `allowToChangeInstallationDirectory: true`.

5. **`createStartMenuShortcut`** — not explicitly set. Defaults to `true`, but adding it explicitly documents intent.

6. **`menuCategory`** — optional. Groups the Start Menu shortcut under a named submenu (e.g., `ResumeHelper`). Avoids cluttering the top-level Start Menu.

**Recommended complete NSIS configuration:**

```yaml
appId: com.resumehelper.app
productName: ResumeHelper

win:
  executableName: ResumeHelper
  icon: build/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  artifactName: ${productName}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
  createStartMenuShortcut: true
  menuCategory: ResumeHelper
```

**`oneClick: false` tradeoff:** Adds an install wizard with a directory picker and confirmation steps. Slightly more user interaction on install, but gives users explicit control over install location. The default `oneClick: true` installs silently without prompting — appropriate for consumer auto-update apps, but less appropriate for a developer tool where users may want to choose install location.

**`asarUnpack` entries to keep:** The existing `asarUnpack` config correctly lists `better-sqlite3` (native module, must be outside ASAR). These entries are correct and should not change.

**`npmRebuild: false`:** Already set. Correct — electron-builder should not attempt to rebuild native modules during build. The `postinstall` script runs `electron-builder install-app-deps` which handles the rebuild separately.

**Build command:** `npm run build:win` already exists in `package.json` scripts and calls `electron-builder --win`. No new script needed.

**Confidence: HIGH** — electron-builder NSIS docs at electron.build/nsis.html. `appId` uniqueness requirement and `oneClick: false` wizard behavior are documented. Current `electron-builder.yml` read directly from the project.

---

### Test Framework — Vitest

**Problem:** The project has zero test coverage. The v2.4 milestone requires test suites for: the three-layer data merge logic, IPC handler contracts, export pipeline (PDF/DOCX), and AI integration (generateObject calls).

**Recommended: `vitest ^3.2` (do NOT jump to v4 yet)**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `vitest` | `^3.2` | Test runner, assertion library, mock framework | Vite-native — uses the same `electron.vite.config.ts` transforms and resolvers as the app. No separate Babel/Jest config. `vi.mock()` is the established approach for mocking the `electron` module. Vitest 4.x (current latest as of April 2026) requires Vite 8; the project is on electron-vite 5 (Vite 7.x). Pin to 3.x to avoid Vite version conflict. |
| `@vitest/coverage-v8` | `^3.2` | Coverage reporting | Ships with Vitest; no separate Istanbul setup. V8 provider gives line/branch/function coverage with minimal overhead. |

**Why NOT Jest:**
Jest requires a separate Babel or `ts-jest` transform pipeline. Vitest uses the same Vite transforms already configured for the project. For an electron-vite project with TypeScript + React, Vitest is zero-config relative to Jest. Vitest's `vi.mock()` API is Jest-compatible — migration cost is near zero if the team already knows Jest.

**Why NOT Vitest 4.x:**
Vitest 4.x requires Vite 8. electron-vite 5 is built on Vite 7. Mixing Vite 7 (electron-vite's peer dep) with Vite 8 (Vitest 4's peer dep) causes build errors. Pin to `^3.2` until electron-vite releases a version that supports Vite 8.

**Configuration:** Vitest requires a separate config or test project block for the main process (Node environment) vs. renderer tests (jsdom environment). In an electron-vite project, the cleanest approach is a standalone `vitest.config.ts` at project root:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    projects: [
      {
        // Main process tests — Node.js environment, can import 'electron' mock
        name: 'main',
        test: {
          environment: 'node',
          include: ['src/main/**/*.test.ts'],
          setupFiles: ['src/test/setup-main.ts'],
        },
      },
      {
        // Renderer tests — jsdom environment for React component tests
        name: 'renderer',
        plugins: [react()],
        test: {
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.tsx'],
          setupFiles: ['src/test/setup-renderer.ts'],
        },
      },
    ],
  },
})
```

**Confidence: HIGH** — Vitest 3.2 is stable (released early 2025). Vite compatibility constraint verified against electron-vite peer dependency. `vi.mock()` for electron module confirmed working in vitest issues #4166 and #425.

---

### DOM Test Environment — jsdom

**Recommended: `jsdom` (install as devDep, configure in vitest config)**

Vitest supports jsdom via `environment: 'jsdom'` — install `jsdom` as a dev dependency. No separate `@jest-environment-jsdom` needed.

**Why NOT happy-dom:** happy-dom is 2-4x faster but has incomplete DOM API coverage. The project uses CSS custom properties (`var(--color-text-primary)`, etc.) extensively in React components. jsdom has better CSS property support. For a relatively small test suite (not thousands of component tests), the speed difference is immaterial. Choose correctness over speed.

**Confidence: MEDIUM** — jsdom vs happy-dom comparison from vitest discussion #1607 (official repo). CSS property coverage gap from community reports.

---

### React Component Testing — @testing-library/react

**Add:** `@testing-library/react ^16.3`, `@testing-library/dom ^10.4`, `@testing-library/user-event ^14.5`

React 19 requires `@testing-library/react` 16.1.0+. Starting from v16, `@testing-library/dom` is a required peer dependency (install it explicitly).

**Note on known React 19 issues:** There are reported rendering issues where suspended components stay on fallback with `@testing-library/react` 16 + React 19. These affect tests with `Suspense`. The project's renderer components do not use `Suspense` (data flows via IPC callbacks into React state). This class of issue is unlikely to affect this project.

**Why `@testing-library/user-event`:** Preferred over `fireEvent` for simulating realistic user interactions (typing, clicking). `fireEvent` dispatches raw DOM events; `userEvent` simulates full user behavior including focus, blur, and keyboard sequences.

**Confidence: MEDIUM** — React 19 compatibility confirmed for v16.1.0+ from testing-library release notes. Known issues documented in testing-library/react-testing-library issue #1397. Suspended component issue unlikely to affect this project.

---

### Electron Module Mocking — `vi.mock('electron', ...)`

**Problem:** The main process IPC handlers import from `electron` (`ipcMain`, `safeStorage`, `app`, `BrowserWindow`, `net`). Running these tests in Node.js with Vitest — not inside the actual Electron process — means `electron` is not available as a module.

**Recommended: `vi.mock('electron', ...)` in test setup file — no additional library**

Vitest's built-in `vi.mock()` handles this:

```typescript
// src/test/setup-main.ts — runs before all main process tests
import { vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-userData'),
    isReady: vi.fn().mockReturnValue(true),
  },
  safeStorage: {
    encryptString: vi.fn((s: string) => Buffer.from(s)),
    decryptString: vi.fn((b: Buffer) => b.toString()),
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
  },
  BrowserWindow: vi.fn(),
  net: {
    fetch: vi.fn(),
  },
}))
```

**Why NOT `electron-mock-ipc`:** The `h3poteto/electron-mock-ipc` library (last published 2022, ~100 weekly downloads) implements a full IPC channel simulation. This is useful for end-to-end IPC tests but is overkill for handler unit tests. For handler unit tests, the handler function receives direct arguments — no IPC dispatch is needed. Call the handler function directly, mock its dependencies with `vi.fn()`.

**Handler testing pattern — extract business logic into pure functions:**

```typescript
// src/main/handlers/jobs.ts
// Extract the logic from the ipcMain.handle callback into a testable function
export async function getJobsHandler(db: Database): Promise<Job[]> {
  return db.select().from(jobs).all()
}

// Register in IPC (thin wrapper only)
ipcMain.handle('jobs:getAll', () => getJobsHandler(db))

// test
import { getJobsHandler } from '../handlers/jobs'
import { createTestDb } from '../test/helpers'

test('getJobsHandler returns all jobs', async () => {
  const { db } = createTestDb()
  // insert seed data...
  const result = await getJobsHandler(db)
  expect(result).toHaveLength(2)
})
```

This pattern avoids IPC dispatch complexity entirely. The `ipcMain.handle(...)` registration call itself does not need testing; only the handler function's behavior does.

**Confidence: HIGH** — `vi.mock()` hoisting behavior confirmed in vitest docs. The mock function pattern is standard Vitest. Electron module shape from official Electron API docs.

---

### Database Testing — In-Memory better-sqlite3

**Problem:** Handler tests that exercise DB operations need a real SQLite database to be meaningful. Using a mock for every query defeats the purpose.

**Recommended: `better-sqlite3` in-memory database (`:memory:`) with schema setup helper — no new library**

`better-sqlite3` already supports in-memory databases via `new Database(':memory:')`. The project's schema uses `CREATE TABLE IF NOT EXISTS` which is already idempotent. Tests create a fresh in-memory database in `beforeEach`, run schema setup, seed data, and tear down — no files on disk, no cleanup.

```typescript
// src/test/helpers/db.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupSchema } from '../../main/db/index'  // the function that runs CREATE TABLE IF NOT EXISTS

export function createTestDb() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  setupSchema(sqlite)  // run all CREATE TABLE IF NOT EXISTS statements
  return { db, sqlite }
}
```

**Compatibility note:** Running `better-sqlite3` in Vitest requires that tests run in Node.js (not via ELECTRON_RUN_AS_NODE). The `main` test project uses `environment: 'node'` — tests run in Vitest's worker pool (Node.js process). The `better-sqlite3` prebuilt binaries for Node.js work here without recompilation because Vitest's test runner uses the system Node.js binary, not Electron's modified binary. Only the packaged Electron build needs the Electron-compiled native module.

**No additional library needed** — `better-sqlite3` is already installed.

**Confidence: HIGH** — `Database(':memory:')` is documented in better-sqlite3's official API. In-memory database pattern for tests is standard SQLite practice. The Vitest/Node vs. Electron binary distinction confirmed in vitest discussion #2142.

---

### AI Integration Testing — `ai/test` Mock Providers

**Problem:** Tests for AI integration (job analysis handler, bullet suggestion handler, PDF/URL extraction handler) must not call real LLM APIs. Tests must be deterministic, fast, and free.

**Recommended: `ai/test` mock helpers (built into the already-installed `ai` package)**

The `ai` package (already installed at `^6.0.136`) includes a `ai/test` subpath export with mock language model providers:

```typescript
import { MockLanguageModelV1 } from 'ai/test'
import { generateObject } from 'ai'

test('analyzeJob returns structured result', async () => {
  const mockModel = new MockLanguageModelV1({
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20 },
      text: JSON.stringify({
        matchScore: 85,
        keywordHits: ['TypeScript', 'React'],
        gaps: ['Kubernetes'],
        bulletSuggestions: [],
      }),
    }),
  })

  const result = await generateObject({
    model: mockModel,
    schema: AnalysisSchema,
    prompt: 'test',
  })

  expect(result.object.matchScore).toBe(85)
})
```

**Why this approach over `vi.mock('ai')`:** Mocking the entire `ai` module with `vi.mock` would stub out `generateObject` entirely, testing only that the function was called — not that the handler correctly interprets the model's output, handles schema validation errors, or properly constructs the prompt. Using `MockLanguageModelV1` tests the full pipeline from model call through Zod validation to handler return value.

**`mockValues` helper:** The `ai/test` module also exports `mockValues(...)` for sequential calls — useful for testing retry behavior or multi-call handlers (e.g., the PDF import handler calls `generateObject` once for profile extraction, once for work history).

**IMPORTANT — verify the exact class name before implementing:** The class name `MockLanguageModelV1` is documented in AI SDK v3.4 release notes. The installed version is `ai ^6.0.136`. Run this to see what `ai/test` actually exports in the installed version:

```
node -e "const t = require('ai/test'); console.log(Object.keys(t))"
```

Adjust import names based on actual exports. Do not assume the v3.4 class names apply to v6.

**Confidence: MEDIUM** — The `ai/test` export and mock provider pattern are documented at ai-sdk.dev/docs/ai-sdk-core/testing. The exact class name for AI SDK v6 was not directly verified — flag for in-project confirmation before implementation.

---

### Export Pipeline Testing — Snapshot + Buffer Assertions

**Problem:** Testing that PDF and DOCX generation produces correct output without actually running Electron's `printToPDF` (which requires a BrowserWindow and Chromium).

**Recommended approach: split testing strategy**

| What to Test | Approach | Library |
|---|---|---|
| DOCX content correctness | Generate DOCX buffer in Node.js, unzip the `.docx` and assert XML content | `docx` (existing) + `jszip` (new dev dep) |
| Three-layer merge correctness | Unit test `applyOverrides()` directly with mock data | No library — pure TypeScript |
| Snapshot data assembly | Unit test the function that assembles `ResumeSnapshot` from DB data | In-memory DB + direct function call |
| PDF control flow | Mock `webContents.printToPDF` and assert it was called with correct params | `vi.mock('electron', ...)` (existing mock setup) |

**DOCX inspection approach:**

```typescript
import { Packer } from 'docx'
import { buildDocx } from '../../main/lib/buildDocx'
import JSZip from 'jszip'

test('DOCX contains expected role text', async () => {
  const buffer = await Packer.toBuffer(buildDocx(mockResumeData, 'classic'))
  const zip = await JSZip.loadAsync(buffer)
  const wordDoc = await zip.files['word/document.xml'].async('text')
  expect(wordDoc).toContain('Senior Software Engineer')
})
```

**New library required: `jszip ^3.10` (dev dependency only)**

`jszip` is used only in tests to inspect DOCX output (DOCX is a ZIP archive). It is a dev dependency only.

**Alternative: skip DOCX unzip testing.** If DOCX inspection adds more complexity than value, test only the pure TypeScript functions (merge logic, data assembly) and skip binary output inspection. The PDF mock approach is sufficient for validating the export handler's control flow without binary inspection.

**Confidence: MEDIUM** — `Packer.toBuffer()` running in Node.js (no Electron) is confirmed by the `docx` library's architecture (it is a pure Node.js library). JSZip used to inspect DOCX output is a known pattern for ZIP-based file formats.

---

## v2.4 Installation

```bash
# Test framework + coverage
npm install -D vitest@^3.2 @vitest/coverage-v8@^3.2

# DOM environment for renderer tests
npm install -D jsdom

# React component testing
npm install -D @testing-library/react @testing-library/dom @testing-library/user-event

# DOCX binary inspection (tests only)
npm install -D jszip

# No new production dependencies.
#
# electron-builder is already installed (^26.0.12).
# NSIS installer needs electron-builder.yml config changes only — no new packages.
# AI mock helpers are in the existing 'ai' package (ai/test subpath) — no separate install.
# better-sqlite3 in-memory DB uses the already-installed package.
# Electron module mock uses vi.mock() built into Vitest.
```

---

## v2.4 What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `vitest` v4.x | Requires Vite 8; electron-vite 5 uses Vite 7 — version conflict breaks build | `vitest ^3.2` |
| `jest` | Requires separate Babel/ts-jest pipeline; duplicates Vitest for no benefit in a Vite project | `vitest` (Vite-native, zero extra config) |
| `electron-mock-ipc` | Last published 2022, low activity. Full IPC dispatch simulation is overkill for handler unit tests | `vi.mock('electron', ...)` + direct function calls |
| `happy-dom` | Faster but incomplete CSS custom property support — project relies on CSS vars extensively | `jsdom` (more complete) |
| `@playwright/test` with Electron | E2E testing the full packaged app requires building the app for each test run — slow feedback loop. Valuable but a separate concern from unit/integration tests | `vitest` for unit/integration; defer E2E to a future milestone |
| `spectron` | Officially deprecated and archived by the Electron team in 2022 | Playwright (if E2E is ever needed) or Vitest (for unit/integration) |
| `nock` | HTTP interceptor for Node.js — intercepts the `http`/`https` module. The project uses `net.fetch` (Electron's custom fetch, not Node's `http` module). `nock` does not intercept `net.fetch` | `vi.mock('electron', ...)` to mock `net.fetch` |
| `msw` (Mock Service Worker) | Designed for browser-context fetch interception via service workers. The AI SDK calls and URL scraping run in the Electron main process (Node.js context). MSW's service worker does not operate in Node.js | `vi.mock('electron', ...)` for `net.fetch`; `MockLanguageModelV1` from `ai/test` for AI calls |
| `supertest` | HTTP integration test library for Express-style servers. There is no HTTP server in this app — all communication is IPC | Direct handler function calls |
| `@testing-library/jest-dom` | Jest-specific DOM matchers (`toBeInTheDocument`, etc.). Vitest includes compatible matchers natively | Vitest built-in matchers |
| Squirrel installer target | Creates auto-update infrastructure complexity. NSIS is simpler, doesn't require a release server, and is already configured | NSIS (already configured in electron-builder.yml) |
| Inno Setup | An alternative Windows installer. electron-builder's NSIS target is already configured and is the Electron community standard | NSIS via electron-builder |

---

## v2.4 Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `vitest ^3.2` | electron-vite 5 (Vite 7.x), TypeScript 5.x, Node.js 18+ | Do NOT use vitest 4.x — requires Vite 8, conflicts with electron-vite 5's Vite 7 peer dep |
| `@vitest/coverage-v8 ^3.2` | `vitest ^3.2` | Must match vitest major.minor version exactly |
| `jsdom` (latest ~25.x) | `vitest ^3.2` | Built-in support via `environment: 'jsdom'` in vitest config; install jsdom as devDep |
| `@testing-library/react ^16.3` | React 19.2.x | React 19 requires RTL v16.1.0+. Versions below 16.1.0 throw peer dependency errors with React 19 |
| `@testing-library/dom ^10.4` | `@testing-library/react ^16` | Required explicit peer dep starting from RTL v16 |
| `@testing-library/user-event ^14.5` | `@testing-library/dom ^10` | Realistic user interaction simulation; stable v14.x API |
| `jszip ^3.10` | Node.js 18+ | Pure Node.js — works in Vitest's Node environment for DOCX inspection |
| `better-sqlite3 ^12.8` (existing) | Node.js (system binary, not Electron binary) | In-memory `:memory:` database works in Vitest's Node.js worker context without recompilation |
| `ai/test` (subpath of `ai ^6.0.136`) | `ai ^6.0.136` | Mock providers bundled with `ai` package — no separate install; verify exported class names in installed version |
| `electron-builder ^26.0.12` (existing) | Electron 39 | NSIS target confirmed working. No upgrade needed for v2.4 requirements |

---

## v2.4 Sources

- electron.build/nsis.html — NSIS configuration options, `oneClick`, `allowToChangeInstallationDirectory`, `menuCategory` (MEDIUM confidence — official docs, accessed via WebSearch; not directly fetched)
- electron.build/configuration.html — `appId`, `productName` global fields (MEDIUM confidence — official docs)
- github.com/vitest-dev/vitest/releases — Vitest 3.2 and 4.x release history; v4 requires Vite 8 confirmed (HIGH confidence — official repo)
- github.com/vitest-dev/vitest/issues/4166 — `vi.mock('electron')` works; `vi.doMock` fails (MEDIUM confidence — issue thread)
- github.com/vitest-dev/vitest/discussions/2142 — better-sqlite3 native module in Vitest Node.js context (MEDIUM confidence — community discussion)
- ai-sdk.dev/docs/ai-sdk-core/testing — `ai/test` mock providers, mock language model helpers (MEDIUM confidence — mentioned in WebSearch results, not directly fetched; verify exported names in installed package)
- github.com/testing-library/react-testing-library/releases — v16.1.0+ required for React 19 (HIGH confidence — official repo)
- pkgpulse.com/blog/happy-dom-vs-jsdom-2026 — jsdom vs happy-dom CSS coverage comparison (LOW confidence — blog post, single source)
- WebSearch result: vitest latest npm version is 4.1.2 as of April 2026 (HIGH confidence — npm registry search)

---

---

## v2.2 Additions — Three-Layer Data Model, Skills Chip UI, Analysis Overrides

These additions cover: analysis-scoped bullet overrides stored as JSON, skills redesign (chip grid with drag-to-reorder within categories and drag-between-categories), and analysis UX improvements (extract company/role, submit from optimize, edit metadata). The base stack is unchanged — no new npm packages required.

---

### Three-Layer Data Model — Drizzle JSON Column with `.$type<T>()` (No New Library)

**Problem:** AI bullet rewrites currently live on `analysisResults.suggestions` as LLM output strings. The v2.2 requirement is that a user can accept a rewrite for a specific analysis, and that override merges at render time — so the base bullet is preserved, the variant selection layer is preserved, and only the analysis layer adds overrides. Accepted rewrites must survive re-analysis (a new analysis does not wipe accepted overrides from the previous one).

**Recommended: new `analysisOverrides` table + `text({ mode: 'json' }).$type<T>()` column pattern**

Drizzle ORM supports typed JSON columns on SQLite using `text` with `mode: 'json'` and `.$type<T>()` for TypeScript type inference. This is confirmed in official Drizzle docs (orm.drizzle.team/docs/column-types/sqlite). The `text` mode is preferred over `blob` for JSON because SQLite JSON functions only work on TEXT columns — `blob` mode throws errors with JSON functions.

```typescript
// Schema additions to src/main/db/schema.ts

// Override record for a single accepted bullet rewrite, scoped to one analysis
type BulletOverride = {
  bulletId: number
  overrideText: string       // the accepted rewrite text
  acceptedAt: string         // ISO timestamp
}

export const analysisOverrides = sqliteTable('analysis_overrides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  analysisId: integer('analysis_id')
    .notNull()
    .references(() => analysisResults.id, { onDelete: 'cascade' }),
  bulletId: integer('bullet_id')
    .notNull()
    .references(() => jobBullets.id, { onDelete: 'cascade' }),
  overrideText: text('override_text').notNull(),   // accepted rewrite text
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
```

**Why a separate table over a JSON column on `analysisResults`:**
A separate table with one row per accepted override gives:
- Individual delete (dismiss an accepted rewrite without touching other overrides)
- Clean FK cascade (analysis deleted → overrides deleted; bullet deleted → override deleted)
- No JSON diff/merge logic on large strings
- Queryable by `bulletId` — render pipeline can query "does this bullet have an accepted override for this analysis?" in a single indexed lookup

**Why NOT storing accepted overrides in `analysisResults.suggestions` JSON column:**
The suggestions column is raw LLM output — re-analysis overwrites it. Accepted overrides need to survive re-analysis. Mixing user decisions into the LLM output column conflates two responsibilities and makes re-analysis logic fragile.

**Three-layer merge at render time:**
```
Layer 1 (base): jobBullets.text — the canonical bullet
Layer 2 (variant): templateVariantItems.excluded — is this bullet in the variant at all?
Layer 3 (analysis): analysisOverrides for (bulletId, analysisId) — use override text if present
```
Merge is pure TypeScript at render/export time — no DB join tricks needed. The export handler receives `analysisId?` as an optional param; if present it loads overrides and substitutes bullet text before rendering.

**Confidence: HIGH** — Drizzle `text({ mode: 'json' }).$type<T>()` pattern confirmed in official docs. Table-per-override pattern is standard relational design. No library needed.

---

### Skills Category Schema — `skillCategory` column (No New Library)

**Problem:** The current `skills` table uses a free-form `tags` JSON array (`text('tags').notNull().default('[]')`). The v2.2 requirement is a chip grid with drag-between-categories — meaning each skill belongs to one primary category, not an arbitrary set of tags.

**Recommended: add `category` column to `skills` table, deprecate `tags` freeform array**

```typescript
// Migration addition — use CREATE TABLE IF NOT EXISTS / ALTER TABLE pattern already established
// Add category column with default 'Uncategorized' for backward compat

export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull().default('Uncategorized'),  // NEW: primary category
  sortOrder: integer('sort_order').notNull().default(0),           // NEW: for within-category order
  tags: text('tags').notNull().default('[]'),  // keep for backward compat, but category takes precedence
})
```

**Migration approach:** Use the existing `ALTER TABLE skills ADD COLUMN ... DEFAULT ...` in a `try/catch` (already the established pattern for this project — see `CREATE TABLE IF NOT EXISTS` decision in PROJECT.md). Adding `category` with a default of `'Uncategorized'` leaves existing data valid.

**Why one primary `category` instead of many `tags`:** Drag-between-categories semantics require a single authoritative category per skill. With a tags array, "move skill from Frontend to Backend" requires removing one tag and adding another — ambiguous if a skill has 3 tags. A single category column makes the drag target unambiguous.

**Confidence: HIGH** — This is schema design, not a library question. The migration pattern is already established in the project.

---

### Skills Chip Grid with Drag-to-Reorder — `@dnd-kit` (Already Installed)

**Problem:** Skills need a chip grid UI where chips can be reordered within a category (horizontal sort) and dragged between categories (cross-container move). Current UI is a list of `SkillItem` components with no drag UI.

**Already installed:** `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2. No new installation needed.

**Pattern for chip grid with cross-container drag:**

dnd-kit supports multiple SortableContext instances under a single DndContext. This is the canonical pattern for drag-between-containers. The official dnd-kit repo includes a `MultipleContainers` story demonstrating this exact pattern (github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx).

Key implementation decisions:

**Sorting strategy:** Use `rectSortingStrategy` from `@dnd-kit/sortable` for the chip grid. This strategy handles variable-width items (chips have different text lengths) and supports both horizontal and mixed-wrap layouts. `verticalListSortingStrategy` is wrong for a horizontal chip grid — it assumes equal-height vertical rows.

**Cross-container move detection:** Use `onDragOver` on the outer `DndContext` to detect when the active item crosses into a different category container, and update React state to "move" the chip to the new category array. On `onDragEnd`, persist to DB.

```typescript
// Simplified cross-container pattern
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragOver={handleDragOver}   // moves chip to new category in state
  onDragEnd={handleDragEnd}     // persists to DB
>
  {categories.map((category) => (
    <SortableContext
      key={category}
      items={skillsByCategory[category].map(s => s.id)}
      strategy={rectSortingStrategy}
    >
      <CategoryContainer category={category} skills={skillsByCategory[category]} />
    </SortableContext>
  ))}
</DndContext>
```

**Drag handle vs. whole chip as drag trigger:** For chips, make the entire chip the drag trigger (no separate handle icon). Use `useSortable` hook in each chip component. The `PointerSensor` with a small activation distance (`{ activationConstraint: { distance: 8 } }`) prevents accidental drags during click-to-edit.

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },  // px before drag starts — prevents click interference
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }),
)
```

**Chip inline rename:** On chip click (not drag), enter an inline edit state — replace chip display with a controlled `<input>`. This is a React state pattern, no library needed. Key constraint: distinguish click (rename intent) from drag start (move intent) using the `distance: 8` activation constraint above. If `onPointerUp` fires without a drag starting, treat as click.

**Why NOT `react-beautiful-dnd`:** Archived by Atlassian in 2023. No React 18/19 support. Uses deprecated React APIs. The project already uses dnd-kit — no reason to add a second DnD library.

**Why NOT `react-dnd`:** Lower-level, requires more boilerplate. dnd-kit's sortable preset is specifically designed for the reorder + cross-container pattern and is already installed.

**Confidence: HIGH** — @dnd-kit/core 6.3.1 and @dnd-kit/sortable 10.0.0 installed and actively used (BulletList.tsx, JobList.tsx, ProjectBulletList.tsx). Cross-container pattern confirmed via official dnd-kit docs and MultipleContainers story in the official repo. `rectSortingStrategy` for variable-width items confirmed via dnd-kit sortable docs.

---

### Chip Component Implementation — Custom (No New Library)

**Problem:** The skills chip UI needs styled chip components that integrate with dnd-kit's `useSortable` hook and the project's 100%-inline-style constraint. External chip libraries (Material UI, PrimeReact) require CSS imports — they are incompatible with the established "inline styles only" constraint for the renderer.

**Recommended: custom chip component (~50 lines) with inline styles**

The chip component is simple: a pill-shaped container with the skill name text, a drag handle (visual cue via cursor), and an inline rename input. No library needed.

```typescript
// Chip structure (inline styles only, useSortable from @dnd-kit/sortable)
function SkillChip({ skill, onRename, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: skill.id,
  })
  const [editing, setEditing] = useState(false)

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',      // token: 9999px
    background: 'var(--color-surface-raised)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--font-size-sm)',
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {editing
        ? <input autoFocus value={skill.name} onBlur={handleRenameBlur} onChange={...} />
        : <span onClick={() => setEditing(true)}>{skill.name}</span>
      }
    </div>
  )
}
```

`CSS.Transform.toString` is from `@dnd-kit/utilities` (already installed at 3.2.2).

**Why NOT Material UI Chip:** Requires `@emotion/react` and `@emotion/styled` — both inject CSS at runtime and require a ThemeProvider. Incompatible with the "no external CSS" constraint for this project's renderer.

**Why NOT PrimeReact Chips:** Requires PrimeReact CSS import. Same incompatibility.

**Confidence: HIGH** — CSS.Transform.toString from @dnd-kit/utilities confirmed installed and already used in the project. Inline style chip pattern is consistent with existing codebase conventions.

---

### Analysis UX: Extract Company/Role from Posting — LLM Prompt (No New Library)

**Problem:** The user pastes a job posting and must manually fill in company and role fields. The v2.2 requirement is to extract these automatically from the posting text.

**Recommended: add an extraction step to the existing AI analysis call using `generateObject`**

The existing `ai` SDK + Zod pattern already handles structured extraction. Add a lightweight pre-analysis extraction schema:

```typescript
const JobMetaSchema = z.object({
  company: z.string(),
  role: z.string(),
})

const { object: meta } = await generateObject({
  model,
  schema: JobMetaSchema,
  prompt: `Extract the company name and job title from this job posting:\n\n${jobText}`,
})
```

This runs as a separate, fast call (small output schema = fast inference) before the main analysis call, or can be combined into the main analysis schema as additional fields. No new library needed — the AI SDK and Zod are already in the stack.

**Alternative — regex/heuristic extraction:** Brittle. Job postings vary enormously in format. LLM extraction is more reliable and the infrastructure is already in place.

**Confidence: HIGH** — Uses existing `generateObject` + Zod pattern already validated in production (v2.0).

---

### Analysis Overrides Merge at Export/Render — Pure TypeScript (No New Library)

The merge function that replaces base bullet text with accepted overrides is pure TypeScript logic in the export handler and print renderer. No library is needed. The pattern:

```typescript
// In export/render pipeline
async function resolveBullets(
  bullets: Bullet[],
  analysisId: number | null,
  db: Database,
): Promise<Bullet[]> {
  if (!analysisId) return bullets

  const overrides = db
    .select()
    .from(analysisOverrides)
    .where(eq(analysisOverrides.analysisId, analysisId))
    .all()

  const overrideMap = new Map(overrides.map(o => [o.bulletId, o.overrideText]))

  return bullets.map(b => ({
    ...b,
    text: overrideMap.get(b.id) ?? b.text,
  }))
}
```

This is called at the point where bullet data is assembled for `PrintApp` / `buildDocx`. It is a pure data transform — no rendering library change needed.

**Confidence: HIGH** — This is application logic, not a library question.

---

## v2.2 Installation

```bash
# No new npm packages required for v2.2.
#
# All v2.2 features use existing installed packages:
#   @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2
#   drizzle-orm@0.45.1, better-sqlite3@12.8.0
#   ai@^6.0.136, zod@^4.3.6
#
# Changes required:
#   - Schema additions (analysisOverrides table, skills.category + skills.sortOrder columns)
#   - ALTER TABLE migrations using existing try/catch pattern
#   - New SkillChip component (~50 lines, inline styles, useSortable)
#   - SkillList refactor to use chip grid with cross-container DnD
#   - analysisOverrides CRUD IPC handlers in preload/main
#   - Merge logic in export and print render pipeline
```

---

## v2.2 What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-beautiful-dnd` | Archived by Atlassian 2023, no React 18/19 support, uses deprecated React APIs | `@dnd-kit/sortable` (already installed) |
| `react-dnd` | More boilerplate than dnd-kit for this use case; adding a second DnD library is unnecessary | `@dnd-kit` (already installed) |
| Material UI `<Chip>` | Requires `@emotion/react` + `@emotion/styled` — CSS injection incompatible with file:// renderer | Custom chip component (inline styles) |
| PrimeReact Chips | Requires PrimeReact CSS import — same incompatibility | Custom chip component (inline styles) |
| JSON diff/patch library (`fast-json-patch`, `immer`) | Not needed — overrides are stored as individual rows, not JSON diffs | Separate `analysisOverrides` table rows |
| `drizzle-zod` | Auto-generates Zod schemas from Drizzle tables — useful for API validation but adds a build step for no benefit here. Manual Zod schemas for AI output are already the established pattern | Manual Zod schemas (existing pattern) |
| Regex/NLP for job parsing | Brittle — job posting formats vary too much | LLM extraction via `generateObject` + Zod |

---

---

## v2.1 Additions — Template Rendering and Export

These additions cover: 5 purpose-built HTML/CSS templates (Classic, Modern, Jake, Minimal, Executive), font loading for Lato/EB Garamond/Inter, CSS page break control, accent color picker, and DOCX per-template font selection. The base stack (Electron 39, React 19, TypeScript, Drizzle, SQLite, docx 9.6.1, electron-vite 5) is unchanged.

---

### Font Loading for Electron PDF Export (No New Library)

**Problem:** New templates need Lato (Modern/Minimal), EB Garamond (Executive), and Inter (Jake) in addition to the existing Calibri fallback. These fonts must render correctly in both the live preview pane and the hidden BrowserWindow used by `printToPDF`. Google Fonts CDN calls are unreliable in hidden BrowserWindows and fail offline.

**Recommended approach: bundle woff2 files in `src/renderer/public/fonts/`**

electron-vite copies `src/renderer/public/` as-is into the renderer's output root during build. Files placed there are served at `/` in dev (`http://localhost:5173/fonts/...`) and bundled into the output at the same relative path in production (`app://./fonts/...`). The hidden BrowserWindow for export shares the same Electron renderer origin, so `/fonts/...` paths resolve identically for preview and PDF export.

```
src/renderer/public/
  fonts/
    inter-regular.woff2
    inter-bold.woff2
    lato-light.woff2       (weight 300)
    lato-regular.woff2     (weight 400)
    lato-bold.woff2        (weight 700)
    eb-garamond-regular.woff2
    eb-garamond-italic.woff2
```

```css
/* Declare in a <style> block within each template component that needs it,
   OR in a shared fonts.css imported once in main.tsx */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Lato';
  src: url('/fonts/lato-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}
/* etc. */
```

**Font sources:** Google Fonts — all three are OFL-licensed (open source, redistribution allowed).
- Inter: https://fonts.google.com/specimen/Inter
- Lato: https://fonts.google.com/specimen/Lato
- EB Garamond: https://fonts.google.com/specimen/EB+Garamond

**Why "EB Garamond" and not "Garamond":** The system font named "Garamond" only exists on some Windows machines. EB Garamond is the open-source revival and is bundleable. Reference it as `font-family: 'EB Garamond'` in template CSS.

**Why NOT base64 inline fonts:** Causes "OTS parsing error: Failed to convert WOFF 2.0 font to SFNT" in some Chromium versions. Makes CSS files enormous and unmaintainable. No advantage over woff2 file references in an Electron app where the filesystem is always available.

**Why NOT Google Fonts @import:** Network-dependent. Fails if the user is offline. Race condition possible in the hidden BrowserWindow's 200ms settle window. Not reproducible across environments.

**PrintToPDF font settle time:** The existing `print:ready` IPC signal + 200ms settle delay in export.ts is sufficient for woff2 fonts to load in the Chromium renderer. Do not increase the timeout speculatively — only increase if visual testing shows font fallback actually occurring.

**Confidence: MEDIUM-HIGH** — electron-vite public asset behavior from official docs; woff2 path resolution in Electron is standard Chromium behavior; OTS error with base64 fonts from community reports.

---

### CSS Page Break Techniques for printToPDF

**Context:** Electron 39 uses Chromium ~130+. Modern Chromium has full CSS Fragmentation Level 3 support. The existing ProfessionalLayout already uses `pageBreakInside: 'avoid'` on job/project/education entries — this pattern is proven to work with the existing printToPDF call.

**Extend this pattern for new templates:**

```typescript
// On job/project/education/volunteer entry containers — prevent splitting mid-entry
style={{
  breakInside: 'avoid',       // CSS Fragmentation Level 3 (modern)
  pageBreakInside: 'avoid',   // CSS2.1 alias — include both for safety
}}

// On section heading (h2) — prevent heading orphaned at page bottom
style={{
  breakAfter: 'avoid',
  pageBreakAfter: 'avoid',
}}

// Forced page break (e.g., if Executive template needs a two-region layout)
style={{
  breakBefore: 'page',
  pageBreakBefore: 'always',
}}
```

**What does NOT work reliably:**

- `@page` CSS margin rules **conflict with** `printToPDF`'s `margins` option (confirmed Electron issue #8138). The existing export.ts uses `margins: { top: 0, bottom: 0, left: 0, right: 0 }`. Do NOT add `@page` rules to new templates — they cause layout drift between preview and PDF.
- `break-inside: avoid-page` — only `avoid` is reliably supported in Chromium's print engine; `avoid-page` is spec but not reliably implemented.
- `orphans`/`widows` CSS properties — apply only to text nodes inside block containers, not to block elements like sections. Useless for resume section control.

**Page break simulation in preview:** The live preview pane shows continuous scroll, not paginated pages. To show visible page break markers in preview (one of the v2.1 requirements), inject visual dividers at fixed page height intervals using JavaScript (`document.querySelector` after render, or a React `useEffect` that computes element positions relative to page height). This is a UI overlay — it does not affect printToPDF output.

**Confidence: MEDIUM** — CSS Fragmentation support confirmed via MDN and caniuse; `@page` conflict confirmed via Electron GitHub issue #8138; page-break-inside behavior in ProfessionalLayout is already validated in production.

---

### Accent Color Picker — react-colorful

**Add:** `react-colorful` 5.6.1

```bash
npm install react-colorful
```

**Usage in Variant Builder:**

```tsx
import { HexColorPicker, HexColorInput } from 'react-colorful'

<HexColorPicker color={accentColor} onChange={setAccentColor} />
<HexColorInput color={accentColor} onChange={setAccentColor} prefixed />
```

**Why react-colorful:**
- 2.8 KB — smallest available hex color picker
- Zero dependencies
- No CSS import required (since v5)
- Uses only stable React hooks — compatible with React 19 (no class component patterns, no deprecated lifecycle methods)
- Provides both a visual swatch picker and a text hex input

**Caveat:** Last npm publish was ~2022. The library is functionally complete and not actively developed, which is acceptable for a mature, stable UI primitive. If peer dependency warnings appear with React 19, the fallback is a native `<input type="color">` + a separate text input — both are natively supported in Chromium with no library needed.

**Why NOT react-color (older library):** Uses deprecated React class component patterns, last updated 2018, 25x larger bundle.

**Why NOT @uiw/react-color:** 5x larger, more components than needed for a single accent picker.

**Why NOT native `<input type="color">` as first choice:** The OS-native color picker chrome (the system color dialog) does not match the dark design system. It also lacks an inline hex text input companion without additional code.

**Confidence: MEDIUM** — version and features from npm registry; React 19 compatibility inferred from hooks-only implementation (no official compatibility test found).

---

### DOCX Per-Template Font Selection (No New Library)

The existing `docx` 9.6.1 implementation is sufficient. For v2.1, pass a `fontName` parameter to the DOCX builder to allow per-template font selection:

```typescript
// In export.ts — DOCX builder receives fontName from variant's template selection
new TextRun({ text: job.role, bold: true, size: 22, font: fontName })
```

**Recommended DOCX font mapping by template:**

| Template | HTML/PDF Font | DOCX Font | Rationale |
|----------|--------------|-----------|-----------|
| Classic | Times New Roman | Times New Roman | ATS-safe, built into Word |
| Modern | Calibri / Inter | Calibri | Inter not available in Word; Calibri is the ATS-standard |
| Jake | Calibri | Calibri | Same as Modern |
| Minimal | Calibri | Calibri | Same |
| Executive | EB Garamond | Garamond | Garamond is built into Word on Windows and macOS; ATS-safe |

**Font embedding in DOCX:** The `docx` library does not support font embedding (GitHub issue #239, open since 2019, no resolution). DOCX files reference fonts by name — Word loads them from the system. This is acceptable because:
1. All DOCX fonts listed above (Calibri, Times New Roman, Garamond) are built into Word on all supported platforms
2. ATS systems parse text content, not font rendering — font embedding is irrelevant for ATS compliance
3. Adding font embedding would require manually post-processing the DOCX ZIP structure — disproportionate complexity

**ATS compliance principles (already followed by existing implementation):**
- Use standard section headings: WORK EXPERIENCE, EDUCATION, SKILLS (not creative alternatives)
- Plain text bullets — no tables, text boxes, columns, or headers/footers with critical info
- Single-column layout for all DOCX output regardless of template visual style
- Font sizes: body text 10–11pt (size: 20–22 in docx), section headers 11–12pt (size: 22–24), name 14–16pt (size: 28–32)

**Confidence: HIGH** — docx font embedding limitation confirmed via official GitHub; ATS font recommendations from multiple 2025 ATS guides agree on Calibri/Times New Roman/Garamond as safe choices.

---

### Template Schema Changes (No New Library)

The existing `templateVariants` table needs two new columns to support per-variant template and accent color persistence:

```typescript
// In src/main/db/schema.ts — additions to templateVariants table
templateId: text('template_id').notNull().default('classic'),  // 'classic' | 'modern' | 'jake' | 'minimal' | 'executive'
accentColor: text('accent_color').notNull().default('#2563eb'),  // hex string
compactMargins: integer('compact_margins', { mode: 'boolean' }).notNull().default(false),
skillsDisplayMode: text('skills_display_mode').notNull().default('grouped'),  // 'grouped' | 'tags' | 'columns'
```

These are Drizzle schema additions only — no new library.

---

## v2.1 Installation

```bash
# New dependency
npm install react-colorful

# Font files — download from Google Fonts (OFL license), place in:
# src/renderer/public/fonts/
# Required files:
#   inter-regular.woff2, inter-bold.woff2
#   lato-light.woff2, lato-regular.woff2, lato-bold.woff2
#   eb-garamond-regular.woff2, eb-garamond-italic.woff2

# No new npm packages for:
# - Font loading (static files in public/)
# - Page break control (CSS inline styles, existing pattern)
# - DOCX font selection (parameter addition to existing docx builder)
# - Template schema (Drizzle column additions only)
```

---

## v2.1 What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| puppeteer / puppeteer-core | ~200MB Chrome download, redundant with existing Electron Chromium | Existing `webContents.printToPDF` |
| html2canvas + jsPDF | Rasterizes text to image — destroys ATS parsability and search-in-PDF | `printToPDF` (vector text output) |
| pdfmake / pdf-lib | Coordinate-based layout — templates would need a parallel programmatic implementation alongside the HTML/CSS version | `printToPDF` (renders existing HTML/CSS templates directly) |
| @react-pdf/renderer | Separate React renderer — templates would need two implementations (one for preview, one for PDF). Different CSS support from browser | Single template component + `printToPDF` |
| docxtemplater | Requires .docx template files on disk — same ESM/path problem that killed the old resume.json themes. Overkill for programmatic generation | `docx` 9.6.1 (already in use) |
| CSS @page rules in templates | Conflicts with printToPDF's `margins` option (Electron issue #8138) — causes layout drift | printToPDF `margins` option (already used) |
| Google Fonts @import CDN | Network-dependent. Fails if the user is offline. Race condition possible in the hidden BrowserWindow's 200ms settle window | Bundled woff2 in `src/renderer/public/fonts/` |
| Base64 inline fonts | OTS parsing errors in some Chromium versions; unmaintainable | woff2 file references |
| vite-plugin-webfont-dl | Downloads fonts at build time but same result as manually placing woff2 files; adds a build-time plugin dependency | Manual download of woff2 files into public/fonts/ |
| react-color (old library) | Deprecated class component API, 2018-vintage, 25x larger than react-colorful | react-colorful |

---

## v2.1 Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| react-colorful@5.6.1 | React 19.2.x | Hooks only; no deprecated APIs; peer dep listed as React >=16.8.0 |
| docx@9.6.1 (existing) | Electron main process | `Packer.toBuffer()` confirmed working; font embedding not supported by design |
| woff2 font files | Electron 39 / Chromium 130+ | woff2 natively supported in Chromium — no loader or plugin needed |
| CSS break-inside/pageBreakInside | Chromium 130+ | Both legacy and modern properties work — use both for safety |

---

---

## v2.0 Additions

These features require the following new library decisions for the AI analysis milestone:
- LLM API integration (provider-agnostic: Claude, OpenAI, etc.)
- Job posting text parsing/extraction
- Match scoring and semantic keyword analysis
- Provider abstraction layer with user-supplied API keys
- Dark theme design system (CSS custom properties, 4px grid)
- Submission pipeline status tracking (fixed stages — database-only, no new library)

---

### LLM Integration — AI SDK (Vercel)

**Feature:** Send job posting text + resume data to an LLM, receive structured analysis (match
score, gaps, keyword coverage, rewrite suggestions) as typed TypeScript objects.

**Recommended: `ai` (AI SDK v6) + provider-specific adapters**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ai` | ^6.0.135 | AI SDK Core — provider-agnostic `generateText`, `generateObject`, `streamText`, `streamObject` with Zod schema enforcement | Released Dec 2025. Works in Node.js (no Next.js required). Single API surface for all providers. `generateObject` + Zod schema produces fully-typed, validated TypeScript objects from LLM responses — critical for reliable match scores and structured analysis output. |
| `@ai-sdk/anthropic` | ^3.0.63 | Anthropic Claude provider adapter | Drop-in provider. User supplies their own API key. Swap without changing call-site code. |
| `@ai-sdk/openai` | ^3.0.48 | OpenAI (GPT-4o, o1, etc.) provider adapter | Same interface as Anthropic adapter. User supplies their own API key. |
| `zod` | ^4.3.6 | Schema definition for structured LLM output + runtime validation | AI SDK natively consumes Zod schemas in `generateObject`. Already a peer dependency of AI SDK. Produces TypeScript types automatically — no manual type declarations for LLM output shapes. |

**Architecture pattern — all AI calls run in the Electron main process:**

```typescript
// src/main/handlers/ai.ts — IPC handler pattern
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const AnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  keywordHits: z.array(z.string()),
  gaps: z.array(z.string()),
  bulletSuggestions: z.array(z.object({
    bulletId: z.number(),
    original: z.string(),
    suggestion: z.string(),
  })),
});

ipcMain.handle('ai:analyze', async (_event, { jobText, resumeData, provider, apiKey }) => {
  const model = provider === 'anthropic'
    ? anthropic('claude-3-5-sonnet-20241022', { apiKey })
    : createOpenAI({ apiKey })('gpt-4o');

  const { object } = await generateObject({
    model,
    schema: AnalysisSchema,
    prompt: buildAnalysisPrompt(jobText, resumeData),
  });
  return object; // TypeScript type inferred from AnalysisSchema
});
```

**Why NOT raw `openai` or `@anthropic-ai/sdk` packages:**
Direct provider SDKs work but require parallel integration code for each provider. Provider
switching would require changing call-site code. AI SDK's `generateObject` + Zod schema enforces
structured output at the SDK level — raw SDKs leave JSON parsing and validation to the application.

**Why NOT LangChain:**
LangChain is a heavyweight abstraction layer (dozens of transitive dependencies) designed for
chaining multi-step agent pipelines. The v2.0 use case is a single structured generation call per
analysis — there is no chain. LangChain's overhead is unjustified for this scope.

**Why NOT LiteLLM or OpenRouter proxy:**
Both require running a separate server process. This is a local Electron app — no server. AI SDK
handles provider switching in-process.

**AI SDK Node.js compatibility:** Explicitly confirmed in official docs. Works in Node.js 18+.
Electron 39 runs Node.js 22 — fully compatible. No Next.js required.

**Confidence:** HIGH — AI SDK v6 is verified via official docs (ai-sdk.dev). Version confirmed via
`npm show ai version` (6.0.135). Provider adapter versions confirmed via npm. Node.js compatibility
confirmed at https://ai-sdk.dev/docs/getting-started/nodejs.

---

### Structured Output — Zod Integration with AI SDK

`generateObject` is the key function for reliable structured LLM output. It accepts a Zod schema
and returns a fully-typed, validated object. If the model returns malformed JSON or a schema
mismatch, it throws rather than silently returning bad data.

**Pattern for match scoring:**

```typescript
const { object: analysis } = await generateObject({
  model,
  schema: AnalysisSchema,
  mode: 'json', // force JSON mode where provider supports it
  prompt: '...',
});
// analysis is typed as z.infer<typeof AnalysisSchema>
```

`streamObject` is available for progressive UI updates (show partial results as they arrive).
For v2.0, `generateObject` is simpler and sufficient — analysis is a one-shot call.

**Confidence:** HIGH — `generateObject` API verified at https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data.

---

### Settings Persistence — API Keys and Provider Config

**Feature:** Store user-supplied API key(s) and AI provider selection between app launches.
Keys must survive app restarts. UI: Settings page with provider dropdown + API key input.

**Recommended: Electron `safeStorage` + Drizzle (existing DB)**

Do NOT add a new settings library. Use existing primitives:

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `electron.safeStorage` | built-in | Encrypt API key string using OS keychain (macOS Keychain, Windows DPAPI, Linux secret store) | Built into Electron — no new dependency. The only correct approach for storing user-supplied secrets in an Electron app. `safeStorage.encryptString(apiKey)` → `Buffer` → store as blob in SQLite. Decrypt on read with `safeStorage.decryptString(buffer)`. |
| Drizzle ORM + better-sqlite3 | existing | Persist provider choice, encrypted key blob, and model selection | Already in the stack. A `settings` table with key-value rows stores all AI config alongside existing app data. No separate config file needed. |

**Implementation sketch:**

```typescript
// Schema addition
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

// Write API key (main process only — safeStorage requires app ready)
const encrypted = safeStorage.encryptString(rawApiKey);
db.insert(settings).values({ key: 'ai_api_key', value: encrypted.toString('base64') }).run();

// Read API key
const row = db.select().from(settings).where(eq(settings.key, 'ai_api_key')).get();
const apiKey = safeStorage.decryptString(Buffer.from(row.value, 'base64'));
```

**Why NOT `electron-store` v11:**
electron-store v11 is pure ESM only. The electron-vite build compiles the main process as CJS by
default. Adding a pure-ESM package to the CJS main process bundle requires workarounds (marking as
external, dynamic import). The existing project does NOT use electron-store. Adding it purely for
settings would introduce an ESM/CJS friction point with no benefit — Drizzle + SQLite already
provides durable storage.

**Why NOT `electron-conf` v1.3.0:**
electron-conf explicitly does not support encryption ("❌ No encryption" per its own README). API
keys stored unencrypted in a JSON file are visible as plaintext on disk. This is unsuitable for
user-supplied secrets.

**Why NOT a plain JSON file with `fs`:**
Unencrypted API keys stored in a JSON file in `app.getPath('userData')` are readable by any process
on the machine. `safeStorage` uses OS-level encryption tied to the user's login — a meaningful
security improvement for negligible code cost.

**Confidence:** HIGH — `safeStorage` API verified at https://www.electronjs.org/docs/latest/api/safe-storage. Supported since Electron 15. Available in Electron 39.

---

### Semantic Keyword Matching — LLM Embeddings via AI SDK

**Feature:** Match resume keywords against job posting keywords semantically (not just exact string
match). Powers the 0–100 match score and gap analysis.

**Recommended: Delegate to LLM prompt engineering (no separate embedding library)**

For v2.0, semantic matching is handled by the LLM prompt itself rather than a separate embedding
pipeline. The LLM receives both the full resume text and job posting text and is instructed to
return a structured analysis including semantic matches. This approach:

1. Requires zero additional dependencies
2. Leverages the LLM's language understanding directly
3. Returns structured output (via `generateObject` + Zod schema) with match score, hits, and gaps
4. Is accurate enough for the v2.0 use case (assisted tailoring, not automated filtering)

**Why NOT a vector embedding pipeline (`sqlite-vec` + `@huggingface/transformers`):**
The v1.0 research mentioned `@huggingface/transformers` + `sqlite-vec` as "Option A". This approach
requires:
- Downloading embedding model weights (~100MB–1GB) at first run
- Running inference locally (CPU-bound, slow on first run)
- Vector index maintenance in SQLite
- Complex pipeline: text → embedding → cosine similarity → score

For v2.0, this pipeline adds significant complexity and first-run latency with no benefit over
the LLM-based approach — the user is already paying for API calls for the analysis itself. The
match score comes from the same LLM call that produces all other analysis, not a separate step.

**Confidence:** HIGH — This is an architectural decision, not a library question.

---

### Dark Theme Design System — CSS Custom Properties

**Feature:** Full UI redesign with a dark-mode token system. Stripe/Vercel-inspired, 4px grid,
semantic color tokens, consistent typography scale.

**Recommended: CSS custom properties on `:root` + Tailwind CSS 4 `@custom-variant` (no new library)**

The existing Tailwind CSS 4 installation provides everything needed. No new CSS-in-JS library or
design token tool is required.

**Why NOT Style Dictionary or other token tools:**
Style Dictionary transforms design tokens stored in JSON/YAML into platform-specific outputs. This
app already has a design system document and HTML mockups defining the token system — the tokens are
known, not discovered. Introducing a build-time token transform pipeline adds complexity with no
payoff for a single-platform app.

**Why NOT Tailwind CSS `@theme` block for all tokens:**
The existing project has a documented constraint: "Inline styles over Tailwind for spacing — Tailwind
v4 utility classes not applying reliably." CSS custom properties consumed directly via inline styles
(`style={{ color: 'var(--color-text-primary)' }}`) are reliable regardless of Tailwind's utility
class application behavior.

**Confidence:** HIGH — CSS custom properties are a baseline web platform feature.

---

### Drag Reorder — Already Installed

`@dnd-kit/core` ^6.3.1 and `@dnd-kit/sortable` ^10.0.0 are **already installed** (confirmed in
`package.json`). No new installation needed.

---

### Submission Pipeline Status — Database Only

**No new library required.** This is a Drizzle schema change only — a `status` text column with enum constraint on the submissions table.

**Confidence:** HIGH — This is a schema design decision, not a library question.

---

## v2.0 Installation

```bash
# AI SDK core + provider adapters
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod

# No new installs for:
# - Settings storage (safeStorage built-in + existing Drizzle)
# - Dark theme design system (CSS custom properties, no library)
# - Drag reorder (@dnd-kit already installed)
# - Submission pipeline (Drizzle schema change only)
```

---

## What NOT to Add (v2.0)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `langchain` / `@langchain/core` | Heavyweight multi-step agent framework (100+ transitive deps). Designed for chains; v2.0 uses single structured calls. Adds ~15MB+ to bundle | `ai` (AI SDK) + `generateObject` |
| Raw `openai` or `@anthropic-ai/sdk` | Provider-specific API surface — switching providers requires call-site changes. No structured output enforcement | `ai` + `@ai-sdk/openai` / `@ai-sdk/anthropic` |
| LiteLLM / OpenRouter | Requires a running server process. Incompatible with local Electron app architecture | AI SDK handles provider switching in-process |
| `@huggingface/transformers` + `sqlite-vec` for embeddings | Downloads 100MB–1GB model weights. CPU-bound inference. Adds a separate embedding pipeline when the LLM call already performs semantic analysis | LLM prompt-based semantic analysis via `generateObject` |
| `electron-store` v11 | Pure ESM only — conflicts with electron-vite CJS main process bundle | `safeStorage` + Drizzle for API key storage |
| `electron-conf` | No encryption support (stated explicitly in README). Unsuitable for storing API keys | `safeStorage` + Drizzle |
| Style Dictionary / design-token tools | Build-time token pipeline for multi-platform. Overkill for a single-platform app with known tokens | CSS custom properties directly in a `tokens.css` file |
| CSS-in-JS libraries (styled-components, emotion) | Runtime style injection conflicts with existing Tailwind + inline style pattern | CSS custom properties + inline styles (existing pattern) |
| `react-query` / `@tanstack/react-query` | Caching library designed for network requests. All data in this app comes from local SQLite via IPC — no network latency to cache | Direct IPC calls with React state (existing pattern) |

---

## Version Compatibility (v2.0)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ai` ^6.0.135 | Node.js 18+, TypeScript 5.x | Electron 39 runs Node.js 22 — fully compatible. No Next.js required. |
| `@ai-sdk/anthropic` ^3.0.63 | `ai` ^6.x | Provider adapter — must match `ai` major version. |
| `@ai-sdk/openai` ^3.0.48 | `ai` ^6.x | Provider adapter — must match `ai` major version. |
| `zod` ^4.3.6 | `ai` ^6.x (peer dep) | AI SDK natively consumes Zod schemas. zod v4 is the current major. |
| `electron.safeStorage` | Electron 15+ | Available in Electron 39. Main process only — cannot call from renderer or preload. |

---

## v1.1 Additions

These four new features require the following new library decisions. The existing stack handles
everything else.

---

### resume.json Import — Parsing and Validation

**Feature:** Read a `.json` file from disk and map it into the app's internal schema.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `resume-schema` | ^1.0.0 | Validate imported JSON against the official JSON Resume schema before mapping | Authoritative — maintained by the jsonresume org. Wraps `jsonschema` validation internally. Calling `resumeSchema.validate(obj, callback)` gives a structured error list that can surface user-readable import warnings. Zero-dependency validator. |

**No parsing library needed:** The resume.json format is plain JSON. `JSON.parse` is sufficient.
`resume-schema` adds only schema validation on top of that — it is not a parser.

**Confidence:** HIGH — Official jsonresume package. Schema is at stable v1.0.0.

**Alternative considered:** `@jsonresume/schema` (v1.2.1) — use `resume-schema` instead: it is the canonical reference implementation explicitly linked from the official schema docs.

---

### resume.json Theme Rendering

**Feature:** Allow users to select an installed jsonresume theme, render their resume data through
it, and display or export the resulting HTML.

The theme contract is:

```javascript
import * as theme from 'jsonresume-theme-even';
const html = theme.render(resumeObject); // returns complete HTML string
```

#### Theme Module Loading Strategy

**Recommended approach: bundle 2–3 curated themes at install time**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `jsonresume-theme-even` | ^0.14.x | First-party bundled theme — flat, modern layout, dual ESM/CJS builds | Most actively maintained community theme. Explicitly supports both ESM and CJS. |
| `jsonresume-theme-class` | latest | Official jsonresume org theme — self-contained, offline-safe | Published under the jsonresume org. Designed to work offline. |

**ESM caveat for theme packages:** `electron-vite` compiles the main process as CJS by default.
Themes that are ESM-only require `await import('jsonresume-theme-X')` inside an async IPC handler.
Verify the target theme's `package.json` `"type"` field before adding it.

#### Rendering the HTML in the UI

**Recommended approach: `<iframe srcdoc={html}>`**

```tsx
<iframe
  srcdoc={themeHtml}
  sandbox="allow-same-origin"
  style={{ width: '100%', height: '100%', border: 'none' }}
/>
```

**Confidence:** MEDIUM — The `srcdoc` + `sandbox` iframe pattern is well-established.

---

### Projects Section

**No new libraries required.** Uses existing Drizzle + @dnd-kit + React.

---

### Tag Autocomplete

**Recommended approach: custom component (no new library)**

A ~60–80 line component using React state + IPC query. The autocomplete behavior does not justify a library dependency. The data model (freeform strings) conflicts with `react-tag-autocomplete`'s `{ label, value }` object model.

---

## Full Updated Installation

```bash
# v2.4 — Test framework + NSIS config
npm install -D vitest@^3.2 @vitest/coverage-v8@^3.2 jsdom
npm install -D @testing-library/react @testing-library/dom @testing-library/user-event
npm install -D jszip
# + update electron-builder.yml (no new npm packages for installer)

# v2.2 — No new npm packages. Schema migrations + component refactor only.

# v2.1 — Template rendering additions
npm install react-colorful
# + manually place woff2 font files in src/renderer/public/fonts/

# v2.0 — AI analysis additions
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod

# v1.1 — resume.json import and themes (already installed)
# npm install resume-schema jsonresume-theme-even jsonresume-theme-class
```

---

## What NOT to Add (Cumulative)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| puppeteer / puppeteer-core | ~200MB Chrome download, redundant with existing Electron Chromium | `webContents.printToPDF` (existing) |
| html2canvas + jsPDF | Rasterizes text — destroys ATS parsability | `printToPDF` (vector output) |
| pdfmake / pdf-lib | Coordinate-based layout — requires parallel implementation alongside HTML/CSS templates | `printToPDF` |
| @react-pdf/renderer | Separate React renderer — templates need two implementations | Single template + `printToPDF` |
| docxtemplater | Requires .docx template files on disk; path resolution issues in packaged Electron apps | `docx` 9.6.1 (existing) |
| CSS `@page` rules in templates | Conflicts with `printToPDF` margins option (Electron issue #8138) | `printToPDF` margins option |
| Google Fonts @import CDN | Network-dependent, offline failure, race condition in hidden BrowserWindow | Bundled woff2 in public/fonts/ |
| Base64 inline fonts | OTS parsing errors in Chromium; unmaintainable | woff2 file references |
| `langchain` / `@langchain/core` | Heavyweight multi-step agent framework. Single structured calls need no chain | `ai` + `generateObject` |
| Raw `openai` or `@anthropic-ai/sdk` | Provider-specific; no structured output enforcement | `ai` + provider adapters |
| `@huggingface/transformers` + `sqlite-vec` | 100MB–1GB model download; complex pipeline | LLM prompt-based semantic analysis |
| `electron-store` v11 | Pure ESM — conflicts with electron-vite CJS main process | `safeStorage` + Drizzle |
| `electron-conf` | No encryption — unsuitable for API keys | `safeStorage` + Drizzle |
| Style Dictionary / design-token tools | Overkill for single-platform app with known tokens | CSS custom properties in `tokens.css` |
| CSS-in-JS (styled-components, emotion) | Runtime injection conflicts with existing pattern | CSS custom properties + inline styles |
| `react-query` / TanStack Query | Caching for network requests — all data is local SQLite | Direct IPC calls with React state |
| `react-tag-autocomplete` | Data model conflicts with freeform string tags | Custom ~70-line component |
| `dangerouslySetInnerHTML` for theme HTML | Cannot inject full `<html><head><body>` into React DOM | `<iframe srcdoc={html}>` |
| react-color (old library) | Deprecated class components, 2018-vintage, 25x larger | react-colorful |
| vite-plugin-webfont-dl | Same outcome as placing woff2 manually; adds build plugin complexity | Manual woff2 download into public/fonts/ |
| `react-beautiful-dnd` | Archived 2023, no React 18/19 support, deprecated APIs | `@dnd-kit/sortable` (already installed) |
| `react-dnd` | More boilerplate; redundant with dnd-kit already installed | `@dnd-kit/sortable` (already installed) |
| Material UI `<Chip>` | Requires `@emotion/react` + CSS injection — incompatible with file:// renderer | Custom chip component (inline styles) |
| PrimeReact Chips | Requires PrimeReact CSS import — same incompatibility | Custom chip component (inline styles) |
| JSON diff/patch library (`fast-json-patch`, `immer`) | Not needed — overrides are per-row, not JSON diffs | Separate `analysisOverrides` table rows |
| `drizzle-zod` | Auto-schema generation adds build step for no benefit; manual Zod is established pattern | Manual Zod schemas (existing pattern) |
| Regex/NLP for job metadata extraction | Brittle — job posting formats vary too much | LLM extraction via `generateObject` |
| `vitest` v4.x | Requires Vite 8; conflicts with electron-vite 5 (Vite 7) | `vitest ^3.2` |
| `jest` | Requires separate Babel/ts-jest pipeline; redundant in a Vite project | `vitest` (Vite-native) |
| `electron-mock-ipc` | Abandoned 2022; overkill for handler unit tests | `vi.mock('electron', ...)` + direct calls |
| `happy-dom` | Incomplete CSS custom property support | `jsdom` |
| `nock` | Intercepts Node.js `http` module — does not intercept Electron's `net.fetch` | `vi.mock('electron', ...)` |
| `msw` | Browser service worker — does not operate in Node.js main process | `vi.mock` + `MockLanguageModelV1` |
| `@playwright/test` with Electron (now) | Full E2E needs app build per run — slow loop for unit/integration work | `vitest` for unit/integration; defer E2E |
| `spectron` | Deprecated and archived by Electron team in 2022 | Playwright (if E2E needed later) |
| Squirrel installer target | More complex auto-update infrastructure; NSIS already configured | NSIS via electron-builder |

---

## Version Compatibility (Cumulative)

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `vitest ^3.2` | electron-vite 5 (Vite 7.x), TypeScript 5.x | Do NOT use v4.x — requires Vite 8, conflicts with electron-vite 5 |
| `@vitest/coverage-v8 ^3.2` | `vitest ^3.2` | Must match vitest major.minor |
| `jsdom` (latest) | `vitest ^3.2` | Install as devDep; set `environment: 'jsdom'` in vitest config |
| `@testing-library/react ^16.3` | React 19.2.x | React 19 requires RTL v16.1.0+ |
| `@testing-library/dom ^10.4` | `@testing-library/react ^16` | Required peer dep starting RTL v16 |
| `@testing-library/user-event ^14.5` | `@testing-library/dom ^10` | Stable v14.x API |
| `jszip ^3.10` | Node.js 18+ | Pure Node.js; works in Vitest Node environment |
| `better-sqlite3 ^12.8` (existing) | Node.js (system binary) | In-memory `:memory:` works without Electron recompile in tests |
| `ai/test` subpath | `ai ^6.0.136` | Built into existing `ai` package — verify exported class names |
| `electron-builder ^26.0.12` (existing) | Electron 39 | NSIS confirmed working; no upgrade needed |
| react-colorful@5.6.1 | React 19.2.x | Hooks only; peer dep >=16.8.0; no deprecated APIs |
| `ai` ^6.0.135 | Node.js 18+, TypeScript 5.x | Electron 39 runs Node.js 22 — fully compatible. |
| `@ai-sdk/anthropic` ^3.0.63 | `ai` ^6.x | Must match `ai` major version. |
| `@ai-sdk/openai` ^3.0.48 | `ai` ^6.x | Must match `ai` major version. |
| `zod` ^4.3.6 | `ai` ^6.x (peer dep) | zod v4 is current major. |
| `electron.safeStorage` | Electron 15+ | Main process only. Available in Electron 39. |
| `resume-schema` ^1.0.0 | Node.js >=12, CJS | Works in Electron main process. |
| `jsonresume-theme-even` ^0.14.x | Node.js >=14, ESM + CJS | Dual build — safe for electron-vite CJS main process. |
| `jsonresume-theme-class` latest | Node.js >=14 | Official jsonresume org theme. |
| woff2 font files | Electron 39 / Chromium 130+ | Natively supported; no loader needed. |
| CSS break-inside/pageBreakInside | Chromium 130+ | Use both legacy and modern — confirmed working. |
| `@dnd-kit/core` 6.3.1 | React 19.2.x | Already installed; latest version as of 2025. Cross-container drag confirmed. |
| `@dnd-kit/sortable` 10.0.0 | `@dnd-kit/core` 6.x | Already installed; `rectSortingStrategy` for chip grids. |
| `@dnd-kit/utilities` 3.2.2 | `@dnd-kit/core` 6.x | Already installed; `CSS.Transform.toString` for chip drag transforms. |

---

## Sources

**v2.4:**
- electron.build/nsis.html — NSIS configuration options (MEDIUM confidence — official docs, not directly fetched)
- github.com/vitest-dev/vitest/releases — Vitest 3.2 stable, v4.x requires Vite 8 (HIGH confidence — official repo)
- github.com/vitest-dev/vitest/issues/4166 — `vi.mock('electron')` works, `vi.doMock` fails (MEDIUM confidence)
- github.com/vitest-dev/vitest/discussions/2142 — better-sqlite3 in Vitest Node.js context (MEDIUM confidence)
- ai-sdk.dev/docs/ai-sdk-core/testing — `ai/test` mock providers (MEDIUM confidence — WebSearch confirmed, not directly fetched; verify class names in installed package)
- github.com/testing-library/react-testing-library/releases — RTL v16.1.0+ for React 19 (HIGH confidence)
- npmjs.com/package/vitest — v4.1.2 latest as of April 2026; v3.x is current stable (HIGH confidence)

**v2.2:**
- docs.dndkit.com/presets/sortable — sortable strategies including `rectSortingStrategy` (HIGH confidence — official docs)
- github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/MultipleContainers.tsx — cross-container drag pattern (HIGH confidence — official repo example)
- docs.dndkit.com/presets/sortable/sortable-context — SortableContext items prop ordering requirement (HIGH confidence — official docs)
- orm.drizzle.team/docs/column-types/sqlite — `text({ mode: 'json' }).$type<T>()` pattern (HIGH confidence — official Drizzle docs)
- npm registry: `@dnd-kit/core` 6.3.1 is latest as of March 2025 (MEDIUM confidence — npm search result)

**v2.1:**
- electron-vite.org/guide/assets — public directory behavior for renderer (MEDIUM confidence)
- github.com/electron/electron/issues/8138 — @page CSS conflicts with printToPDF margins (MEDIUM confidence)
- github.com/dolanmiu/docx/issues/239 — font embedding not supported in docx (HIGH confidence)
- github.com/omgovich/react-colorful — react-colorful 5.6.1 features (HIGH confidence)
- developer.mozilla.org/en-US/docs/Web/CSS/break-inside — CSS Fragmentation (HIGH confidence)
- caniuse.com/css-page-break — page-break property browser support (HIGH confidence)
- fonts.google.com — OFL license for Inter, Lato, EB Garamond (HIGH confidence)

**v2.0:**
- AI SDK official docs — https://ai-sdk.dev/docs/introduction (HIGH confidence)
- AI SDK generateObject — https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data (HIGH confidence)
- Electron `safeStorage` API — https://www.electronjs.org/docs/latest/api/safe-storage (HIGH confidence)

**v1.1:**
- JSON Resume schema docs — https://docs.jsonresume.org/schema (HIGH confidence)
- JSON Resume theme development — https://jsonresume.org/theme-development (HIGH confidence)

---

*Stack research for: ResumeHelper — v1.0 export + v1.1 resume.json import/themes + v2.0 AI analysis + v2.1 template rendering + v2.2 three-layer data model + v2.4 Windows installer + test suites*
*Researched: 2026-03-13 (v1.0), 2026-03-14 (v1.1), 2026-03-23 (v2.0), 2026-03-25 (v2.1), 2026-03-26 (v2.2), 2026-04-03 (v2.4)*
