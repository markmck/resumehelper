# Feature Research

**Domain:** Resume builder — per-variant text overrides and excluded-bullet surfacing
**Researched:** 2026-06-05
**Confidence:** HIGH (grounded in actual component source + established UX patterns from structured-content editors)

---

## Scope Boundary

This file covers only the NEW v2.6 features. Everything already shipped (variant builder
checkbox include/exclude, analysis bullet rewrites, OptimizeVariant suggestion cards,
three-layer merge, per-click accept/dismiss) is treated as stable infrastructure.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features without which v2.6 feels incomplete or broken on launch.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Inline reword affordance on bullet text at variant tier | User's mental model is "click bullet to rephrase for this variant" — a separate screen breaks flow; the existing `InlineEdit` component already provides this pattern (used for variant name editing) | MEDIUM | Reuse `InlineEdit` (multiline=true) inline with each bullet row in VariantBuilder; on save write an override row; live preview must refresh via existing `onToggle` callback |
| Visual distinction: base vs variant-overridden text | Without a clear signal (icon, color, underline) users will not know an override is active and will not trust the output | LOW | A small badge/dot next to the bullet text (accent color) or italic override text suffices; line-through on original is already used for excluded items — do not reuse that convention |
| Reset to base affordance on overridden fields | Every override tool (Google Docs version history, Notion block menus, VS Code editor settings) provides a clear "reset to original" escape hatch | LOW | A "Reset" link or X icon adjacent to the overridden field; only render when `overrideText != null`; mirrors the existing "Reset to template defaults" link in the Layout section |
| Inline reword affordance on summary at variant tier | Summary is the only field with an existing toggle-only affordance. Users who write a variant for data-engineering roles want a different summary headline without changing base | MEDIUM | Gated on `showSummary === true` AND `profileSummary !== ''` (same existing gate); clicking the preview text opens an InlineEdit textarea. Reset restores `profileSummary` from profile. |
| Inline reword for project title and project description at variant tier | Projects section exists in VariantBuilder with bullet checkboxes but no text-edit affordance; titles and descriptions are prime candidates for reword (e.g. "Led API migration" → "Led microservices decomposition") | MEDIUM | Same inline-edit pattern; project title maps to `projects.name`, description is a new `description` field if one is added, or a separate first-bullet convention — needs schema decision |
| Inline reword for job title/company line at variant tier | "Principal Engineer at Contoso" can be reworded as "Staff Engineer" for target companies if accurate; this is the second most requested reword after bullets | MEDIUM | Maps to `jobs.role` (not `jobs.company` — company is factual; role is fair game for rewording). Override stored per-variant, field='role' |
| Unified overrides table with precedence analysis → variant → base | Without a single table, existing `analysisBulletOverrides` and new variant-tier overrides diverge — the existing `applyOverrides()` function and `buildMergedBuilderData()` would need two separate lookup paths forever | HIGH | The polymorphic schema from memory (variant_id NULL?, analysis_id NULL?, entity_type, entity_id, field, override_text) cleanly replaces `analysisBulletOverrides`; migration is an INSERT SELECT |
| Migration of existing `analysisBulletOverrides` into unified table | All existing accepted bullet rewrites must survive the migration — existing submissions snapshots are frozen so they are safe; only live analysis override lookups need to be re-pointed | MEDIUM | INSERT into `overrides` WHERE source from `analysisBulletOverrides`; old table can be dropped after verification; `applyOverrides()` in `src/shared/overrides.ts` adapts to read from unified table |

### Differentiators (Competitive Advantage)

