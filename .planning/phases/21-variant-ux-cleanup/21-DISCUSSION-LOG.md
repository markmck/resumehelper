# Phase 21: Variant UX + Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 21-variant-ux-cleanup
**Areas discussed:** Job toggle behavior, Coming soon cleanup scope, Modern template skills fix

---

## Job Toggle Behavior

### Toggle UI control

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox on job header | Matches existing bullet checkbox pattern | :heavy_check_mark: |
| Toggle switch | Different control type from bullets | |
| Click entire header | No visible control, click-based | |

**User's choice:** Checkbox on job header

### Bullet visibility when job excluded

| Option | Description | Selected |
|--------|-------------|----------|
| Visible but disabled | Grayed out, retains visibility | :heavy_check_mark: |
| Hidden entirely | Collapse bullet list | |
| Visible and interactive | Re-include job on bullet toggle | |

**User's choice:** Visible but disabled

---

## Coming Soon Cleanup

### Handling both occurrences

| Option | Description | Selected |
|--------|-------------|----------|
| Remove both | Remove From URL tab and fix Submit button | |
| Remove Phase 11 reference only | Fix Submit, keep From URL as disabled | :heavy_check_mark: |
| Remove all disabled placeholders | Full scan for all placeholder text | |

**User's choice:** Remove Phase 11 reference only (keep From URL tab)

### Submit button behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Wire to Log Submission flow | Enable and navigate to SubmissionLogForm | :heavy_check_mark: |
| Remove the button entirely | Other entry points cover it | |
| Show Submitted status | Replace with status indicator | |

**User's choice:** Wire to Log Submission flow

---

## Modern Template Skills Fix

### Fix approach

| Option | Description | Selected |
|--------|-------------|----------|
| Add word-wrap CSS | overflowWrap + wordBreak on container | :heavy_check_mark: |
| Switch to flex-wrap chips | Each skill as inline chip | |
| Truncate with ellipsis | Hide overflow | |

**User's choice:** Add word-wrap CSS

---

## Claude's Discretion

- Checkbox placement/styling on job header
- Visual indicator for excluded job headers
- Whether to scan for other "coming soon" instances

## Deferred Ideas

None -- discussion stayed within phase scope
