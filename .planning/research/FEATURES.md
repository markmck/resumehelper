# Feature Research

**Domain:** Personal resume management and job application tracking desktop app
**Researched:** 2026-03-13 (v1.0) / 2026-03-14 (v1.1 additions) / 2026-03-23 (v2.0 additions) / 2026-03-25 (v2.1 additions) / 2026-03-26 (v2.2 additions)
**Confidence:** HIGH (core patterns verified against competing tools), MEDIUM (UX detail estimates)

---

## v2.2 Feature Landscape (Current Milestone: Three-Layer Data Model)

### Context: What Already Exists

The following are already shipped and must NOT be rebuilt:

- `analysisResults` table with `variantId`, `suggestions` (JSON), `status`, `matchScore`, `keywordHits`, `keywordMisses`, `gapSkills`
- `OptimizeVariant.tsx` — reads bullet suggestions from analysis and allows per-bullet accept (writes back to DB `jobBullets.text`) or dismiss
- `VariantBuilder.tsx` — checkbox tree UI for including/excluding bullets, skills, jobs, projects, education, and all resume.json entities
- `templateVariantItems` — junction table storing per-item exclusions per variant, with `excluded` boolean flag
- `SkillList.tsx` / `SkillItem.tsx` — tag-grouped list, inline name edit, tag chip edit via `TagInput.tsx`, hover-reveal delete
- `TagInput.tsx` — chip-style tag editing with autocomplete suggestions
- `AnalysisResults.tsx` — analysis dashboard showing match score, keyword hits/misses, gap analysis, rewrite suggestions
- `NewAnalysisForm.tsx` — job posting text paste + variant selector + analyze trigger
- `SubmissionLogForm.tsx` / `SubmissionAddForm.tsx` — submission creation form (does NOT pre-populate company/role from analysis)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — already in package.json, used for job card reorder in `JobItem.tsx`

**The v2.2 milestone restructures where AI rewrites live, redesigns skills management ergonomics, and fills analysis/variant UX gaps.**

---

### Table Stakes (Users Expect These — v2.2)

Features that feel broken or missing given the system already exists. Missing any of these creates obvious workflow friction.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Analysis-scoped bullet overrides (three-layer model) | Accepted AI rewrites currently overwrite the base bullet permanently — users expect "this is for this job" not "permanently changed" | HIGH | Layer 1: base bullet in `jobBullets.text`. Layer 2: variant excludes/includes bullets via `templateVariantItems`. Layer 3: analysis override stored on `analysisResults` as a JSON map `{ bulletId → overriddenText }`. Render merges: start with base, apply variant selection, apply analysis override if present. Accepted suggestions no longer mutate `jobBullets.text` — they write to `analysisResults.bulletOverrides`. |
| Submit job from analysis screen | After reviewing analysis results, the natural next action is submitting the application — forcing navigation to Submissions tab is disorienting | LOW | "Log Submission" button in `AnalysisResults.tsx`. Pre-populates company and role from the linked `jobPostings` record. Passes `analysisId` to submission form so `submissions.analysisId` is set at creation. No new DB schema needed — `submissions.analysisId` column already exists. |
| Auto-extract company/role from job posting | Every AI tool that parses job postings fills in the company and role automatically — manually typing them after pasting the full text feels broken | MEDIUM | During analysis, LLM prompt (or regex heuristic) extracts `company` and `role` from the raw posting text. Store on the `jobPostings` record. Pre-populate the "Log Submission" form. Optionally show extracted values above the posting text in `NewAnalysisForm` for confirmation before running full analysis. |
| Toggle entire job on/off in variant builder | Users need to exclude all bullets for a job at once (e.g. "leave off old job for this application") — doing it bullet-by-bullet is friction | LOW | Single "exclude job" checkbox at the job header level in `VariantBuilder.tsx`. Checking it excludes the `jobId` entry in `templateVariantItems` (sets `excluded = true` for the job-level item). Template render interprets job-level exclusion as "skip entire job block". Already supported by the `itemType: 'job'` path in the schema — needs UI only. |
| Chip grid skills display (management view) | Skills are currently shown as a list where each skill is a row with a name and tag chips. A chip grid grouped by category is a standard skills management pattern for large skill sets — the list becomes unwieldy past 20 items | MEDIUM | Replace the skills management list with a grouped chip grid: category headers as section labels, skills as clickable chips within each category. Click chip to select/edit. dnd-kit (already in project) enables drag-chip-to-category reorder. Inline rename on double-click or dedicated edit mode per chip. |
| Edit submission metadata (company, role, URL, notes) after creation | Users make typos or want to update the URL after submission — there is currently no edit path for existing submissions | LOW | Inline edit or modal form for `submissions.company`, `submissions.role`, `submissions.url`, `submissions.notes`. Existing `InlineEdit.tsx` component handles inline editing pattern. This is purely additive to `SubmissionDetailView.tsx`. |

### Differentiators (Competitive Advantage — v2.2)

Features that make the system qualitatively better than a simple analysis tool, enabled by the three-layer model.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-analysis bullet override with merge-at-render | "This phrasing is right for this job, not my base resume" — contextual tuning without data mutation. No competitor offers per-analysis content that survives independently of the base. | HIGH | `analysisResults` gets a `bulletOverrides TEXT DEFAULT '{}'` column storing `{ [bulletId]: overriddenText }` as JSON. Render path: when building resume content for preview/export in the context of an analysis, merge overrides on top of base text before applying variant exclusions. The `OptimizeVariant` accept flow writes to `bulletOverrides` instead of `jobBullets.text`. Previous "accept" behavior that mutated base text is removed. |
| Drag skills between categories | Moving a skill to a different category (e.g. "Python" from Languages to Cloud Tools) is direct manipulation — the mental model is immediate. Currently requires editing the skill's tags manually. | MEDIUM | dnd-kit multi-container sortable: each category section is a `SortableContext`. Dragging a chip from one category to another updates that skill's `tags` array. Uses `onDragEnd` to detect container change and call `window.api.skills.update`. Visual feedback: chip gets a drag shadow (elevation), category sections highlight as drop targets. All inline styles (no external CSS). |
| Inline skill rename in chip grid | Double-clicking a chip to rename it in-place matches established chip UX (e.g. Gmail labels). Currently name edit is done by expanding the row and clicking InlineEdit. | LOW | On double-click, chip enters edit mode: text becomes an input field sized to chip width. Enter/blur commits. Escape cancels. Reuses `InlineEdit.tsx` pattern at chip level. |
| Analysis shows which variant was analyzed | "I ran this for my Backend variant, not Frontend" — context is visible without navigating away | LOW | Already stored as `analysisResults.variantId` with `variantName` joined in the query. Expose in `AnalysisResults.tsx` header: "Analysis for: Backend Focus variant". Already present in data model, needs display only. |
| Remove stale "coming soon" UI text | Any "coming soon" message in a shipped product erodes trust and makes features feel half-built | LOW | Audit and remove or replace with accurate state descriptions. Pure cleanup — no behavior change. |

### Anti-Features (v2.2 — Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Retroactively apply analysis overrides to base bullets | "I liked that rewrite — put it in my real resume" | Conflates the three layers intentionally kept separate; damages the isolation that makes the model trustworthy | Provide a deliberate "promote to base" action that makes the intent explicit; auto-promote breaks the contract |
| Skills drag-reorder within a category | Natural expectation from drag UX | Skill order within a category has no semantic meaning for resume output; templates render skills alphabetically or by insertion order depending on template | If reorder within category is added, it must write `sortOrder` to skills schema (not currently present); defer until there's a clear user need |
| Free-form skill category management (rename category, delete category, merge categories) | Power-user need as skill lists grow | Categories are derived from the `tags` array — there is no `categories` entity; "renaming a category" means updating every skill's tag; "deleting a category" means removing a tag from all skills; these are high-impact bulk operations | Allow category rename as a bulk-update operation in a dedicated action (not drag); warn about scope before executing |
| AI auto-generate bullet overrides without user review | Speed: "just rewrite everything for this job" | Reintroduces the AI fabrication risk that is the app's core differentiator to prevent; removes the human-in-the-loop step | All overrides go through the existing per-bullet accept/dismiss UI; batch dismiss is acceptable, batch accept without review is not |
| Analysis overrides that survive across multiple analyses of the same job | "I want my last rewrites to carry forward to re-analysis" | Re-analysis should start fresh from current base bullets; carrying forward old overrides silently is disorienting and makes score changes harder to interpret | Store overrides per `analysisId`; when re-analyzing, user can view old overrides from previous analysis run as reference |
| Skills pills display mode in export (PDF/DOCX) | Visual chips are common in modern resume templates | DOCX cannot render chip visual styling; requires non-trivial fallback logic; already noted in v2.1 anti-features as deferred | `skillsDisplayMode: 'pills'` is addressed when DOCX degradation logic is explicitly implemented; do not add to v2.2 scope |