Features that distinguish this tool beyond what basic resume builders offer.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Excluded-bullet suggestions during analysis (the "add back" card) | No other tool surfaces "you excluded this bullet from your variant but the JD is specifically asking for it" — this directly converts omissions into inclusions at the right scope | MEDIUM | Analysis prompt must receive the set of base bullets the variant EXCLUDES (not currently sent); LLM scores them against JD gaps; user accepts → re-include at analysis tier only (temporary inclusion, does not modify variant) |
| Staleness indicator when base text changes after an override | If a user edits the base bullet in ExperienceTab after establishing a variant override, the variant override is now semantically stale — showing a "Base changed" warning prevents silent divergence | MEDIUM | Compare `jobBullets.updatedAt` against `overrides.createdAt`; same on-demand detection pattern already used for analysis staleness (see `stale analysis detection` in v2.2 decisions) |
| "Override only — doesn't affect base" copy near reword controls | Users are anxious about accidentally destroying their master resume; clear labeling prevents hesitation and support requests | LOW | One line of helper text near the first override a user creates; can be dismissed/suppressed after first use |
| Accepted-rewrite count badge on VariantEditor builder pane header | The existing builder pane header already shows analysis score badge and "AI suggest" link; adding "3 overrides" badge would communicate variant richness at a glance | LOW | Count of non-null variant-tier override rows for the variant; tap to scroll to first overridden item |

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Variant-tier summary CREATE from scratch (empty base) | User wants per-variant summaries without maintaining a base summary | Breaks the "AI never fabricates" invariant and the "base = master" mental model; an empty base with a variant-only summary means the base export has no summary, which is unexpected | Gate summary override on non-empty base profile.summary (same gate the existing showSummary toggle already uses); user must set a base summary first |
| Propagate variant override back to base | Seems like a useful shortcut ("promote this reword to base") | Destroys the layering — every other variant and analysis that was using base text silently gets the promoted text; makes the three-layer model unpredictable | Provide copy-to-clipboard of override text; user manually updates base in ExperienceTab if they decide it is canonical |
| Batch "accept all" for variant overrides | Mirrors the existing "Accept all" in OptimizeVariant | Variant-tier overrides are intentional identity decisions (not AI suggestions to review quickly); bulk-accepting defeats the purpose of the per-field review; also, there is no "suggested" text at variant tier — user types it themselves, so "accept all" has no meaning | Offer "copy base text to edit" pre-population on first open |
| AI-suggested rewords at variant tier | "Why doesn't the AI suggest how to reword this bullet for data-engineering roles?" | Analysis tier already does this per-JD; variant-tier is the user's own curation layer, not AI-assisted — mixing them collapses the tier distinction and re-introduces fabrication risk at a persistent tier | Keep AI suggestions strictly at analysis tier; variant tier is manual |
| Free-form company name override per variant | Users may want "Google (contract)" → "Alphabet" | Company names are factual on a resume; rewording them is misrepresentation risk | Allow job role/title reword (fair game — titles vary); keep company as read-only in the override UI |

---

## Feature Dependencies

```
[Unified overrides table + migration]
    └──required by──> [Variant-tier bullet reword affordance]
    └──required by──> [Variant-tier summary reword affordance]
    └──required by──> [Variant-tier job title reword affordance]
    └──required by──> [Variant-tier project title/description reword affordance]
    └──required by──> [Staleness detection for overrides]
    └──required by──> [Excluded-bullet suggestion cards]

[Excluded-bullet suggestion cards]
    └──requires──> [Analysis prompt receives excluded-bullet set]
    └──requires──> [Unified overrides table] (to write analysis-tier re-inclusion)
    └──enhances──> [OptimizeVariant left pane] (new card type alongside rewrite cards)

[Visual distinction: base vs overridden]
    └──required by──> [Reset to base affordance] (need to know override is active to show reset)

[Reset to base affordance]
    └──enhances──> [Variant-tier reword (all fields)] (each rewordable field needs its own reset)
```

### Dependency Notes

- **Unified overrides table required first:** All five reword affordances write to it. Build the table + migration in Phase 1; UI affordances in Phase 2.
- **Analysis prompt change required for excluded-bullet suggestions:** The existing `buildResumeTextForLlm` in `analysisPrompts.ts` renders only the included bullets. To surface excluded-bullet suggestions, the LLM prompt must also receive excluded bullets (tagged distinctly). This is a prompt change, not just a UI change.
- **`applyOverrides()` in `src/shared/overrides.ts` will need updating:** Currently it takes `analysisBulletOverrides`-shaped rows. After unification it reads from the new table — the function signature and call sites in `mergeHelper.ts` need updating together.
- **`buildMergedBuilderData()` must apply variant-tier overrides before analysis-tier overrides:** Precedence is analysis → variant → base, so variant overrides are Layer 2.5 (after variant exclusions, before analysis overrides). The current Layer 2 only handles exclusion flags; a new override lookup pass is needed between Layer 2 and Layer 3.

---

## UX Recommendations (Answering the Four Specific Questions)

### (a) Inline-edit vs dedicated panel for variant-tier rewording

**Recommendation: Inline-edit within VariantBuilder, triggered by a "Reword" icon/link.**

Rationale grounded in the existing component structure:

- `InlineEdit.tsx` already handles click-to-edit → textarea → blur-to-save with Escape-to-cancel. It supports `multiline=true`. It is already used for variant name editing in `VariantEditor.tsx`.
- The VariantBuilder left pane is a scrollable checklist — the pattern is already "row per bullet, interact in place." A dedicated side panel would require a new split (making it 3-column) or replacing the live preview pane, both of which break the existing layout.
- Analysis-tier bullet rewrites already use an in-card textarea (the `isEditing` state in `OptimizeVariant`). Variant-tier rewording should follow the same inline pattern for consistency.
- Dedicated panels make sense when the override form is complex (multiple fields, structured inputs). Variant overrides are single-field freetext edits — inline is the right level of ceremony.

**Affordance design:**
- Each bullet row in VariantBuilder gets a small pencil icon or "Reword" micro-link that appears on hover (only visible when job is not excluded).
- Clicking it expands an `InlineEdit` textarea below the bullet text (not replacing it), pre-populated with the current effective text (override text if one exists, base text otherwise).
- Save on blur or Enter (multiline: Shift+Enter = newline, Enter = save). Escape cancels.
- The same pattern applies to summary, job title (role field), project title, and project description.

### (b) Visual distinction: base text vs variant-overridden text vs reset-to-base

Three states need distinct visual treatment, using tokens from the existing design system:

| State | Treatment | Rationale |
|-------|-----------|-----------|
| **Base (no override)** | Normal text — `var(--color-text-secondary)` as today | No change to existing look |
| **Variant-overridden** | Override text displayed with a small `var(--color-accent)` dot or left-border accent (`borderLeft: '2px solid var(--color-accent)'`) + italic style | Mirrors the accent left-border the suggestion card uses for its suggested text block in OptimizeVariant (line 841-846) — immediately recognizable |
| **Reset-to-base** | A small "Reset" text link (`var(--color-text-muted)`, underline) appears inline after the overridden text when override is active | Mirrors existing "Reset to template defaults" in the Layout section footer (line 529-536 of VariantBuilder) — consistent pattern within the same screen |

Do NOT use strikethrough for "base text replaced by override" — strikethrough already means "excluded" (line 56-59 of VariantBuilder). Reuse would create confusion.

Do NOT use a green accepted-state style for overrides — that color belongs to analysis-tier accepted suggestions (OptimizeVariant). Variant-tier overrides are permanent edits, not pending suggestions.

### (c) Excluded-bullet "add back" suggestion card: copy and behavior

**Card placement:** In the OptimizeVariant left pane, after the existing "Bullet Rewrites" section and before (or within) the "Missing skills for this job" section. A new section header "Bullets you excluded that match this job" separates them from rewrites.

**Why not mixed with rewrites:** Rewrites operate on *included* bullets; add-back cards operate on *excluded* bullets. They are different actions. Mixing them would be confusing when a bullet both has a rewrite suggestion and is also marked excluded.

**Card structure (mirroring existing skill suggestion card shape):**

```
┌─────────────────────────────────────────────────────────┐
│  [Company — Role] · Excluded from variant   [Moderate]  │
│                                                         │
│  "Architected event-driven pipeline reducing latency    │
│   by 40% using Kafka and Flink..."                      │
│                                                         │
│  Relevant because: JD requires stream processing        │
│  experience (Kafka listed as required).                 │
│                                                         │
│  [Include for this job]    [Skip]                       │
└─────────────────────────────────────────────────────────┘
```

**Copy rules:**
- Header label: `"Excluded from variant"` — factual, not alarming; distinguishes from orphaned-bullet danger badge.
- Body: Show the full base bullet text (not overridden — the variant excluded it so there is no override).
- Reason line: AI-generated rationale tied to the specific JD gap (same `reason` field structure as `StagedSkill.reason` in OptimizeVariant).
- Action — primary: `"Include for this job"` (not "Accept" or "Add" — matches the actual outcome: temporary re-inclusion at analysis tier only).
- Action — secondary: `"Skip"` (mirrors existing skill card "Skip" label).

**Behavior on accept:**
- Writes an analysis-tier inclusion flag (or clears the analysis-tier exclusion) — does NOT modify the variant's exclusion setting.
- The bullet appears in the merged output for this analysis only — same scoping as existing bullet rewrites.
- `previewRefreshKey` increments so the live preview pane reflects the re-inclusion immediately (same pattern as `accept()` in OptimizeVariant line 352).
- The card transitions to an "Included for this job" accepted state with green border (same visual as accepted rewrite cards).

