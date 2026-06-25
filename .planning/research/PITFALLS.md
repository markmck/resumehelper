# Pitfalls Research

**Domain:** Polymorphic override table migration + "suggest excluded content" LLM feature in a three-layer Electron/SQLite resume app
**Researched:** 2026-06-05
**Confidence:** HIGH — grounded in actual source files: schema.ts, mergeHelper.ts, ai.ts, templates.ts, submissions.ts, db/index.ts (bootstrap migration path)

---

## Critical Pitfalls

### Pitfall 1: Migration Drops analysisBulletOverrides Rows Silently

**What goes wrong:**
The migration from `analysis_bullet_overrides` into a unified `overrides` table uses INSERT-SELECT. If the unified table has a UNIQUE constraint on `(scope, entity_type, entity_id, variant_id, analysis_id)` and the source data maps to the same logical key (e.g., two overrides for the same `bulletId × analysisId`), the INSERT silently ignores duplicates via ON CONFLICT DO NOTHING. Because `analysis_bullet_overrides` already has a UNIQUE `(analysis_id, bullet_id)` constraint, duplicates aren't a real concern — but if the INSERT-SELECT maps columns incorrectly (e.g., `entity_id` receives `analysis_id` instead of `bullet_id`), every row migrates with a wrong FK, and queries return zero overrides. The old table still exists during testing and nothing obviously breaks until the old table is dropped.

**Why it happens:**
The `overrides` table is polymorphic — columns that carry entity identity depend on `entity_type`. A simple INSERT-SELECT must assign `entity_id = bullet_id` for rows where `entity_type = 'job_bullet'`. Getting the column mapping wrong is easy because the old table's column name (`bullet_id`) and the new table's column name (`entity_id`) diverge.

**How to avoid:**
- Write the INSERT-SELECT explicitly: `INSERT INTO overrides (scope, entity_type, entity_id, analysis_id, variant_id, override_text, source) SELECT 'analysis', 'job_bullet', bullet_id, analysis_id, NULL, override_text, source FROM analysis_bullet_overrides`.
- Add a post-migration assertion: `SELECT COUNT(*) FROM overrides WHERE entity_type = 'job_bullet'` must equal `SELECT COUNT(*) FROM analysis_bullet_overrides`. Run this in the bootstrap migration block and log a console.error (not a throw) if counts diverge.
- Keep `analysis_bullet_overrides` alive (do NOT drop it) until at least one full app launch + smoke-test cycle. Drop in a subsequent release.

**Warning signs:**
- Override count in merged output drops to zero after DB migration.
- `getOverrides()` returns empty array where it previously returned rows.
- `applyOverrides()` in `mergeHelper.ts` (line 296) runs but the override map is empty.

**Phase to address:** Migration phase (Phase 1 of v2.6) — the INSERT-SELECT and post-migration assertion belong in `ensureSchema()` or a dedicated migration block alongside the existing `alterStatements` pattern.

---

### Pitfall 2: NULL-Column Ambiguity in the Polymorphic Table Breaks Merge Queries

**What goes wrong:**
A single `overrides` table covering job bullets, summary text, project titles, job title/company line, and project descriptions must use nullable FK columns or a nullable `entity_id` integer plus an `entity_type` discriminator. If the merge query does `WHERE entity_id = ? AND entity_type = ?` but also includes `AND variant_id = ?` or `AND analysis_id = ?`, rows where those FK columns are NULL (base scope, no variant/analysis) never match because `NULL = NULL` is false in SQL. The query silently returns no override, so base text is shown even when a variant-tier override exists.

