---
phase: 28-ai-integration-tests
plan: 02
subsystem: testing
tags: [ai, vitest, zod, unit-tests, pure-functions]

# Dependency graph
requires:
  - phase: 28-ai-integration-tests
    plan: 01
    provides: extractJsonFromText export, JobUrlExtractionSchema co-located in aiProvider.ts
provides:
  - Schema validation tests for all four AI schemas (JobParserSchema, ResumeScorerSchema, ResumeJsonSchema, JobUrlExtractionSchema)
  - deriveOverallScore weighted-sum, clamping, and rounding tests
  - extractJsonFromText helper unit tests
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function Vitest unit tests with no mock LLM required"
    - "Zod .parse() + .toThrow() pattern for schema rejection tests"

key-files:
  created:
    - tests/unit/main/lib/aiProvider.schema.test.ts
    - tests/unit/main/lib/aiProvider.score.test.ts
    - tests/unit/main/lib/aiProvider.extractor.test.ts
  modified: []

key-decisions:
  - "Created tests/unit/main/lib/ directory (did not exist prior to this plan)"
  - "Added JSON array parsing test to extractor suite (bonus coverage, no plan impact)"

# Metrics
duration: 1min
completed: 2026-04-07
---

# Phase 28 Plan 02: Pure-Function Unit Tests Summary

**Three test files covering AI schema validation (4 schemas), deriveOverallScore weighted-sum/clamping/rounding, and extractJsonFromText fence/unfenced/whitespace/throw cases — 32 tests passing, no mock LLM required**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-07T15:06:44Z
- **Completed:** 2026-04-07T15:08:10Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments

- `aiProvider.schema.test.ts` — 13 tests: JobParserSchema (4), ResumeScorerSchema (4), ResumeJsonSchema (2), JobUrlExtractionSchema (3)
- `aiProvider.score.test.ts` — 11 tests: all-100, all-0, four individual weight probes, negative clamp, above-100 clamp, round-up, round-down, mixed realistic case
- `aiProvider.extractor.test.ts` — 8 tests: fenced with lang hint, fenced without hint, unfenced, whitespace, empty object, JSON array, two malformed-throw cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema validation tests** - `7cd9536`
2. **Task 2: deriveOverallScore tests** - `14d8207`
3. **Task 3: extractJsonFromText tests** - `c8269a2`

## Test Coverage Summary

| File | Tests | Happy Paths | Rejection/Throw |
|------|-------|-------------|-----------------|
| aiProvider.schema.test.ts | 13 | 8 | 5 |
| aiProvider.score.test.ts | 11 | 11 | 0 (clamping tests cover edge values) |
| aiProvider.extractor.test.ts | 8 | 6 | 2 |
| **Total** | **32** | **25** | **7** |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Minor additions (within scope):**
- `aiProvider.schema.test.ts`: Added 5 extra `it(` blocks beyond the minimum 8 (nullish acceptance split into 2 tests, ResumeScorerSchema empty arrays test, JobUrlExtractionSchema isJobPosting=false test)
- `aiProvider.extractor.test.ts`: Added JSON array parsing test as a bonus coverage case

## Known Stubs

None.

## Self-Check: PASSED

Files verified:
- `tests/unit/main/lib/aiProvider.schema.test.ts` — exists, 204 lines
- `tests/unit/main/lib/aiProvider.score.test.ts` — exists, 75 lines
- `tests/unit/main/lib/aiProvider.extractor.test.ts` — exists, 38 lines

Commits verified:
- `7cd9536` — test(28-02): add Zod schema validation tests for all four AI schemas
- `14d8207` — test(28-02): add deriveOverallScore weighted-sum and clamping tests
- `c8269a2` — test(28-02): add extractJsonFromText helper unit tests

All 32 tests pass via `npx vitest run tests/unit/main/lib/`.
