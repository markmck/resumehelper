# Phase 14: Templates Complete - Research

**Researched:** 2026-03-25
**Domain:** React template components (inline styles), DOCX font selection, summary toggle, skills display modes — building on the Phase 13 pipeline foundation
**Confidence:** HIGH (direct codebase inspection; all patterns proven in Phase 13)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Classic Template Update**
- Change font from Times New Roman to Georgia (serif), fallback: 'Times New Roman', serif — per user spec
- All other Classic styles remain as built in Phase 13 (uppercase headings, accentColor prop, etc.)
- Accent color: #000000 (pure black and white, no color)

**Modern Template (NEW)**
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

**Jake Template (NEW)**
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

**Minimal Template (NEW)**
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

**Executive Template (NEW)**
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

**Summary Toggle (TMPL-04)**
- User can toggle professional summary on/off per variant
- Executive template defaults summary to ON; all other templates default to OFF
- When off, summary section is completely omitted (no empty space)
- Implementation: new excludable item type or per-variant setting in templateOptions

**Skills Display Modes (TMPL-05)**
- Two modes: `grouped` (bold category + colon + comma list) and `inline` (all skills comma-separated)
- Each template has a default mode per spec (Classic: grouped, Modern: inline with category, Jake: grouped compact, Minimal: inline no labels, Executive: grouped)
- User can override per variant (Phase 15 adds the UI toggle — Phase 14 wires the prop)

**DOCX Export (EXPRT-02, EXPRT-03)**
- Section headings use HeadingLevel.HEADING_1 for ATS parsing
- Per-template font mapping: Classic: Georgia/Times New Roman, Modern: Calibri, Jake: Calibri, Minimal: Calibri, Executive: Garamond
- Bullets use Word's native list formatting (not unicode bullets) — already done
- DOCX builder receives fontName parameter from variant's template selection

**Work Experience Entry Format**
- Standard for Classic/Modern/Minimal/Executive: Company bold on line 1 with dates right, title italic on line 2
- Jake format: **Company** — *Title* on ONE line, dates right-aligned
- All use disc bullets except Minimal (en dash –)

**Section Order**
- Fixed order: Name, Summary, Work Experience, Skills, Education, Certifications/Awards, Projects
- Section reordering deferred to v2.2

