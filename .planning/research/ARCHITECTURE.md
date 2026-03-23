# Architecture Research

**Domain:** AI-powered Electron desktop app — v2.0 AI Analysis Integration
**Researched:** 2026-03-23
**Confidence:** HIGH — based on direct inspection of existing 9,373-line codebase + verified external sources

---

## Existing Architecture (v1.1 Baseline)

Direct code inspection confirms the following shape. Understanding this baseline is prerequisite to knowing what changes for v2.0.

### System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐   │
│  │ ExperienceTab│  │  TemplatesTab  │  │   SubmissionsTab     │   │
│  │  (jobs,      │  │ (VariantList + │  │ (list + snapshot     │   │
│  │  skills, edu)│  │  VariantBuilder│  │  viewer + export)    │   │
│  └──────┬───────┘  └───────┬────────┘  └──────────┬───────────┘  │
│         │                  │                       │              │
│  ┌──────┴──────────────────┴───────────────────────┴──────────┐   │
│  │              window.api (contextBridge)                     │   │
│  └──────────────────────────┬──────────────────────────────────┘  │
└─────────────────────────────│──────────────────────────────────────┘
                              │ ipcRenderer.invoke / ipcMain.handle
┌─────────────────────────────│──────────────────────────────────────┐
│                      MAIN PROCESS                                  │
│  ┌──────────────────────────┴──────────────────────────────────┐   │
│  │              registerAllHandlers()                           │   │
│  │  jobs / bullets / skills / templates / submissions /        │   │
│  │  profile / export / projects / education / volunteer /      │   │
│  │  awards / publications / languages / interests /            │   │
│  │  references / import / themes                               │   │
│  └──────────────────────┬──────────────────────────────────────┘   │
│                         │                                          │
│  ┌──────────────────────┴──────────────────────────────────────┐   │
│  │          Drizzle ORM  (better-sqlite3)                      │   │
│  │  ensureSchema() — CREATE TABLE IF NOT EXISTS + ALTER TABLE  │   │
│  └──────────────────────┬──────────────────────────────────────┘   │
│                         │                                          │
│               app.db (SQLite, userData dir)                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Existing Component Responsibilities (Confirmed)

| Component | File | Responsibility |
|-----------|------|---------------|
| Tab Router | `App.tsx` | `useState<Tab>` — no router library, 3 tabs |
| IPC bridge | `preload/index.ts` | Typed `window.api` namespace per entity domain |
| Handler modules | `main/handlers/*.ts` | One file per entity domain, `ipcMain.handle` |
| Schema | `main/db/schema.ts` | Drizzle table definitions |
| DB init | `main/db/index.ts` | `ensureSchema()` — raw SQL `CREATE TABLE IF NOT EXISTS` + try/catch `ALTER TABLE` array |
| Theme registry | `main/lib/themeRegistry.ts` | `buildResumeJson()` + `renderThemeHtml()` per theme key |
| VariantBuilder | `VariantBuilder.tsx` | Checkbox exclusion per item type, optimistic state update |

Key patterns locked in by existing code:
- All IPC uses `ipcRenderer.invoke` / `ipcMain.handle` (request-response)
- Schema changes use `ensureSchema()` raw SQL, never file-based migrations
- JSON arrays stored as `JSON.stringify(T[])` in TEXT columns (skills.tags, etc.)
- Optimistic UI: React state updated immediately, IPC fires asynchronously
- `profile` table uses singleton row pattern (`INSERT OR IGNORE id=1`, always UPDATE)

---

## v2.0 What Changes vs What Is New

**MODIFIED (extend, do not replace):**
- `App.tsx` — add `analysis` and `settings` tabs (keep existing three)
- `preload/index.ts` — add `ai`, `jobPostings`, and `settings` namespaces
- `main/handlers/index.ts` — register three new handler modules
- `main/db/index.ts` — add `ensureSchema()` blocks for new tables; add ALTER TABLE entries for new `submissions` columns
- `main/db/schema.ts` — add Drizzle table definitions for new tables
- `SubmissionsTab.tsx` — add pipeline status chip row
- `renderer/src/assets/main.css` — import design-tokens.css

**NEW (additive only):**
- `main/handlers/ai.ts`
- `main/handlers/jobPostings.ts`
- `main/handlers/settings.ts`
- `main/lib/aiProvider.ts`
- `main/lib/analysisPrompts.ts`
- `renderer/src/components/AnalysisTab.tsx`
- `renderer/src/components/SettingsTab.tsx`
- `renderer/src/components/JobPostingForm.tsx`
- `renderer/src/components/MatchScoreCard.tsx`
- `renderer/src/components/GapList.tsx`
- `renderer/src/components/SuggestionPanel.tsx`
- `renderer/src/components/SubmissionPipelineStatus.tsx`
- `renderer/src/assets/design-tokens.css`

---

## System Overview with v2.0 Components

```
┌────────────────────────────────────────────────────────────────────────┐
│                           RENDERER PROCESS                             │
│                                                                        │
│  Tabs: Experience | Variants | Analysis | Submissions | Settings       │
│                                                                        │
│  ┌────────────┐  ┌───────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │ Experience │  │ Variants  │  │    Analysis      │  │Submissions │  │
│  │  (v1 tab,  │  │ split pane│  │  (NEW tab)       │  │+ pipeline  │  │
│  │  unchanged)│  │ builder + │  │  paste job text  │  │  status    │  │
│  │            │  │ preview   │  │  → score + gaps  │  │  chips     │  │
│  │            │  │ side-by-  │  │  + suggestions   │  │(modified)  │  │
│  │            │  │ side      │  │                  │  │            │  │
│  └────────────┘  └───────────┘  └─────────────────┘  └────────────┘  │
│                                           ┌────────────┐              │
│                                           │  Settings  │              │
│                                           │  (NEW tab) │              │
│                                           └────────────┘              │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │               window.api (contextBridge)                         │ │
│  │  ...existing namespaces +                                        │ │
│  │  .ai{ analyze, onProgress, offProgress,                          │ │
│  │       acceptSuggestion, dismissSuggestion }                      │ │
│  │  .jobPostings{ list, create, delete, getAnalysis }               │ │
│  │  .settings{ getAi, setAi }                                       │ │
│  └───────────────────────────────┬──────────────────────────────────┘ │
└───────────────────────────────────│────────────────────────────────────┘
                                    │ invoke + on
┌───────────────────────────────────│────────────────────────────────────┐
│                           MAIN PROCESS                                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │               registerAllHandlers()                              │  │
│  │  ...existing + ai + jobPostings + settings                       │  │
│  └───────────────┬──────────────────────┬───────────────────────────┘ │
│                  │                      │                              │
│  ┌───────────────┴──────┐  ┌────────────┴───────────────────────────┐ │
│  │   aiProvider.ts      │  │       Drizzle ORM (existing)           │ │
│  │   (Vercel AI SDK)    │  │  + job_postings + analysis_results     │ │
│  │   OpenAI / Anthropic │  │  + ai_settings                         │ │
│  │   via user API key   │  │  + submissions.status column           │ │
│  └───────────────┬──────┘  │  + submissions.job_posting_id column   │ │
│                  │         └────────────────────────────────────────┘ │
│            External LLM API                                            │
│            (HTTPS, main process, user-supplied key)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## New Schema Design

### job_postings table

```sql
CREATE TABLE IF NOT EXISTS `job_postings` (
  `id`                  integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `company`             text NOT NULL,
  `role`                text NOT NULL,
  `raw_text`            text NOT NULL DEFAULT '',
  `parsed_skills`       text NOT NULL DEFAULT '[]',      -- JSON: string[]
  `parsed_keywords`     text NOT NULL DEFAULT '[]',      -- JSON: string[]
  `parsed_requirements` text NOT NULL DEFAULT '[]',      -- JSON: string[]
  `created_at`          integer NOT NULL DEFAULT (unixepoch())
);
```

`parsed_*` columns follow the existing `skills.tags` JSON TEXT pattern. Raw text is preserved so re-analysis is possible without user re-paste.

### analysis_results table

```sql
CREATE TABLE IF NOT EXISTS `analysis_results` (
  `id`               integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `job_posting_id`   integer NOT NULL REFERENCES `job_postings`(`id`) ON DELETE CASCADE,
  `variant_id`       integer REFERENCES `template_variants`(`id`) ON DELETE SET NULL,
  `match_score`      integer NOT NULL DEFAULT 0,
  `keyword_hits`     text NOT NULL DEFAULT '[]',   -- JSON: string[]
  `keyword_misses`   text NOT NULL DEFAULT '[]',   -- JSON: string[]
  `gap_skills`       text NOT NULL DEFAULT '[]',   -- JSON: string[]
  `suggestions`      text NOT NULL DEFAULT '[]',   -- JSON: BulletSuggestion[]
  `ats_flags`        text NOT NULL DEFAULT '[]',   -- JSON: string[]
  `raw_llm_response` text NOT NULL DEFAULT '',
  `created_at`       integer NOT NULL DEFAULT (unixepoch())
);
```

`suggestions` JSON shape:
```typescript
interface BulletSuggestion {
  bulletId: number          // FK to job_bullets.id or project_bullets.id
  originalText: string
  suggestedText: string
  status: 'pending' | 'accepted' | 'dismissed'
  targetKeywords: string[]
}
```

### ai_settings table

```sql
CREATE TABLE IF NOT EXISTS `ai_settings` (
  `id`       integer PRIMARY KEY NOT NULL DEFAULT 1,
  `provider` text NOT NULL DEFAULT 'openai',
  `api_key`  text NOT NULL DEFAULT '',
  `model`    text NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO `ai_settings` (`id`) VALUES (1);
```

Singleton row pattern matching the existing `profile` table. API key stored in SQLite in the user's AppData — equivalent security to `electron-store` for a single-user desktop app, simpler to implement.

### submissions table (ALTER TABLE additions)

Added via the existing try/catch ALTER TABLE array in `db/index.ts`:

```sql
ALTER TABLE `submissions` ADD COLUMN `status` text NOT NULL DEFAULT 'applied'
ALTER TABLE `submissions` ADD COLUMN `job_posting_id` integer REFERENCES `job_postings`(`id`) ON DELETE SET NULL
```

`status` enum values: `'applied' | 'phone_screen' | 'technical' | 'offer' | 'rejected'`

---

## IPC Contract for AI Operations

### Invoke channels (request/response)

| Channel | Args | Returns |
|---------|------|---------|
| `jobPostings:list` | — | `JobPosting[]` |
| `jobPostings:create` | `{ company, role, rawText }` | `JobPosting` |
| `jobPostings:delete` | `id: number` | `void` |
| `jobPostings:getAnalysis` | `id: number` | `AnalysisResult \| null` |
| `ai:analyze` | `{ jobPostingId, variantId }` | `{ analysisId: number }` (pushes progress events during execution) |
| `ai:acceptSuggestion` | `{ analysisId, bulletId, suggestedText }` | `void` (writes to job_bullets, updates suggestion status) |
| `ai:dismissSuggestion` | `{ analysisId, bulletId }` | `void` (marks dismissed in suggestions JSON) |
| `settings:getAi` | — | `{ provider, model, hasKey: boolean }` (never returns raw key) |
| `settings:setAi` | `{ provider, model, apiKey }` | `void` |
| `submissions:updateStatus` | `{ id, status }` | `Submission` |

### One-way push channels (main → renderer via webContents.send)

These require `ipcRenderer.on` wrapper in preload — not `invoke`. The invoke still returns the final result; push channels carry progress during execution.

| Channel | Payload | Purpose |
|---------|---------|---------|
| `ai:progress` | `{ phase: string, pct: number }` | Coarse progress (parsing / calling LLM / storing) |
| `ai:error` | `{ message: string }` | Surface LLM API errors before invoke resolves |

### Preload additions for push channels

```typescript
// preload/index.ts — ai namespace additions
ai: {
  analyze: (jobPostingId: number, variantId: number) =>
    ipcRenderer.invoke('ai:analyze', jobPostingId, variantId),
  onProgress: (cb: (phase: string, pct: number) => void) =>
    ipcRenderer.on('ai:progress', (_, phase, pct) => cb(phase, pct)),
  offProgress: () =>
    ipcRenderer.removeAllListeners('ai:progress'),
  acceptSuggestion: (analysisId: number, bulletId: number, text: string) =>
    ipcRenderer.invoke('ai:acceptSuggestion', analysisId, bulletId, text),
  dismissSuggestion: (analysisId: number, bulletId: number) =>
    ipcRenderer.invoke('ai:dismissSuggestion', analysisId, bulletId),
}
```

---

## AI Provider Abstraction Layer

### Library Choice: Vercel AI SDK

Use the Vercel AI SDK (`ai` package + `@ai-sdk/openai` + `@ai-sdk/anthropic`) in the main process. The SDK provides a unified `generateText()` / `generateObject()` interface — switching providers requires changing only the model instantiation line. (HIGH confidence — verified against official ai-sdk.dev docs.)

### aiProvider.ts structure

```typescript
// main/lib/aiProvider.ts
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

function getModel(settings: AiSettings) {
  // Use factory functions with explicit apiKey — key comes from DB at runtime,
  // cannot rely on env var defaults
  if (settings.provider === 'anthropic') {
    return createAnthropic({ apiKey: settings.apiKey })(
      settings.model || 'claude-3-5-sonnet-20241022'
    )
  }
  return createOpenAI({ apiKey: settings.apiKey })(
    settings.model || 'gpt-4o'
  )
}

export async function analyzeJobPosting(
  resumeText: string,
  jobText: string,
  settings: AiSettings,
): Promise<AnalysisPayload> {
  const { object } = await generateObject({
    model: getModel(settings),
    schema: z.object({
      matchScore:    z.number().min(0).max(100),
      keywordHits:   z.array(z.string()),
      keywordMisses: z.array(z.string()),
      gapSkills:     z.array(z.string()),
      atsFlags:      z.array(z.string()),
      suggestions:   z.array(z.object({
        bulletId:       z.number(),
        originalText:   z.string(),
        suggestedText:  z.string(),
        targetKeywords: z.array(z.string()),
      })),
    }),
    prompt: buildAnalysisPrompt(resumeText, jobText),
  })
  return object
}
```

`generateObject` with a Zod schema forces the LLM to return parseable JSON and automatically retries on malformed output. This is preferable to raw `generateText` + manual JSON.parse for structured analysis results. (MEDIUM confidence — documented SDK behavior; actual retry count depends on provider.)

---

## Split-Pane Variant Builder Architecture

### Current state (v1.1)

`TemplatesTab` renders `VariantList` + `VariantEditor` stacked vertically. `VariantEditor` shows `VariantBuilder` (checklist) and `VariantPreview` toggled separately.

### v2.0 target

`VariantEditor` becomes a two-column flex container:
- Left pane: `VariantBuilder` (existing checkbox logic — no IPC changes needed)
- Right pane: live `VariantPreview` iframe (existing `themes:renderHtml` IPC — no changes needed)
- Resize handle: a draggable `<div>` separator managed with `onMouseDown` + `document.onMouseMove` — no library required for desktop-only

The existing `VariantBuilder` and `VariantPreview` components require no IPC changes. Only their container layout changes. The live preview already re-fetches on `variantId` change and continues to do so.

---

## Design System CSS Custom Properties Integration

### Current state

`main.css` imports Tailwind with no custom tokens. All color values are hardcoded inline (`zinc-950`, etc.) or via Tailwind utility classes.

### v2.0 target

Add `design-tokens.css` using Tailwind v4's `@theme` block. This registers tokens as both Tailwind utilities and CSS custom properties, satisfying the project's constraint of using inline styles for spacing (where Tailwind utilities are unreliable).

```css
/* src/renderer/src/assets/design-tokens.css */
@theme {
  /* Surfaces */
  --color-surface:         #09090b;   /* zinc-950 */
  --color-surface-raised:  #18181b;   /* zinc-900 */
  --color-surface-elevated:#27272a;   /* zinc-800 */

  /* Text */
  --color-text-primary:    #f4f4f5;   /* zinc-100 */
  --color-text-secondary:  #a1a1aa;   /* zinc-500 */
  --color-text-muted:      #52525b;   /* zinc-600 */

  /* Border */
  --color-border:          #27272a;   /* zinc-800 */
  --color-border-subtle:   #3f3f46;   /* zinc-700 */

  /* Accent */
  --color-accent:          #6366f1;   /* indigo-500 */
  --color-accent-hover:    #4f46e5;   /* indigo-600 */

  /* Status */
  --color-success:         #22c55e;   /* green-500 */
  --color-warning:         #f59e0b;   /* amber-500 */
  --color-danger:          #ef4444;   /* red-500 */

  /* Radius */
  --radius-sm:  4px;
  --radius-md:  6px;
  --radius-lg: 10px;

  /* Spacing (4px grid) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
}
```

`main.css` change: `@import './design-tokens.css';` before `@import 'tailwindcss';`

New components reference `var(--color-surface)` etc. in inline styles. Existing components can migrate incrementally.

---

## Data Flow

### AI Analysis Flow

```
User pastes job text + selects variant in AnalysisTab
    |
    v
JobPostingForm → window.api.jobPostings.create({ company, role, rawText })
    |
    v
main: INSERT INTO job_postings → returns JobPosting { id, ... }
    |
    v
window.api.ai.analyze(jobPostingId, variantId)  [invoke]
    |
    v  [main process ai.ts handler]
1. Load job_postings row (raw_text)
2. Load resume via buildResumeJson(profile, getBuilderDataForVariant(variantId))
3. Load ai_settings (provider, apiKey, model)
4. webContents.send('ai:progress', 'parsing', 10)
5. aiProvider.analyzeJobPosting(resumeText, jobText, settings)
   → HTTP to LLM API (OpenAI or Anthropic)
   → webContents.send('ai:progress', 'scoring', 70)
6. INSERT INTO analysis_results (match_score, keyword_hits, gaps, suggestions, ...)
   → webContents.send('ai:progress', 'done', 100)
7. ipcMain.handle returns { analysisId }
    |
    v
AnalysisTab: receive analysisId
→ window.api.jobPostings.getAnalysis(jobPostingId)
→ Render MatchScoreCard + GapList + SuggestionPanel
```

### Suggestion Accept Flow

```
User clicks Accept on a suggestion in SuggestionPanel
    |
    v  [optimistic update — same pattern as VariantBuilder toggle]
SuggestionPanel: mark suggestion as 'accepted' in local state immediately
    |
    v
window.api.ai.acceptSuggestion(analysisId, bulletId, suggestedText)
    |
    v  [main process ai.ts handler]
1. UPDATE job_bullets SET text = suggestedText WHERE id = bulletId
2. Load analysis_results.suggestions JSON, update matching entry to status='accepted'
3. UPDATE analysis_results SET suggestions = updatedJson WHERE id = analysisId
```

Accepted suggestions become permanent bullet edits. This is consistent with the constraint "user controls every word" — acceptance is explicit and the result is durable.

### Pipeline Status Flow

```
User clicks stage chip in SubmissionsTab
    |
    v
SubmissionPipelineStatus → window.api.submissions.updateStatus(id, newStatus)
    |
    v
main: UPDATE submissions SET status = newStatus WHERE id = id
    |
    v
SubmissionsTab refreshes (or optimistic update) → re-render status chip row
```

---

## Recommended Project Structure (New Files Only)

```
src/
├── main/
│   ├── handlers/
│   │   ├── ai.ts                    # NEW — ai:analyze, ai:acceptSuggestion, ai:dismissSuggestion
│   │   ├── jobPostings.ts           # NEW — jobPostings:list/create/delete/getAnalysis
│   │   └── settings.ts              # NEW — settings:getAi / settings:setAi
│   └── lib/
│       ├── aiProvider.ts            # NEW — getModel(), analyzeJobPosting()
│       └── analysisPrompts.ts       # NEW — buildAnalysisPrompt(), buildSuggestionPrompt()
└── renderer/src/
    ├── components/
    │   ├── AnalysisTab.tsx           # NEW — full analysis dashboard
    │   ├── JobPostingForm.tsx        # NEW — paste + submit
    │   ├── MatchScoreCard.tsx        # NEW — 0-100 score display
    │   ├── GapList.tsx              # NEW — missing skills/keywords
    │   ├── SuggestionPanel.tsx      # NEW — per-bullet accept/dismiss
    │   ├── SubmissionPipelineStatus.tsx  # NEW — stage chips
    │   └── SettingsTab.tsx          # NEW — provider + key config
    └── assets/
        └── design-tokens.css        # NEW — @theme CSS custom properties
```

---

## Build Order

Dependencies determine this order.

| Order | What | Why first |
|-------|------|-----------|
| 1 | Design token CSS + App.tsx tab additions | All new UI depends on tokens; tab shell needed to host new screens |
| 2 | New DB schema (CREATE TABLE) + ALTER TABLE for submissions + stub IPC handlers | All features need persistence; stub handlers let renderer be developed in parallel |
| 3 | Settings tab + AI settings persistence | LLM calls require a stored API key; must exist before any ai:analyze call |
| 4 | AI provider lib + analysis prompts | Core LLM logic; no UI dependency; can be unit-tested independently |
| 5 | Analysis tab + JobPostingForm + MatchScoreCard + GapList | Full analysis round-trip; depends on items 2, 3, 4 |
| 6 | SuggestionPanel + accept/dismiss | Requires analysis results in DB (order 5 complete) |
| 7 | Submission pipeline status | Isolated modification to SubmissionsTab; no AI dependency; safe to do late |
| 8 | Split-pane VariantBuilder redesign | Layout-only refactor; no IPC changes; no new data dependencies |

---

## Architectural Patterns

### Pattern 1: Singleton Table Row

**What:** Tables with one conceptual record (`profile`, `ai_settings`) use `INSERT OR IGNORE` seed + `UPDATE` only. `id = 1` is a hardcoded primary key.
**When to use:** App-level configuration with no concept of multiple instances.
**Trade-offs:** Simple. No list queries. `ai_settings` replicates the existing `profile` pattern exactly.

### Pattern 2: JSON TEXT Columns for Variable-Length Arrays

**What:** Store arrays as `JSON.stringify(T[])` in SQLite TEXT columns. Parse in the handler layer before returning to renderer.
**When to use:** Data that varies in length and is always fetched as a whole, never queried element-by-element in SQL. Used for `skills.tags`, `interests.keywords`, and all new `analysis_results` columns.
**Trade-offs:** Simple schema, fast reads. Cannot use SQL WHERE on individual elements — irrelevant for this desktop app where full table scans are sub-millisecond.

### Pattern 3: Optimistic UI + Async IPC Confirm

**What:** Update local React state immediately, then fire `ipcRenderer.invoke`. Roll back on error.
**When to use:** All toggle and CRUD operations where immediate visual feedback matters.
**Trade-offs:** Fast UI. Established in `VariantBuilder` toggle handlers throughout the codebase.

New `SuggestionPanel` accept/dismiss must use this pattern. The round-trip to update a bullet and mark a suggestion status will feel instant.

### Pattern 4: IPC Progress Push for Long Operations

**What:** For LLM API calls (1-10s), use `webContents.send('ai:progress', phase, pct)` from main process to push progress to renderer during the invoke. The invoke still returns the final result normally.
**When to use:** Any operation over ~500ms. LLM analysis is the only such operation in this app.
**Trade-offs:** Requires `ipcRenderer.on` listener setup and teardown. Listeners must be removed on component unmount to prevent accumulation.

```typescript
// AnalysisTab renderer pattern:
useEffect(() => {
  window.api.ai.onProgress((phase, pct) => setProgress({ phase, pct }))
  return () => window.api.ai.offProgress()
}, [])
```

---

## Anti-Patterns

### Anti-Pattern 1: Making LLM Calls from the Renderer Process

**What people do:** Call OpenAI/Anthropic SDK directly from renderer-side JavaScript.
**Why it's wrong:** API keys are exposed in renderer DevTools. The renderer runs in a browser-like sandbox without privileged access. Main process is the correct location for all credentialed I/O.
**Do this instead:** All LLM calls live in `main/handlers/ai.ts` and `main/lib/aiProvider.ts`. The renderer sends job posting IDs and variant IDs, receives analysis results.

### Anti-Pattern 2: File-Based Drizzle Migrations for New Columns

**What people do:** Generate a new migration SQL file for ALTER TABLE statements.
**Why it's wrong:** The project explicitly chose `ensureSchema()` over file-based migrations because the DB can be in any state on a user's machine. Mixing strategies breaks the guarantee.
**Do this instead:** Add new CREATE TABLE blocks to the `sqlite.exec()` call in `ensureSchema()`. Add new ALTER TABLE statements to the `alterStatements` array with try/catch. This is the established pattern.

### Anti-Pattern 3: Streaming LLM Tokens to the Renderer for Analysis

**What people do:** Use `streamText` to forward every token to the UI for a "typing" effect during analysis.
**Why it's wrong:** Analysis results are structured JSON — `generateObject` with a schema. Streaming partial JSON to the renderer has no UX value since the user cannot act on half-parsed results. It adds reassembly complexity for zero benefit.
**Do this instead:** Use `generateObject` (blocking, structured) for analysis. Use `webContents.send('ai:progress', phase, pct)` for coarse progress. Reserve `streamText` only if free-text generation (e.g., cover letters) is added in a future milestone.

### Anti-Pattern 4: Returning the Raw API Key Through IPC

**What people do:** Return `ai_settings.api_key` from the `settings:getAi` handler to display in the Settings tab.
**Why it's wrong:** The key ends up in renderer memory and DevTools. Unnecessary exposure for a field that only needs to show "configured" vs. "not configured."
**Do this instead:** Return `{ provider, model, hasKey: boolean }` — the renderer shows a masked placeholder if `hasKey` is true. The actual key is only read inside `main/lib/aiProvider.ts` when constructing the LLM client.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI API | Vercel AI SDK `@ai-sdk/openai` in main process | `createOpenAI({ apiKey })` — explicit key from DB, not env var |
| Anthropic API | Vercel AI SDK `@ai-sdk/anthropic` in main process | `createAnthropic({ apiKey })` — same pattern, only model factory changes |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| AnalysisTab ↔ ai handler | `ipcRenderer.invoke` (result) + `ipcRenderer.on` (progress) | Two-channel pattern; on-listener must be torn down in useEffect cleanup |
| ai handler ↔ aiProvider lib | Direct function call within main process | No IPC needed within main process |
| aiProvider lib ↔ LLM API | HTTPS via Vercel AI SDK | Main process has full Node.js network access |
| SuggestionPanel ↔ job_bullets | Accept writes to `job_bullets` table via ai:acceptSuggestion | Accepted suggestions are permanent bullet edits |
| SubmissionsTab ↔ job_postings | Optional FK — submission can exist without a linked job posting | `job_posting_id` is nullable; pipeline status is independent of AI analysis |

---

## Sources

- Vercel AI SDK provider abstraction and `generateObject`: [ai-sdk.dev/docs/foundations/providers-and-models](https://ai-sdk.dev/docs/foundations/providers-and-models) (HIGH confidence)
- Electron IPC push pattern (`webContents.send`): [electronjs.org/docs/latest/tutorial/ipc](https://www.electronjs.org/docs/latest/tutorial/ipc) (HIGH confidence)
- Tailwind CSS v4 `@theme` block / CSS custom properties: [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) (HIGH confidence)
- SQLite JSON TEXT column patterns: [beekeeperstudio.io/blog/sqlite-json](https://www.beekeeperstudio.io/blog/sqlite-json) (HIGH confidence)
- Existing codebase (direct inspection): `src/main/db/schema.ts`, `src/main/db/index.ts`, `src/main/handlers/*.ts`, `src/preload/index.ts`, all renderer components

---

*Architecture research for: ResumeHelper v2.0 AI Analysis Integration*
*Researched: 2026-03-23*
