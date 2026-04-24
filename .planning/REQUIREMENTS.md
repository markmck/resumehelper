# Requirements: ResumeHelper v2.5 Portability & Debt Cleanup

**Defined:** 2026-04-23
**Core Value:** Full visibility into job applications — which resume version was sent to which company, when, and where each application stands in the pipeline.

## v2.5 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Merge Reconciliation

- [ ] **MERGE-01**: Unified `buildMergedBuilderData(db, variantId, analysisId?)` function consolidates bullet overrides, accepted skill additions, and summary/job exclusions — replaces the three parallel paths in export.ts/templates.ts/submissions.ts
- [ ] **MERGE-02**: Shared `ResumeJson` interface lifted to `src/shared/resumeJson.ts` — single source of truth for both import and export
- [ ] **MERGE-03**: Parameterized tests cover HTML + PDF + DOCX × summary on/off × all 5 templates — preventing future drift

### DOCX Export Fix

- [ ] **DOCX-01**: User's `showSummary` toggle on a variant is honored by DOCX export — summary paragraph omitted when toggled off, matching PDF/HTML behavior

### Base Resume.json Export

- [ ] **JSON-01**: User can click "Export JSON" in the Experience tab header and save full experience DB as valid resume.json
- [ ] **JSON-02**: Exported base JSON validates against `ResumeJsonSchema` (Zod) before write — invalid data surfaces user-actionable error
- [ ] **JSON-03**: Null and empty optional fields are OMITTED from exported JSON, not emitted as `null` or `""` — JSON Resume validators accept the output
- [ ] **JSON-04**: Filename defaults to `${profileName}_Resume.json` with existing sanitization rules; save dialog opens at last-used export location
- [ ] **JSON-05**: Existing ImportConfirmModal surfaces append-only semantics: "Re-importing previously exported data creates duplicates — import is append-only."
- [ ] **JSON-06**: Code comment on `buildBaseResumeJson` + milestone release notes document the "lossy-faithful" fields (profiles[1..], address sub-fields except city, basics.url/label/image, skill level, project description/url/dates)

### Variant-Merged Resume.json Export

- [ ] **JSON-07**: User can click "JSON" in the VariantEditor preview toolbar (next to PDF/DOCX) and save a variant's fully-merged view as resume.json
- [ ] **JSON-08**: Variant export applies full three-layer merge (base + variant selection + accepted skill additions + bullet overrides) via `buildMergedBuilderData` — output matches what PDF/DOCX of the same variant produce
- [ ] **JSON-09**: Exported variant JSON contains NO `meta` sidecar field — pure resume.json output only
- [ ] **JSON-10**: Variant export filename defaults to `${profileName}_Resume_${variantName}.json`
- [ ] **JSON-11**: Button tooltip clarifies: "Exports the final rendered resume. Re-importing creates new base entries — it won't recreate this variant."

### Configurable DB Location

- [ ] **DB-01**: `Database Location` card appears in Settings below AI Configuration with current DB path label, "Reveal in Explorer" button, and "Change location" button
- [ ] **DB-02**: User can pick a folder via OS folder picker; app validates write permission before proceeding
- [ ] **DB-03**: Change flow sequence: WAL checkpoint → close DB → copy file → verify integrity (readonly open + `integrity_check`) → write bootstrap JSON → rename old → `.bak` → prompt restart
- [ ] **DB-04**: Any failure during the sequence rolls back cleanly — source DB remains accessible, no partial state, error surfaced to user
- [ ] **DB-05**: Confirmation modal before Change enumerates the 5-step plan (Copy → Verify → Switch → Backup → Restart)
- [ ] **DB-06**: After successful relocation, restart-required modal offers "Restart now" / "Later" buttons; choosing Restart Now calls `app.relaunch(); app.exit(0)`
- [ ] **DB-07**: On first boot after restart, app resolves DB path via `userData/db-location.json` bootstrap override before opening the DB
- [ ] **DB-08**: Heuristic detects UNC paths (`\\server\share`) and well-known cloud folder names (OneDrive, Dropbox, iCloud Drive) — non-blocking warning modal explains WAL-over-network risk, user can proceed
- [ ] **DB-09**: After successful relocation, a "Delete old backup" button appears in the Database Location card — deletes the `.bak` file on explicit user click
- [ ] **DB-10**: Bootstrap JSON lives at `app.getPath('userData')/db-location.json` — outside the SQLite DB (chicken-and-egg avoidance)

### Tech Debt Cleanup

- [ ] **DEBT-01**: Orphan `TEMPLATE_LIST` export removed from `resolveTemplate.ts` — verified by full-workspace grep (incl. `.claude/`, `dist/`, `scripts/`) showing no readers
- [ ] **DEBT-02**: Vestigial `compact` prop removed from `ResumeTemplateProps` and all 5 template components — tsc + vitest + 5-template manual render pass
- [ ] **DEBT-03**: Dead `tests/setup.ts` deleted — not referenced by vitest config, no direct imports; full test suite passes 3× consecutive pre/post
- [ ] **DEBT-04**: `jobs.test.ts` broken `.where(undefined as any)` replaced with correct filter (or line removed with documented intent); full suite runs 10× consecutive under default thread pool without race failures

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Variant JSON roundtrip / re-import as variant | Export-only by design — tempts sibling import path, risks JSON Resume spec violation |
| "Export all variants" bulk/zip | N×dialog friction or new zip dep; low-value for v2.5 |
| Live in-process DB swap (no restart) | Requires Proxy retrofit across 20+ handler imports — out of scope for debt cleanup |
| In-app DB browser / table viewer | Future milestone if user need emerges |
| Scheduled auto-backup | Single-user local tool — out of scope |
| Cloud sync integration | Future milestone; warn-but-allow covers the common case today |
| `meta` sidecar field in exported JSON | User opted out; pure resume.json spec output preferred |
| Hard-block on network/cloud DB paths | Warn-but-allow chosen — user knows their storage best |
| Auto-expiring `.bak` file | User-initiated delete only — respects user's backup preferences |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MERGE-01 | Phase 30 | Pending |
| MERGE-02 | Phase 30 | Pending |
| MERGE-03 | Phase 30 | Pending |
| DOCX-01 | Phase 30 | Pending |
| JSON-01 | Phase 31 | Pending |
| JSON-02 | Phase 31 | Pending |
| JSON-03 | Phase 31 | Pending |
| JSON-04 | Phase 31 | Pending |
| JSON-05 | Phase 31 | Pending |
| JSON-06 | Phase 31 | Pending |
| JSON-07 | Phase 32 | Pending |
| JSON-08 | Phase 32 | Pending |
| JSON-09 | Phase 32 | Pending |
| JSON-10 | Phase 32 | Pending |
| JSON-11 | Phase 32 | Pending |
| DEBT-01 | Phase 33 | Pending |
| DEBT-02 | Phase 33 | Pending |
| DEBT-03 | Phase 33 | Pending |
| DEBT-04 | Phase 33 | Pending |
| DB-01 | Phase 34 | Pending |
| DB-02 | Phase 34 | Pending |
| DB-03 | Phase 34 | Pending |
| DB-04 | Phase 34 | Pending |
| DB-05 | Phase 34 | Pending |
| DB-06 | Phase 34 | Pending |
| DB-07 | Phase 34 | Pending |
| DB-08 | Phase 34 | Pending |
| DB-09 | Phase 34 | Pending |
| DB-10 | Phase 34 | Pending |

**Coverage:**
- v2.5 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-23*
*Last updated: 2026-04-23 after initial definition*
