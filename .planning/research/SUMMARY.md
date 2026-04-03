# Project Research Summary

**Project:** ResumeHelper v2.4
**Domain:** Electron desktop app — Windows NSIS installer completion + test suite infrastructure
**Researched:** 2026-04-03
**Confidence:** HIGH (installer config verified against codebase + official docs); MEDIUM (test framework — Vitest/Electron interaction patterns from community sources; AI SDK v6 mock API needs in-project verification)

## Executive Summary

ResumeHelper v2.4 is a focused infrastructure milestone that adds two orthogonal deliverables to an existing, fully-functional Electron + React + SQLite + AI desktop app: a complete Windows NSIS installer and a Vitest-based test suite covering the data layer, export pipeline, and AI integration. Neither concern touches the app's data model, IPC surface, or renderer components. The work is primarily configuration completion (electron-builder NSIS) and new test infrastructure (vitest.config.ts, mocks, test helpers) rather than feature development.

The recommended approach is sequential: installer config first (zero code risk, verifiable in 30 minutes), then test infrastructure setup (unblocks all test writing), then test suites in parallel across data layer, AI integration, and export pipeline. The installer work has no dependencies on the test work; they are safe to execute in any order. The native module challenge (better-sqlite3 compiled for Electron's Node ABI) is a well-documented pattern — use Node-compiled better-sqlite3 with in-memory `:memory:` SQLite for tests, which sidesteps the Electron binary requirement entirely.

The key risks are: (1) the `appId` in `electron-builder.yml` and `setAppUserModelId()` in `src/main/index.ts` must match — a mismatch causes broken uninstallation; (2) the broken `publish.url` pointing to `https://example.com/auto-updates` will cause silent runtime failures if not removed before shipping; (3) the AI SDK v6 `ai/test` mock class name needs in-project verification before tests are written — the documented `MockLanguageModelV1` is from AI SDK v3.4 and the project is on v6. All three risks are low-effort to address upfront.

---

## Key Findings

### Recommended Stack

electron-builder is already installed at `^26.0.12` and partially configured — v2.4 completes the NSIS config, not installs it. Vitest `^3.2` is the correct test runner choice: it shares Vite transforms with electron-vite, requires no separate Babel config, and its `vi.mock()` API is Jest-compatible. Vitest 4.x must be avoided — it requires Vite 8, but electron-vite 5 is pinned to Vite 7.

**Core technologies:**
- `electron-builder ^26` (existing): NSIS installer packaging — already installed, needs `oneClick: false` + metadata fixes
- `vitest ^3.2` (new dev dep): test runner — Vite-native, zero additional config for electron-vite projects; do NOT use 4.x (Vite 8 peer dep conflict)
- `@vitest/coverage-v8 ^3.2` (new dev dep): coverage reporting — V8 provider, no Istanbul setup needed
- `better-sqlite3` `:memory:` (existing): in-memory DB for tests — Node-compiled build works in Vitest node environment without Electron binary
- `jsdom` (new dev dep): DOM environment for renderer component tests
- `@testing-library/react ^16.3` + `@testing-library/dom ^10.4` (new dev deps): React 19 requires v16.1.0+
- `@testing-library/user-event ^14.5` (new dev dep): realistic user interaction simulation for component tests
- `jszip ^3.10` (new dev dep, optional): DOCX content inspection in tests — DOCX is a ZIP archive; skip if DOCX test complexity exceeds value
- `ai/test` subpath (existing `ai` package): mock LLM providers for AI integration tests — class name needs in-project verification for v6

### Expected Features

**Must have — Windows Installer (ship with v2.4):**
- Fix `productName` to "ResumeHelper" and `appId` to `com.resumehelper.app` in electron-builder.yml
- Fix `author` in package.json away from "example.com"
- Update `version` to `2.4.0`
- Add `build/icon.ico` — missing; installer looks broken without it
- Set `oneClick: false` — enables wizard UI with install directory picker and confirmation steps
- Set `allowToChangeInstallationDirectory: true` — power user option
- Change `createDesktopShortcut: always` to `askCreateDesktopShortcut: true` — opt-in, not forced
- Add `runAfterFinish: true` — reduces friction from install to first run
- Remove or stub broken `publish.url: https://example.com/auto-updates` — silent runtime failure risk
- Remove dead `asarUnpack` entries for jsonresume theme packages removed in v2.1
- Update `setAppUserModelId('com.electron')` in `src/main/index.ts` to match new appId

**Must have — Test Suites (ship with v2.4):**
- `vitest.config.ts` with `node` environment, `electron` resolve alias pointing to mock file
- `tests/__mocks__/electron.ts`: static mock for all Electron imports (ipcMain, app, safeStorage, dialog, BrowserWindow, shell)
- `tests/helpers/test-db.ts`: `createTestDb()` factory returning in-memory Drizzle instance
- `tests/setup.ts`: global test setup
- Unit tests for `applyOverrides()` in `src/shared/overrides.ts` (pure function, zero deps — highest ROI)
- Unit tests for `scoreColor()` and `deriveOverallScore()` (pure functions)
- DB CRUD tests for jobs, variants, skills, submissions via in-memory SQLite helper
- AI Zod schema tests: `schema.parse()` and `schema.safeParse()` with fixture JSON
- Handler logic extraction for `handlers/templates.ts` and `handlers/ai.ts` + IPC handler unit tests
- DOCX structure tests asserting paragraph/heading/font output for at least one template

**Should have (v2.4.x):**
- Custom `build/uninstaller.nsh` — prompt user to keep/delete app data on uninstall (requires NSIS macro work; independent of core installer functionality)
- Coverage for remaining IPC handlers — add as regression tests when bugs surface
- PDF import full extraction path tests

**Defer (v3+):**
- E2E Playwright tests — only if a specific regression requires full app launch to reproduce
- React component rendering tests with jsdom — only if component bugs become a pattern
- Code signing / auto-update infrastructure — only if distributing publicly (EV certs cost $300-500/yr)
- MSI installer format — no benefit over NSIS for personal distribution

### Architecture Approach

v2.4 adds two build/dev-time concerns as satellites to the unchanged app core. The installer is a configuration-only concern in `electron-builder.yml` plus one `src/main/index.ts` line. The test suite adds a `tests/` tree with its own config, mocks, and helpers that do not touch any production source file. The only production files modified are handler files where business logic is extracted into named exports for testability — a low-risk refactor (thin IPC wrapper + exported pure function) already established in `handlers/export.ts` (`getBuilderDataForVariant` is already exported as a named function).

**Major components:**
1. `electron-builder.yml` — NSIS installer config: `oneClick: false`, wizard options, correct metadata, asarUnpack cleanup
2. `vitest.config.ts` — Vitest projects config with `node` environment for main process, `jsdom` for renderer; `electron` resolve alias
3. `tests/__mocks__/electron.ts` — static Electron mock; avoids `vi.mock()` factory hoisting bugs documented in Vitest issues #425 and #4166
4. `tests/helpers/test-db.ts` — in-memory SQLite + Drizzle factory; each test gets a fresh isolated DB with no file I/O
5. `tests/data-layer/` — pure function tests + DB operation tests + three-layer merge tests
6. `tests/ai-integration/` — Zod schema tests + prompt builder tests + mocked AI SDK provider tests
7. `tests/export-pipeline/` — DOCX structure tests + snapshot shape tests + template component render tests

**Key patterns to follow:**
- Electron mock via `resolve.alias` (not `vi.mock()` factory) — avoids known hoisting bugs
- In-memory SQLite via `new Database(':memory:')` with `beforeEach` schema reset — real SQL behavior, no file cleanup
- Export business logic from handler files for testability — `ipcMain.handle()` becomes a thin wrapper
- Mock `ai` package via `MockLanguageModelV1` (verify class name in v6) or `vi.mock('ai', ...)` — no real LLM API calls in tests

### Critical Pitfalls

**v2.4-specific pitfalls:**

1. **`appId` mismatch between electron-builder.yml and `setAppUserModelId()`** — Must update both in the same commit. Current `src/main/index.ts` has `setAppUserModelId('com.electron')` — must match new `com.resumehelper.app`. Mismatch causes broken uninstallation and incorrect Windows taskbar grouping.

2. **Broken `publish.url` causes silent auto-update runtime failure** — `electron-builder.yml` has `publish.url: https://example.com/auto-updates`. `electron-updater` is in dependencies. At app startup it will attempt to check for updates and fail silently (or not-so-silently). Remove or stub the publish config entirely for v2.4.

3. **`vi.mock('electron', factory)` hoisting bugs in Vitest** — Vitest issues #425 and #4166 document initialization errors when using `vi.mock('electron')` with a factory function. Use `resolve.alias` in `vitest.config.ts` to point the `electron` module to a static `tests/__mocks__/electron.ts` file instead. No factory function, no hoisting issue.

4. **AI SDK v6 `ai/test` mock class name unverified** — Documentation references `MockLanguageModelV1` from AI SDK v3.4. Installed version is `ai ^6.0.136`. Run `node -e "const t = require('ai/test'); console.log(Object.keys(t))"` before writing any mock provider tests. Class name may differ in v6; fall back to `vi.mock('ai', ...)` if the mock class is unavailable.

5. **Handler extraction scope creep** — Extract logic only from handlers that need test coverage (`handlers/templates.ts`, `handlers/ai.ts`). Do not refactor all 20 IPC handlers. The thin-wrapper + named-export pattern already exists in `handlers/export.ts` — follow it, don't gold-plate it.

**Carry-forward pitfalls relevant to test writing:**

6. **SQLite native module packaging** (Pitfall 4) — Already mitigated in production. For tests: Node-compiled `better-sqlite3` from npm works fine in Vitest node environment for `:memory:` testing. Do NOT use `ELECTRON_RUN_AS_NODE=1` approach — it adds startup overhead and CI complexity with no benefit for unit tests.

7. **Real AI API calls in tests** — Mock the `ai` package. Never call real LLM APIs in tests. Test prompt construction, schema validation, and score derivation — not LLM response fidelity.

---

## Implications for Roadmap

Based on combined research, there is a clear natural phase ordering driven by dependency flow. The installer and test infrastructure are independent of each other; test suites depend on the infrastructure being in place.

### Phase 1: Installer Config Completion

**Rationale:** Zero code dependencies, lowest risk, immediately verifiable — run `npm run build:win` and click through the installer wizard. Produces a shippable artifact. No blockers.

**Delivers:** A professional Windows installer with correct metadata, wizard UI, opt-in desktop shortcut, launch-on-finish, and no broken auto-update plumbing. Produces `dist/ResumeHelper-2.4.0-setup.exe`.

**Addresses:** All installer table-stakes from FEATURES.md (productName, appId, author, version, icon, oneClick: false, shortcut opt-in, runAfterFinish, publish stub removal, dead asarUnpack cleanup).

**Avoids:** appId mismatch pitfall (update `electron-builder.yml` and `setAppUserModelId()` in the same commit); broken publish.url silent failure.

**Research flag:** No further research needed. Official electron-builder NSIS docs are authoritative and the existing config was read directly. Standard patterns apply.

---

### Phase 2: Test Infrastructure Setup

**Rationale:** All test suites depend on this phase. Vitest config, electron mock, and in-memory DB helper must exist before any test file is written. One-time setup that unblocks Phases 3, 4, and 5.

**Delivers:** `vitest.config.ts`, `tests/__mocks__/electron.ts`, `tests/helpers/test-db.ts`, `tests/setup.ts`, `test` and `test:coverage` scripts in package.json. Running `npm test` produces zero failing tests (no test files yet).

**Uses:** Vitest ^3.2, @vitest/coverage-v8, @testing-library/react ^16.3, @testing-library/dom ^10.4, jsdom (all new dev deps).

**Avoids:** `vi.mock()` hoisting bug (use `resolve.alias` pattern); Electron binary complexity for DB tests (use Node-compiled `better-sqlite3`).

**Research flag:** Verify `ai/test` mock class name (`node -e "const t = require('ai/test'); console.log(Object.keys(t))"`) before Phase 4 begins. One command, required before any AI mock provider test is written.

---

### Phase 3: Data Layer Tests

**Rationale:** Highest ROI tests — pure functions have zero setup overhead and in-memory SQLite tests verify real SQL behavior. Foundation for correctness guarantees on the three-layer merge model that is the core of the app's value.

**Delivers:** Tests for `applyOverrides()`, `deriveOverallScore()`, `scoreColor()` (pure functions, immediate), DB CRUD operations (jobs, variants, skills, submissions via test-db helper), `getBuilderDataForVariant()` with seeded in-memory DB. Handler logic extraction for `handlers/templates.ts` and `handlers/ai.ts` as needed.

**Avoids:** Mocking the entire db module (tests verify real SQL behavior, not just function invocations); testing IPC registration boilerplate (no value); `ELECTRON_RUN_AS_NODE` complexity.

**Research flag:** No further research needed. Pure function testing and in-memory SQLite patterns are well-documented. Handler extraction pattern already established in `handlers/export.ts`.

---

### Phase 4: AI Integration Tests

**Rationale:** Can run in parallel with Phase 3 — depends only on Phase 2 infrastructure. AI Zod schema tests have zero blockers (pure TypeScript/Zod, no Electron, no DB). Mock provider tests require the Phase 2 prerequisite verification of AI SDK v6 class names.

**Delivers:** Tests for `JobParserSchema`/`ResumeScorerSchema`/`ResumeJsonSchema` parse/reject behavior with fixture JSON, prompt builder output content assertions (`buildJobParserPrompt()`, `buildScorerPrompt()`), `deriveOverallScore()` weight verification and edge cases (0-100 clamping, weighting), `callJobParser()` with mocked AI SDK.

**Uses:** `ai/test` mock providers (or `vi.mock('ai', ...)` fallback if class name unavailable in v6).

**Avoids:** Real LLM API calls; testing LLM response fidelity (not the project's responsibility).

**Research flag:** In-project verification of `ai/test` API shape for AI SDK v6 is required before writing mock provider tests. Zod schema tests can be written immediately with no blockers.

---

### Phase 5: Export Pipeline Tests

**Rationale:** Can run in parallel with Phases 3 and 4 — depends only on Phase 2 infrastructure. Template component tests are the most isolated (no IPC, no DB). DOCX structure tests require the `test-db` helper from Phase 2 and can reference seeded data patterns from Phase 3.

**Delivers:** Template React component render tests (no crash on minimal props, expected text appears), DOCX buffer content assertions (paragraph text, heading structure, font names per template), snapshot shape validation (expected fields present), PDF export control flow test (mocked `webContents.printToPDF` called with correct params).

**Uses:** `jszip ^3.10` for DOCX ZIP inspection; `@testing-library/react` for template component tests.

**Avoids:** Full PDF generation in tests (requires Electron/BrowserWindow — out of scope for this milestone); E2E Playwright tests.

**Research flag:** No further research needed. `docx` library is pure Node.js. jszip DOCX inspection is a known pattern for ZIP-based formats.

---

### Phase Ordering Rationale

- Phase 1 (Installer) has no dependencies and produces a shippable artifact. Do it first — it validates packaging works before test infrastructure adds complexity.
- Phase 2 (Infrastructure) is the single gate for all test phases. Do it second — one-time setup, no rework.
- Phases 3, 4, 5 (Test suites) can be parallelized after Phase 2. Suggested order by diminishing risk: data layer (core business logic), AI integration (Zod schemas unblock immediately, mock provider tests unblock after verification), export pipeline (highest implementation complexity but lowest bug risk given docx is pure Node).
- Handler extraction (needed for Phase 3 IPC handler tests) is a small refactor embedded in Phase 3 — modifies existing handler files but follows the established `handlers/export.ts` pattern.

### Research Flags

Phases needing in-project verification before writing code:
- **Phase 4 (AI Integration Tests):** Verify `ai/test` mock API shape for AI SDK v6. One command before mock provider tests are written. Zod schema tests can proceed immediately.

Phases with well-documented, verified patterns (skip research-phase):
- **Phase 1 (Installer):** electron-builder NSIS docs are authoritative. Config read directly from project. No ambiguity.
- **Phase 2 (Infrastructure):** Vitest + `resolve.alias` electron mock is a confirmed pattern. Dependency version constraints (^3.2, not 4.x) verified against electron-vite peer deps.
- **Phase 3 (Data Layer):** In-memory SQLite + Drizzle is standard. Pure function testing is straightforward.
- **Phase 5 (Export Pipeline):** `docx` library is pure Node.js. jszip DOCX inspection is a known pattern.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | electron-builder config read directly from project. Vitest version constraint (3.x not 4.x) verified against electron-vite peer deps. `ai/test` mock class name is MEDIUM — needs in-project verification for v6. |
| Features | HIGH | Installer features from official electron-builder NSIS docs verified against existing config. Test feature set from Vitest docs + codebase inspection. Anti-features well-justified. |
| Architecture | HIGH | Based on direct codebase inspection of existing handler patterns, asarUnpack config, build scripts, and the `getBuilderDataForVariant` export pattern already established in `handlers/export.ts`. |
| Pitfalls | HIGH | appId mismatch and publish.url pitfalls verified from code inspection. Vitest hoisting bug verified from official issue tracker. AI SDK mock class name gap identified explicitly and has a known fallback. |

**Overall confidence:** HIGH for installer work and data layer tests. MEDIUM for AI integration tests (one unverified class name with a documented fallback). HIGH for all other test work.

### Gaps to Address

- **AI SDK v6 `ai/test` export shape:** The `MockLanguageModelV1` class name is documented for AI SDK v3.4. The project has `ai ^6.0.136`. Must verify before writing Phase 4 mock provider tests. If renamed or removed in v6, fall back to `vi.mock('ai', () => ({ generateObject: vi.fn().mockResolvedValue({...}) }))`. Low effort to check upfront; no blocker if fallback is used.

- **`build/icon.ico` creation:** Required for installer. Not currently in the repo. Must be created before Phase 1 is considered complete. ICO format requires multi-resolution (16x16, 32x32, 48x48, 256x256) — use ImageMagick or an online ICO converter from a source PNG. This is not blocking Phase 1 config changes but is required for a professional installer.

- **Handler extraction scope:** The specific handlers needing business logic extraction should be confirmed at Phase 3 start to avoid over-refactoring. Named candidates from research: `handlers/templates.ts` and `handlers/ai.ts`. `handlers/export.ts` is already done and is the reference implementation.

---

## Sources

### Primary (HIGH confidence — direct code inspection)

- `D:/Projects/resumeHelper/electron-builder.yml` — current NSIS config, appId placeholder, broken publish.url, asarUnpack entries
- `D:/Projects/resumeHelper/src/main/index.ts` — `setAppUserModelId('com.electron')` placeholder
- `D:/Projects/resumeHelper/package.json` — existing scripts, no test runner present
- `D:/Projects/resumeHelper/src/main/handlers/export.ts` — `getBuilderDataForVariant` already exported (reference pattern)
- `D:/Projects/resumeHelper/src/main/lib/aiProvider.ts` — `callJobParser`, `callResumeScorer`, Zod schemas
- `D:/Projects/resumeHelper/src/shared/overrides.ts` — `applyOverrides()` pure function (zero-dep test candidate)

### Primary (HIGH confidence — official documentation)

- https://www.electron.build/nsis.html — `oneClick`, `perMachine`, `allowToChangeInstallationDirectory`, `askCreateDesktopShortcut` options
- https://vitest.dev/config/ — Vitest 3.x projects configuration, `resolve.alias`
- https://github.com/vitest-dev/vitest/issues/425 — `vi.mock('electron')` hoisting problems; `resolve.alias` approach confirmed
- https://github.com/vitest-dev/vitest/issues/4166 — same hoisting bug, additional confirmation
- https://better-sqlite3.github.io/better-sqlite3/api.html — `new Database(':memory:')` documented API

### Secondary (MEDIUM confidence)

- https://ai-sdk.dev/docs/ai-sdk-core/testing — `MockLanguageModelV1` documented for AI SDK v3.4; v6 class name unverified
- Vitest discussion #2142 — `better-sqlite3` in Vitest node environment behavior
- https://github.com/drizzle-team/drizzle-orm/discussions/784 — Drizzle ORM unit testing with SQLite in-memory
- https://www.electron.build/electron-builder.Interface.NsisOptions.html — NsisOptions interface reference
- NSIS AppData cleanup on uninstall: https://github.com/electron-userland/electron-builder/issues/4141

### Tertiary (LOW confidence — needs validation during implementation)

- jszip DOCX inspection pattern — community examples, no official `docx` library documentation for this approach; validate during Phase 5 implementation

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*
