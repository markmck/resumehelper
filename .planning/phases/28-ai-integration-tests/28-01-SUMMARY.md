---
phase: 28-ai-integration-tests
plan: 01
subsystem: testing
tags: [ai, vitest, typescript, vercel-ai-sdk, zod, refactor]

# Dependency graph
requires:
  - phase: 26-test-infrastructure
    provides: vitest config, electron mock infrastructure
  - phase: 27-data-layer-tests
    provides: handler extraction pattern, test factories
provides:
  - callJobParser/callResumeScorer/callResumeExtractor accept LanguageModel instance (composition-based mock injection)
  - JobUrlExtractionSchema exported from aiProvider.ts (schema co-location)
  - extractJsonFromText helper exported from aiProvider.ts
  - safeStorage mock returns true from isEncryptionAvailable with UTF-8 encoding
affects: [28-02, 28-03, 28-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composition-based LLM mocking: call functions accept LanguageModel instance instead of (apiKey, provider, model) strings"
    - "Model built once at orchestration level (runAnalysis) and passed to all call functions"

key-files:
  created: []
  modified:
    - src/main/lib/aiProvider.ts
    - src/main/handlers/ai.ts
    - src/main/handlers/jobPostings.ts
    - src/main/handlers/import.ts
    - tests/__mocks__/electron.ts

key-decisions:
  - "LanguageModel imported as type from 'ai' (confirmed export exists in installed version)"
  - "JobUrlExtractionSchema co-located in aiProvider.ts alongside other three AI schemas"
  - "extractJsonFromText extracted as standalone exported helper used by callResumeExtractor"
  - "safeStorage.isEncryptionAvailable default changed to true so runAnalysis integration test passes encryption check"
  - "import.ts updated alongside ai.ts/jobPostings.ts (Rule 3 blocking fix — callResumeExtractor old 4-arg signature caused TS2554)"

patterns-established:
  - "Pattern 1: All AI call functions take LanguageModel instance, not (apiKey, provider, model) strings"
  - "Pattern 2: All Zod schemas for AI responses live in aiProvider.ts"

requirements-completed: [AI-01, AI-03]

# Metrics
duration: 4min
completed: 2026-04-07
---

# Phase 28 Plan 01: AI Provider Refactor Summary

**Refactored callJobParser/callResumeScorer/callResumeExtractor to accept LanguageModel instances, co-located JobUrlExtractionSchema in aiProvider.ts, and extracted extractJsonFromText helper — enabling composition-based MockLanguageModelV3 injection for Wave 2 tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T15:00:50Z
- **Completed:** 2026-04-07T15:04:14Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- New call signatures: `callJobParser(rawText, model)`, `callResumeScorer(resumeText, parsedJob, model)`, `callResumeExtractor(pdfText, model)` — all accept `LanguageModel` from `'ai'`
- `JobUrlExtractionSchema` and `JobUrlExtraction` type now exported from `src/main/lib/aiProvider.ts` alongside the other three AI schemas
- `extractJsonFromText(text: string): unknown` extracted as pure exported helper, used inside `callResumeExtractor`
- `safeStorage` mock returns `true` from `isEncryptionAvailable` with explicit UTF-8 encoding — supports runAnalysis integration test
- All 57 existing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor aiProvider.ts** - `be2890d` (refactor)
2. **Task 2: Update production callers** - `8722c0f` (refactor)
3. **Task 3: Extend electron safeStorage mock** - `6769511` (chore)

## New Signatures (for downstream Wave 2 test plans)

```typescript
// src/main/lib/aiProvider.ts
import type { LanguageModel } from 'ai'

export async function callJobParser(rawText: string, model: LanguageModel): Promise<ParsedJob>
export async function callResumeScorer(resumeText: string, parsedJob: ParsedJob, model: LanguageModel): Promise<ResumeScore>
export async function callResumeExtractor(pdfText: string, model: LanguageModel): Promise<ResumeJsonParsed>
export function extractJsonFromText(text: string): unknown
export const JobUrlExtractionSchema: z.ZodObject<...>
export type JobUrlExtraction = z.infer<typeof JobUrlExtractionSchema>
```

## safeStorage Mock Behavior

```typescript
// tests/__mocks__/electron.ts
export const safeStorage = {
  isEncryptionAvailable: vi.fn().mockReturnValue(true),   // default true (changed from false)
  encryptString: vi.fn().mockImplementation((s: string) => Buffer.from(s, 'utf8')),
  decryptString: vi.fn().mockImplementation((b: Buffer) => b.toString('utf8')),
}
```

Individual tests can still override with `vi.spyOn(safeStorage, 'isEncryptionAvailable').mockReturnValue(false)`.

## Files Created/Modified

- `src/main/lib/aiProvider.ts` — New call signatures, JobUrlExtractionSchema export, extractJsonFromText helper
- `src/main/handlers/ai.ts` — Import getModel, build llm once, pass to callJobParser/callResumeScorer
- `src/main/handlers/jobPostings.ts` — Import JobUrlExtractionSchema from aiProvider, remove inline definition
- `src/main/handlers/import.ts` — Update callResumeExtractor call site to new 2-arg signature
- `tests/__mocks__/electron.ts` — safeStorage returns true from isEncryptionAvailable, explicit UTF-8 encoding

## Decisions Made

- `LanguageModel` type is directly exported from `'ai'` (verified via `Object.keys(require('ai'))` — present in installed version)
- `import.ts` had to be updated alongside the planned files since its `callResumeExtractor` call used the old 4-arg signature, causing TS2554 compile errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated import.ts callResumeExtractor call site**
- **Found during:** Task 2 (update production callers)
- **Issue:** `src/main/handlers/import.ts` called `callResumeExtractor(pdfText, apiKey, aiRow.provider, aiRow.model)` with old 4-arg signature, causing TS2554 compile error not covered by the plan
- **Fix:** Added `getModel` import, built model instance, updated call to `callResumeExtractor(pdfText, llmModel)`
- **Files modified:** src/main/handlers/import.ts
- **Verification:** `npx tsc --noEmit -p tsconfig.node.json` no longer shows TS2554 errors for import.ts
- **Committed in:** 8722c0f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for typecheck to pass. No scope creep — strictly within the signature refactor boundary.

## Issues Encountered

- Pre-existing `TS4023` error in `src/main/db/index.ts` (exported `sqlite` using unexportable `BetterSqlite3.Database` name) was present before our changes and is out of scope for this plan. Logged to deferred items.

## Next Phase Readiness

- Wave 2 test plans (28-02 through 28-04) can now use `MockLanguageModelV3` from `ai/test` directly with the new call signatures
- `JobUrlExtractionSchema` is in `aiProvider.ts` alongside all other schemas — schema tests can import from one place
- `extractJsonFromText` is a standalone testable helper
- No blockers for Wave 2

---
*Phase: 28-ai-integration-tests*
*Completed: 2026-04-07*