---

### v2.2 Feature Dependencies

```
[Three-Layer Data Model]
    └──requires──> [bulletOverrides JSON column on analysisResults]
                       └──schema migration: ALTER TABLE analysis_results ADD COLUMN bullet_overrides TEXT DEFAULT '{}'
    └──requires──> [OptimizeVariant: accept writes to bulletOverrides, not jobBullets.text]
    └──requires──> [Resume render path: merge-at-render logic for analysis context]
                       └──requires──> [VariantBuilder/preview can receive active analysisId]
    └──requires──> [Remove old "accept mutates base bullet" behavior]
                       └──BREAKING: existing accepted suggestions stay in jobBullets.text (no migration of old data needed)

[Submit from Analysis Screen]
    └──requires──> [Three-Layer Data Model complete] (so submission snapshot captures merged content, not stale base)
    └──uses──> [submissions.analysisId column (already exists)]
    └──reads──> [jobPostings.company + jobPostings.role (already stored)]
    └──pre-populates──> [SubmissionLogForm company/role fields]

[Auto-Extract Company/Role]
    └──enhances──> [Submit from Analysis Screen]
    └──writes to──> [jobPostings.company + jobPostings.role]
    └──triggered during──> [NewAnalysisForm analysis run]
    NOTE: Can be implemented as LLM extraction step OR regex heuristic — LLM is more reliable

[Toggle Entire Job in Variant Builder]
    └──reads──> [templateVariantItems with itemType='job' (already in schema)]
    └──UI only: no schema change needed]
    └──must be consistent with──> [individual bullet toggles] (job-level exclude overrides bullet-level includes)

[Chip Grid Skills Management]
    └──replaces──> [SkillList.tsx list rendering] (same data, different layout)
    └──uses──> [@dnd-kit/core + @dnd-kit/sortable (already installed)]
    └──requires──> [multi-container DndContext: one SortableContext per category]
    └──writes to──> [skills.tags via window.api.skills.update on drag-end]
    └──inline rename uses──> [InlineEdit.tsx pattern]

[Edit Submission Metadata]
    └──extends──> [SubmissionDetailView.tsx]
    └──uses──> [InlineEdit.tsx (already exists)]
    └──no schema change needed]

[Remove Coming Soon Messages]
    └──no dependencies, no schema change]
    └──pure cleanup — can be done in any phase]
```

#### Dependency Notes

- **Three-layer model is the load-bearing dependency for the milestone.** The `bulletOverrides` schema migration and the render-time merge logic must land before `OptimizeVariant` accept behavior changes. Changing accept behavior before the storage target exists would discard accepted rewrites.
- **Submit from analysis screen requires the three-layer model to be meaningful.** If accept still mutates base bullets, submitting from the analysis screen adds no new value. The value is: submission snapshot captures the merged (overridden) content specific to this analysis.
- **Toggle entire job is UI-only.** The `itemType: 'job'` path in `templateVariantItems` already handles this — no schema migration needed. This is the lowest-risk item in the milestone.
- **Chip grid is a display replacement, not a data model change.** Same `skills.tags` structure, same IPC calls. The dnd-kit multi-container pattern handles drag-between-categories via `onDragEnd` detecting a container change and updating the dragged skill's `tags`.
- **Auto-extract company/role is additive to the existing analysis flow.** It writes to existing columns on `jobPostings`. Can be a post-analysis step or part of the initial parse — whichever reduces latency.
- **Inline skill rename and chip drag are independent features** sharing the chip grid layout. Can be built incrementally: chip grid layout first, then drag, then inline rename.

---

### v2.2 MVP Definition

#### Launch With (v2.2)

- [ ] `bulletOverrides` column migration on `analysisResults` — gates the entire three-layer model; must land first
- [ ] `OptimizeVariant` accept writes to `bulletOverrides` instead of `jobBullets.text` — changes the accept behavior
- [ ] Merge-at-render logic for preview/export when an `analysisId` is in context — makes overrides visible
- [ ] Toggle entire job on/off in `VariantBuilder.tsx` — low-risk, high-value, UI-only
- [ ] Submit from analysis screen with pre-populated company/role — closes workflow gap between analyze and log
- [ ] Auto-extract company/role from posting during analysis — reduces manual re-entry friction
- [ ] Chip grid skills display in management view — replaces unwieldy list; uses existing dnd-kit install
- [ ] Edit submission metadata inline — rounds out submission tracking; uses existing `InlineEdit` pattern
- [ ] Remove stale "coming soon" messages — cleanup; no behavior change

#### Add After Validation (v2.2.x)

- [ ] "Promote override to base bullet" explicit action — deliberate data-model bridge for accepted rewrites user wants permanently
- [ ] Category rename as bulk tag-update operation — needed when skill sets grow; requires UI to warn about scope
- [ ] Per-analysis score delta display (improvement vs previous run) — meaningful once users re-run analyses after edits

#### Future Consideration (v2.3+)

- [ ] Skills `pills` display mode in PDF/DOCX — requires explicit DOCX degradation logic; noted as deferred since v2.1
- [ ] Submission analytics and pattern insights — needs months of history data; deferred per PROJECT.md
- [ ] AI-powered auto-variant generation — deferred per PROJECT.md
- [ ] Skills `sortOrder` within categories — only if user research confirms this is needed

---

### v2.2 Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `bulletOverrides` schema migration | HIGH (gates model) | LOW | P1 |
| Accept writes to `bulletOverrides` | HIGH | MEDIUM | P1 |
| Merge-at-render for analysis context | HIGH | MEDIUM | P1 |
| Toggle entire job in variant builder | HIGH | LOW | P1 |
| Submit from analysis screen | HIGH | LOW | P1 |
| Auto-extract company/role | MEDIUM | MEDIUM | P1 |
| Chip grid skills management | MEDIUM | MEDIUM | P1 |
| Edit submission metadata | MEDIUM | LOW | P1 |
| Remove coming soon messages | LOW | LOW | P1 (cleanup) |
| Promote override to base | MEDIUM | LOW | P2 |
| Category rename (bulk) | MEDIUM | MEDIUM | P2 |
| Per-analysis score delta | MEDIUM | LOW | P2 |
| Skills pills display mode | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.2 launch
- P2: Add after core three-layer model is validated
- P3: Defer to v2.3+

---

### v2.2 Implementation Notes for Phase Authors

#### Three-Layer Model: Where Each Layer Lives

```
Layer 1 — Base:         jobBullets.text
                        Skills in skills table
                        Jobs in jobs table

Layer 2 — Selection:    templateVariantItems (excluded flag per bullet/job/skill)
                        One set of selections per variant

Layer 3 — Override:     analysisResults.bulletOverrides (JSON: { bulletId: string → overriddenText: string })
                        One set of overrides per analysis run
```

The render path must accept an optional `analysisId`. When present, after applying variant selections (layer 2), any bullet that has an entry in `bulletOverrides` for that analysis should use the override text instead of the base text. When no `analysisId` is present (plain variant preview, export without analysis context), only layers 1 and 2 apply.

#### bulletOverrides Schema Migration

```typescript
try {
  db.run(sql`ALTER TABLE analysis_results ADD COLUMN bullet_overrides TEXT DEFAULT '{}'`)
} catch {
  // column already exists — safe to ignore
}
```

Runtime type:
```typescript
type BulletOverrides = Record<string, string> // bulletId (as string) → overridden text
```

#### Accept Flow Change in OptimizeVariant

Current flow: `window.api.bullets.update(bulletId, { text: suggestedText })` — mutates base.

New flow: `window.api.jobPostings.updateAnalysisBulletOverride(analysisId, bulletId, suggestedText)` — writes to `analysisResults.bulletOverrides` map.

Dismiss flow: unchanged — dismissal is UI state only, no DB write.

The existing `SuggestionEdit` state machine (`pending | accepted | dismissed`) is preserved. Only the persistence target changes.

#### Chip Grid: Multi-Container dnd-kit Pattern

The existing `@dnd-kit/core` and `@dnd-kit/sortable` installs already support multi-container drag. Pattern:

```
<DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
  {categories.map(cat => (
    <SortableContext key={cat} items={chipIdsInCategory(cat)}>
      <CategorySection label={cat} chips={skillsInCategory(cat)} />
    </SortableContext>
  ))}
</DndContext>
```

`handleDragEnd`: if `active.data.current.sortable.containerId !== over.data.current.sortable.containerId`, remove the dragged skill's old category tag and add the new category tag, then call `window.api.skills.update(skillId, { tags: newTags })`.