**Why it happens:**
The existing `applyOverrides()` in `shared/overrides.ts` is written for a non-nullable `bulletId`. When the unified table adds nullable `variant_id` and `analysis_id` (NULL = base scope, value = that tier's scope), any WHERE clause using `=` against those columns will never match NULL rows.

**How to avoid:**
- Use `IS NULL` / `IS NOT NULL` guards in all merge queries, not `=`. In Drizzle, use `isNull(overrides.variantId)` and `isNull(overrides.analysisId)` for base-scope lookups.
- Prefer a non-nullable `scope` enum column (`'base' | 'variant' | 'analysis'`) alongside the nullable FK columns. The enum eliminates ambiguity; the FK is a lookup aid only.
- Add a CHECK constraint: `CHECK (scope = 'base' OR (scope = 'variant' AND variant_id IS NOT NULL) OR (scope = 'analysis' AND analysis_id IS NOT NULL))` enforced at the DB level.
- Update `applyOverrides()` in `shared/overrides.ts` and the Layer 3 block in `mergeHelper.ts` (lines 278-297) to handle each scope with explicit IS NULL comparisons.

**Warning signs:**
- Variant-tier overrides entered in the UI don't appear in the preview or PDF export.
- `buildMergedBuilderData(db, variantId)` called without `analysisId` shows no rewrites.
- SQL query in `getOverrides()` (currently raw SQLite prepare on line 174 of ai.ts) returns rows correctly but Drizzle query doesn't.

**Phase to address:** Schema design phase (Phase 1) — the NULL semantics must be decided before writing any merge query.

---

### Pitfall 3: Merge Precedence Inversion — Variant Override Wins Over Analysis Override

**What goes wrong:**
The intended precedence is `analysis > variant > base`. If `buildMergedBuilderData` applies variant-tier overrides _after_ analysis-tier overrides, the variant reword silently clobbers the analysis rewrite the user accepted. The user sees their accepted AI suggestion disappear from the preview when they open the analysis screen again.

**Why it happens:**
Today's Layer 3 in `mergeHelper.ts` only applies analysis overrides (lines 278-297). When variant overrides are added, the natural place to insert them is "after exclusions, before analysis" — Layer 2.5. If a developer instead appends variant override application after the existing Layer 3 analysis block (because that's where the existing override code lives), the order is wrong.

**How to avoid:**
- Enforce the merge order in code comments and structure: Layer 1 = base, Layer 2 = variant exclusions, Layer 2.5 = variant text rewrites, Layer 3 = analysis overrides.
- Write a unit test: `buildMergedBuilderData(db, variantId, analysisId)` where bullet 1 has a variant override "Variant wording" and an analysis override "Analysis wording" — assert the result is "Analysis wording".
- The single `buildMergedBuilderData()` function is the only merge path (confirmed by Phase 30 D-01), so fixing it here fixes all surfaces: HTML/PDF/DOCX/snapshot.

**Warning signs:**
- Accepted AI suggestions vanish in preview when the variant also has a reword for the same bullet.
- Unit test for the merge function (currently in tests) passes in isolation but export output differs.

**Phase to address:** Merge-helper phase (Phase 2) — add the new layer and the precedence unit test before wiring any UI.

---

### Pitfall 4: Snapshot Freezes Base Text, Not the Overridden Text, for New Override Types

**What goes wrong:**
`buildSnapshotForVariant()` in `submissions.ts` calls `buildMergedBuilderData(db, variantId, analysisId)` and freezes the merged result. Today this works because the only overrides are bullet text overrides (Layer 3 analysis). When variant-tier overrides are added (summary text, job title/company line, project title, project description), any surface that `buildMergedBuilderData` doesn't yet apply variant overrides to will be frozen at base text rather than overridden text. The submission snapshot will show "Software Engineer at Acme" instead of "Senior Consultant at Acme" — silently, with no error.

**Why it happens:**
The snapshot trusts `buildMergedBuilderData` to have applied all layers. If Layer 2.5 (variant text overrides) isn't implemented yet when the snapshot code ships, or if it is implemented but doesn't cover a new entity type (e.g., project description), the snapshot freezes the wrong text.

**How to avoid:**
- Treat the entity coverage of `buildMergedBuilderData` as a contract: every entity type that can have a variant override must have its override applied _inside_ `buildMergedBuilderData`, not in a caller.
- Write a snapshot integration test: create a variant override for summary + bullet + project title, submit, read back the snapshot JSON, assert override text is present (not base text).
- Add a "snapshot coverage" checklist to the phase definition: summary, job title, company, project title, project description, bullet text — each verified in the snapshot.

