# Phase 19: Analysis Submission Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 19-analysis-submission-flow
**Areas discussed:** Log Submission placement, Company/role auto-extraction, Stale analysis detection, Orphaned override handling

---

## Log Submission Placement

### Button placement

| Option | Description | Selected |
|--------|-------------|----------|
| Both screens | Add to OptimizeVariant alongside existing AnalysisResults button | :heavy_check_mark: |
| AnalysisResults only | Keep single location | |
| OptimizeVariant only | Move from dashboard to optimize view | |

**User's choice:** Both screens

### Flow from OptimizeVariant

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to SubmissionLogForm | Same form, same flow as AnalysisResults | :heavy_check_mark: |
| Inline submission in OptimizeVariant | Compact form in optimize view | |
| Modal dialog | Popup over optimize view | |

**User's choice:** Navigate to SubmissionLogForm

### Inline edit location (ANLYS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| AnalysisResults metadata bar | Click-to-edit inline in results view | :heavy_check_mark: |
| AnalysisList table row | Editable in list table | |
| Both locations | Editable everywhere | |

**User's choice:** AnalysisResults metadata bar

---

## Company/Role Auto-Extraction

### Extraction timing

| Option | Description | Selected |
|--------|-------------|----------|
| At paste-time in NewAnalysisForm | Regex/heuristics at paste | |
| LLM extraction at paste-time | Call LLM on paste | |
| Only during analysis (current) | Extract during analysis run | :heavy_check_mark: |

**User's choice:** Only during analysis (current behavior)
**Follow-up:** Simple regex extraction was selected to satisfy ANLYS-02

### Regex extraction for ANLYS-02

| Option | Description | Selected |
|--------|-------------|----------|
| Simple regex extraction | Parse common patterns at paste-time, auto-fill fields | :heavy_check_mark: |
| Skip auto-extract entirely | Leave manual until LLM runs | |

**User's choice:** Simple regex extraction

---

## Stale Analysis Detection

### What constitutes stale

| Option | Description | Selected |
|--------|-------------|----------|
| Bullet text or variant structure changed | Compare against relevant updatedAt timestamps | :heavy_check_mark: |
| Any base data change | Broader detection including profile, skills, metadata | |
| Manual staleness flag | User-triggered only | |

**User's choice:** Bullet text or variant structure changed

### Computation approach

| Option | Description | Selected |
|--------|-------------|----------|
| On-demand when viewed | Derive at read time, no stored column | :heavy_check_mark: |
| Stored stale flag | Boolean column updated by triggers | |

**User's choice:** On-demand when viewed

### UI indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Warning badge + re-analyze prompt | Amber banner, non-blocking, includes re-analyze button | :heavy_check_mark: |
| Blocking stale state | Disable submission/optimize when stale | |
| Subtle indicator only | Small icon, no banner | |

**User's choice:** Warning badge + re-analyze prompt

---

## Orphaned Override Handling

### What to show

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful notice with strikethrough | Muted/strikethrough styling + "Original bullet was deleted" | :heavy_check_mark: |
| Auto-remove orphaned overrides | Silently delete override rows | |
| Filter out silently | Skip in rendering, don't show or delete | |

**User's choice:** Graceful notice with strikethrough

### Detection approach

| Option | Description | Selected |
|--------|-------------|----------|
| JOIN check at load time | LEFT JOIN overrides against jobBullets, NULL = orphaned | :heavy_check_mark: |
| Pre-check on analysis open | Separate query for orphaned overrides | |

**User's choice:** JOIN check at load time

---

## Claude's Discretion

- Exact regex patterns for company/role extraction
- Warning badge styling details
- Strikethrough styling for orphans
- Whether stale indicator shows in AnalysisList
- updatedAt column on jobBullets if needed

## Deferred Ideas

None -- discussion stayed within phase scope
