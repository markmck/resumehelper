# Project Research Summary

**Project:** ResumeHelper
**Domain:** Local-first Electron desktop app — resume management, AI-assisted job matching, PDF/DOCX export
**Researched:** 2026-03-23 (v2.0 synthesis; builds on v1.0/v1.1 research from 2026-03-13 and 2026-03-14)
**Confidence:** HIGH (stack and architecture verified against live packages and official docs; features verified against competing tools; pitfalls verified via code inspection)

---

## Executive Summary

ResumeHelper is a local-first Electron desktop app that has grown through three milestones: v1.0 established the core resume database and PDF/DOCX export pipeline; v1.1 added projects, resume.json import, and theme rendering; v2.0 (current milestone) adds LLM-powered job analysis, match scoring, and bullet rewrite suggestions. The app's central architectural constraint is that all user data stays on device and the user supplies their own API keys — no backend, no cloud, no subscriptions.

The recommended approach for v2.0 is lean and additive: the Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai` + `zod`) covers the entire LLM integration surface with a single unified interface, Electron's built-in `safeStorage` encrypts API keys using the OS keychain, and a `design-tokens.css` file with CSS custom properties handles the dark-theme redesign without any new CSS library. No other new dependencies are needed. The existing Electron 39 / React 19 / TypeScript / Tailwind CSS 4 / Drizzle ORM / better-sqlite3 stack handles everything else.

The primary risks are architectural rather than technical: AI fabrication must be enforced by a hard prompt contract (the user's core anti-requirement is AI-generated text), API keys must never cross the IPC boundary to the renderer process, LLM output must be validated with Zod schemas before storage, and the match score must be derived from deterministic sub-components rather than raw LLM confidence numbers. These constraints must be designed into the system upfront — they cannot be retrofitted cheaply.

---

## Key Findings

### Recommended Stack

The v2.0 stack is the existing v1.1 stack plus four packages. The existing scaffold (Electron 39, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, better-sqlite3, electron-builder, @dnd-kit) is locked in and performs well. The v2.0 additions are minimal by design.

**Core new technologies:**
- `ai` (Vercel AI SDK v6.0.135): Provider-agnostic `generateObject` / `generateText` — `generateObject` + Zod schema enforces typed, validated LLM output without manual JSON parsing
- `@ai-sdk/anthropic` ^3.0.63 + `@ai-sdk/openai` ^3.0.47: Drop-in provider adapters — switching providers changes only the model factory, not the call site
- `zod` ^4.3.6: Schema definition for structured LLM output, automatically infers TypeScript types; already a peer dependency of AI SDK
- `electron.safeStorage` (built-in): OS-level encryption for user-supplied API keys via macOS Keychain, Windows DPAPI, or Linux libsecret — zero additional dependency

Explicitly rejected: LangChain (heavyweight, designed for multi-step agent chains — v2.0 uses single structured calls), raw provider SDKs (provider-specific, no structured output enforcement), `@huggingface/transformers` + `sqlite-vec` embedding pipeline (100MB+ model weights, complex pipeline — the LLM call already performs semantic analysis via `generateObject`), `electron-store` v11 (pure ESM, conflicts with electron-vite CJS main process bundle), and any CSS-in-JS library.

### Expected Features

**Must have (table stakes — v2.0):**
- AI provider settings with encrypted API key storage — gates every other AI feature; must ship first
- Job posting text paste + analysis trigger (textarea, Analyze button, loading state with progress)
- Match score (0-100) tied to a specific variant + posting pair, displayed with a breakdown
- Keyword coverage list split into exact match, semantic match, and missing; hard/soft skills separated
- Gap analysis with critical vs moderate severity tiers sourced from posting language
- Per-bullet rewrite suggestions with original vs proposed side-by-side, per-bullet accept/dismiss
- Submission pipeline stages (Applied / Phone Screen / Technical / Offer / Rejected)
- Per-submission notes field

**Should have (competitive differentiators — v2.0):**
- Analysis tied to a specific variant snapshot, not a generic resume — no competing tool (Jobscan, Teal, ResumeWorded) does this
- Semantic match labeled separately from exact match so the user understands why they scored
- Accepted suggestions write back to the bullet in DB as permanent edits (durable, not ephemeral)
- Submission optionally linked to job posting ID for full traceability

**Defer to v2.1+:**
- Analysis history per job posting (score progression delta after edits)
- ATS compatibility heuristic check (multi-column, table, non-standard section header detection)
- Automated tailoring pipeline (one-click workflow)
- Submission analytics and pattern insights (needs months of history data)

**Permanent anti-features (non-negotiable):**
- AI-generated resume text from scratch — the app's core anti-requirement; erodes trust completely
- Accept-all suggestions at once — bypasses per-bullet review; batch dismiss is the acceptable alternative
- URL scraping of job postings — fragile, ongoing maintenance burden; text paste is sufficient

### Architecture Approach

The app follows a strict Electron main/renderer split: all IPC uses `ipcRenderer.invoke` / `ipcMain.handle`, all LLM calls and credentialed I/O live exclusively in the main process, and all schema changes go through `ensureSchema()` raw SQL (CREATE TABLE IF NOT EXISTS + try/catch ALTER TABLE array). This pattern is established in the existing codebase and must be extended, not replaced.

For v2.0, three new IPC handler modules are added (ai.ts, jobPostings.ts, settings.ts), three new DB tables are created (job_postings, analysis_results, ai_settings), and two columns are added to submissions via the existing ALTER TABLE array. The AnalysisTab and SettingsTab are new renderer components. A `design-tokens.css` file introduces CSS custom properties for the dark-theme token system; these are consumed via inline styles, consistent with the existing Tailwind v4 constraint.

**Major components and responsibilities:**
1. `main/lib/aiProvider.ts` — `getModel()` factory + `analyzeJobPosting()` function; wraps AI SDK; API key read from DB only inside this file
2. `main/handlers/ai.ts` — IPC bridge for analysis, accept/dismiss; orchestrates DB reads, LLM call, DB writes; sends progress events via `webContents.send`
3. `main/handlers/settings.ts` — reads/writes `ai_settings` singleton row; returns `{ provider, model, hasKey: boolean }` to renderer, never the raw key
4. `renderer/src/components/AnalysisTab.tsx` — full analysis dashboard; owns progress state, analysis result display, job posting list
5. `renderer/src/components/SuggestionPanel.tsx` — per-bullet accept/dismiss with optimistic UI updates (mirrors existing VariantBuilder pattern)
6. `renderer/src/assets/design-tokens.css` — CSS custom properties token system; imported once in `main.css`

### Critical Pitfalls

1. **API key exposed to renderer process** — Store key exclusively in main process via `safeStorage`. Return only `{ hasKey: boolean }` to renderer; never the raw key. LLM SDK must not appear in any `.tsx` file. (Pitfalls 17-18)

2. **LLM JSON output not validated** — `generateObject` with a Zod schema is non-negotiable. Raw `JSON.parse` on LLM output silently fails on format drift. Schema mismatch must surface as a user-visible "try again" error, not a silent crash. (Pitfall 20)

3. **Bullet rewrites fabricate experience** — The system prompt must explicitly prohibit: adding statistics not in the original, adding technologies not mentioned, elevating IC scope to leadership. Show diff side-by-side. Require per-bullet accept; no accept-all. (Pitfall 21)

4. **Non-deterministic match scores destroy trust** — Set `temperature: 0` for all analysis calls. Derive the score from verifiable sub-components (keyword coverage count, required skills matched) not a raw LLM confidence number. Display the breakdown; never show a naked number. (Pitfall 22)

5. **IPC listener accumulation during LLM call** — Use `AbortController` for the HTTP request. Expose a cancel IPC handler. Call cancel in React `useEffect` cleanup. Guard `webContents.send` with `!event.sender.isDestroyed()`. (Pitfall 25)

6. **UI redesign breaks export and snapshot functionality** — Define a regression checkpoint list (PDF export, DOCX export, snapshot viewer, variant builder preview) before touching any redesign work. Migrate one page at a time. The inline-styles-over-Tailwind-spacing constraint must hold through the redesign. (Pitfall 23)

7. **ALTER TABLE on existing user databases** — Adding columns to `CREATE TABLE IF NOT EXISTS` is a no-op on existing installs. New submissions columns (`status`, `job_posting_id`) must use the existing `alterStatements` try/catch array. (Pitfall 10)

---

## Implications for Roadmap

The build order is constrained by hard dependencies: settings infrastructure must exist before AI calls, the LLM interface contract must exist before any consumer, and schema changes must precede handler code. The UI redesign is layout-only and can be sequenced last within each phase or treated as a parallel workstream.

### Phase 1: AI Foundation — Settings, Schema, and Token System

**Rationale:** Settings gates every AI feature. New DB tables and the API key infrastructure must be in place before any analysis UI is built. The design-token CSS file is low-risk and unblocks all styling in subsequent phases.
**Delivers:** Encrypted API key storage (`safeStorage` + `ai_settings` singleton row), provider selector UI, `job_postings` and `analysis_results` table creation, stub IPC handlers for all v2.0 channels, `design-tokens.css` imported in `main.css`, two ALTER TABLE additions to submissions.
**Avoids:** Pitfall 17 (API key in renderer), Pitfall 10 (ALTER TABLE on existing databases).
**Research flag:** Standard patterns — `safeStorage` API is well-documented; ALTER TABLE array pattern is established in this codebase. Skip research-phase.

### Phase 2: LLM Provider Abstraction and Prompt Layer

**Rationale:** Core LLM logic with no renderer dependency — buildable and unit-testable in isolation. The typed interface must exist before any consumer is wired.
**Delivers:** `main/lib/aiProvider.ts` with `getModel()` + `analyzeJobPosting()`, `main/lib/analysisPrompts.ts` with fabrication-guarded system prompt and data boundary structure, Zod schema for `AnalysisPayload`. AI SDK packages installed (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `zod`).
**Avoids:** Pitfall 19 (interface shaped by first provider), Pitfall 20 (unvalidated LLM JSON output), Pitfall 21 (bullet rewrites fabricating experience), Pitfall 22 (non-deterministic scores — `temperature: 0` enforced here).
**Research flag:** Prompt engineering for fabrication prevention needs empirical validation against real Claude and GPT-4o responses during implementation. Plan for at least one iteration cycle.

### Phase 3: Analysis Tab and Core Analysis Flow

**Rationale:** Full analysis round-trip — paste job posting, trigger analysis, display structured results. Requires Phase 1 (schema + settings) and Phase 2 (LLM layer) to be complete.
**Delivers:** `JobPostingForm`, `MatchScoreCard`, `GapList`, full `AnalysisTab` wiring, `ai:analyze` IPC handler with progress push (`webContents.send`), job posting list with results display.
**Avoids:** Pitfall 25 (dangling IPC listeners — `useEffect` cleanup with cancel), Pitfall 26 (prompt injection via job posting text — data boundary in system prompt), Pitfall 22 (score displayed with breakdown, not naked number).
**Research flag:** Standard Electron IPC invoke + push channel combination. Well-documented. Skip research-phase.

### Phase 4: Bullet Rewrite Suggestions

**Rationale:** Depends on analysis results in DB (Phase 3 complete). The accept/dismiss flow writes back to `job_bullets` — the most trust-critical UI interaction in the app.
**Delivers:** `SuggestionPanel` with per-bullet accept/dismiss, original vs proposed side-by-side display, optimistic UI updates, `ai:acceptSuggestion` and `ai:dismissSuggestion` IPC handlers.
**Avoids:** Pitfall 21 (fabricated rewrites — diff display required), Pitfall 3 (AI boundary erosion — accept writes to DB, dismiss does not generate new text).
**Research flag:** Optimistic UI pattern already established in VariantBuilder. Skip research-phase.

### Phase 5: Submission Pipeline and Notes

**Rationale:** Isolated modification to the existing SubmissionsTab. No AI dependency. Safe to sequence after the AI core is validated.
**Delivers:** Pipeline stage chips on submission cards, per-submission notes field, `submissions:updateStatus` IPC handler.
**Avoids:** Pitfall 24 (submission state inconsistency — transaction handling for multi-table updates), Pitfall 10 (ALTER TABLE already handled in Phase 1).
**Research flag:** Fully standard patterns. Skip research-phase.

### Phase 6: Dark Theme UI Redesign

**Rationale:** Layout-only redesign after all business logic is complete. No IPC changes, no data model changes. Highest regression risk of any phase due to breadth of component changes.
**Delivers:** Full dark theme across all tabs, design tokens consumed in all components, split-pane VariantBuilder layout, drag-reorder extended to card level in Experience tab.
**Avoids:** Pitfall 23 (redesign breaks export/snapshot) — regression checkpoint list must be defined and run after each page; the inline-styles-over-Tailwind-spacing constraint must hold throughout.
**Research flag:** The Tailwind v4 inline-style constraint is a known pain point. May benefit from a brief pre-phase validation of `@theme` CSS custom property integration with the existing constraint before beginning full redesign.

### Phase Ordering Rationale

- Schema and provider infrastructure before any UI (Phases 1-2 before Phases 3-4)
- LLM interface contract defined before any consumer is written (Phase 2 before Phase 3)
- Analysis core results in DB before rewrite suggestions consume them (Phase 3 before Phase 4)
- Pipeline status is fully independent of AI and placed after the AI core to maintain momentum
- Redesign last: all business logic and regression baselines established before introducing layout risk

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (LLM prompt layer):** Fabrication prevention prompts and temperature-0 scoring need empirical validation against real LLM responses. Build time for prompt iteration into phase scope.
- **Phase 6 (UI redesign):** Tailwind v4 `@theme` block vs plain CSS custom properties in the context of the inline-style constraint needs a quick validation pass before full redesign begins.

Phases with standard patterns (skip research-phase):
- **Phase 1:** `safeStorage` and ALTER TABLE patterns are documented and established in this codebase
- **Phase 3:** Electron IPC invoke + push channel combination is well-documented
- **Phase 4:** Optimistic UI pattern is already established in VariantBuilder throughout the codebase
- **Phase 5:** Simple status column + chip component with no novel integration surface

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | AI SDK v6 version confirmed live via npm. `safeStorage` API verified via Electron official docs. Provider adapter versions confirmed. No alpha or unstable packages in v2.0 additions. |
| Features | MEDIUM-HIGH | Core feature set verified against Jobscan, Teal, and ResumeWorded feature documentation. UX detail estimates (65-80% match as "good") are MEDIUM confidence from commercial tool benchmarks. Feature boundaries (accept vs accept-all) are opinionated design decisions, not industry standards. |
| Architecture | HIGH | Based on direct inspection of the existing 9,373-line codebase. Build order and component boundaries derived from observed live code patterns. All IPC, schema, and optimistic UI patterns confirmed in existing handlers. |
| Pitfalls | HIGH | Critical pitfalls 1-8 verified against existing codebase code patterns. AI-specific pitfalls (17-26) based on Electron official security docs + AI SDK official docs. v1.1 pitfalls (9-16) verified via code inspection of theme integration and import handler. |

**Overall confidence:** HIGH

### Gaps to Address

- **Prompt engineering quality:** The fabrication prevention prompts and temperature-0 determinism have been designed based on research but need empirical validation during Phase 2 implementation against real Claude and GPT-4o responses. Budget at least one prompt iteration cycle.
- **API key storage consistency:** ARCHITECTURE.md describes storing the API key directly in SQLite (the `ai_settings` singleton row). STACK.md recommends `safeStorage` encryption with base64-encoded bytes stored in SQLite. These are slightly inconsistent. The `safeStorage` approach from STACK.md is the correct one for security and should be treated as authoritative — the `ai_settings.api_key` column stores the `safeStorage`-encrypted base64 bytes, not the plaintext key.
- **Token budget for large postings:** The performance research flags a hard limit on job posting text (~4,000 tokens / ~16,000 characters) to prevent LLM call failures. The specific character count UI and truncation strategy need to be decided during Phase 3 implementation.
- **Per-suggestion diff rendering approach:** Features research specifies side-by-side original vs proposed display, but the exact rendering strategy (character-level diff, word-level, or two-block comparison) is left unspecified. Decide during Phase 4 planning.

---

## Sources

### Primary (HIGH confidence)
- Vercel AI SDK official docs (ai-sdk.dev) — provider list, `generateObject` API, Node.js compatibility, v6 release
- Electron official docs (electronjs.org) — `safeStorage` API, IPC patterns, security model
- Tailwind CSS v4 docs (tailwindcss.com) — `@custom-variant`, `@theme` block, dark mode
- Existing codebase (direct inspection, 9,373 lines) — architecture patterns, schema conventions, IPC contracts, component structure
- `npm show ai version` / `npm show @ai-sdk/anthropic version` / `npm show @ai-sdk/openai version` — live version verification

### Secondary (MEDIUM confidence)
- Jobscan (jobscan.co) — scoring benchmarks, keyword coverage patterns, feature comparison
- Teal (tealhq.com) — pipeline stage UX, per-stage notes feature documentation
- ResumeWorded feature overview — competitor feature baseline
- JSON Resume schema docs (docs.jsonresume.org) — field definitions, validate() API
- ATS Resume Keywords Guide 2026 (uppl.ai) — keyword density targets, 15-25 keywords guidance
- ATS-Friendly Resume Guide 2026 (owlapply.com) — ATS formatting heuristics

### Tertiary (LOW confidence)
- How AI Can Transform Job Matching (Medium, Feb 2026) — LLM semantic matching patterns; single source
- How to Build an LLM-Powered Resume Optimizer (Medium) — finite state machine workflow pattern; single source

---

*Research completed: 2026-03-23*
*Ready for roadmap: yes*