All drag visual states use inline styles (transform via `CSS.Transform.toString(transform)` from `@dnd-kit/utilities`, already imported in `JobItem.tsx`). No external CSS needed.

#### UX Behavior: Chips vs List

| Behavior | Current List | New Chip Grid |
|----------|-------------|---------------|
| Add skill | "+ Add Skill" button → inline form | "+ Add" chip at end of category, or dedicated add button per category |
| Rename skill | Click row → InlineEdit activates | Double-click chip → chip becomes input |
| Change category | Edit tags in TagInput row | Drag chip to different category section |
| Delete skill | Hover → × button appears | Hover chip → × on chip, or dedicated delete in edit mode |
| Add new category | Tag the skill with a new tag name | Typing a new category name in the add flow creates it |

Chips should display with a subtle border and background, sized to content, with `border-radius: var(--radius-full)` or `var(--radius-sm)` depending on design preference. Hover state: slightly elevated background. Selected/editing state: accent border. Dragging state: shadow + slight scale (via `transform: scale(1.02)` inline style).

#### Auto-Extract Company/Role

Two implementation options:

**Option A — LLM extraction (recommended):** Add a brief structured prompt step before or alongside the main analysis prompt. Ask the LLM to return `{ company, role }` from the raw posting text. Store results in `jobPostings.company` and `jobPostings.role`. These columns already exist and are required fields with defaults (`''`).

**Option B — Regex heuristic:** Parse common patterns ("Company: X", "About [Company]", "We are hiring a [Role]"). Reliable for well-formatted postings; fails on informal postings. Lower cost but higher error rate.

Option A is preferred — the LLM is already being called, and company/role extraction is trivial to add to the prompt. A failed extraction defaults to the current behavior (user fills in manually).

---

### v2.2 Competitor Feature Analysis

| Feature | Jobscan/Teal | Huntr | Our Approach |
|---------|-------------|-------|--------------|
| Bullet overrides per job posting | None — all rewrites are permanent | None | Per-analysis override stored separately; base unchanged; merge-at-render |
| Submit from analysis screen | Teal: yes, inline | Huntr: yes, inline | Submit button in analysis results; pre-populates from jobPosting record |
| Company/role extraction | Teal: yes (LLM) | No | LLM extraction during analysis; stores to jobPosting record |
| Skills chip management | Teal: categorized chips | No | Chip grid with drag-between-categories using existing dnd-kit |
| Toggle whole job in variant | Not applicable (no variants) | Not applicable | Single checkbox at job header level |
| Edit submission metadata | Both: yes | Yes | Inline edit via existing InlineEdit component |

---

### v2.2 Sources