**Behavior on skip:** Card fades to 50% opacity, skip state persisted, no preview change. Same as `dismissSkill()`.

**Prompt change required:** The analysis prompt (`buildResumeTextForLlm` + `buildScorerPrompt`) must receive excluded bullets in a clearly marked section so the LLM can evaluate relevance. Suggested format: a `## Excluded Bullets (not on this variant)` section in the resume text sent for scoring, with a scorer instruction to flag any that are relevant to gap skills.

### (d) Edge Cases

**Empty base field (summary gate):**
- The existing gate in VariantBuilder: summary section only renders if `profileSummary` is non-empty (line 253 in VariantBuilder). The override UI must respect the same gate.
- If the base summary is empty, the "Reword" affordance must not appear — you cannot override a field that does not exist.
- If a user deletes their base summary after establishing a variant override, the override becomes orphaned. At render time: `buildMergedBuilderData` should treat a null/empty base summary as "no summary" regardless of override — the override has nothing to override. Log a warning, do not crash.

**Reset/revert affordances:**
- Variant-tier overrides have no "pending → accepted" state machine — they are immediately applied on save. Reset is the only revert path.
- Reset deletes the override row (or sets it null). The field snaps back to base text instantly. The live preview refreshes.
- Reset for summary reword: clears override text; the profile.summary remains unchanged.
- Reset must NOT be confused with "exclude item" — they are separate controls. Reset is adjacent to the override text; the checkbox toggle remains at the left edge of the row.

**Staleness when base text changes after a variant override is established:**
- Scenario: User rewrites bullet A in VariantBuilder at variant tier ("Led cloud migration" → "Led Azure migration"). Two weeks later, user edits bullet A in ExperienceTab to fix a typo in the base text. The variant override is now semantically stale (it no longer reflects the corrected base).
- Detection: Compare `jobBullets.updatedAt` (already tracked, see schema line 23) against `overrides.updatedAt` (new table must track this). If `updatedAt(base) > createdAt(override)`, show a staleness indicator.
- Indicator: A small amber "Base updated" pill next to the overridden bullet in VariantBuilder — same amber color token (`var(--color-warning)`) used for stale-analysis warning banners.
- Action: User can dismiss the staleness warning (mark as acknowledged) or click "Review" to see the base text and decide whether to update their override. Do NOT auto-update the override (that would silently discard intentional rewording).
- Analysis-tier staleness (existing behavior): The existing on-demand staleness detection (v2.2) already flags stale analyses. Override staleness is a separate concern — variant-tier overrides are persistent whereas analysis overrides are job-specific.

**Excluded-bullet re-inclusion + variant override interaction:**
- Edge case: A bullet has both a variant-tier text override AND is excluded at variant tier. This should not be possible by construction — you cannot override text for an excluded item (the "Reword" control is disabled when the bullet checkbox is unchecked). But if the user re-includes via the excluded-bullet suggestion card at analysis tier, the analysis re-inclusion should use the BASE text (not the variant override that was set before exclusion) since the exclusion postdates the override. This needs explicit handling in the merge precedence logic.

**Project description field not in current schema:**
- `projects` table (schema line 50-54) has only `name`, `sortOrder`. There is no `description` or `url` field. If project description override is in scope, the schema must first add a `description` field to the `projects` table, or treat the first project bullet as the description. The first-bullet-as-description convention avoids schema migration but is semantically fragile. Recommendation: Add `description TEXT NOT NULL DEFAULT ''` to `projects` table as part of v2.6 schema work, then support variant-level override on that field.

---

## MVP Definition

### Launch With (v2.6 core)

These are all required — they form the coherent "git-branch" mental model:

- [ ] Unified overrides table with polymorphic shape (entity_type, entity_id, field, override_text, variant_id, analysis_id) — required foundation
- [ ] Migration: INSERT existing `analysisBulletOverrides` rows into new table with analysis_id scoping preserved
- [ ] Update `applyOverrides()` and `buildMergedBuilderData()` to read from unified table with precedence analysis → variant → base
- [ ] Inline reword affordance for bullet text at variant tier (InlineEdit pattern, pencil icon on hover)
- [ ] Inline reword affordance for summary at variant tier (gated on non-empty base summary + showSummary)
- [ ] Visual distinction: accent dot/left-border for overridden fields in VariantBuilder
- [ ] Reset-to-base for all overridable fields
- [ ] Excluded-bullet suggestion cards in OptimizeVariant (requires prompt change to send excluded bullets)

