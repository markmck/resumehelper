# Feature Research

**Domain:** Windows Installer UX (NSIS/electron-builder) + Electron/React Test Suites
**Researched:** 2026-04-03
**Confidence:** HIGH (installer config — official docs verified); MEDIUM (testing strategy — native module constraints vary by environment)

---

## Feature Landscape

### Domain 1: Windows Installer (NSIS via electron-builder)

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Install wizard UI (not silent one-click) | Standard Windows software pattern; users expect to see install location | LOW | `oneClick: false` already in electron-builder.yml — needs verification it actually presents UI |
| Start Menu shortcut | Every Windows app creates this; missing it breaks discoverability | LOW | `shortcutName` already in electron-builder.yml — currently set to `${productName}` |
| Desktop shortcut (opt-in, not forced) | Users expect to opt in/out during install; forced desktop shortcuts are considered rude | LOW | Currently `createDesktopShortcut: always` — should be `askCreateDesktopShortcut: true` |
| Clean uninstaller via Add/Remove Programs | Users expect to be able to remove the app; missing this is a trust failure | LOW | NSIS target provides this by default — verify it appears correctly in Programs list |
| App version in Add/Remove Programs | Standard Windows metadata; helps users know what they installed | LOW | Driven by `version` in package.json — currently `1.0.0`, should be `2.4.0` |
| Correct app name and publisher | Currently `resumehelper` as both appId and productName; needs real name | LOW | Fix `productName` to "ResumeHelper", fix `author` away from "example.com" |
| Predictable install directory | Users expect apps to land in `AppData\Local` (per-user) or `Program Files` (per-machine) | LOW | NSIS default for `oneClick: false` without `perMachine: true` is per-user `AppData\Local` |
| App icon in installer and shortcuts | Unsigned apps still look legitimate with a real icon; missing icon looks broken | LOW | Requires `build/icon.ico` — not currently present in repo |

#### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Install directory picker | Power users appreciate choosing install location | LOW | `allowToChangeInstallationDirectory: true` in nsis config |
| "Launch on finish" checkbox | Reduces friction from install to first run | LOW | `runAfterFinish: true` in nsis config |
| Prompt to keep/delete user data on uninstall | SQLite DB in AppData survives uninstall by default; prompting respects user data intent | MEDIUM | Requires custom `build/uninstaller.nsh` macro; `deleteAppDataOnUninstall` only works for `oneClick: true` mode |
| Correct display name everywhere | "ResumeHelper" not "resumehelper" in taskbar, title bar, installer pages | LOW | Fix `productName` in electron-builder.yml; affects installer title, shortcuts, Programs list |

#### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Code signing certificate | Eliminates SmartScreen "Unknown Publisher" warning | EV certs cost $300-500/yr and require hardware token; standard certs still show warning initially; Azure Trusted Signing adds pipeline complexity. This is a personal tool — one-time "Run anyway" click is acceptable | Document the SmartScreen bypass for self-distribution; revisit if ever distributed publicly |
| Auto-update via electron-updater | Keeps users current automatically | `publish.url` currently points to `https://example.com/auto-updates` — this is broken plumbing that will fail silently in prod; auto-update requires real server infrastructure | Remove or stub the publish config entirely for v2.4; electron-updater is already in dependencies but non-functional |
| Per-machine (system-wide) install | App available to all Windows accounts on the machine | Requires UAC elevation prompt; for a single-user personal tool this is unnecessary friction | Default per-user install; no UAC prompt needed |
| MSI installer format | Enterprise-grade format some users prefer | Requires significantly more configuration and tooling vs NSIS; no benefit for personal distribution | Stay with NSIS |

---

### Domain 2: Test Suites (Data Layer, Export Pipeline, AI Integration)

#### Table Stakes (Developer Expects These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unit tests for pure business logic | `applyOverrides()`, `scoreColor()`, merge logic are pure functions with no deps — fastest possible tests, highest ROI | LOW | `src/shared/overrides.ts` exports pure functions; ideal starting point |
| Vitest as test runner | Already using electron-vite (Vite-based); Vitest shares the same config/transforms — near-zero setup overhead vs. Jest | LOW | Add `vitest` to devDependencies; configure separate `vitest.config.ts` |
| In-memory SQLite for DB tests | Avoids hitting real DB file; each test gets fresh schema; fast and fully isolated | MEDIUM | `better-sqlite3` supports in-memory via `new Database(':memory:')` — Drizzle works with it directly |
| DB CRUD operation tests | Verify schema correctness, insert/select/delete behavior, foreign key constraints | MEDIUM | Use in-memory SQLite + Drizzle; run schema `CREATE TABLE IF NOT EXISTS` in `beforeEach` |
| Three-layer merge behavior tests | Core correctness guarantee: base data → variant selection → analysis override merge must be deterministic | LOW | `applyOverrides()` in `src/shared/overrides.ts` is already pure — test with crafted fixture data covering edge cases |
| AI Zod schema validation tests | The Zod schemas used with `generateObject` define the contract with AI output; test that schemas parse valid fixture JSON and reject malformed input | LOW | Test `schema.parse()` and `schema.safeParse()` with fixture JSON; no AI API calls needed |
| Mock AI provider for integration tests | AI SDK v3.4+ ships `MockLanguageModelV1` and test helpers for deterministic, API-call-free testing | LOW | Use `createMockProvider()` from `ai/test`; avoids real API calls and cost in CI |