**Warning signs:**
- Snapshot JSON contains base text for an entity type that the active variant overrides.
- Submission detail screen shows the base phrasing rather than the variant wording.
- Resume export and submission snapshot diverge (snapshot shows base, PDF shows override, or vice versa).

**Phase to address:** Snapshot verification phase (Phase 3, after merge-helper) — the snapshot integration test must gate the feature as complete.

---

### Pitfall 5: Staleness Detection Misses Variant Override Changes

**What goes wrong:**
The existing staleness detection (PROJECT.md decision "On-demand staleness detection") compares `analysis.createdAt` against `bullet.updatedAt` and `variant.updatedAt`. Today, editing a bullet's base text stamps `jobBullets.updatedAt`; toggling an item stamps `templateVariants.updatedAt` (templates.ts line 422). Variant-tier overrides stored in the new `overrides` table have their own `createdAt`/`updatedAt` — but those timestamps are not yet part of the staleness comparison. If a user rewrites the summary in a variant _after_ running analysis, the analysis won't be flagged stale because only `variant.updatedAt` (from `setItemExcluded`) is checked, not `overrides.updatedAt`.

**Why it happens:**
The staleness check reads from `analysisResults.createdAt` vs. a known set of stamped columns. Adding a new override table doesn't automatically extend the check — it must be explicitly wired.

**How to avoid:**
- When an override is created or updated in the `overrides` table, also call `UPDATE template_variants SET updated_at = now() WHERE id = ?` for variant-scoped overrides (mirrors the existing pattern in `setItemExcluded`).
- For analysis-scoped overrides, stamp `analysis_results.updated_at` (add the column if missing) or rely on the existing `createdAt` comparison since re-running analysis always creates a new row.
- Add a staleness test: insert a variant override _after_ the analysis `createdAt`, assert the stale-analysis flag is true.

**Warning signs:**
- User rewrites the summary at the variant tier; the analysis banner shows "up to date".
- No stale warning appears after variant overrides are added post-analysis.

**Phase to address:** Staleness phase (Phase 2, alongside merge-helper) — the variant override write path must stamp `variant.updatedAt`.

---

### Pitfall 6: Override Points at an Excluded or Deleted Entity

**What goes wrong:**
A user creates a variant override for a bullet, then excludes that bullet from the variant (or deletes the job entirely). The override row remains in `overrides` with a valid `entity_id`, but `buildMergedBuilderData` already filters excluded bullets from the output via `excludedBulletIds`. The override is never applied (the bullet isn't in the output), which is correct — but the orphaned override row also is never cleaned up, accumulating silently. When the user later re-includes the bullet, the old override reappears, which may be intentional (good) or surprising (confusing) depending on context.

For the more serious case: the entity is _deleted_ (job deleted via CASCADE, bullet CASCADE-deleted from `job_bullets`). The old `analysis_bullet_overrides` table relied on `ON DELETE cascade` from `job_bullets`. The new unified `overrides` table must also have the same cascade — but with polymorphic FKs, SQLite's FK cascade is per-column. If `entity_id` is a generic integer with no FK, the cascade won't fire.

**Why it happens:**
Polymorphic FK tables in SQLite can't express a single `entity_id` column that cascades from multiple parent tables. Each parent table requires a separate nullable FK column (the same pattern used in `template_variant_items`). If the design uses a generic `entity_id` integer instead, there is no FK, and cascades don't happen.

**How to avoid:**
- Mirror the `template_variant_items` approach: use separate nullable FK columns (`bullet_id`, `project_bullet_id`, `summary` sentinel, etc.) with individual ON DELETE CASCADE declarations. Do not use a single generic `entity_id` integer.
- Add a `getOverrides()` equivalent that LEFT JOINs the entity table and sets `isOrphaned = true` when the entity no longer exists (existing pattern in `ai.ts` lines 174-195 for `analysis_bullet_overrides`). Extend this to all entity types.
- For excluded-but-not-deleted entities: decide the policy explicitly — "override is retained and reactivated if bullet is re-included" or "override is cleared when bullet is excluded". Document the decision in PROJECT.md Key Decisions.

**Warning signs:**
- Deleting a job leaves override rows in the `overrides` table with no matching `job_bullets` row.
- Re-including a previously excluded bullet shows an unexpected variant reword.
- `getOverrides()` returns rows where the entity no longer exists in its parent table.

**Phase to address:** Schema design phase (Phase 1) — FK cascade strategy must be decided in the CREATE TABLE, not retrofitted.

---

### Pitfall 7: AI Suggests a Base Bullet That Is Already in the Variant (False "Missing" Signal)

**What goes wrong:**
The excluded-bullet suggestion feature feeds the LLM base bullets that the active variant excludes, asking it to recommend ones relevant to JD gaps. If the LLM's context includes bullets that are excluded from the _variant_ but included at the _base_, and the prompt does not clearly distinguish "these are excluded from your current variant" from "these are missing from your resume entirely", the LLM may suggest a bullet the user intentionally omitted (e.g., omitted because it's irrelevant to this role family). The user accepts it, the bullet reappears at the analysis tier — contradicting the variant's curation intent.

