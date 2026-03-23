---
phase: 08-foundation
plan: 02
subsystem: database
tags: [ai-sdk, anthropic, openai, safeStorage, drizzle, sqlite, ipc, encryption]

# Dependency graph
requires: []
provides:
  - aiSettings, jobPostings, analysisResults Drizzle table definitions and ensureSchema creation
  - settings:getAi / settings:setAi / settings:testAi IPC handlers with safeStorage encryption
  - Stub ai:analyze, ai:acceptSuggestion, ai:dismissSuggestion IPC handlers
  - Stub jobPostings:list, jobPostings:create, jobPostings:delete, jobPostings:getAnalysis IPC handlers
  - Preload api.settings, api.ai, api.jobPostings namespaces
  - ai, @ai-sdk/anthropic, @ai-sdk/openai, zod installed
affects: [09-analysis, 10-ai-pipeline, 11-job-matching, settings-ui]

# Tech tracking
tech-stack:
  added:
    - ai@6.x (Vercel AI SDK — generateText, streaming)
    - "@ai-sdk/anthropic@3.x (Anthropic provider)"
    - "@ai-sdk/openai@3.x (OpenAI provider)"
    - zod@4.x (schema validation)
  patterns:
    - safeStorage.encryptString / decryptString for API key storage (bytes stored as base64)
    - Singleton table row pattern (id=1, INSERT OR IGNORE) for ai_settings (same as profile)
    - Stub handler pattern: all Phase 9/10 handlers return NOT_CONFIGURED until implemented
    - IPC handler error classification: check status code and message patterns for 401/429/network

key-files:
  created:
    - src/main/handlers/settings.ts
    - src/main/handlers/ai.ts
    - src/main/handlers/jobPostings.ts
  modified:
    - src/main/db/schema.ts
    - src/main/db/index.ts
    - src/main/handlers/index.ts
    - src/preload/index.ts
    - package.json

key-decisions:
  - "API key encrypted via safeStorage.encryptString, stored as base64 string in ai_settings.api_key — never plaintext"
  - "settings:getAi returns {provider, model, hasKey: boolean} — raw key never leaves main process"
  - "Default models: gpt-4o for openai, claude-sonnet-4-20250514 for anthropic when model field is empty"
  - "Test connection error classification: 401=Invalid API key, 429=Rate limited, ECONN*/ETIMEDOUT=Network error"
  - "submissions table extended with status (default: applied) and job_posting_id columns via ALTER TABLE"

patterns-established:
  - "Singleton DB row pattern: INSERT OR IGNORE INTO table (id) VALUES (1) to seed on app start"
  - "Stub handler pattern: return {error, code: NOT_CONFIGURED} for Phase 9+ features"
  - "safeStorage usage: ONLY inside ipcMain.handle callback — never at module top level"

requirements-completed: [AI-03, AI-05]

# Metrics
duration: 2min
completed: 2026-03-23
---

# Phase 8 Plan 02: AI Backend Foundation Summary

**AI SDK installed with safeStorage-encrypted key storage, three new DB tables (ai_settings, job_postings, analysis_results), settings/AI/jobPostings IPC handlers, and full preload namespace wiring**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-23T18:01:33Z
- **Completed:** 2026-03-23T18:03:29Z
- **Tasks:** 2
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Installed ai, @ai-sdk/anthropic, @ai-sdk/openai, zod as dependencies
- Added aiSettings (singleton), jobPostings, and analysisResults Drizzle tables with full schema definitions
- Created settings handler with safeStorage encryption: getAi never returns raw key, setAi encrypts before storing, testAi classifies errors specifically
- Extended submissions table with status and job_posting_id columns for Phase 9 pipeline
- Created stub ai and jobPostings handlers that return structured NOT_CONFIGURED errors
- Wired all three new handler modules into registerAllHandlers()
- Added settings, ai, and jobPostings namespaces to preload api object

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK, add DB tables, create settings handler** - `8696dd6` (feat)
2. **Task 2: Create stub handlers and register in preload** - `1cd6d7a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/main/db/schema.ts` - Added aiSettings, jobPostings, analysisResults table definitions; extended submissions
- `src/main/db/index.ts` - Added CREATE TABLE IF NOT EXISTS for three new tables, INSERT OR IGNORE seed for ai_settings, ALTER TABLE for submissions
- `src/main/handlers/settings.ts` - settings:getAi, settings:setAi (safeStorage), settings:testAi (real LLM call + error classification)
- `src/main/handlers/ai.ts` - Stub ai:analyze, ai:acceptSuggestion, ai:dismissSuggestion (NOT_CONFIGURED)
- `src/main/handlers/jobPostings.ts` - Stub jobPostings:list/create/delete/getAnalysis (NOT_CONFIGURED)
- `src/main/handlers/index.ts` - Registered three new handler modules
- `src/preload/index.ts` - Added settings, ai, jobPostings namespaces
- `package.json` - ai, @ai-sdk/anthropic, @ai-sdk/openai, zod added

## Decisions Made
- safeStorage.encryptString used for API key — stored as base64 in DB, decrypted only inside handler callbacks (per Electron safeStorage restriction — cannot call at module top level)
- settings:getAi returns `hasKey: boolean` not the key itself — renderer only needs to know if configured
- Default models hardcoded in testAi: gpt-4o (OpenAI), claude-sonnet-4-20250514 (Anthropic)
- Error classification uses status code check + message pattern matching (works across AI SDK error shapes)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. API keys are entered by user in the Settings UI (Plan 03).

## Next Phase Readiness
- All backend contracts for the Settings UI (Plan 03) are in place: settings:getAi, settings:setAi, settings:testAi
- All LLM-bound channels (ai:analyze, etc.) return NOT_CONFIGURED — safe to wire up UI before Phase 9
- DB schema for AI analysis pipeline fully defined — Phase 9 can start implementing real handlers
- TypeScript compiles clean with all new additions

---
*Phase: 08-foundation*
*Completed: 2026-03-23*