#### Differentiators (What Makes the Test Suite Actually Useful)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Handler logic extracted to pure functions | IPC handlers currently mix `ipcMain.handle()` registration with business logic — extraction makes handlers testable without mocking Electron | MEDIUM | Pattern: export `handleGetVariant(db, variantId)` called by the `ipcMain.handle(...)` wrapper; test the export directly |
| DOCX structure assertions | PDF export is hard to unit test; DOCX builder object is inspectable in memory before `Packer.toBuffer()` — assert on paragraph count, heading text, font names per template | MEDIUM | Create fixture variant + profile data; call `getBuilderDataForVariant` with in-memory DB; assert on output structure |
| Separate Vitest environments per layer | Main process tests run in `node` environment; renderer utility tests can run in `jsdom` if needed | MEDIUM | Configure via `environmentMatchGlobs` in `vitest.config.ts` — avoids browser-vs-node API conflicts |
| `beforeEach` schema reset for DB tests | Each test gets a clean DB state; no test pollution between cases | LOW | Standard pattern: recreate in-memory `Database(':memory:')` and run schema creation in `beforeEach` |
| Fixture-based testing over mocking DB | Test real SQL behavior (not just "was this function called") by using in-memory SQLite with real queries | MEDIUM | Higher confidence than mock-everything approach; catches actual query bugs |

#### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| E2E tests with Playwright launching real Electron | Full end-to-end coverage feels thorough | Requires built app; 30-120s per test; flaky without display server in CI; the app has no complex multi-step flows that unit + integration tests can't cover | Defer E2E entirely for v2.4; add only if a specific regression requires it |
| React component tests with jsdom | Component coverage feels complete | Most renderer components are display logic wired to `window.api` (preload IPC); testing them requires mocking the entire preload bridge plus Electron state; high setup cost for low signal | Test renderer utility functions (`scoreColor`, `filterResumeData`) as pure unit tests; skip component rendering tests |
| 100% code coverage target | Feels rigorous | Forces testing of IPC registration boilerplate and DB schema field names that provide zero bug-catching value; wastes time | Target coverage on business logic: merge, scoring, AI schema validation, DOCX structure |
| Running `better-sqlite3` under plain `npx vitest` | Seems like standard setup | `better-sqlite3` is a native module compiled against Electron's Node version, not system Node. Running under plain Vitest throws native module version errors | Run main process tests via `ELECTRON_RUN_AS_NODE=1 electron ./node_modules/.bin/vitest` or vi.mock the db module pointing to a test-only in-memory instance |
| Mocking the entire `db` module | Fully isolates handlers | You're only testing that handlers call db methods — not that queries are correct. Zero value for data correctness | Use real in-memory SQLite; mock only at boundaries that cannot run in test (Electron dialogs, BrowserWindow, file system writes) |

---

## Feature Dependencies

```
[Vitest setup + vitest.config.ts]
    └──required by──> [All test suites]

[Native module problem solved (ELECTRON_RUN_AS_NODE or vi.mock)]
    └──required by──> [In-memory SQLite test helper]

[In-memory SQLite test helper]
    └──required by──> [DB operation tests]
    └──required by──> [IPC handler tests]
    └──required by──> [Export pipeline tests (getBuilderDataForVariant)]

[Handler logic extraction (pure function exports)]
    └──required by──> [IPC handler unit tests]

[AI SDK mock provider]
    └──required by──> [AI integration tests]

[Zod schema fixtures]
    └──feeds into──> [AI Zod schema tests]
    └──feeds into──> [AI integration tests]

[NSIS metadata fixes (productName, appId, author, version)]
    └──required by──> [Any usable installer — must land first]

[build/icon.ico]
    └──required by──> [Professional installer appearance]

[Custom uninstaller.nsh]
    └──enhances──> [Uninstall experience]
    └──independent of──> [Core installer functionality]
```

### Dependency Notes

- **NSIS metadata fixes are zero-risk and should land before anything else**: Purely additive config changes in package.json and electron-builder.yml; no code changes.
- **Native module problem is the critical blocker for all DB-dependent tests**: Must be solved before in-memory SQLite helper, which is itself a prerequisite for DB, IPC handler, and export pipeline tests.
- **Handler logic extraction is a prerequisite for useful IPC handler tests**: Handlers in `src/main/handlers/` currently mix registration with logic — extraction is a refactor step, not just a test step.
- **AI Zod schema tests have no blockers**: The schemas are pure TypeScript/Zod, no Electron, no DB. Can be written immediately after Vitest is configured.

