---
phase: 28-ai-integration-tests
plan: 04
subsystem: testing
tags: [ai, vitest, typescript, vercel-ai-sdk, integration-test, runAnalysis]

# Dependency graph
requires:
  - phase: 28-01
    provides: runAnalysis accepts LanguageModel instance, safeStorage mock returns true
  - phase: 26-test-infrastructure
    provides: createTestDb(), vitest config
  - phase: 27-data-layer-tests
    provides: Phase 27 factories (seedJobPosting, seedVariant, seedJobWithBullets, updateProfile)
provides:
  - tests/unit/main/handlers/ai.runAnalysis.test.ts: cache-miss and cache-hit integration tests
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.spyOn on named export getModel for composition-based LLM injection (not vi.mock)"
    - "@electron-toolkit/utils aliased in vitest.config test.alias to allow import.ts chain under test"

key-files:
  created:
    - tests/unit/main/handlers/ai.runAnalysis.test.ts
    - tests/__mocks__/@electron-toolkit/utils.ts
  modified:
    - vitest.config.ts

key-decisions:
  - "vi.spyOn(aiProvider, 'getModel') satisfies D-03 — spy on named export, not module replacement"
  - "@electron-toolkit/utils requires a test alias because export.ts imports it and the CJS require fails under ESM vitest"
  - "No template_variant_items rows needed — getBuilderDataForVariant returns empty arrays gracefully when no exclusion items exist"
  - "matchScore expected value is 77 (Math.round(80*0.35 + 75*0.35 + 70*0.20 + 90*0.10) = Math.round(77.25) = 77)"

patterns-established:
  - "Pattern: Handler integration tests live in tests/unit/main/handlers/ mirroring src/main/handlers/"
  - "Pattern: Heavy Electron-dependent modules (export.ts) need @electron-toolkit/utils alias in vitest.config"

requirements-completed: [AI-03]

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 28 Plan 04: runAnalysis Integration Tests Summary

**Two integration tests for runAnalysis covering cache-miss (full parse+score path) and cache-hit (scoring only) using MockLanguageModelV3 injected via vi.spyOn on the getModel named export**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-07T15:07:10Z
- **Completed:** 2026-04-07T15:10:00Z
- **Tasks:** 2
- **Files created/modified:** 3

## Accomplishments

- Created `tests/unit/main/handlers/ai.runAnalysis.test.ts` with 2 passing integration tests
- Cache-miss test verifies: LLM called twice, all 5 progress stages emitted, jobPostings parsed* columns updated, analysisResults row inserted with matchScore=77
- Cache-hit test verifies: LLM called exactly once, 'parsing'/'parsed' events NOT emitted, 'scoring'/'storing'/'done' ARE emitted
- Added `@electron-toolkit/utils` mock and vitest.config alias to unblock import chain (export.ts dependency)
- Full test suite: 101 tests passing (up from 57 pre-phase-28, 59 pre-plan-04)

## Task Commits

1. **Task 1: Test scaffold** - `3d1c0e6` (test)
2. **Task 2: Cache-miss and cache-hit tests + blocking fix** - `d359d98` (feat)

## Test Strategy: vi.spyOn on Named Export (D-03)

`runAnalysis` internally calls `getModel(provider, model, apiKey)` to build its LLM instance — it does NOT accept an injected model. To substitute `MockLanguageModelV3`:

```typescript
vi.spyOn(aiProvider, 'getModel').mockReturnValue(mock as any)
```

This is a per-test spy on the named `getModel` export from `aiProvider.ts`. It satisfies D-03 because:
- It does NOT use `vi.mock('../../../../src/main/lib/aiProvider', ...)` (module replacement)
- It does NOT use `vi.mock('ai', ...)` (SDK module replacement)
- It is a targeted spy that intercepts only the `getModel` call within the current test scope
- `vi.restoreAllMocks()` in `afterEach` ensures no cross-test contamination

## Seed Requirements for getBuilderDataForVariant

`getBuilderDataForVariant(db, variantId)` does NOT throw on empty tables — it returns empty arrays for all sections. Minimum seed requirement is:
- A `templateVariants` row (so the function has a valid variantId to filter against)
- No `template_variant_items` rows needed — the function returns all rows without exclusion

We also seed a job+bullets and profile for realistic resume text, but these are not strictly required.

## matchScore Calculation

```
keyword_score = 80, skills_score = 75, experience_score = 70, ats_score = 90
Weights: 0.35, 0.35, 0.20, 0.10

score = Math.round(80*0.35 + 75*0.35 + 70*0.20 + 90*0.10)
      = Math.round(28 + 26.25 + 14 + 9)
      = Math.round(77.25)
      = 77
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Add @electron-toolkit/utils mock and vitest.config alias**
- **Found during:** Task 2 (running tests)
- **Issue:** `src/main/handlers/export.ts` (imported by `ai.ts` via `getBuilderDataForVariant`) imports from `@electron-toolkit/utils`. The CJS module tries to `require('electron')` at load time, but Vitest's `test.alias` for `electron` does not intercept CommonJS `require()` calls from within other node_modules. This caused: `Named export 'BrowserWindow' not found. The requested module 'electron' is a CommonJS module`
- **Fix:** Created `tests/__mocks__/@electron-toolkit/utils.ts` with a minimal mock (`is`, `platform`, `electronApp`) and added it to `vitest.config.ts` under `test.alias`
- **Files modified:** `tests/__mocks__/@electron-toolkit/utils.ts` (created), `vitest.config.ts`
- **Commit:** `d359d98` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for import chain to resolve under Vitest. No scope creep — strictly required to run the planned tests.

## Phase 28 Test Suite Status

All Phase 28 test files now pass:
- `tests/unit/main/lib/aiProvider.schema.test.ts` — 4 schemas
- `tests/unit/main/lib/aiProvider.score.test.ts` — deriveOverallScore
- `tests/unit/main/lib/aiProvider.extractor.test.ts` — extractJsonFromText
- `tests/unit/main/lib/aiProvider.calls.test.ts` — callJobParser, callResumeScorer, callResumeExtractor
- `tests/unit/main/handlers/ai.runAnalysis.test.ts` — runAnalysis (cache-miss + cache-hit)

**Total: 101 tests passing, 0 failing**

## Self-Check: PASSED