**Why it happens:**
The LLM cannot independently check what is in the variant vs. the base. The prompt author must construct the context correctly. If the prompt says "here are bullets you don't have" without specifying "excluded from this variant, not from your career history", the LLM's framing of the suggestion is wrong.

**How to avoid:**
- In the prompt for excluded-bullet suggestions, explicitly label the two sets: "INCLUDED IN THIS VARIANT: [bullets]" and "EXCLUDED FROM THIS VARIANT (but exist in your base experience): [bullets]". Ask the LLM to suggest from the EXCLUDED set only when a JD gap can be addressed by that specific content.
- Limit the excluded bullets fed to the LLM to those belonging to jobs/projects _not_ entirely excluded at the job/project level. Entire-job exclusions are intentional curation — only per-bullet exclusions are "soft omissions" worth suggesting.
- Add a UI confirmation: when accepting a suggestion for an excluded bullet, show "This bullet is currently excluded from your [variant name] variant. Accept to include it for this analysis only?"

**Warning signs:**
- User accepts a suggestion but the bullet is also excluded in the variant; the accepted re-include at analysis tier conflicts with the variant exclusion.
- The analysis score improves but the suggestion involves a bullet from a job the user intentionally removed from the variant.

**Phase to address:** Prompt engineering phase (Phase 4, excluded-bullet suggestion feature) — the prompt construction must distinguish variant-excluded from base-missing.

---

### Pitfall 8: LLM Fabricates a Bullet That Doesn't Exist in the DB (Hallucination)

**What goes wrong:**
When the LLM is asked to suggest excluded bullets, it is given a list of real bullet IDs + text. The LLM may respond with a bullet ID that was not in the provided list (hallucinated) or with a modified text that it presents as a "suggestion" for a bullet that doesn't match the source text. If the accept path writes `entity_id = <hallucinated id>` to the `overrides` table, the merge query finds no matching bullet in the DB, and the accepted suggestion silently disappears from output — or worse, matches an unrelated bullet with the same numeric ID.

**Why it happens:**
The existing fabrication-prevention guardrail (PROJECT.md constraint: "AI suggests rewording of existing bullets, never fabricates") is enforced at the prompt level and the Zod schema for `generateObject`. The excluded-bullet suggestion is a _different_ LLM call with a different schema, and the same guardrail needs to be explicitly carried over — it's not automatic.

**How to avoid:**
- Use `generateObject` with a Zod schema for excluded-bullet suggestions just as for bullet rewrites. The schema must constrain returned `bulletId` values to an enum of the IDs provided in context (`z.union([z.literal(id1), z.literal(id2), ...])`), or validate post-response.
- After receiving the LLM response, validate: every suggested `bulletId` must exist in the excluded bullets set that was passed in. Reject any suggestion whose ID is not in that set before writing to the DB.
- The accept-path IPC handler must re-verify the `bulletId` exists in `job_bullets` _and_ is currently excluded in the variant before writing to `overrides`. Do not trust the renderer's payload blindly.

