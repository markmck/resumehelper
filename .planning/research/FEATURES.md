# Feature Research

**Domain:** Personal resume management and job application tracking desktop app
**Researched:** 2026-03-13 (v1.0) / 2026-03-14 (v1.1 additions) / 2026-03-23 (v2.0 additions)
**Confidence:** HIGH (core patterns verified against competing tools), MEDIUM (UX detail estimates)

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

*Feature research for: ResumeHelper v1.0, v1.1, and v2.0*
*Last updated: 2026-03-23*