---

## MVP Definition

### Windows Installer — Ship With v2.4

- [ ] Fix `productName` to "ResumeHelper" in electron-builder.yml
- [ ] Fix `appId` to something real (e.g., `com.mark.resumehelper`)
- [ ] Fix `author` in package.json (away from "example.com")
- [ ] Update `version` in package.json to `2.4.0`
- [ ] Add `build/icon.ico` (app icon for installer and shortcuts)
- [ ] Change `createDesktopShortcut: always` to `askCreateDesktopShortcut: true`
- [ ] Add `runAfterFinish: true` to nsis config
- [ ] Remove or stub `publish.url` (currently broken `https://example.com/auto-updates`)
- [ ] Verify `npm run build:win` produces installable .exe with working uninstaller in Add/Remove Programs

### Test Suites — Ship With v2.4

- [ ] Add Vitest to devDependencies; create `vitest.config.ts` with `node` environment
- [ ] Solve `better-sqlite3` native module problem (ELECTRON_RUN_AS_NODE approach)
- [ ] Tests for `applyOverrides()` in `src/shared/overrides.ts`
- [ ] Tests for `scoreColor()` in `src/renderer/src/lib/scoreColor.ts`
- [ ] Create `src/test/helpers/db.ts` — `createTestDb()` utility returning in-memory Drizzle instance
- [ ] DB operation tests: CRUD for jobs, variants, skills, submissions
- [ ] AI Zod schema tests: parse/safeParse with fixture JSON for PDF import and URL extraction schemas
- [ ] Extract handler logic from at least `handlers/templates.ts` and `handlers/ai.ts` to pure functions
- [ ] IPC handler unit tests for extracted handler functions
- [ ] DOCX structure test: assert paragraph/heading/font output for at least one template

### Add After Validation (v2.4.x)

- [ ] Custom `build/uninstaller.nsh` to prompt for user data deletion on uninstall
- [ ] Coverage for remaining IPC handlers — add as regression tests when bugs surface
- [ ] Tests for PDF import full extraction path (pdf-parse + Zod schema + AI mock)

### Future Consideration (v3+)

- [ ] E2E Playwright tests — only if a regression requires full app launch to reproduce
- [ ] React component tests with jsdom — only if component bugs become a pattern
- [ ] Code signing and auto-update infrastructure — only if distributing publicly

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fix installer metadata (productName, appId, author, version) | HIGH | LOW | P1 |
| Add `build/icon.ico` | HIGH | LOW | P1 |
| `askCreateDesktopShortcut` + `runAfterFinish` | MEDIUM | LOW | P1 |
| Remove broken publish URL | HIGH (prevents silent runtime failure) | LOW | P1 |
| Vitest setup + native module solution | HIGH | MEDIUM | P1 |
| `applyOverrides()` + `scoreColor()` unit tests | HIGH | LOW | P1 |
| In-memory SQLite test helper | HIGH | MEDIUM | P1 |
| DB CRUD tests | HIGH | MEDIUM | P1 |
| AI Zod schema tests | HIGH | LOW | P1 |
| Handler logic extraction + IPC tests | HIGH | MEDIUM | P1 |
| DOCX structure tests | MEDIUM | MEDIUM | P2 |
| PDF import full extraction tests | MEDIUM | MEDIUM | P2 |
| Custom uninstaller data-prompt | MEDIUM | MEDIUM | P2 |
| Code signing | LOW (personal tool) | HIGH | P3 |
| E2E Playwright tests | LOW | HIGH | P3 |
| React component tests | LOW | HIGH | P3 |

---

## Sources

- electron-builder NSIS official docs: https://www.electron.build/nsis.html
- electron-builder NsisOptions interface: https://www.electron.build/electron-builder.Interface.NsisOptions.html
- Electron automated testing guide: https://www.electronjs.org/docs/latest/tutorial/automated-testing
- Vercel AI SDK testing (mock providers): https://ai-sdk.dev/docs/ai-sdk-core/testing
- electron-mock-ipc: https://github.com/h3poteto/electron-mock-ipc
- Vitest + Electron native module discussion: https://github.com/vitest-dev/vitest/discussions/2142
- Drizzle ORM unit testing with SQLite: https://github.com/drizzle-team/drizzle-orm/discussions/784
- Electron app testing guide (2026): https://www.accelq.com/blog/electron-app-testing/
- NSIS SmartScreen / code signing: https://codesigningstore.com/how-to-sign-a-windows-app-in-electron-builder
- NSIS AppData cleanup on uninstall issue: https://github.com/electron-userland/electron-builder/issues/4141
- NSIS uninstaller AppData deletion option: https://github.com/electron-userland/electron-builder/issues/2057

---

*Feature research for: Windows installer UX + Electron/React test suite strategy*
*Researched: 2026-04-03*
