# ResumeHelper

## What This Is

A desktop application (Electron) for managing, versioning, and submitting tailored resumes. It stores all professional experience in a SQLite database, lets users create template variants (frontend-focused, fullstack, backend-heavy, etc.), and tracks every job submission with full pipeline visibility. Built for a developer with a wide skill set who needs to quickly produce targeted resumes without AI exaggeration.

## Core Value

Full visibility into job applications — which resume version was sent to which company, when, and where each application stands in the pipeline. The tracking system is the foundation; fast resume tailoring builds on top of it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] User can store all professional experience (jobs, skills, projects, education) in a structured database
- [ ] User can create and manage template variants (e.g., "Frontend Focus", "Fullstack", "Backend Heavy")
- [ ] User can quickly tweak a template variant for a specific job application by toggling experience items in/out
- [ ] User can paste a job description and get AI-suggested relevant experience items from their database (AI suggests, never writes)
- [ ] User can export a resume as PDF
- [ ] User can export a resume as Word/DOCX
- [ ] User can log a submission (company, role, date, which resume version)
- [ ] User can track submission status through a pipeline (Applied, Interview, Offer, Rejected)
- [ ] User can view all submissions at a glance with status and version info

### Out of Scope

- AI-generated resume text — AI only matches existing experience to job postings, never writes or rephrases
- resume.json format conformance — schema designed for this app's workflow, not external spec
- Mobile app — desktop-first via Electron
- Cover letter generation — separate concern
- Job board integration/scraping — manual entry

## Context

- Developer has extensive cross-stack experience (C#, React, Angular, frontend, backend) making resume tailoring especially valuable
- Current pain point: AI tools exaggerate experience when asked to help tailor resumes
- Current pain point: hard to track which version was sent where
- Existing codebase: Electron + React + TypeScript + Drizzle ORM + SQLite already scaffolded
- Two workflow modes: quick pick-template-and-tweak, or paste-job-description for AI-assisted matching

## Constraints

- **Tech stack**: Electron + React + TypeScript + Drizzle ORM + SQLite (already scaffolded)
- **AI boundary**: AI suggests relevant experience items only — never generates, rewrites, or embellishes text
- **Export formats**: PDF and Word/DOCX required

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Template variants over git-like branching | Simpler mental model — few base templates tweaked per job, not full git semantics | — Pending |
| AI suggests, never writes | User's #1 complaint is AI exaggeration — trust comes from controlling every word | — Pending |
| Custom schema over resume.json | Freedom to design around branching, submissions, and app workflow | — Pending |
| Submission pipeline tracking is core value | User prioritized tracking visibility over speed of resume creation | — Pending |

---
*Last updated: 2026-03-13 after initialization*