### Add After Validation (v2.6.x)

- [ ] Inline reword for job title (role field) at variant tier — high value but lower urgency since summary + bullets cover most tailoring cases
- [ ] Inline reword for project title + description at variant tier — requires projects.description schema addition
- [ ] Staleness indicator when base text updated after variant override — nice-to-have safety signal; don't block launch on it
- [ ] Override count badge in VariantEditor builder pane header — cosmetic quality-of-life

### Future Consideration (v2.7+)

- [ ] Bulk override management UI (see all overrides across a variant, clear all) — only relevant once users have many overrides
- [ ] Override history / audit trail — only relevant if users report confusion about what changed

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Unified overrides table + migration | HIGH (enables everything else) | MEDIUM (schema + migration + applyOverrides refactor) | P1 |
| Bullet text reword at variant tier | HIGH (core v2.6 requirement) | MEDIUM (InlineEdit reuse + new IPC handler) | P1 |
| Summary reword at variant tier | HIGH (existing gate already exists) | LOW (one InlineEdit addition to VariantBuilder) | P1 |
| Visual distinction (overridden vs base) | HIGH (trust signal) | LOW (CSS addition to bullet row) | P1 |
| Reset-to-base affordance | HIGH (required for any override feature) | LOW (delete override row + preview refresh) | P1 |
| Excluded-bullet suggestion cards | HIGH (unique differentiator) | MEDIUM-HIGH (prompt change + new card type + IPC) | P1 |
| Job title (role) reword at variant tier | MEDIUM (nice for role-family variants) | LOW (same pattern as bullet reword) | P2 |
| Project title + description reword | MEDIUM (relevant for portfolio roles) | MEDIUM (schema change to projects table) | P2 |
| Staleness detection | MEDIUM (prevents silent divergence) | MEDIUM (updatedAt comparison + UI indicator) | P2 |
| Override count badge | LOW (cosmetic) | LOW | P3 |

**Priority key:** P1 = required for v2.6 launch, P2 = add after core validated, P3 = nice to have

---

## Component Integration Map

| Feature | Primary Component | Secondary Components | New IPC Handler Needed |
|---------|------------------|---------------------|------------------------|
| Bullet reword affordance | `VariantBuilder.tsx` | `InlineEdit.tsx` (reuse), `VariantPreview` (refresh) | `templates.setVariantOverride(variantId, entityType, entityId, field, text)` |
| Summary reword affordance | `VariantBuilder.tsx` | `InlineEdit.tsx` (reuse) | Same handler |
| Job title reword | `VariantBuilder.tsx` | `InlineEdit.tsx` (reuse) | Same handler |
| Project title/description reword | `VariantBuilder.tsx` | `InlineEdit.tsx` (reuse) | Same handler |
| Visual distinction | `VariantBuilder.tsx` | None | None (pure styling) |
| Reset-to-base | `VariantBuilder.tsx` | `VariantPreview` (refresh) | `templates.clearVariantOverride(variantId, entityType, entityId, field)` |
| Excluded-bullet suggestion cards | `OptimizeVariant.tsx` | `VariantPreview` (refresh via `previewRefreshKey`) | `ai.getExcludedBulletSuggestions(analysisId)` + `ai.acceptExcludedBullet(analysisId, bulletId)` |
| Unified table merge | `src/main/lib/mergeHelper.ts` | `src/shared/overrides.ts` | None (pure function change) |
| Migration | `src/main/db/bootstrap.ts` | `src/main/db/schema.ts` | None (schema + migration script) |

---

## Sources

- Codebase inspection: `VariantBuilder.tsx`, `OptimizeVariant.tsx`, `VariantEditor.tsx`, `InlineEdit.tsx`, `mergeHelper.ts`, `overrides.ts`, `schema.ts`
- Project context: `.planning/PROJECT.md` (v2.6 milestone definition, Key Decisions table)
- Memory: `project_v26_overrides.md` (polymorphic overrides table design, git-branch mental model)
- UX patterns: standard inline-edit conventions from structured-content editors (Notion block editing, VS Code settings reset, GitHub PR review comment editing) — MEDIUM confidence (common patterns, not citation-verified)

---

*Feature research for: ResumeHelper v2.6 Per-Variant Text Overrides + Excluded-Bullet Suggestions*
*Researched: 2026-06-05*