**Warning signs:**
- An accepted suggestion writes an `entity_id` to `overrides` that has no corresponding row in `job_bullets`.
- Accepted suggestions appear in the UI but don't render in the resume preview.
- The Zod schema for the suggestion response doesn't include `bulletId` validation.

**Phase to address:** Prompt engineering + IPC handler phase (Phase 4) — the validate-before-write guard belongs in the IPC handler, not just the prompt.

---

### Pitfall 9: Token Cost Blows Up When All Excluded Bullets Are Fed to the LLM

**What goes wrong:**
A variant for a "Senior Engineer" role might exclude 40–60 bullets from various earlier jobs (intentional curation). Feeding all 60 excluded bullets to the LLM in the analysis call alongside the full job posting text pushes the context into high-cost territory and may approach context limits for shorter-context models. The analysis call already sends the full variant text; adding the excluded set on top could double or triple token usage with no user-visible cap.

**Why it happens:**
The feature requires giving the LLM both the included bullets (for scoring) and the excluded bullets (for suggestion). Neither set is currently bounded. On a large career history, both sets can be large.

**How to avoid:**
- Gate excluded-bullet suggestions as a _separate, optional LLM call_ after the main analysis, not bundled into the primary scoring call. The user pays for it explicitly ("Find missing bullets" button rather than automatic).
- Cap the excluded bullets sent: limit to bullets from jobs/projects that are _partially_ excluded (at least one bullet included from that job), not from jobs that are entirely excluded. This reduces noise and token count.
- If the variant excludes more than N bullets (e.g., 20), truncate to the top N most recently dated bullets (most career-relevant) and log a `console.warn` so the developer knows truncation occurred.
- Expose token estimation (character count heuristic, e.g., chars/4) in the UI before the call, or at least document the cost in release notes.

**Warning signs:**
- Analysis calls for users with large career histories take significantly longer or error with rate limit / context length errors.
- The main analysis + excluded-bullet suggestion combined exceeds 32K tokens.
- No token budget cap exists in the prompt construction code.

