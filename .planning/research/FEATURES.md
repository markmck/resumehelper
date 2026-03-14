# Feature Research

**Domain:** Personal resume management and job application tracking desktop app
**Researched:** 2026-03-13
**Confidence:** HIGH (cross-referenced competitor products Teal, Huntr, Careerflow, plus market research)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

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

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI experience matching (suggest, never write) | Solves the #1 user pain: AI exaggeration. Competitors like Huntr, Teal, Kickresume all rewrite bullets — this app does not. User retains every word. | HIGH | Paste job description → AI returns ranked list of existing experience items from DB. No text generation. Core differentiator. |
| Experience item reuse across variants | One canonical experience DB that all templates and job-specific customizations draw from — no copy-paste drift between versions | MEDIUM | Competitors do this with varying degrees of polish; Teal does it well |
| Full application history with version snapshot | "What exact resume did I send 3 months ago?" — most tools show status but not the frozen content | MEDIUM | Store serialized resume state at submission time, not just a reference that can mutate |
| Template variant system (named role archetypes) | "Frontend Focus" vs "Backend Heavy" as named starting points that get tweaked per job, rather than per-job documents from scratch | LOW | Simpler mental model than git branching; reduces decision fatigue |
| Local-first / offline-capable | Desktop app with SQLite means zero cloud dependency, privacy by default, and no subscription required | LOW | Already scaffolded; a genuine differentiator vs cloud-only tools like Teal, Huntr |
| Pipeline stage notes and dates | Record interview dates, notes from calls, who you spoke to — turns the tracker into a full submission record | MEDIUM | Adds significant value to pipeline view; contacts + notes per stage |
| ATS-safety indicators on export | Visual warning if resume layout choices (tables, columns) may harm ATS parsing | MEDIUM | Educates user without being prescriptive; would require ATS rule knowledge embedded in app |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

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

## Feature Dependencies

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
    (suggests items; user still toggles manually)

[Pipeline Tracking] ──enhances──> [Application Dashboard]
    (status stages populate the board/table)
