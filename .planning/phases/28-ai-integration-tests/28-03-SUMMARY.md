---
phase: 28-ai-integration-tests
plan: 03
subsystem: testing
tags: [ai, vitest, typescript, vercel-ai-sdk, MockLanguageModelV3, composition-mocking]

# Dependency graph
requires:
  - phase: 28-ai-integration-tests
    plan: 01
    provides: callJobParser/callResumeScorer/callResumeExtractor with LanguageModel instance signatures
provides:
  - MockLanguageModelV3-based tests for callJobParser (3 tests)
  - MockLanguageModelV3-based tests for callResumeScorer (3 tests)
  - MockLanguageModelV3-based tests for callResumeExtractor (4 tests)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MockLanguageModelV3 from ai/test: composition-based LLM mocking for deterministic AI call testing"
    - "mockReturning helper: wraps canned object as JSON text in doGenerate response"
    - "mockCapturingPrompt helper: captures options.prompt array for prompt-wiring assertions"
    - "doGenerate returns {finishReason, usage: {inputTokens, outputTokens}, content: [{type, text}], warnings: []}"

key-files:
  created:
    - tests/unit/main/lib/aiProvider.calls.test.ts
  modified: []

key-decisions:
  - "MockLanguageModelV3 (not V1 or V2) confirmed present in installed ai SDK — specificationVersion v3"
  - "usage field uses flat {inputTokens, outputTokens} shorthand (not nested objects) — accepted by MockLanguageModelV3"
  - "warnings: [] is required in doGenerate return — without it SDK throws Cannot read properties of undefined (reading length)"
  - "prompt captured via options.prompt in doGenerate — serialized as [{role, content}] message array"
  - "as any casts used at call sites to satisfy LanguageModel type alias while using MockLanguageModelV3"

patterns-established:
  - "Pattern: Two reusable test helpers (mockReturning, mockCapturingPrompt) reduce boilerplate in AI call tests"
  - "Pattern: mockReturningText inner helper in callResumeExtractor suite for generateText vs generateObject distinction"

requirements-completed: [AI-03]

# Metrics
duration: 10min
completed: 2026-04-07
---

# Phase 28 Plan 03: MockLanguageModelV3 Call Function Tests Summary

**MockLanguageModelV3 from ai/test used to test callJobParser, callResumeScorer, callResumeExtractor with composition-based mocking — no vi.mock('ai') or vi.mock('aiProvider') anywhere in the file**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-07T10:00:00Z
- **Completed:** 2026-04-07
- **Tasks:** 2 (collapsed into 1 atomic commit)
- **Files created:** 1

## Accomplishments

- 10 tests across 3 describe blocks covering all three AI call functions
- `callJobParser`: happy path, rejection on missing field, prompt-wiring assertion with unique marker
- `callResumeScorer`: happy path, rejection on missing field, keyword prompt-wiring assertion
- `callResumeExtractor`: fenced JSON, malformed JSON (rejects), schema-invalid JSON (rejects), unfenced JSON
- No `vi.mock('ai')` or `vi.mock('aiProvider')` — D-03 fully compliant
- `MockLanguageModelV3` confirmed as `v3` specificationVersion in installed SDK

## Task Commits

1. **Task 1 + 2: Scaffold + test suites (combined)** — `3183c22`
   - Created `tests/unit/main/lib/aiProvider.calls.test.ts` with scaffold helpers and all test suites

## Test Counts Per Call Function

| Function | Tests | Coverage |
|---|---|---|
| `callJobParser` | 3 | happy path, rejection, prompt-wiring |
| `callResumeScorer` | 3 | happy path, rejection, keyword prompt-wiring |
| `callResumeExtractor` | 4 | fenced valid, malformed, schema-invalid, unfenced valid |
| **Total** | **10** | |

## MockLanguageModelV3 doGenerate Return Shape

The installed SDK (`ai` v6, specificationVersion `v3`) accepts the following shape from `doGenerate`:

```typescript
{
  finishReason: 'stop',
  usage: { inputTokens: 10, outputTokens: 20 },   // flat shorthand — nested form also works
  content: [{ type: 'text', text: JSON.stringify(obj) }],
  warnings: [],   // REQUIRED — SDK throws if undefined
}
```

Key findings from Task 1 SDK inspection:
- `MockLanguageModelV3` is the correct class name (not V1 or V2)
- The `warnings: []` field is required; omitting it causes `Cannot read properties of undefined (reading 'length')`
- Prompt is captured from `options.prompt` in `doGenerate`, structured as a message array: `[{role: 'system', content: '...'}, {role: 'user', content: [{type: 'text', text: '...'}]}]`

## SDK Version Quirks

No class name substitution needed — `MockLanguageModelV3` was confirmed present. The only quirk was the required `warnings: []` field in `doGenerate` return value.

## Composition Mocking Confirmation

- `grep -c "vi.mock" tests/unit/main/lib/aiProvider.calls.test.ts` returns **0**
- `grep -c "MockLanguageModelV3" tests/unit/main/lib/aiProvider.calls.test.ts` returns **7**
- No `vi.mock('ai', ...)` — D-03 compliant
- No `vi.mock('../../../../src/main/lib/aiProvider', ...)` — D-03 compliant

## Files Created

- `tests/unit/main/lib/aiProvider.calls.test.ts` — 163 lines, 10 tests

## Deviations from Plan

### Collapsed Task 1 and Task 2 into a Single Commit

- **Reason:** Both tasks modify the same file. Writing the complete file in one pass (scaffold + suites) is more efficient and avoids an intermediate commit that represents an incomplete file with no tests.
- **Impact:** No acceptance criteria were skipped. All Task 1 and Task 2 acceptance criteria verified before commit.
- **Classification:** Process deviation only — no code deviation.

---

**Total deviations:** 1 (process — task collapse, no acceptance criteria impact)

## Known Stubs

None — all tests wire real imported functions to MockLanguageModelV3 instances. No placeholder data flows to UI.

---

*Phase: 28-ai-integration-tests*
*Completed: 2026-04-07*