**Phase to address:** Prompt engineering phase (Phase 4) — the call separation and bullet cap must be in the initial implementation, not added later after users report costs.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `analysis_bullet_overrides` table alongside new `overrides` table | Zero migration risk, rollback trivial | Dual read paths; `applyOverrides()` and merge code must query two tables or the old table becomes stale | Only during the migration phase — drop in v2.7 after verification |
| Generic `entity_id` integer without FK (no per-entity columns) | Simpler schema, one column instead of many nullable FKs | No CASCADE on delete; orphaned override rows accumulate; `isOrphaned` detection requires joining every possible entity table | Never — follow `template_variant_items` pattern with per-entity nullable columns |
| Bundle excluded-bullet suggestion into the main analysis call | Fewer IPC round-trips, one LLM call | Token cost doubles; errors in suggestion call kill the main analysis result | Never — keep as a separate optional call |
| Omit `scope` enum column, rely on NULL analysis of FK columns alone | Fewer columns | Query author must remember NULL-means-base semantics; mistakes cause silent wrong-tier reads | Acceptable only if CHECK constraint enforces NULL invariants and all queries are centralized in `buildMergedBuilderData` |
| Skip snapshot integration test for new override types | Faster initial ship | Snapshot silently freezes base text for newly added entity types; discovered at submit time | Never for new entity type coverage — snapshot test is the correctness contract |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Drizzle + SQLite NULL comparisons | Using `eq(overrides.variantId, variantId)` returns no rows when `variantId` is NULL | Use `isNull(overrides.variantId)` for scope=base queries; `eq()` only for non-null lookups |
| `ensureSchema()` migration block | INSERT-SELECT migration runs every app launch; if idempotency isn't enforced, rows are duplicated on every restart | Guard with `WHERE NOT EXISTS (SELECT 1 FROM overrides WHERE ...)` or check row count before migrating |
| `applyOverrides()` in `shared/overrides.ts` | Called from both main process and (via IPC) implicitly via renderer — adding variant-tier call to renderer code breaks the "single merge path" principle | All override application stays inside `buildMergedBuilderData()` in main process only; renderer receives merged data |
| `duplicateVariant()` in templates.ts | Copies `templateVariantItems` rows but doesn't copy variant-tier overrides from the new `overrides` table | Add `INSERT INTO overrides SELECT ... WHERE variant_id = ?` with new variant's ID in the duplicate transaction |
| Snapshot re-render for old submissions | Old snapshots were frozen with only bullet overrides; new snapshot shape has additional override types | Old submissions fall back to `resumeSnapshot` JSON as-is (existing fallback behavior confirmed in PROJECT.md); no change needed, but verify shape is backward-compatible |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `buildMergedBuilderData` runs 6+ separate DB queries and will gain more for override lookups | Measurable latency on preview render (today acceptable; grows with new queries) | Bundle new override queries into the existing query block; avoid per-entity-type individual queries | Unlikely to break at Mark's single-user scale; monitor if query count exceeds ~10 |
| Feeding all excluded bullets to LLM in one prompt | Long analysis calls, rate limit errors | Separate call, cap excluded bullet count | Any variant with 20+ excluded bullets |
| `overrides` table scan without index on `(variant_id, entity_type)` | Slow merge on large override sets | Add index `CREATE INDEX IF NOT EXISTS idx_overrides_variant ON overrides (variant_id, entity_type)` | Unlikely at single-user scale with <500 override rows, but index is cheap |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| User can't tell which tier a reword lives in (variant vs analysis) | User thinks their variant was permanently changed when they accepted an analysis suggestion; or thinks their analysis reword will follow them to other analyses | Show tier badge ("Variant" / "This analysis only") on every overridden field in the builder and analysis screens |
| No revert path for variant-tier rewords | User rewrites a title, decides it's worse, has no "undo to base" | Provide a "Reset to original" affordance that deletes the override row; if the base text was the default, it reappears immediately |
| "Permanent vs this-job-only" ambiguity when accepting excluded-bullet suggestion | User accepts a base bullet into an analysis, not realizing it doesn't persist to the variant — next time they run the same variant they don't see it | Confirm dialog on accept: "This will include this bullet for [Company] analysis only. To add it permanently, edit your [variant name] variant." |
| Inline reword UI appears for all fields simultaneously | Overwhelming; user doesn't know where to start | Scope the reword affordance to the summary, current job's title/company line, and bullets — not all fields at once. Project fields can be a v2.7 addition. |
| Override text not visible in the builder's main listing | User creates a variant reword but forgets it's there; reads the base text on the list and thinks the override was lost | Show a visual indicator (e.g., subtle pencil icon or "edited" chip) on any field with a variant-tier override |

---

## "Looks Done But Isn't" Checklist

