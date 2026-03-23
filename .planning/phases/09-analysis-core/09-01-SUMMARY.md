---
phase: 09-analysis-core
plan: 01
subsystem: api
tags: [ai-sdk, zod, drizzle, sqlite, ipc, electron, llm, analysis]

# Dependency graph
requires:
  - phase: 08-foundation
    provides: AI settings handler with safeStorage key decryption, design system tokens, stub IPC handlers
  - phase: 07-resume-json-theme-rendering
    provides: buildResumeJson, getBuilderDataForVariant for resume data assembly
provides:
  - Two-call LLM pipeline (parse job posting + score resume) via ai:analyze IPC handler
  - Zod schemas for JobParserSchema and ResumeScorerSchema with exported ParsedJob/ResumeScore types
  - Job postings CRUD IPC handlers (list with latest analysis join, create, delete, getAnalysis)
  - aiProvider.ts with getModel, callJobParser, callResumeScorer, deriveOverallScore
  - analysisPrompts.ts with buildJobParserPrompt, buildScorerPrompt, buildResumeTextForLlm
  - Extended DB schema with semanticMatches, status, scoreBreakdown on analysisResults and parsedPreferred on jobPostings
affects: [10-analysis-ui, 11-applications, 12-export-snapshot]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-call LLM pipeline: parse job posting first (cached), then score resume against parsed data"
    - "temperature: 0 for all generateObject calls — deterministic scoring"
    - "Overall score derived in code (weighted formula) rather than asked from LLM to avoid arithmetic errors"
    - "Job parser cache: parsedKeywords !== '[]' signals cached parse result, avoids redundant LLM call"
    - "ai:progress events carry optional data payload (phase, pct, data?) for rich renderer updates"

key-files:
  created:
    - src/main/lib/aiProvider.ts
    - src/main/lib/analysisPrompts.ts
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - src/main/handlers/ai.ts
    - src/main/handlers/jobPostings.ts
    - src/preload/index.ts

key-decisions:
  - "overall_score excluded from LLM schema — computed in code via deriveOverallScore (keyword*0.35 + skills*0.35 + experience*0.20 + ats*0.10) to avoid LLM arithmetic errors"
  - "Job parsing result cached in jobPostings columns — subsequent analyses for same posting skip Call 1"
  - "rewrite_suggestions must reference existing bullets only — fabrication prevention enforced in system prompt"
  - "getAnalysis auto-marks status to 'reviewed' on first view — no separate mutation needed from renderer"
  - "ParsedJob reconstructed from cached columns when cache hit — title/company from posting row, rest from parsed JSON columns"

patterns-established:
  - "LLM schemas: use .nullish() for fields LLM might return as null (experience_years, education_requirement)"
  - "IPC progress events: (phase: string, pct: number, data?: unknown) — data carries structured payload at key milestones"
  - "Score derivation: weighted formula in deriveOverallScore(), not in LLM call"

requirements-completed: [ANLYS-02, ANLYS-03, ANLYS-04, ANLYS-06, ANLYS-07]

# Metrics
duration: 2min
completed: 2026-03-23
---

# Phase 9 Plan 1: Analysis Core Backend Summary

**Two-call LLM pipeline with Zod schemas, job posting CRUD, and DB schema extensions powering the AI analysis engine**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-23T23:10:27Z
- **Completed:** 2026-03-23T23:13:09Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Built complete two-call AI analysis pipeline: parse job posting (with caching) then score resume against parsed data
- Implemented all jobPostings CRUD handlers (list with latest analysis join, create, delete, getAnalysis with auto-review)
- Extended DB schema with semanticMatches, status, scoreBreakdown on analysisResults and parsedPreferred on jobPostings
- Created aiProvider.ts (Zod schemas, getModel, callJobParser, callResumeScorer, deriveOverallScore) and analysisPrompts.ts (prompt builders, resume text renderer)
- Updated preload onProgress to carry optional data payload for parsed job information after Call 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend DB schema and create LLM pipeline modules** - `318d727` (feat)
2. **Task 2: Implement ai:analyze handler and jobPostings CRUD, update preload** - `8e05989` (feat)

**Plan metadata:** (created in this commit)

## Files Created/Modified

- `src/main/lib/aiProvider.ts` - Zod schemas (JobParserSchema, ResumeScorerSchema), getModel, callJobParser, callResumeScorer, deriveOverallScore
- `src/main/lib/analysisPrompts.ts` - buildJobParserPrompt, buildScorerPrompt, buildResumeTextForLlm
- `src/main/db/schema.ts` - Added semanticMatches, status, scoreBreakdown to analysisResults; parsedPreferred to jobPostings
- `src/main/db/index.ts` - Added 4 ALTER TABLE statements for new columns
- `src/main/handlers/ai.ts` - Full ai:analyze two-call pipeline replacing stub
- `src/main/handlers/jobPostings.ts` - Full CRUD handlers replacing stubs
- `src/preload/index.ts` - Extended onProgress signature to accept optional data payload

## Decisions Made

- overall_score excluded from LLM schema: computed in code via weighted formula to avoid LLM arithmetic errors
- Job parse result cached in jobPostings table columns — subsequent analyses skip Call 1
- getAnalysis auto-marks status 'reviewed' on first retrieval — renderer doesn't need a separate mutation
- ParsedJob reconstructed from cached columns when cache hit (title/company from posting row, skills/keywords/requirements from parsed JSON columns)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. AI API key must already be configured via Settings (Phase 8).

## Next Phase Readiness

- All analysis backend IPC handlers are functional and type-safe
- Phase 10 can build the Analysis UI screens that call ai:analyze and jobPostings:* handlers
- ai:acceptSuggestion and ai:dismissSuggestion remain as stubs for Phase 10

---
*Phase: 09-analysis-core*
*Completed: 2026-03-23*