**CSS Approach**
- React inline styles (project constraint — external CSS breaks in prod file:// context)
- Each template is self-contained React component following ClassicTemplate pattern

### Claude's Discretion
- Exact implementation of summary toggle mechanism (excludable item type vs templateOptions field)
- How to pass skillsDisplay mode to templates before Phase 15 UI exists (prop default per template)
- DOCX builder refactoring approach to accept fontName parameter
- Whether to bundle Georgia woff2 or rely on system font (Georgia is widely available)

### Deferred Ideas (OUT OF SCOPE)
- Section reordering (drag sections 2-7 in variant builder) — v2.2, TMPL-ENH-01
- Skills pills/chips display mode — v2.2, TMPL-ENH-02
- Template thumbnail grid picker — v2.2 (text dropdown acceptable for v2.1)
- Core Competencies box for Executive — deferred in favor of standard grouped skills
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TMPL-01 | App includes 5 resume templates: Classic, Modern, Jake, Minimal, Executive — each with distinct typography, spacing, and visual style | 4 new template components following ClassicTemplate pattern; resolveTemplate.ts gets 4 new entries |
| TMPL-04 | Templates support professional summary section (optional, user-toggleable) | showSummary prop on ResumeTemplateProps; default differs per template; DB column via ALTER TABLE try/catch |
| TMPL-05 | Skills section supports two display modes per template: inline comma-separated and grouped by category | skillsDisplay prop already on ResumeTemplateProps; filterResumeData.skillGroups handles grouped; inline is a flat join |
| EXPRT-01 | PDF export matches the preview exactly for all 5 templates — no layout differences | Structurally guaranteed by unified print.html path from Phase 13; no new code needed for this invariant |
| EXPRT-02 | DOCX export produces clean ATS-parseable documents with proper Word heading styles (HeadingLevel.HEADING_1) | HeadingLevel confirmed available in docx@9.6.1 dist; replace TextRun bold section headings with heading paragraphs |
| EXPRT-03 | DOCX export uses correct font per template (serif for Classic/Executive, sans-serif for Modern/Jake/Minimal) | fontName param passed into DOCX builder; variant's layoutTemplate drives font lookup |
</phase_requirements>

---

## Summary

Phase 14 is a template-building phase, not a pipeline phase. The Phase 13 pipeline (PrintApp, VariantPreview, resolveTemplate, filterResumeData) is fully in place and working. This phase adds 4 new template React components and upgrades the DOCX builder. All 4 new templates follow the identical pattern proven by ClassicTemplate — they are self-contained React components, receive `ResumeTemplateProps`, call `filterResumeData()`, use inline styles only, and get registered in `resolveTemplate.ts`.

The two non-template concerns are: (1) the summary toggle, which requires a new DB column and prop on `ResumeTemplateProps` — the toggle mechanism is Claude's discretion but a `showSummary` boolean prop passed from PrintApp is the simplest approach; and (2) the DOCX upgrade, which requires two targeted changes to `export.ts`: replace hard-coded `'Calibri'` with a per-template `fontName` lookup, and replace bold TextRun section headings with `HeadingLevel.HEADING_1` paragraphs.

**Primary recommendation:** Build templates in this order: Modern (simplest new template), Jake (unique entry format), Minimal (en dash bullets, no separators), Executive (2-column header). Complete Classic font update first as it's 2-line change. DOCX changes are independent and can be a separate plan.

---

## Standard Stack

### Core (no new npm packages for Phase 14)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.x | Template components (JSX + inline styles) | Already in use |
| TypeScript | Latest | ResumeTemplateProps type, template prop contracts | Already in use |
| docx | 9.6.1 | DOCX builder — HeadingLevel upgrade + font param | Already in use; HeadingLevel confirmed in dist/index.d.ts |
| Electron | 39 | printToPDF; no changes needed for Phase 14 | Already in use |

### No New Dependencies

Phase 14 requires zero new npm packages. Georgia is a Windows/macOS system font — no woff2 file needed. EB Garamond (for Executive template HTML rendering) and Lato/Inter are already bundled in `src/renderer/public/fonts/`.

### Font Status by Template

| Template | HTML/PDF Font | Status | DOCX Font |
|----------|--------------|--------|-----------|
| Classic (update) | Georgia, 'Times New Roman', serif | System font — already on all platforms | Georgia (Word has it natively) |
| Modern | Calibri, 'Helvetica Neue', Arial, sans-serif | System font — already on all platforms | Calibri |
| Jake | Lato, 'Helvetica', Arial, sans-serif | **Already bundled** as lato-*.woff2 | Calibri |
| Minimal | Inter, -apple-system, 'Segoe UI', sans-serif | **Already bundled** as inter-*.woff2 | Calibri |
| Executive | EB Garamond, Georgia, serif | **Already bundled** as eb-garamond-*.woff2 | Garamond |

Note: The Classic template currently uses `'Times New Roman', 'Times', serif` — change it to `'Georgia', 'Times New Roman', serif`. This is a 1-line change in ClassicTemplate.tsx.

---

## Architecture Patterns

### Recommended Project Structure

```
src/renderer/src/components/templates/
├── types.ts                  # EXISTS — ResumeTemplateProps (add showSummary prop)
├── resolveTemplate.ts        # EXISTS — add 4 new imports + TEMPLATE_MAP entries
├── filterResumeData.ts       # EXISTS — no changes needed
├── ClassicTemplate.tsx       # EXISTS — update font to Georgia, update accent default
├── ModernTemplate.tsx        # NEW
├── JakeTemplate.tsx          # NEW
├── MinimalTemplate.tsx       # NEW
└── ExecutiveTemplate.tsx     # NEW

src/main/handlers/
└── export.ts                 # MODIFY — fontName param + HeadingLevel headings + summary paragraph
```

### Pattern 1: New Template Component Structure

Copy ClassicTemplate.tsx as the starting skeleton for each new template. The pattern is identical — only the style values and layout structure differ.

```typescript
// src/renderer/src/components/templates/ModernTemplate.tsx (example)
import { ResumeTemplateProps } from './types'
import { filterResumeData } from './filterResumeData'

export default function ModernTemplate({
  profile,
  accentColor = '#2563EB',
  skillsDisplay = 'inline',
  showSummary = false,
  ...props
}: ResumeTemplateProps): React.JSX.Element {
  const {
    includedJobs,
    includedSkills,
    includedProjects,
    includedEducation,
    skillGroups,
    // ... rest
  } = filterResumeData({ profile, accentColor, skillsDisplay, showSummary, ...props })

  // All styles as React.CSSProperties objects
  const containerStyle: React.CSSProperties = {
    fontFamily: "Calibri, 'Helvetica Neue', Arial, sans-serif",
    fontSize: '10.5px',
    lineHeight: 1.25,
    padding: '0.75in',
    maxWidth: '8.5in',
    margin: '0 auto',
    backgroundColor: '#fff',
    color: '#1a1a1a',
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: '18px',
    marginBottom: '8px',
    // NOTE: Modern's 40px accent underline is done via a separate <div>, not borderBottom
  }

  // ... render JSX
}
```

### Pattern 2: Modern's 40px Accent Underline

Modern's section heading separator is a 40px-wide colored bar, not a full-width rule. Use a sibling `<div>` after the heading text:

```typescript
// Modern section heading with partial underline
<div style={{ marginTop: '18px', marginBottom: '8px' }}>
  <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
    WORK EXPERIENCE
  </div>
  <div style={{ width: '40px', height: '2px', backgroundColor: accentColor, marginTop: '3px' }} />
</div>
```

### Pattern 3: Jake's Single-Line Entry Format

Jake's entry format differs from all other templates: Company + em dash + Title on one line, dates right-aligned. Use flexbox with justifyContent: 'space-between':

```typescript
// Jake entry header: **Company Name** — *Job Title* (dates right)
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
  <span style={{ fontSize: '10px', lineHeight: 1.15 }}>
    <strong>{job.company}</strong>
    {' \u2014 '}
    <em>{job.role}</em>
  </span>
  <span style={{ fontSize: '10px', color: '#666', whiteSpace: 'nowrap', marginLeft: '8px' }}>
    {job.startDate} — {job.endDate ?? 'Present'}
  </span>
</div>
```

### Pattern 4: Minimal's En Dash Bullets

Minimal uses en dash (–) with zero indent instead of HTML list bullets. Implement as a `<div>` with manual prefix, not a `<ul>`:

```typescript
// Minimal bullet — NOT a <ul> list
<div style={{ display: 'flex', gap: '6px', marginBottom: '1px' }}>
  <span style={{ flexShrink: 0 }}>\u2013</span>
  <span style={{ fontSize: '10.5px', lineHeight: 1.35 }}>{b.text}</span>
</div>
```

This avoids `paddingLeft` and `list-style` CSS — simpler and renders the same in print.

### Pattern 5: Executive's 2-Column Header

Executive has a unique 2-column header (name+subtitle left, contact right). The body is still single-column. Use a flexbox row for the header only:

```typescript
// Executive header — 2 column via flexbox
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  borderBottom: '0.5pt solid #999',
  paddingBottom: '10px',
  marginBottom: '14px',
}}>
  {/* Left: name + subtitle */}
  <div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>
      {profile?.name || 'Your Name'}
    </div>
    {profile?.label && (
      <div style={{ fontSize: '14px', color: '#555', marginTop: '2px' }}>
        {profile.label}
      </div>
    )}
  </div>
  {/* Right: contact stacked vertically */}
  <div style={{ textAlign: 'right', fontSize: '10px', color: '#555' }}>
    {profile?.email && <div>{profile.email}</div>}
    {profile?.phone && <div>{profile.phone}</div>}
    {profile?.linkedin && <div>{profile.linkedin}</div>}
  </div>
</div>
```

Note: The Executive "subtitle" field maps to `profile.label` — check whether this field exists in the `Profile` interface. If not, it can be derived from `profile.summary` first line or left as a static placeholder for now. Since the spec says "current title (e.g. Senior Software Engineer)", `profile.label` is the correct JSON Resume field for current title.

### Pattern 6: Summary Toggle

The `showSummary` prop controls whether the professional summary section renders. Each template defaults this differently. The prop flows from PrintApp.tsx to the template.

For Phase 14, `showSummary` is a prop with a per-template default. Phase 15 wires it to a DB column with UI control. For now, PrintApp passes `showSummary` from data if available, otherwise falls back to the template's prop default.

```typescript
// In types.ts — add to ResumeTemplateProps
showSummary?: boolean  // default: false for all templates except Executive (true)

// In each template component
export default function ClassicTemplate({
  showSummary = false,  // Classic default
  ...
}: ResumeTemplateProps) {
  // ...
  {showSummary && profile?.summary && (
    <div style={{ /* summary paragraph styles */ }}>
      {profile.summary}
    </div>
  )}
}

// In ExecutiveTemplate
export default function ExecutiveTemplate({
  showSummary = true,  // Executive default is ON
  ...
}: ResumeTemplateProps) { ... }
```

PrintApp currently hard-codes `accentColor="#cccccc"` because Phase 15 reads from DB. The same pattern applies to `showSummary` — pass a hardcoded value from PrintApp for Phase 14, wire from DB in Phase 15.

### Pattern 7: Skills Display Modes

`skillsDisplay` prop is already on `ResumeTemplateProps`. `filterResumeData` already returns both `includedSkills` (flat) and `skillGroups` (Record<string, BuilderSkill[]>). Each template uses one or both depending on its default mode.

```typescript
// Grouped mode (Classic, Jake, Executive default)
{Object.entries(skillGroups).map(([group, groupSkills]) => (
  <div key={group} style={{ fontSize: '11px', marginBottom: '4px' }}>
    <strong>{group}: </strong>
    <span>{groupSkills.map((s) => s.name).join(', ')}</span>
  </div>
))}

// Inline mode — all skills as one comma-separated line (Minimal default)
<div style={{ fontSize: '10.5px' }}>
  {includedSkills.map((s) => s.name).join(', ')}
</div>

// Modern mode — inline per category, category label in accent color
{Object.entries(skillGroups).map(([group, groupSkills]) => (
  <div key={group} style={{ fontSize: '10.5px', marginBottom: '3px' }}>
    <span style={{ fontWeight: 600, color: accentColor }}>{group}: </span>
    <span>{groupSkills.map((s) => s.name).join(', ')}</span>
  </div>
))}
```

### Pattern 8: DOCX Builder — fontName + HeadingLevel

The DOCX export in `export.ts` currently hard-codes `font: 'Calibri'` in every TextRun. The change: (1) derive `fontName` from `layoutTemplate`, (2) pass it through, (3) replace section heading TextRun-bold with `HeadingLevel.HEADING_1`.

```typescript
// In export:docx handler, after reading variant
import { ..., HeadingLevel } from 'docx'

const DOCX_FONT_MAP: Record<string, string> = {
  classic:   'Georgia',
  modern:    'Calibri',
  jake:      'Calibri',
  minimal:   'Calibri',
  executive: 'Garamond',
}
const fontName = DOCX_FONT_MAP[layoutTemplate ?? 'classic'] ?? 'Calibri'

// Section heading paragraph — HeadingLevel replaces TextRun bold pattern
new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [
    new TextRun({ text: 'WORK EXPERIENCE', bold: true, size: 22, font: fontName }),
  ],
  spacing: { before: 240, after: 120 },
})
// Note: The border remains on the paragraph, it's not part of HeadingLevel styling
```

The border (`border: { bottom: ... }`) stays — HeadingLevel adds semantic structure for ATS, the border provides the visual separator. Both can coexist on the same Paragraph.

### Pattern 9: Register Templates in resolveTemplate.ts

```typescript
// resolveTemplate.ts — final state after Phase 14
import ClassicTemplate from './ClassicTemplate'
import ModernTemplate from './ModernTemplate'
import JakeTemplate from './JakeTemplate'
import MinimalTemplate from './MinimalTemplate'
import ExecutiveTemplate from './ExecutiveTemplate'
import type { ResumeTemplateProps } from './types'

const TEMPLATE_MAP: Record<string, React.ComponentType<ResumeTemplateProps>> = {
  classic:   ClassicTemplate,
  modern:    ModernTemplate,
  jake:      JakeTemplate,
  minimal:   MinimalTemplate,
  executive: ExecutiveTemplate,
}
```

Also update `themeRegistry.ts` THEMES array to include the 4 new template entries alongside existing ones (clean-up of old themes is Phase 16).

### Anti-Patterns to Avoid

- **Using a `<ul>` for Minimal bullets:** Minimal uses en dash with zero indent — a `<ul>` with `paddingLeft: 0` still adds browser-default list-style and list-item padding. Use a `<div>` with flexbox instead.
- **Adding `@page` rules in templates:** Confirmed conflict with printToPDF margins (Electron issue #8138). All margin control is via `padding` on the container `<div>`.
- **Using CSS class imports:** Templates render in print.html isolated context — only inline styles and the `<style>` tag inside print.html work reliably in prod file:// context.
- **Shared base template component:** Each template diverges structurally (Jake's single-line entry, Executive's 2-column header). Keep them independent; share only types and filterResumeData.
- **fontVariant: 'small-caps' on section headings in Executive:** CSS `font-variant: 'small-caps'` renders poorly in some Chromium print contexts. Use `text-transform: 'uppercase'` with a slightly reduced font-size for a visual equivalent, or rely on the Garamond/Georgia small-caps OpenType feature if it renders correctly in testing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skills grouping | Custom grouping logic in each template | `filterResumeData().skillGroups` | Already implemented, tested, consistent |
| Excluded bullet filtering | Per-template filter logic | `filterResumeData()` | Already handles jobs, projects, all entity types |
| Font selection mapping | Conditional branches in DOCX handler | `DOCX_FONT_MAP` lookup object | Single lookup table vs repeated if/else |
| Right-aligned dates in DOCX | Manual spacing/padding | `tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]` | Already in use for Classic — copy the pattern |
| DOCX bullet formatting | Unicode prefix on TextRun | `bullet: { level: 0 }` on Paragraph | Already in use — produces correct Word list formatting |

---

## Common Pitfalls

### Pitfall 1: `profile.label` May Not Exist in DB Schema

**What goes wrong:** Executive template spec calls for a "subtitle" showing the current job title. The JSON Resume spec uses `profile.label` for this. But the project's Profile type (verified in preload/index.d.ts line 174-181) may or may not include `label`.

**How to avoid:** Before writing ExecutiveTemplate, grep `profile` schema and Profile interface for `label`. If it doesn't exist, the subtitle is omitted for Phase 14 (not a blocker — the summary field covers the intent). Do not add a new DB column for this in Phase 14.

**Warning signs:** TypeScript compiler error when accessing `profile?.label` in ExecutiveTemplate.

### Pitfall 2: Classic Font Update Breaks Accent Color Default

**What goes wrong:** ClassicTemplate.tsx currently defaults `accentColor = '#cccccc'`. The CONTEXT.md says Classic's accent should be `#000000` (pure black). Updating only the font but missing the accent color default creates an inconsistency.

**How to avoid:** The Classic update has two changes: `fontFamily: "'Georgia', 'Times New Roman', serif"` AND `accentColor = '#000000'` default.

### Pitfall 3: DOCX `layoutTemplate` Not Read from DB in Handler

**What goes wrong:** The `export:docx` handler (unlike the `export:pdf` handler) does not currently read `variant.layoutTemplate` from the DB — it just builds the document with hard-coded Calibri. Adding `fontName` requires first reading the variant row.

**How to avoid:** At the top of the `export:docx` handler, after getting `variantId`, add:
```typescript
const variant = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
const layoutTemplate = variant?.layoutTemplate ?? 'classic'
const fontName = DOCX_FONT_MAP[layoutTemplate] ?? 'Calibri'
```
This pattern is already done in the `export:pdf` handler — copy it.

### Pitfall 4: HeadingLevel Paragraph + Border Conflict

**What goes wrong:** `HeadingLevel.HEADING_1` applies Word's built-in heading style, which may include its own spacing, color, or border that conflicts with the manually set `border.bottom`.

**How to avoid:** Test the DOCX output in Word/LibreOffice. If HeadingLevel styling conflicts, fall back to just using `bold: true` TextRun for the section heading text (ATS parsers read the text regardless of heading paragraph style). The EXPRT-02 requirement says "proper Word heading styles" — if HeadingLevel causes visual regressions, document the tradeoff and keep the existing bold TextRun approach.

### Pitfall 5: Jake Line Density Causing Page Overflow

**What goes wrong:** Jake is designed for maximum density (line-height 1.15, tight margins). In practice, long company names or many jobs can overflow the page and force an ugly page 2 with just 1-2 entries.

**How to avoid:** Apply `pageBreakInside: 'avoid'` on each job entry container just like Classic does. This ensures jobs don't split mid-entry even in the dense layout.

### Pitfall 6: Minimal Skills Section With `skillsDisplay = 'grouped'` Override

**What goes wrong:** Minimal defaults to `inline` skills (no category labels). But `skillsDisplay` is a prop that can be overridden. If `skillsDisplay = 'grouped'` is passed to Minimal, it should render grouped mode even though the template's design prefers inline.

**How to avoid:** All templates should respect the `skillsDisplay` prop value — the template's parameter default is just the fallback. The rendering logic is:
```typescript
{skillsDisplay === 'grouped'
  ? /* grouped rendering */
  : /* inline rendering */}
```

### Pitfall 7: `showSummary` Not Wired in PrintApp

**What goes wrong:** Phase 14 adds `showSummary` prop to templates, but PrintApp currently passes a hardcoded `accentColor="#cccccc"` and no `showSummary`. If `showSummary` is not passed from PrintApp, the template default kicks in (false for most, true for Executive) — which is actually correct behavior for Phase 14. But it needs to be explicit.

**How to avoid:** For Phase 14, PrintApp passes no `showSummary` prop — the template default is the intended behavior. When Phase 15 adds the DB column and UI toggle, PrintApp will read `showSummary` from the variant data and pass it explicitly.

---

## Code Examples

### Template Header Font Declarations (inline styles)

```typescript
// Classic (updated)
fontFamily: "'Georgia', 'Times New Roman', serif"

// Modern — Calibri is a system font; EB Garamond NOT used for Modern
fontFamily: "Calibri, 'Helvetica Neue', Arial, sans-serif"

// Jake — uses bundled Lato woff2
fontFamily: "'Lato', 'Helvetica', Arial, sans-serif"

// Minimal — uses bundled Inter woff2
fontFamily: "Inter, -apple-system, 'Segoe UI', sans-serif"

// Executive — uses bundled EB Garamond woff2
fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif"
```

### DOCX HeadingLevel Section Paragraph

```typescript
// Source: docx 9.6.1, dist/index.d.ts — HeadingLevel confirmed available
import { ..., HeadingLevel } from 'docx'

new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [
    new TextRun({ text: 'WORK EXPERIENCE', bold: true, size: 22, font: fontName }),
  ],
  border: {
    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
  },
  spacing: { before: 240, after: 120 },
})
```

### Summary Section (all templates)

```typescript
// In template component — conditional on showSummary prop + profile.summary content
{showSummary && profile?.summary && (
  <div style={{
    fontSize: '10.5px',
    lineHeight: 1.35,
    color: '#1a1a1a',
    marginTop: '10px',
    marginBottom: '4px',
  }}>
    {profile.summary}
  </div>
)}
```

### resolveTemplate.ts After Phase 14

```typescript
// Source: direct codebase inspection of current resolveTemplate.ts
const TEMPLATE_MAP: Record<string, React.ComponentType<ResumeTemplateProps>> = {
  classic:   ClassicTemplate,
  modern:    ModernTemplate,
  jake:      JakeTemplate,
  minimal:   MinimalTemplate,
  executive: ExecutiveTemplate,
}
// Fallback to ClassicTemplate for unknown keys — unchanged
```

### themeRegistry.ts THEMES Addition

```typescript
// Add 4 new entries — do NOT remove even/class/elegant until Phase 16
export const THEMES: ThemeEntry[] = [
  { key: 'professional', displayName: 'Professional (built-in)' },
  { key: 'classic',   displayName: 'Classic' },
  { key: 'modern',    displayName: 'Modern' },
  { key: 'jake',      displayName: 'Jake' },
  { key: 'minimal',   displayName: 'Minimal' },
  { key: 'executive', displayName: 'Executive' },
  { key: 'even',      displayName: 'Even' },
  { key: 'class',     displayName: 'Class' },
  { key: 'elegant',   displayName: 'Elegant' },
]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isProfessional` branch in export.ts | Unified print.html path for all templates | Phase 13 | PDF fidelity guaranteed for all 5 templates |
| Hard-coded Calibri in DOCX | Per-template fontName lookup | Phase 14 | Serif DOCX for Classic/Executive; sans-serif for others |
| Section headings as bold TextRun | HeadingLevel.HEADING_1 Paragraph | Phase 14 | ATS parsers recognize Word heading semantics |
| No summary support in templates | showSummary prop with per-template default | Phase 14 | Executive defaults ON; others default OFF |
| Single skillsDisplay mode per template | Configurable via prop (UI in Phase 15) | Phase 14 | Both grouped and inline work in all templates |

**What exists from Phase 13 (no rebuild needed):**
- `filterResumeData.ts`: handles all entity types including skillGroups — no changes needed
- `types.ts`: `ResumeTemplateProps` with `skillsDisplay?: 'grouped' | 'inline'` — add `showSummary?: boolean` only
- `resolveTemplate.ts`: add 4 imports + 4 TEMPLATE_MAP entries
- `PrintApp.tsx`: no changes needed; already reads `template` param and calls `resolveTemplate()`
- Font woff2 files: already in `src/renderer/public/fonts/` — Lato, Inter, EB Garamond all present
- `print.html`: already has `@font-face` for Lato, Inter, EB Garamond — no changes needed

---

## Open Questions

1. **Does `profile.label` exist in the Profile interface?**
   - What we know: `Profile` is defined in `preload/index.d.ts` line 174. `summary` is confirmed at line 181.
   - What's unclear: Whether `label` (for Executive subtitle) is in the schema. Grep needed before writing ExecutiveTemplate.
   - Recommendation: Check `profile.label` existence before the ExecutiveTemplate plan. If absent, omit the subtitle for Phase 14.

2. **Should `showSummary` use a DB column or templateOptions JSON blob?**
   - What we know: No `showSummary` or `templateOptions` column exists yet in `templateVariants`. Pattern from STATE.md is `ALTER TABLE ADD COLUMN` in try/catch at startup.
   - What's unclear: Phase 15 adds DB controls — should Phase 14 pre-create the column to ease Phase 15? Or is it safer to leave DB changes to Phase 15 entirely?
   - Recommendation: Phase 14 adds the prop with template defaults only; no DB column. Phase 15 adds `show_summary integer NOT NULL DEFAULT 0` via ALTER TABLE. This keeps Phase 14 scope clean.

3. **Classic font update: is Georgia actually rendered in the preview?**
   - What we know: Georgia is a system font, not bundled as woff2. It's available on Windows and macOS.
   - What's unclear: Whether the Chromium renderer in Electron picks up Georgia from the system font directory reliably.
   - Recommendation: Georgia is widely available on all Windows machines (it's been a core Windows font since Office 97). No woff2 needed. The `@font-face` fallback chain `'Georgia', 'Times New Roman', serif` handles edge cases. Mark as LOW risk — no action needed unless visual testing shows fallback rendering.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, vitest.config, or test directory found) |
| Config file | none — no test infrastructure exists |
| Quick run command | N/A — manual smoke testing |
| Full suite command | N/A — manual smoke testing |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMPL-01 | 5 templates render without crash | smoke | manual — open each template in preview | N/A |
| TMPL-01 | Each template has visually distinct typography | visual | manual — compare preview screenshots | N/A |
| TMPL-04 | Summary shows when showSummary=true, hidden when false | smoke | manual — toggle in Classic/Executive | N/A |
| TMPL-05 | Skills render grouped and inline in each template | smoke | manual — check both modes in preview | N/A |
| EXPRT-01 | PDF matches preview for each template | visual | manual — export PDF, compare to preview | N/A |
| EXPRT-02 | DOCX section headings are Heading 1 style in Word | manual | open DOCX in Word, check Navigation pane | N/A |
| EXPRT-03 | DOCX font matches template font family | manual | open DOCX in Word, check font name | N/A |

### Sampling Rate

- Per task commit: Open template in Electron preview — confirm renders without blank screen
- Per wave merge: Export PDF + DOCX for each completed template, verify fonts and layout
- Phase gate: All 5 templates visible and distinct in preview, PDF export clean for all 5, DOCX exports using correct fonts for at least Classic (Georgia) and Executive (Garamond)

### Wave 0 Gaps

None — no test infrastructure is planned for this project. All validation is manual smoke testing. This is consistent with the existing approach (Phase 13 CONTEXT.md confirms "written smoke test checklist output as part of Phase 13").

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `src/renderer/src/components/templates/` (all 4 existing files), `src/renderer/src/PrintApp.tsx`, `src/main/handlers/export.ts`, `src/main/lib/themeRegistry.ts`, `src/renderer/print.html`, `src/renderer/public/fonts/` (7 woff2 files confirmed present)
- `src/main/db/schema.ts` — `templateVariants` table has no `showSummary` or template option columns yet
- `src/preload/index.d.ts` — `Profile.summary` confirmed at line 181; `profile.label` needs verification
- `node_modules/docx/dist/index.d.ts` — `HeadingLevel` export confirmed

### Secondary (MEDIUM confidence)

- `.planning/research/ARCHITECTURE.md` — unified print.html path design, anti-patterns, build order
- `.planning/research/STACK.md` — DOCX font mapping, font bundling strategy, CSS page break patterns
- `.planning/phases/13-pipeline-foundation/13-RESEARCH.md` — Phase 13 proven patterns, font file list

### Tertiary (LOW confidence)

- Font compatibility claims (Georgia on all Windows/macOS platforms) — based on knowledge of OS-bundled font history; not directly verified from a 2026 source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct file inspection; zero new packages needed
- Architecture: HIGH — all patterns directly derived from Phase 13 working code
- DOCX changes: HIGH — HeadingLevel confirmed in docx dist; fontName pattern is mechanical substitution
- Pitfalls: MEDIUM — most from direct codebase reading; font availability is LOW (system font assumption)
- Template specs: HIGH — locked in CONTEXT.md by user; no discretion needed

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable tech; no fast-moving dependencies)