- dnd-kit multi-container sortable docs: [https://docs.dndkit.com/presets/sortable](https://docs.dndkit.com/presets/sortable) (HIGH confidence — official docs)
- dnd-kit GitHub (cross-container drag pattern): [https://github.com/clauderic/dnd-kit](https://github.com/clauderic/dnd-kit) (HIGH confidence)
- Material Design chip component behavior spec: [https://m3.material.io/components/chips/overview](https://m3.material.io/components/chips/overview) (HIGH confidence — authoritative UX spec)
- Telerik chip UX guidelines: [https://www.telerik.com/design-system/docs/components/chip/](https://www.telerik.com/design-system/docs/components/chip/) (MEDIUM confidence)
- Chip drag-and-drop visual states: [https://bricxlabs.com/blogs/drag-and-drop-ui](https://bricxlabs.com/blogs/drag-and-drop-ui) (MEDIUM confidence)
- Codebase analysis: `schema.ts`, `OptimizeVariant.tsx`, `SkillList.tsx`, `SkillItem.tsx`, `TagInput.tsx`, `VariantBuilder.tsx`, `AnalysisResults.tsx`, `JobItem.tsx`, `package.json` (read directly — HIGH confidence)

---

## v2.1 Feature Landscape (Current Milestone: Resume Template System)

### Context: What Already Exists

The following are already shipped and must NOT be rebuilt:

- `ProfessionalLayout` — React component rendering resume content; uses `pageBreakInside: 'avoid'` per job block
- `VariantPreview` — renders either `ProfessionalLayout` (built-in path) or iframe with HTML string (resume.json themes path)
- `VariantEditor` — split-pane: Builder pane left, Preview pane right; template dropdown in preview header
- `VariantBuilder` — checkbox toggle for bullets, jobs, skills, projects, education, and all resume.json entities
- PDF export via Electron `printToPDF` through a hidden BrowserWindow (`PrintApp.tsx` render path)
- DOCX export via built-in formatter (unaffected by template choice)
- `layoutTemplate` text column on `templateVariants` table (defaults to `'traditional'`)
- `window.api.themes.*` IPC handlers (list, renderHtml) wrapping external resume.json theme packages

The v2.1 milestone **replaces** the three resume.json themes (Even, Class, Elegant) with 5 purpose-built React template components. The iframe path in `VariantPreview` will be replaced by a React component dispatch.

---

### Table Stakes (Users Expect These — v2.1)

Features users assume will exist. Missing any of these makes the template system feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 5 distinct template styles (Classic, Modern, Jake, Minimal, Executive) | Users expect visual variety; a single layout is not a "template system" | MEDIUM | Each needs distinct typography and header treatment. Jake (MIT-licensed, most-forked resume template on GitHub) is the most recognized format among SWEs. All must be single-column — multi-column breaks ATS parsing. |
| Preview matches PDF export exactly (no layout drift) | Core trust failure with v1.1 — resume.json themes rendered differently in preview vs PDF | HIGH | Root cause of old bug: iframe HTML rendering != Chromium print engine. Fix: new templates are React components registered in both `VariantPreview` and `PrintApp.tsx`. Same component = same output. |
| Page break visualization in preview pane | Users need to know if content spills to page 2 before exporting; without this they export blind | MEDIUM | Overlay approach: compute page boundaries as `n * PAGE_HEIGHT_PX` (1056px for US Letter at 96dpi) and render dashed divider lines with page number labels. This is a React overlay, NOT a CSS print feature — it must NOT appear in the `printToPDF` output. |
| Template persists per variant | Each variant targets a different role/company; different templates make sense | LOW | `layoutTemplate` column already exists. Needs companion `templateOptions` JSON column for accent color, margin, and skills mode. |
| Accent color persists per variant | Tech role vs executive role warrants different color choices | LOW | Add `templateOptions TEXT DEFAULT '{}'` JSON column to `templateVariants`. Parse at runtime as `{ accentColor?, compactMargins?, skillsDisplayMode? }`. |
| ATS-clean output (single-column, text-based) | Recruiters submit to ATS; multi-column PDF and table-based layouts break parsing | MEDIUM | All 5 templates must be single-column. Skills rendered as comma-separated text in DOCX regardless of display mode. No tables for layout structure. |

### Differentiators (Competitive Advantage — v2.1)

Features that make the template system feel polished beyond typical resume builders.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Page break overlay with page number labels | "Page 1 / Page 2" at each break line — instantly shows if resume is running long before export | LOW | Pure React overlay (`position: absolute`, `pointer-events: none`) over the scrollable preview container. Draw horizontal rules at `n * 1056px` intervals. Add page number labels ("Page 2" etc.) at each line. Must be excluded from PrintApp render path by a `if (isPrintContext) return null` guard. |
| Compact margin toggle (normal / tight) | Two-state is faster than a slider; maps to clear use cases (tech-dense vs executive-spacious) | LOW | CSS variable swap: `--page-margin: 0.75in` (normal) vs `--page-margin: 0.5in` (tight). Toggling changes content height → page break overlay must re-measure via `ResizeObserver`. |
| Accent color picker with preset palette | Lets user match industry convention without a full color wheel | LOW | 8-10 curated hex swatches (navy, teal, forest green, slate, burgundy, charcoal, royal blue, black). No freeform hex input for v2.1 — constrains choices to resume-safe colors. |
| Skills display mode switcher | Different roles suit different skills layouts without re-selecting the whole template | LOW | Two modes for v2.1: `grouped` (bold category + comma list, current behavior) and `inline` (all skills comma-separated, maximum space efficiency). Add `pills` in v2.2 after verifying DOCX degradation logic. |
| Template thumbnail grid picker | Visual thumbnails make template selection faster than reading names in a dropdown | MEDIUM | Static PNG thumbnails per template in a popover grid. Can defer to v2.2 — text dropdown is acceptable for v2.1 launch. |

### Anti-Features (v2.1 — Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Freeform margin sliders (px/in input) | "I want exactly 0.6in margins" | Unlimited values break template visual integrity; users over-tweak; print margin edge cases accumulate | Compact toggle (2 values: normal / tight) is sufficient and safe |
| Per-section font size controls | "This section looks too big" | Creates incoherent typography; font scale is load-bearing in each template's design | Let each template own its type scale; user switches templates to get different density |
| Custom font upload or URL loading | "I want my brand font" | Font loading in Electron print context is unreliable; web fonts require explicit `@font-face` blob loading; DOCX cannot use custom fonts | Bundle 2-3 system fonts per template (Georgia, Calibri, Helvetica) |
| Multi-column layout templates | Visually striking; common in designer resumes | Two-column HTML breaks ATS parsing; `page-break-inside` behaves unpredictably across CSS columns in Chromium print; DOCX cannot represent columns | Single-column only. Modern/Executive can use a left border accent line for visual structure without true columns |
| Live font-size scaling to force one page | "Shrink everything to fit" | Fractional font sizes cause pixel rounding issues in PDF; hides content problem | Page break overlay shows overflow; user trims bullets in VariantBuilder — the correct solution |
| Template-specific section ordering UI | "I want Education before Experience" | Section order is a template concern; exposing it creates combinatorial complexity per template | Templates have opinionated section orders; user picks a template whose order fits their background |
| Runtime theme install from URL or file | "I found a template I like" | Security risk (arbitrary HTML/CSS execution in Electron); no sandboxing for loaded CSS | Bundle 5 curated templates; user requests new ones via GitHub issue |
| Skills `pills` display mode in v2.1 | Visual chip layout is common in modern resume builders | Requires non-trivial DOCX degradation logic (pills are HTML-only; DOCX must silently fall back to inline); adds scope risk to v2.1 | Deliver `grouped` and `inline` in v2.1; add `pills` with explicit DOCX fallback in v2.2 |

---

### v2.1 Feature Dependencies

```
[5 Template React Components]
    └──requires──> [TemplateProps interface] (shared data contract)
                       └──built on──> [BuilderData (already exists)]
    └──requires──> [PrintApp.tsx registration] (for PDF fidelity)
    └──requires──> [VariantPreview dispatch] (replaces iframe path)

[Page Break Overlay]
    └──requires──> [Templates render at fixed page width (8.5in)]
    └──requires──> [Single-column layout] (height measurement is reliable)
    └──requires──> [ResizeObserver on template container] (to re-measure on option changes)
    └──must NOT appear in──> [PrintApp.tsx render path]

[Accent Color Picker]
    └──requires──> [templateOptions JSON column on templateVariants]
    └──requires──> [CSS variable system inside each template component]

[Compact Margin Toggle]
    └──requires──> [templateOptions JSON column on templateVariants]
    └──requires──> [CSS variable system inside each template component]
    └──affects──> [Page Break Overlay] (margin change shifts content height → re-measure breaks)

[Skills Display Mode]
    └──requires──> [templateOptions JSON column on templateVariants]
    └──requires──> [Template component respects skillsDisplayMode prop]
    └──DOCX export ignores mode──> [Always renders skills as inline comma-separated in DOCX]

[templateOptions persistence]
    └──requires──> [Schema migration: ALTER TABLE template_variants ADD COLUMN template_options TEXT DEFAULT '{}']
    └──requires──> [try/catch guard for idempotency] (SQLite throws if column already exists)

[PDF Export fidelity]
    └──requires──> [Templates registered in PrintApp.tsx]
    └──requires──> [No external font loading] (system fonts only)

[Remove Even/Class/Elegant themes]
    └──requires──> [All 5 new templates working] (must not remove old path before new path is ready)
    └──deletes──> [window.api.themes.* IPC handlers] (or leaves them dormant)
    └──deletes──> [iframe path in VariantPreview]
```

#### Dependency Notes

- **`templateOptions` column is the gate for all three controls.** Accent color, margin toggle, and skills mode all store to the same JSON field. This schema migration must land before any control can persist across sessions.
- **PrintApp.tsx registration is required for PDF fidelity.** The old bug (preview != export) came from the iframe path bypassing PrintApp entirely. Every new template component must be added to PrintApp's dispatch logic.
- **Page break overlay must be invisible to printToPDF.** Achieved with a conditional render: `if (isPrintContext) return null`. The `PrintApp.tsx` context is the print path; `VariantPreview` is the preview path. They are different React trees.
- **Compact margins toggle triggers a page break re-measurement.** After any `templateOptions` change that affects rendered height, the overlay must recalculate. Use `ResizeObserver` on the template container div — fires when height changes.
- **Remove old theme wiring last.** Even/Class/Elegant removal should be a cleanup step after all 5 new templates are confirmed working, not done upfront.

---

### v2.1 MVP Definition

#### Launch With (v2.1)

- [ ] 5 React template components (Classic, Modern, Jake, Minimal, Executive) — the core deliverable; all single-column
- [ ] Page break overlay in preview pane — users must see page 2 boundary before exporting; non-negotiable UX
- [ ] `templateOptions` JSON column migration — gates accent color, margin, and skills mode persistence
- [ ] Accent color picker (preset swatches, 8-10 colors) — highest-visibility customization
- [ ] Compact margin toggle (normal / tight) — low complexity, clear value
- [ ] Skills display mode: `grouped` and `inline` (defer `pills` to v2.2) — `grouped` already works; `inline` adds space efficiency
- [ ] PDF export via PrintApp.tsx for all 5 templates — preview-to-export fidelity is the core trust requirement
- [ ] Remove Even/Class/Elegant theme wiring (and iframe path in VariantPreview) — explicitly in milestone goal

#### Add After Validation (v2.1.x)

- [ ] Skills `pills` display mode with explicit DOCX inline fallback — visually appealing; lower priority; defer until DOCX degradation tested
- [ ] Template thumbnail grid picker — better than dropdown text; requires thumbnail assets; acceptable to ship text dropdown for v2.1

#### Future Consideration (v2.2+)

- [ ] A4 page size option — US Letter only for v2.1; A4 needs different page-height calculations for overlay
- [ ] User-requested additional templates — based on feedback after 5 templates ship
- [ ] AI-powered auto-variant generation — already scoped to v2.2 in PROJECT.md

---

### v2.1 Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 5 template components | HIGH | MEDIUM | P1 |
| Page break overlay | HIGH | LOW | P1 |
| PDF export fidelity (PrintApp wiring) | HIGH | LOW | P1 |
| `templateOptions` DB migration | HIGH | LOW | P1 |
| Accent color picker | MEDIUM | LOW | P1 |
| Compact margin toggle | MEDIUM | LOW | P1 |
| Skills display mode (grouped + inline) | MEDIUM | LOW | P1 |
| Remove old theme wiring | LOW | LOW | P1 (cleanup) |
| Skills pills mode | LOW | MEDIUM | P2 |
| Template thumbnail grid | MEDIUM | MEDIUM | P2 |
| A4 page size | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v2.1 launch
- P2: Should have, add when validated
- P3: Nice to have, future milestone

---

### v2.1 Implementation Notes for Phase Authors

#### Page Break Overlay

Two approaches:

**Option A — React overlay div (recommended):** Absolute-positioned div over the preview container with `pointer-events: none`. Draw `<hr>` or div rules at `n * 1056px` intervals (US Letter at 96dpi). Add page number labels ("Page 2" etc.) at each line. Excluded from PrintApp render path by a `if (isPrintContext) return null` guard.

**Option B — CSS background-image:** `repeating-linear-gradient` on the scroll container at 1056px intervals. Simpler code but harder to add page number labels.

Option A is preferred — page number labels are high-value UX and Option B cannot support them cleanly.

The correct PAGE_HEIGHT_PX for US Letter at 96dpi is 1056px (11in * 96px/in). Content height adjusts by margin: with 0.75in top+bottom margins, usable height per page is approximately 912px. The overlay lines mark the full page boundary at 1056px intervals, not the usable-content boundary.

#### `templateOptions` Schema Migration

Add to `db/index.ts` initialization block:

```typescript
try {
  db.run(sql`ALTER TABLE template_variants ADD COLUMN template_options TEXT DEFAULT '{}'`)
} catch {
  // column already exists — safe to ignore
}
```

Runtime type:

```typescript
interface TemplateOptions {
  accentColor?: string        // hex, e.g. '#1a56db'
  compactMargins?: boolean    // default false
  skillsDisplayMode?: 'grouped' | 'inline' | 'pills'  // default 'grouped'
}
```

#### Template Component Interface

All 5 templates share the same props interface extending `ProfessionalLayoutProps`:

```typescript
interface TemplateProps extends ProfessionalLayoutProps {
  options?: TemplateOptions
}
```

`VariantPreview` and `PrintApp` both dispatch to a `templateComponents` map keyed by `layoutTemplate` value. This replaces the current `isBuiltIn()` check and iframe path.

#### Skills Display Mode and ATS Safety

- `grouped`: bold category label + comma list (current behavior in ProfessionalLayout). ATS-safe.
- `inline`: all skills as single comma-separated string. Maximum ATS compatibility. Minimal vertical space.
- `pills`: visual chip elements. DOCX export path MUST override to `inline` regardless of stored mode. Print/PDF is fine with pills.

#### Accent Color Implementation

Each template component uses CSS custom properties scoped to its container: `--template-accent: {accentColor}`. Template JSX applies `style={{ '--template-accent': options?.accentColor ?? '#1a56db' } as React.CSSProperties}` at the root element. Section headers, rule lines, and name highlight consume this variable.

---

### v2.1 Competitor Feature Analysis

| Feature | Kickresume / Canva | Enhancv | Our Approach |
|---------|-------------------|---------|--------------|
| Template selection | Visual grid of 40+ templates | Visual grid with category filter | 5 curated templates; text dropdown for v2.1, thumbnail grid for v2.2 |
| Color customization | Full color wheel per template | Preset palette plus custom hex | 8-10 preset swatches only (safer for resume context; fewer bad choices) |
| Margin/spacing | Slider or presets | Spacing scale | Two-state toggle (normal / tight) |
| Skills display | Categorized list | Progress bars (ATS-hostile) | grouped / inline for v2.1; pills in v2.2 |
| Page break visibility | Live paged preview (Canva) | No explicit indicator | Overlay dividers with page numbers in preview |
| Preview-to-export fidelity | Strong (SaaS-controlled render) | Strong | Achievable via shared React component in PrintApp |

---

### v2.1 Sources

- Jake's Resume template (MIT license, most-forked on GitHub): [https://github.com/jakegut/resume](https://github.com/jakegut/resume)
- Jake's Resume on Overleaf: [https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs](https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs)
- CSS page-break properties (MDN): [https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside](https://developer.mozilla.org/en-US/docs/Web/CSS/page-break-inside)
- Electron printToPDF page-break issues: [https://github.com/electron/electron/issues/10086](https://github.com/electron/electron/issues/10086)
- ATS skills section guidance: [https://blog.theinterviewguys.com/how-to-list-skills-on-a-resume/](https://blog.theinterviewguys.com/how-to-list-skills-on-a-resume/)
- Resume color scheme ATS compatibility: [https://www.resumly.ai/blog/resume-color-scheme-for-ats-compatibility-and-readability](https://www.resumly.ai/blog/resume-color-scheme-for-ats-compatibility-and-readability)
- Codebase analysis: `ProfessionalLayout.tsx`, `VariantPreview.tsx`, `VariantEditor.tsx`, `schema.ts` (read directly — HIGH confidence)

---

## v2.0 Feature Landscape (Current Milestone: AI Analysis Integration)

This section covers only what is new in v2.0. v1.0 and v1.1 feature landscape is preserved below.

### What Already Exists (v1.x Foundation)

Work history, skills, projects, education, and all resume.json entities. Template variants with checkbox builder. PDF/DOCX export with bundled resume.json themes. Submissions with frozen snapshots and list view. resume.json import. Profile/contact info.

---

### Table Stakes (Users Expect These — v2.0)

Features every AI resume tool provides. Missing these makes the product feel incomplete relative to Jobscan/Teal.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Job posting text paste + analysis trigger | Entry point for all analysis; competitors (Jobscan, Teal) all start here | LOW | Textarea + "Analyze" button; loading/spinner state; URL scraping is out of scope per PROJECT.md — text paste is sufficient |
| Match score (0-100) | Every competing tool shows a headline numeric score; users anchor to it and share it | MEDIUM | Score tied to a specific variant, not the raw DB; 65-80% is "good" per Jobscan benchmarks; score must be stored alongside the job posting record |
| Keyword coverage list (matched / missing) | Users act on specific gaps, not just a score; competitors split hard skills from soft skills | MEDIUM | Three buckets: exact match, semantic match (LLM-detected equivalence), missing; industry expectation is 15-25 hard skills and 20-40 soft skills extracted from posting |
| Gap analysis with severity tiers | "Missing Python (required)" drives a different action than "Could mention CI/CD" | MEDIUM | Two tiers: critical (explicitly required per posting) and moderate (preferred or implied); count per tier shown prominently |
| Per-bullet rewrite suggestions | Rewording existing bullets to match job language is the highest-value AI action; all serious tools offer it | HIGH | AI suggests rewording of existing bullets only — never fabricates; one suggestion per bullet; user accepts or dismisses each individually |
| Accept/dismiss per suggestion | Granular control is required; accepting all blindly undermines the AI-boundary constraint | LOW | State per bullet: original / suggested / accepted / dismissed; accepted writes back to the bullet in DB |
| Submission pipeline stages | Applied → Phone Screen → Technical → Offer → Rejected; expected since Trello job-search templates became popular | MEDIUM | Fixed stages (per PROJECT.md key decision); stage column added to existing submissions table; drag-to-advance or dropdown change |
| Per-submission notes field | Jobscan and Teal both surface recruiter name, interview dates, and follow-up notes on each submission card | LOW | Additive text field on existing submission record; no new entity needed |
| AI provider settings + API key | Provider-agnostic + user-supplied key is the stated constraint; without settings nothing else works | MEDIUM | Provider selector (Claude / OpenAI / custom endpoint), API key input with masked display, test-connection button, local encrypted storage |

### Differentiators (Competitive Advantage — v2.0)

Features that go beyond Jobscan/Teal, made possible by this app's local-first, snapshot-linked architecture.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Analysis tied to a specific variant snapshot | Competitors analyze a generic resume; this app analyzes the exact variant being submitted — match score reflects what was actually sent | MEDIUM | Variant selector required before analysis runs; analysis result stored with job posting record and linked to variant ID |
| Semantic matching labeled separately from exact matching | "Led cross-functional teams" correctly matches "project management" without false-missing signal | LOW (prompt design) | LLM returns semantic matches in a distinct bucket; UI labels them differently from exact matches so user understands why they scored |
| Gap tiers distinguish required vs preferred | Binary "missing/present" is the norm among competitors; severity drives prioritization | LOW (prompt design) | LLM classifies each gap using language from the posting ("required", "must have", "preferred", "nice to have") |
| Rewrite suggestion shows original and proposed side-by-side | Most tools silently replace; a diff view is required for honest accept/reject | LOW | Side-by-side card: left = original text, right = LLM suggestion; accept writes to DB, dismiss restores state |
| ATS compatibility check as a distinct signal | Formatting issues (tables, columns, images) hurt ATS parsing independently of keyword match | MEDIUM | Heuristic check on the rendered resume structure; separate from match score; flags: multi-column layout detected, table used, non-standard section heading |
| Submission linked to exact variant + analysis used | "What resume did I send, and what was the match score at time of sending?" — no competitor offers this | LOW (schema extension) | Extend submission record to store variant ID and optional analysis run ID |
| Analysis history per job (score progression) | Re-running analysis after edits should show improvement delta | MEDIUM | Store multiple analysis runs per job posting; display score timeline; show +/- delta from previous run |

### Anti-Features (v2.0 — Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| AI-generated resume text from scratch | "Just write me a better resume" is the obvious ask | Exaggerates experience — the core user pain point that motivated this app per PROJECT.md; erodes trust completely | AI rewrites existing bullets only; user controls every word; this boundary is non-negotiable |
| Accept-all suggestions at once | Saves time | Bypasses per-bullet review that maintains the AI boundary; can introduce language the user cannot defend in interviews | Explicit accept per bullet; batch dismiss is lower risk and acceptable |
| URL scraping of job postings | More convenient than pasting | Fragile (sites change, block bots, require JS rendering); ongoing maintenance burden for a desktop app with no server | Text paste only; copy from browser takes 3 seconds; out of scope per PROJECT.md |
| Fully automated tailoring pipeline | One-click workflow is appealing | Removes user agency at the trust-critical step; deferred to v2.1 per PROJECT.md | Guided workflow: paste → review score → address gaps → review rewrites → export; each step explicit |
| Custom pipeline stages | "I want to add Take-Home Test" | Custom stages complicate filtering and reporting; label the custom context in the notes field instead | Fixed stages cover 95% of cases; notes field handles the rest |
| Submission analytics and pattern insights | "Why am I not getting callbacks?" | Needs months of history data to be meaningful; v2.0 will have too little data | Deferred to v2.2 per PROJECT.md; build data collection now, analyze later |
| Real-time score updates while editing | Instant feedback | LLM calls are slow and expensive; polling on every keystroke is impractical | Explicit "Re-analyze" button after edits; show last-run timestamp so user knows when score was calculated |
| Cover letter generation | Natural adjacent feature | Different document type, different failure modes; explicitly out of scope per PROJECT.md | Not in scope |

---

### v2.0 Feature Dependencies

```
[AI Provider Settings + API Key]
    └──required by──> [Job Posting Analysis]
                          └──required by──> [Match Score]
                          └──required by──> [Keyword Coverage]
                          └──required by──> [Gap Analysis (critical/moderate)]
                          └──required by──> [Bullet Rewrite Suggestions]
                          └──required by──> [ATS Compatibility Check]

[Variant Selection]
    └──required by──> [Job Posting Analysis]
        (analysis must target a specific variant, not the raw DB)

[Job Posting Analysis]
    └──produces──> [Analysis Result record]
                       └──linked to──> [Submission Record (v1.x)]

[Bullet Rewrite Suggestions]
    └──informed by──> [Gap Analysis]
        (gaps tell the LLM which bullets to prioritize)
    └──writes back to──> [Work History bullets / Project bullets (v1.x)]
        (accepted suggestion updates bullet text in DB)

[Submission Pipeline Stages]
    └──extends──> [Submission Record (v1.x)]
        (adds status enum column + stage history)

[Per-Submission Notes]
    └──extends──> [Submission Record (v1.x)]
        (additive text column)

[Analysis History]
    └──requires──> [Job Posting Analysis]
    └──enhances──> [Submission record display]
```

#### Dependency Notes

- **AI Provider Settings gates every AI feature.** Must ship first or alongside the analysis UI. Cannot be deferred to a later phase.
- **Variant selection is required before analysis runs.** Analysis without a specific variant context produces a misleading score. The UI must enforce this — no "analyze" without a selected variant.
- **Bullet rewrite and gap analysis share the same LLM context.** Both can be returned from a single prompt call that receives the job posting and the variant's bullets together. This is a design optimization, not a hard dependency.
- **Submission pipeline is additive to v1.x submissions.** Not a new entity — adds a `status` column (enum) and `notes` column to the existing `submissions` table. Drizzle migration is two columns.
- **Analysis history depends on storing multiple runs.** Schema should allow N analysis runs per job posting from the start, even if the UI only shows the latest run in v2.0.

---

### v2.0 MVP Definition

#### Launch With (v2.0)

- [ ] AI provider settings (provider select, API key input, masked display, encrypted local storage, test-connection) — gates everything else
- [ ] Job posting text paste + analysis trigger (textarea, Analyze button, loading state, error handling) — entry point
- [ ] Match score (0-100) per variant + posting pair — headline output
- [ ] Keyword coverage (exact match / semantic match / missing) split hard/soft — actionable output
- [ ] Gap analysis with critical vs moderate tiers — prioritization layer on top of coverage
- [ ] Bullet rewrite suggestions with per-bullet accept/dismiss, original vs proposed side-by-side — the AI-assists-without-fabricating flow
- [ ] Submission pipeline stages (Applied / Phone Screen / Technical / Offer / Rejected) with status on submission cards
- [ ] Per-submission notes field

#### Add After Validation (v2.1)

- [ ] Analysis history per job (score progression, delta from previous run) — needs history data first
- [ ] ATS compatibility check (heuristic: multi-column, table, non-standard section header detection) — useful but not blocking
- [ ] Analysis run linked to submission export (traceability: which analysis score was active when submission was created)
- [ ] Automated tailoring pipeline — deferred per PROJECT.md

#### Future Consideration (v2.2+)

- [ ] Submission analytics and pattern insights — deferred per PROJECT.md; needs months of history
- [ ] AI-powered auto-variant generation — deferred per PROJECT.md

---

### v2.0 Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| AI Provider Settings | HIGH (gate) | MEDIUM | P1 |
| Job Posting Text Paste + Trigger | HIGH | LOW | P1 |
| Match Score (0-100) | HIGH | MEDIUM | P1 |
| Keyword Coverage List | HIGH | MEDIUM | P1 |
| Gap Analysis (critical/moderate) | HIGH | MEDIUM | P1 |
| Bullet Rewrite Suggestions | HIGH | HIGH | P1 |
| Accept/Dismiss Per Suggestion | HIGH | LOW | P1 |
| Submission Pipeline Stages | HIGH | MEDIUM | P1 |
| Per-Submission Notes | MEDIUM | LOW | P1 |
| ATS Compatibility Check | MEDIUM | MEDIUM | P2 |
| Analysis History / Score Delta | MEDIUM | MEDIUM | P2 |
| Analysis Linked to Submission Snapshot | MEDIUM | LOW | P2 |
| Submission Analytics | LOW | HIGH | P3 |
| Auto-Variant Generation | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Add in v2.1 after core validated
- P3: Defer to v2.2+

---

### Competitor Feature Analysis (v2.0 Context)

| Feature | Jobscan | Teal | ResumeWorded | Our Approach |
|---------|---------|------|--------------|--------------|
| Match score | Prominent 0-100% | Yes, with excitement rating | Yes | 0-100, tied to specific variant not generic resume |
| Keyword coverage | Hard + soft skills split | Yes, AI guidance per stage | Yes, with priority ranking | Hard/soft split + exact vs semantic match labeled distinctly |
| Gap analysis | Missing keywords list | Skills gap with AI tips | Responsibilities alignment tiers | Critical vs moderate tiers; required vs preferred sourced from posting language |
| Bullet rewrites | Suggests insertion points | Partial (tips only) | None | Per-bullet accept/dismiss; original vs proposed side-by-side |
| ATS check | Core feature | Limited | Yes | Heuristic on export structure; separate signal from match score |
| Job tracking | Kanban + notes + reminders | Kanban with excitement scale + notes | None | Fixed pipeline stages + notes; no reminders in v2.0 |
| Snapshot linkage | None | None | None | Differentiator: submission links to exact variant + analysis run |
| Local / private | No (cloud SaaS) | No (cloud SaaS) | No (cloud SaaS) | Electron, local SQLite, user-supplied API key; no data leaves machine |
| Provider choice | Locked to proprietary models | Locked to proprietary models | Locked to proprietary models | Provider-agnostic; user brings Claude/OpenAI key |

---

### v2.0 Sources

- [Jobscan ATS Resume Checker](https://www.jobscan.co/) — scoring benchmarks (65-80% match rate guidance), keyword coverage patterns (MEDIUM confidence, commercial tool)
- [Teal Job Tracker feature overview](https://www.tealhq.com/tools/job-tracker) — pipeline stage UX, per-stage notes (MEDIUM confidence, official docs)
- [ATS Resume Keywords Guide 2026 — uppl.ai](https://uppl.ai/ats-resume-keywords/) — keyword density targets, 15-25 keywords guidance (MEDIUM confidence)
- [How AI Can Transform Job Matching — Medium Feb 2026](https://tusharlaad.medium.com/how-ai-can-transform-job-matching-using-llms-to-understand-what-jobs-really-offer-ab7ab4a171c9) — LLM semantic matching patterns (LOW confidence, single source)
- [Best LLM for Resume and Job Description Analysis — PitchMeAI](https://pitchmeai.com/blog/best-llm-resume-job-description-analysis) — LLM choice for resume domain (MEDIUM confidence)
- [Applying AI-Powered Gap Analysis — Resumly](https://www.resumly.ai/blog/applying-ai-powered-gap-analysis-to-find-missing-skills) — gap analysis output patterns (MEDIUM confidence)
- [ATS-Friendly Resume Guide 2026 — OwlApply](https://owlapply.com/en/blog/ats-friendly-resume-guide-2026-format-keywords-score-and-fixes) — ATS formatting heuristics (MEDIUM confidence)
- [Jobscan vs Teal 2026 — Jobscan blog](https://www.jobscan.co/blog/jobscan-vs-teal/) — feature comparison (MEDIUM confidence, vendor-authored)
- [How to Build an LLM-Powered Resume Optimizer — Medium](https://medium.com/@leofgonzalez/how-i-built-an-llm-powered-resume-optimizer-to-beat-ats-filters-8ace36d5d32c) — finite state machine workflow pattern (LOW confidence, single source)

---

## v1.1 Feature Landscape

*(Research from 2026-03-14 — shipped features.)*

### What Already Exists (v1.0 Foundation)

The app has: work history (jobs + toggleable bullets), skills with freeform tag arrays (stored as JSON in SQLite), template variants (checkbox-based include/exclude per job/bullet/skill), PDF export (hidden BrowserWindow + `printToPDF`) and DOCX export (docx library), submission tracking with frozen JSON snapshots, and profile/contact info.

Tags are stored as `JSON.stringify(string[])` in `skills.tags`. Template variant exclusions are stored in `templateVariantItems` with flexible `itemType` + `bulletId`/`skillId`/`jobId` FK columns.

---

### Table Stakes (Users Expect These — v1.1)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Projects section with toggleable bullets | Work history has this pattern; projects are standard resume content for developers; schema parity with jobs | MEDIUM | New DB tables: `projects` (name, description, url, startDate, endDate) and `projectBullets` (projectId FK, text, sortOrder). Mirrors `jobs`/`jobBullets` exactly. Must be added to template variant include/exclude (add `projectId` FK column to `templateVariantItems`), PDF print template, and DOCX builder. Renders after work experience on output. |
| Tag autocomplete (suggest existing tags while typing) | Typing tags without suggestions is friction; users expect combobox/dropdown on any tag input | LOW | Query all distinct tags from all existing `skills.tags` rows. Deduplicate in-memory. Show filtered dropdown below input as user types. Accept suggestion via click or Enter; custom value created on Enter/comma. No new IPC handler needed — data is available from the already-loaded skills list. |
| resume.json data import | Any structured format has an import path; users migrating from other tools or exporting from LinkedIn/other sites have resume.json files | MEDIUM | File picker (`dialog.showOpenDialog`) → `fs.readFile` → `JSON.parse` → validate top-level keys → map to internal schema. Field mappings: `basics` → profile, `work[]` → jobs+bullets (highlights[]), `skills[]` → skills+tags (keywords[]), `projects[]` → projects+projectBullets (highlights[]). Partial import is correct behavior — skip unknown/missing sections. Show import summary (X jobs added, Y skills added, Z projects added). |

### Differentiators (v1.1)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| resume.json theme support | Unlocks 400+ community themes without building layouts in-house; users pick from curated bundled themes | HIGH | Themes are npm packages (`jsonresume-theme-{name}`) that export `render(resumeJson) => htmlString` with all CSS inlined. Integration: (1) write `toResumeJson(variantId)` mapper that transforms internal DB data filtered by variant exclusions into resume.json shape, (2) call `theme.render(resumeJson)` in main process, (3) inject resulting HTML into the existing hidden-BrowserWindow PDF pipeline via `loadURL('data:text/html,...')` or temp HTML file. Bundle 3-5 curated themes as npm deps. The `templateVariants.layoutTemplate` field already exists and maps theme names directly. |

### Anti-Features (v1.1 — Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full merge/conflict UI on resume.json import | Importing into a populated DB feels like it needs merge logic | Massive scope increase; users expect "add to existing" semantics for imports | Detect non-empty DB and show "this will add to your existing experience" warning. Allow user to see what will be imported before confirming. |
| Dynamic theme installation from npm at runtime | Users want any of 400+ community themes on demand | npm install at runtime in Electron is fragile, slow, creates arbitrary dependency surface; themes can pull in heavy build tooling | Bundle 3-5 curated self-contained themes. Provide local-file escape hatch (load a `render.js` from disk) for power users. |
| Theme CSS editing in-app | Seems like the next step after picking a theme | Themes are npm packages with their own build pipeline; in-app CSS editing is a separate product | Themes are open source — users who want custom layouts fork the package. |
| resumé.json export | Symmetric with import | Not in scope for v1.1; adds complexity with little immediate value for this user | Consider for v1.2 if users request it. |

---

### v1.1 Feature Dependencies

```
[Tag Autocomplete]
    └──reads from──> [Skills (existing, v1.0)]
    No new data model. Zero blocking dependencies.

[Projects Section]
    └──requires──> [New DB tables: projects + projectBullets]
    └──requires──> [templateVariantItems: add projectId FK column]
    └──requires──> [PDF print template: add projects rendering]
    └──requires──> [DOCX builder: add PROJECTS section]

[resume.json Data Import]
    └──populates──> [Jobs/Bullets (existing v1.0)]
    └──populates──> [Skills (existing v1.0)]
    └──populates──> [Profile (existing v1.0)]
    └──populates──> [Projects] (new — import maps projects[] to projects table)
    NOTE: data import is independent of theme import

[resume.json Theme Support]
    └──requires──> [toResumeJson(variantId) mapper]
                       └──ideally includes──> [Projects Section] (complete data)
    └──uses──> [existing PDF export pipeline (hidden BrowserWindow + printToPDF)]
    └──reads from──> [templateVariants.layoutTemplate (already exists)]
```

#### Dependency Notes

- **Projects section should precede theme import:** The `toResumeJson()` mapper for themes should include `projects[]`. Building projects first means themes get complete data. They can be developed in parallel but projects must be complete before theme output is considered final.
- **Data import and theme import are independent pipelines:** Import populates the DB; themes consume the DB via the mapper. A user does not need to have imported data to use a theme.
- **Tag autocomplete has zero blocking dependencies:** Reads existing data, no new schema. Can be built in any order.
- **Resume.json data import benefits from projects section being complete:** So the import can map `projects[]` from the file to the new projects table. If projects is built first, import is complete in one pass.

---

### v1.1 Implementation Notes

#### Projects Section
Copy the `jobs`/`jobBullets` table structure exactly. Add a `projectId` integer FK column to `templateVariantItems` (nullable, same as existing `bulletId`/`skillId`/`jobId`). The `itemType` field can use `'project'` and `'projectBullet'` as new values — no structural change required beyond the FK column. The template variant builder UI (checkbox tree) gains a PROJECTS subtree identical to the WORK EXPERIENCE subtree. The PDF print component and DOCX builder each need a new section appended after work experience.

resume.json project fields to accept on import: `name`, `description`, `highlights[]` (→ bullets), `url`, `startDate`, `endDate`, `keywords[]` (→ tags on project if a tags field is added, or discard for now).

#### Tag Autocomplete
Tags are `string[]` arrays parsed from JSON in the skills list. The autocomplete data source is: `Array.from(new Set(allSkills.flatMap(s => s.tags)))`. Filter this list by the current input value (case-insensitive prefix or substring match). Standard combobox UX: dropdown appears after first character, keyboard navigation (arrow + Enter to select), click to select, typing and pressing Enter/comma creates a new tag. Shadcn/ui ships a Combobox component that fits directly.

#### resume.json Data Import
IPC flow: renderer triggers `import:resumeJson` → main process calls `dialog.showOpenDialog` → reads and parses file → validates keys → inserts rows → returns summary object `{ profile: boolean, jobs: number, skills: number, projects: number, errors: string[] }`. The renderer shows a preview/confirmation step before the user commits the import. Failure modes to handle: malformed JSON (surface parse error), missing required fields on a row (skip row, include in errors), duplicate job entries (insert anyway — user can clean up, or detect by company+role and ask).

#### resume.json Theme Support
Themes export `render(resume: ResumeJson): string`. Output is self-contained HTML. Key constraint: "all assets and CSS must be inlined" — verify bundled themes work fully offline before including. Integration path for PDF: if `variant.layoutTemplate` is a known theme name, call `theme.render(toResumeJson(variantId))` in main process, write result to a temp `.html` file, then `win.loadFile(tempHtmlPath)` instead of the React print route, then `printToPDF` as usual. For DOCX there is no theme equivalent — themes are HTML/CSS only. DOCX continues using the custom builder regardless of theme selection.

---

## v1.0 Feature Landscape (Reference)

*(Preserved from initial research. These are shipped features.)*

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Structured experience storage (jobs, skills, projects, education) | All serious resume tools maintain a profile/experience database users can draw from | MEDIUM | Core of this app; Teal does this with check/uncheck per version |
| Multiple resume template variants | Users with broad skill sets need role-type variants (frontend vs fullstack vs backend) without rebuilding each time | MEDIUM | The "base template" model; competitors like Teal and Huntr both support this |
| Per-job resume customization (toggle items in/out) | Expected since at least 2022; every serious tool supports this | MEDIUM | Must be fast — the quick-tweak workflow is a core selling point |
| PDF export | Every employer accepts PDF; ATS systems generally parse text-based PDFs well | LOW | Must produce text-based PDF, not image-based; avoid headers/footers for ATS |
| DOCX export | Some employers or ATS systems specifically request DOCX; safer for older ATS | MEDIUM | DOCX is the "safest" format for ATS per 2025 research; harder to generate cleanly than PDF |
| Submission log (company, role, date, which version) | Users applying to many jobs need a record of what was sent where — this is basic hygiene | LOW | Without this, version tracking is pointless |
| Pipeline status tracking (Applied, Interview, Offer, Rejected) | Standard kanban stages; every job tracker from Huntr to Notion templates uses this | LOW | Standard stages: Applied → Phone Screen → Interview → Offer → Rejected/Withdrawn |
| Application dashboard (all submissions at a glance) | Users expect a single view of all active applications with status | MEDIUM | Kanban and/or table view; kanban is more visual, table is more data-dense |
| Resume version linked to submission | "Which resume did I send to Company X?" is the foundational question that drives the whole product | LOW | Store snapshot or reference at submission time; losing this breaks trust |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI experience matching (suggest, never write) | Solves the #1 user pain: AI exaggeration. Competitors like Huntr, Teal, Kickresume all rewrite bullets — this app does not. User retains every word. | HIGH | Paste job description → AI returns ranked list of existing experience items from DB. No text generation. Core differentiator. |
| Experience item reuse across variants | One canonical experience DB that all templates and job-specific customizations draw from — no copy-paste drift between versions | MEDIUM | Competitors do this with varying degrees of polish; Teal does it well |
| Full application history with version snapshot | "What exact resume did I send 3 months ago?" — most tools show status but not the frozen content | MEDIUM | Store serialized resume state at submission time, not just a reference that can mutate |
| Template variant system (named role archetypes) | "Frontend Focus" vs "Backend Heavy" as named starting points that get tweaked per job, rather than per-job documents from scratch | LOW | Simpler mental model than git branching; reduces decision fatigue |
| Local-first / offline-capable | Desktop app with SQLite means zero cloud dependency, privacy by default, and no subscription required | LOW | Already scaffolded; a genuine differentiator vs cloud-only tools like Teal, Huntr |
| Pipeline stage notes and dates | Record interview dates, notes from calls, who you spoke to — turns the tracker into a full submission record | MEDIUM | Adds significant value to pipeline view; contacts + notes per stage |
| ATS-safety indicators on export | Visual warning if resume layout choices (tables, columns) may harm ATS parsing | MEDIUM | Educates user without being prescriptive; would require ATS rule knowledge embedded in app |

### Anti-Features (v1.0)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| AI-generated or AI-rewritten resume text | "Just make my resume better" is the obvious ask | Creates the exact problem users came to avoid: exaggeration, hallucination, words user didn't write and can't stand behind in interviews | AI suggests which existing experience items to include; user writes all text |
| Cover letter generation | Natural complement to resume tailoring | Separate workflow entirely; risks feature bloat, and AI-generated cover letters are already recognized as noise by recruiters | Out of scope for v1; document explicitly in PROJECT.md |
| Job board scraping or auto-apply | Closing the loop on applications | Creates "spray and pray" behavior; floods ATS with generic applications; legally gray in some jurisdictions | Manual job entry keeps the user intentional and deliberate |
| Cloud sync / multi-device | Seems like obvious hygiene | Adds auth, backend, subscription model, and privacy concerns; fundamentally contradicts local-first value prop | Export/import of SQLite DB as backup/migration path |
| LinkedIn import | "I already have my profile there" | LinkedIn actively blocks scrapers; API is restricted; implementation is fragile and requires ongoing maintenance | Manual structured entry; one-time import if LinkedIn exports a PDF/DOCX |
| Real-time ATS score during editing | Users want to know their score | Requires third-party ATS API or proprietary ATS simulation; complex to maintain; false precision | Export as text-based PDF/DOCX using ATS-safe layout conventions and document those conventions |
| Team / recruiter collaboration features | Might be useful for agencies | Adds multi-tenancy, permissions, conflict resolution; completely different product | Single-user desktop tool; explicitly not a team product |
| Interview prep / flashcards | Logically adjacent to job search | Different domain entirely; no connection to resume data model | Not in scope; refer users to dedicated tools |

## Feature Dependencies (Full — v1.0 + v1.1)

```
[Experience Database]
    └──required by──> [Template Variants]
                          └──required by──> [Per-job Customization]
                                                └──required by──> [Submission Log]
                                                                      └──required by──> [Pipeline Tracking]

[Experience Database]
    └──required by──> [AI Experience Matching]

[Per-job Customization]
    └──required by──> [PDF Export]
    └──required by──> [DOCX Export]

[Submission Log]
    └──required by──> [Application Dashboard]
    └──required by──> [Resume Version Snapshot]

[PDF Export] ──independent of──> [DOCX Export]

[AI Experience Matching] ──enhances──> [Per-job Customization]

[Projects Section (v1.1)]
    └──extends──> [Experience Database]
    └──extends──> [Per-job Customization]
    └──extends──> [PDF Export]
    └──extends──> [DOCX Export]

[Tag Autocomplete (v1.1)]
    └──reads from──> [Skills (existing)]

[resume.json Data Import (v1.1)]
    └──populates──> [Experience Database + Projects]

[resume.json Theme Support (v1.1)]
    └──requires──> [toResumeJson mapper]
    └──extends──> [PDF Export pipeline]
```

## MVP Definition (v1.1 Scope)

### v1.1 Launch With

- [ ] **Projects section** — table stakes for a developer resume; mirrors existing job pattern so scope is well-bounded
- [ ] **Tag autocomplete** — low complexity, high daily UX value; immediately noticeable improvement
- [ ] **resume.json data import** — unblocks users migrating existing data; maps to existing + new projects table
- [ ] **resume.json theme support (curated set of 3-5 themes)** — avoids runtime npm complexity; validates the theme pipeline end-to-end

### Add After v1.1 Validation

- [ ] **Local theme file loading** — power user escape hatch: load a `render.js` from disk without it being a bundled dep
- [ ] **Pipeline status tracking** — already deferred from v1.0; logical next milestone
- [ ] **resume.json export** — symmetric with import; adds interoperability

### Future Consideration (v2+)

- [ ] **Dynamic npm theme installation** — only if curated set proves insufficient
- [ ] **AI job matching** — suggest relevant experience items for a given job description

## Feature Prioritization Matrix (v1.1)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Projects section | HIGH | MEDIUM | P1 |
| Tag autocomplete | HIGH | LOW | P1 |
| resume.json data import | MEDIUM | MEDIUM | P1 |
| resume.json theme support | MEDIUM | HIGH | P2 |

**Priority key:**
- P1: Must ship in v1.1
- P2: Ship in v1.1 after P1 features stabilize
- P3: Defer

## Sources

**v2.2 sources:**
- dnd-kit sortable docs: [https://docs.dndkit.com/presets/sortable](https://docs.dndkit.com/presets/sortable) (HIGH confidence — official)
- dnd-kit GitHub multi-container pattern: [https://github.com/clauderic/dnd-kit](https://github.com/clauderic/dnd-kit) (HIGH confidence)
- Material Design 3 chip component spec: [https://m3.material.io/components/chips/overview](https://m3.material.io/components/chips/overview) (HIGH confidence)
- Telerik chip UX guidelines: [https://www.telerik.com/design-system/docs/components/chip/](https://www.telerik.com/design-system/docs/components/chip/) (MEDIUM confidence)
- Top 5 React DnD libraries 2025-2026: [https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) (MEDIUM confidence)
- Smart interface design patterns — badges vs chips: [https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/](https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/) (MEDIUM confidence)
- Codebase analysis: `schema.ts`, `OptimizeVariant.tsx`, `SkillList.tsx`, `SkillItem.tsx`, `VariantBuilder.tsx`, `AnalysisResults.tsx`, `JobItem.tsx`, `package.json` (read directly — HIGH confidence)

**v1.1 sources:**
- [JSON Resume Schema Documentation](https://docs.jsonresume.org/schema) — projects section field definitions (HIGH confidence)
- [JSON Resume Theme Development](https://jsonresume.org/theme-development) — render function API and packaging requirements (HIGH confidence)
- [jsonresume/resume-schema GitHub](https://github.com/jsonresume/resume-schema) — authoritative schema source (HIGH confidence)
- [W3C Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) — keyboard navigation expectations for autocomplete (HIGH confidence)
- [jsonresume-theme-boilerplate](https://github.com/jsonresume/jsonresume-theme-boilerplate) — reference for theme structure (MEDIUM confidence)
- [resume-cli Puppeteer PDF rendering](https://github.com/jsonresume/resume-cli/pull/275) — confirms standard HTML→PDF via headless browser (MEDIUM confidence)

**v1.0 sources:**
- [Teal resume builder feature documentation](https://help.tealhq.com/en/collections/9568976-resume-builder) — HIGH confidence (official docs)
- [Teal review: features, pros, cons (2025)](https://www.usesprout.com/blog/teal-review-pricing-alternatives) — MEDIUM confidence
- [Huntr vs Teal comparison 2026](https://huntr.co/blog/huntr-vs-teal) — MEDIUM confidence (vendor-authored but feature-accurate)
- [ATS PDF vs DOCX compatibility (2026)](https://smallpdf.com/blog/do-applicant-tracking-systems-prefer-resumes-in-pdf-format) — HIGH confidence
- [ATS formatting pitfalls (2025)](https://blog.theinterviewguys.com/ats-friendly-resume-template-2025/) — MEDIUM confidence

---

*Feature research for: ResumeHelper v1.0, v1.1, v2.0, v2.1, and v2.2*
*Last updated: 2026-03-26*
