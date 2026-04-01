# Phase 14: Templates Complete - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** User-provided template spec + discuss-phase conflict resolution

<domain>
## Phase Boundary

All 5 resume templates (Classic, Modern, Jake, Minimal, Executive) available with distinct visual styles. DOCX export uses correct font per template with proper Word heading styles. Professional summary is user-toggleable. Skills section supports inline and grouped display modes. Requirements: TMPL-01, TMPL-04, TMPL-05, EXPRT-01, EXPRT-02, EXPRT-03.

</domain>

<decisions>
## Implementation Decisions

### Classic Template Update
- Change font from Times New Roman to Georgia (serif), fallback: 'Times New Roman', serif — per user spec
- All other Classic styles remain as built in Phase 13 (uppercase headings, accentColor prop, etc.)
- Accent color: #000000 (pure black and white, no color)

### Modern Template (NEW)
- Font: Calibri, fallback: 'Helvetica Neue', Arial, sans-serif
- Name: 24pt, semibold (600), left-aligned
- Contact: 10pt, left-aligned, pipes separator, email/URLs in accent color
- Section headings: 11pt, bold, uppercase, letter-spacing 0.08em
- Section heading separator: 2px solid accent color, 40px wide (NOT full width)
- Company: 11pt bold; Job title: 11pt regular in accent color; Dates: 10pt #666
- Body: 10.5pt, line-height 1.25
- Margins: 0.75" all sides
- Accent color default: #2563EB (blue)
- Skills default: inline comma-separated, grouped by category on separate lines, category label in accent color

### Jake Template (NEW)
- Font: Lato, fallback: 'Helvetica', Arial, sans-serif
- Name: 22pt, bold, centered; Contact: 9pt, centered, diamond (◆) separator
- Section headings: 11pt, bold, uppercase, full-width 1px solid #333 rule
- Entry format: **Company Name** — *Job Title* (dates right-aligned) — all on ONE line
- Body: 10pt, line-height 1.15 (very tight)
- Margins: 0.6" top/bottom, 0.5" left/right (dense layout)
- Section spacing: 10pt; entry spacing: 6pt; bullet spacing: 1pt
- Accent color: #333333 (monochrome)
- Skills: single line per category, bold label, colon, comma-separated, very compact
- Maximum information density — designed to fit a lot on one page

### Minimal Template (NEW)
- Font: Inter, fallback: -apple-system, 'Segoe UI', sans-serif
- Name: 20pt, medium (500), left-aligned
- Contact: 10pt, #555, middot (·) separator
- Section headings: 10pt, medium (500), uppercase, letter-spacing 0.12em, #888 — NO separator line, 20pt gap above instead
- Company: 11pt medium (500); Job title: 10.5pt regular; Dates: 10pt #888
- Body: 10.5pt, line-height 1.35 (generous)
- Margins: 1" all sides
- Bullets use en dash (–) instead of disc, NO indent (0 indent)
- Accent color: #333333 (near-black, very subtle)
- Skills: inline comma-separated, no category labels, single line or wrapped
- Maximum whitespace, no horizontal rules or decorative elements

### Executive Template (NEW)
- Font: Garamond, fallback: 'Georgia', 'Times New Roman', serif
- Name: 24pt, bold, left-aligned
- Optional subtitle below name: 14pt, regular, #555 — for current title (e.g. "Senior Software Engineer")
- Contact: 10pt, RIGHT-aligned, stacked vertically (email, phone, LinkedIn on separate lines)
- Header is 2-column: name+subtitle LEFT, contact RIGHT, thin rule below
- Section headings: 12pt, bold, small-caps
- Section heading separator: 0.5pt solid #999, full width
- Company: 11pt bold; Job title: 11pt italic; Dates: 11pt right-aligned
- Body: 10.5pt, line-height 1.25
- Margins: 0.8" all sides
- Accent color: #1a1a1a (near-black)
- Skills: grouped by category (no Core Competencies box)
- Professional summary ON by default (other templates default to off)
- Designed for 2-page resumes — proper page break logic after work experience

### Summary Toggle (TMPL-04)
- User can toggle professional summary on/off per variant
- Executive template defaults summary to ON; all other templates default to OFF
- When off, summary section is completely omitted (no empty space)
- Implementation: new excludable item type or per-variant setting in templateOptions