- [ ] **Migration:** `analysis_bullet_overrides` row count in new `overrides` table equals original row count — verify post-migration assertion runs at startup
- [ ] **Cascade delete:** Deleting a job also deletes all its override rows from `overrides` — verify via integration test
- [ ] **Snapshot coverage:** All new entity types (summary, job title, company, project title, project description) appear with override text (not base text) in `resumeSnapshot` JSON after submission
- [ ] **Merge precedence:** Analysis override wins over variant override for the same entity — verify unit test exists and passes
- [ ] **Duplicate variant:** Duplicating a variant copies its override rows, not just its `templateVariantItems` rows
- [ ] **Staleness:** Adding or editing a variant override stamps `template_variants.updated_at` — verify stale banner appears after override is added post-analysis
- [ ] **Fabrication guard:** Excluded-bullet suggestion accept handler validates that the accepted `bulletId` is in `job_bullets` and is currently excluded in the variant before writing to `overrides`
- [ ] **NULL scope:** A query for variant-scoped overrides with `WHERE variant_id IS NULL` returns zero rows (no base-scope rows appear as variant overrides)
- [ ] **Old submission display:** Opening a pre-v2.6 submission snapshot still renders correctly with no new fields expected

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Migration drops override rows | MEDIUM | Keep `analysis_bullet_overrides` alive; re-run INSERT-SELECT with corrected column mapping; add post-migration assertion to catch on next launch |
| Wrong merge precedence shipped to user | LOW | Fix `buildMergedBuilderData` Layer 2.5/3 ordering; release patch; no data loss (overrides still in DB) |
| Snapshot frozen with base text instead of overridden text | HIGH | Cannot retroactively fix frozen snapshots; fix `buildMergedBuilderData` and `buildSnapshotForVariant` going forward; add prominent note in release: "Submissions created before v2.6.x patch may show base text in history" |
| Orphaned override rows after entity delete | LOW | Run cleanup SQL: `DELETE FROM overrides WHERE bullet_id NOT IN (SELECT id FROM job_bullets)`; idempotent and safe |
| Hallucinated bullet ID accepted into overrides | LOW | Override silently never matches; user sees no change; cleanup: `DELETE FROM overrides WHERE bullet_id NOT IN (SELECT id FROM job_bullets)` (same as above) |
| Token cost overrun on excluded-bullet call | LOW | Add cap N in prompt construction; no data loss |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Migration drops analysisBulletOverrides rows | Phase 1 — Schema + Migration | Post-migration row count assertion in `ensureSchema()`; manual test on a DB with existing overrides |
| NULL-column ambiguity breaks merge queries | Phase 1 — Schema + Migration | Unit test: variant-scope override (NULL analysis_id) returns override text without analysisId in call |
| Merge precedence inversion | Phase 2 — Merge helper extension | Unit test: same-entity variant + analysis override → analysis text wins |
| Snapshot freezes base text for new override types | Phase 3 — Snapshot integration test | Integration test: submit with variant summary override; assert snapshot JSON contains override text |
| Staleness misses variant override changes | Phase 2 — Merge helper extension | Staleness unit test: add override after analysis createdAt; assert stale flag is true |
| Override pointing at excluded/deleted entity | Phase 1 — Schema + Migration | Integration test: delete job; assert override rows cascade-deleted; re-include bullet; assert old override reappears (or not, per policy) |
| LLM suggests already-variant-excluded bullet as if missing | Phase 4 — Excluded-bullet suggestion prompt | Prompt review + test: assert suggestions only come from excluded set, not included set |
| LLM hallucinates bullet ID | Phase 4 — Excluded-bullet suggestion prompt | IPC handler test: mock LLM returning non-existent bulletId; assert handler rejects it |
| Token cost blows up | Phase 4 — Excluded-bullet suggestion prompt | Add cap before first implementation; no separate verification needed |
| UX tier ambiguity | Phase 3/4 — UI affordance | Design review: every overridden field shows tier badge before marking feature complete |

---

## Sources

- Direct reading of `src/main/db/schema.ts` — existing `analysisBulletOverrides` schema and UNIQUE constraint
- Direct reading of `src/main/lib/mergeHelper.ts` — three-layer merge implementation, Layer 3 application at lines 278-297
- Direct reading of `src/main/handlers/ai.ts` — `acceptSuggestion`, `getOverrides` with orphan detection via LEFT JOIN
- Direct reading of `src/main/handlers/templates.ts` — `duplicateVariant`, `setItemExcluded`, `updatedAt` stamp pattern
- Direct reading of `src/main/handlers/submissions.ts` — `buildSnapshotForVariant` calling `buildMergedBuilderData`
- Direct reading of `src/main/db/index.ts` — `ensureSchema`, `alterStatements` try/catch pattern, existing skill-migration idiom
- `src/shared/overrides.ts` — `applyOverrides()` current signature (non-nullable bulletId)
- `.planning/PROJECT.md` — Key Decisions for staleness detection, orphaned override handling, fabrication prevention, snapshot immutability

---
*Pitfalls research for: ResumeHelper v2.6 — Polymorphic Override Table Migration + Excluded-Bullet LLM Suggestions*
*Researched: 2026-06-05*