```

### Dependency Notes

- **Experience Database required by everything:** No experience stored = no variants, no tailoring, no AI matching. This is phase 1, non-negotiable.
- **Template Variants required by Per-job Customization:** Users need a named base to deviate from; per-job resumes are variants of variants, not built from scratch.
- **Submission Log required by Pipeline Tracking:** A pipeline stage without a submission record is meaningless. Log the submission first, then track its status.
- **Per-job Customization required by Export:** Export must reflect the current customized state for a specific job, not just a generic template.
- **AI Experience Matching enhances Per-job Customization:** It accelerates the toggle workflow by surfacing relevant items, but users can use the toggle interface without AI. AI is additive, not load-bearing.
- **Resume Version Snapshot enhances Submission Log:** Storing a frozen copy of the resume at submission time is what transforms a basic log into a full audit trail. Medium complexity but high value.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Experience database (jobs, skills, projects, education) — without this, nothing else is possible
- [ ] Template variant creation and management — the "Frontend Focus" / "Backend Heavy" starting points
- [ ] Per-job customization (toggle experience items in/out of a variant) — the core daily workflow
- [ ] PDF export — required for actual job applications; text-based, ATS-safe layout
- [ ] Submission log (company, role, date, which template variant used) — validates the tracking value prop
- [ ] Pipeline status tracking (Applied, Interview, Offer, Rejected) — validates the visibility value prop
- [ ] Application dashboard — the full-picture view that closes the loop

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] DOCX export — add when users report ATS or employer rejection of PDF; important but non-blocking for v1
- [ ] AI experience matching — add when the experience database is rich enough to make suggestions meaningful; needs populated DB to be useful
- [ ] Resume version snapshot at submission — add once the submission log proves valuable; increases trust substantially
- [ ] Pipeline stage notes and dates — add when users want richer history beyond status alone

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] ATS-safety indicators on export — defer; requires maintaining ATS compatibility knowledge; medium complexity for moderate value
- [ ] Import from LinkedIn PDF export — defer; parsing is fragile; only worth it if users cite data-entry friction as the #1 blocker
- [ ] Resume analytics (which template variant gets responses) — defer; needs enough submission data to be meaningful (>20 submissions)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Experience database | HIGH | MEDIUM | P1 |
| Template variants | HIGH | MEDIUM | P1 |
| Per-job customization (toggle) | HIGH | MEDIUM | P1 |
| PDF export | HIGH | MEDIUM | P1 |
| Submission log | HIGH | LOW | P1 |
| Pipeline status tracking | HIGH | LOW | P1 |
| Application dashboard | HIGH | MEDIUM | P1 |
| DOCX export | HIGH | MEDIUM | P2 |
| AI experience matching | HIGH | HIGH | P2 |
| Version snapshot at submission | MEDIUM | MEDIUM | P2 |
| Pipeline stage notes | MEDIUM | LOW | P2 |
| ATS-safety indicators | MEDIUM | HIGH | P3 |
| Resume analytics | LOW | HIGH | P3 |
| LinkedIn PDF import | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Teal | Huntr | Careerflow | Our Approach |
|---------|------|-------|------------|--------------|
| Experience database | Yes — check/uncheck items per version | Yes — versioned per role | Partial | Core foundation; same model as Teal |
| Multiple resume versions | Yes — unlimited | Yes | Yes | Template variants as named archetypes, not per-job documents |
| Per-job tailoring | Yes — driven by job description | Yes — fast iteration | Yes | Manual toggle + optional AI suggestion |
| AI text rewriting | Yes — rewrites bullets | Yes — rewrites bullets | Yes | Explicitly NOT done; AI suggests only |
| PDF export | Yes | Yes | Yes | Yes; text-based, ATS-safe layout |
| DOCX export | Yes | Yes | Yes | Yes |
| Job application pipeline | Yes — basic | Yes — kanban | Yes | Kanban + table; with resume version linked |
| Which version was sent | Partial — linked but mutable | Partial | No | Frozen snapshot at submission time |
| Local / offline | No — cloud only | No — cloud only | No — cloud only | Yes — SQLite desktop; genuine differentiator |
| AI auto-apply | No | No | No | No — anti-feature |
| Cover letter | Yes | Yes | Yes | No — out of scope |
| Job board scraping | No | Extension-assisted | No | No — anti-feature |

## Sources

- [Teal resume builder feature documentation](https://help.tealhq.com/en/collections/9568976-resume-builder) — HIGH confidence (official docs)
- [Teal review: features, pros, cons (2025)](https://www.usesprout.com/blog/teal-review-pricing-alternatives) — MEDIUM confidence
- [Huntr vs Teal comparison 2026](https://huntr.co/blog/huntr-vs-teal) — MEDIUM confidence (vendor-authored but feature-accurate)
- [Huntr vs Teal vs Careerflow](https://www.careerflow.ai/blog/huntr-vs-teal-vs-careerflow) — MEDIUM confidence
- [Job application tracker best-of 2026](https://worldmetrics.org/best/job-application-tracking-software/) — MEDIUM confidence
- [Kanban for job hunting patterns](https://kanbanzone.com/2023/personal-kanban-for-job-hunting/) — MEDIUM confidence
- [ATS PDF vs DOCX compatibility (2026)](https://smallpdf.com/blog/do-applicant-tracking-systems-prefer-resumes-in-pdf-format) — HIGH confidence
- [ATS formatting pitfalls (2025)](https://blog.theinterviewguys.com/ats-friendly-resume-template-2025/) — MEDIUM confidence
- [AI resume tailoring tools analysis (2025-2026)](https://www.reztune.com/blog/best-ai-resume-tailoring-2025/) — MEDIUM confidence
- [AI resume survival guide (anti-AI-writing perspective)](https://natesnewsletter.substack.com/p/the-ai-resume-survival-guide-for) — MEDIUM confidence
- [Resume tailoring callback rate research](https://huntr.co/blog/how-to-tailor-resume-to-job-description) — LOW confidence (vendor claim: 40% more callbacks for tailored resumes)

---
*Feature research for: Personal resume management and job application tracking desktop app*
*Researched: 2026-03-13*