### Skills Display Modes (TMPL-05)
- Two modes: `grouped` (bold category + colon + comma list) and `inline` (all skills comma-separated)
- Each template has a default mode per spec:
  - Classic: grouped
  - Modern: inline with category grouping and accent-colored labels
  - Jake: grouped (compact)
  - Minimal: inline, no category labels
  - Executive: grouped
- User can override per variant (Phase 15 adds the UI toggle — Phase 14 wires the prop)

### DOCX Export (EXPRT-02, EXPRT-03)
- Section headings use HeadingLevel.HEADING_1 (not just bold TextRun) for ATS parsing
- Per-template font mapping (from STACK.md, confirmed by spec):
  - Classic: Georgia / Times New Roman in DOCX
  - Modern: Calibri in DOCX
  - Jake: Calibri in DOCX
  - Minimal: Calibri in DOCX
  - Executive: Garamond in DOCX
- Bullets use Word's native list formatting (not unicode bullets)
- DOCX builder receives fontName parameter from variant's template selection

### Work Experience Entry Format
- Standard for Classic/Modern/Minimal/Executive: Company bold on line 1 with dates right, title italic on line 2
- Jake format is different: **Company** — *Title* on ONE line, dates right-aligned
- All use disc bullets except Minimal (en dash –)

### Section Order
- Fixed order for v2.1: Name, Summary, Work Experience, Skills, Education, Certifications/Awards, Projects
- Section reordering deferred to v2.2 (TMPL-ENH-01)

### CSS Approach
- React inline styles (project constraint — external CSS breaks in prod file:// context)
- Spec's CSS class approach adapted to inline style objects
- Each template is self-contained React component following ClassicTemplate pattern

### Claude's Discretion
- Exact implementation of summary toggle mechanism (excludable item type vs templateOptions field)
- How to pass skillsDisplay mode to templates before Phase 15 UI exists (prop default per template)
- DOCX builder refactoring approach to accept fontName parameter
- Whether to bundle Georgia woff2 or rely on system font (Georgia is widely available)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ClassicTemplate.tsx`: Pattern for all new templates — inline styles, filterResumeData, accentColor prop
- `resolveTemplate.ts`: Registry — add 4 new entries (modern, jake, minimal, executive)
- `filterResumeData.ts`: Shared excluded-item filtering — used by all templates
- `types.ts`: ResumeTemplateProps interface — already has accentColor, compact, skillsDisplay props
- `export.ts`: DOCX builder — needs per-template font parameter and HeadingLevel upgrade
- `PagedContent` in PrintApp.tsx: Multi-page rendering for preview — works for all templates

### Established Patterns
- Inline styles with React.CSSProperties objects
- `pageBreakInside: 'avoid'` on job/project/education entries
- postMessage data bridge between VariantPreview and PrintApp (iframe)
- print:ready IPC signal for PDF export timing

### Integration Points
- `resolveTemplate.ts`: Add 4 new template imports + TEMPLATE_MAP entries
- `themeRegistry.ts`: Add 4 new entries to THEMES array
- `export.ts` DOCX handler: Pass fontName based on layoutTemplate, upgrade to HeadingLevel
- `print.html`: Georgia may need @font-face if not relying on system font (Inter, Lato, EB Garamond already bundled)

</code_context>

<specifics>
## Specific Ideas

- User provided a complete template spec with exact typography, spacing, margins, and visual characteristics for all 5 templates
- Jake template reference: most-forked resume on GitHub (MIT license), Overleaf version
- Minimal template inspiration: jsonresume-theme-actual, Stripe-style minimalism
- Executive has unique 2-column header (name left, contact right) — body stays single-column
- Executive defaults summary ON; all others default OFF
- Minimal uses en dash (–) bullets with 0 indent — unique among templates
- Modern has short accent-colored underline (40px wide, not full width) — unique among templates

</specifics>

<deferred>
## Deferred Ideas

- Section reordering (drag sections 2-7 in variant builder) — v2.2, TMPL-ENH-01
- Skills pills/chips display mode — v2.2, TMPL-ENH-02
- Template thumbnail grid picker — v2.2 (text dropdown acceptable for v2.1)
- Core Competencies box for Executive — deferred in favor of standard grouped skills

</deferred>

---

*Phase: 14-templates-complete*
*Context gathered: 2026-03-25*
