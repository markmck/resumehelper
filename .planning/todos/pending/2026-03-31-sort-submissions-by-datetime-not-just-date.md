---
created: 2026-03-31T23:39:00.000Z
title: Sort submissions by datetime not just date
area: ui
files:
  - src/renderer/src/components/SubmissionsTab.tsx
  - src/main/handlers/submissions.ts
---

## Problem

Submissions list sorts by date but not by time within the same day. When multiple submissions are logged on the same day, they appear in arbitrary order rather than most-recent-first. This makes it hard to find the latest submission when applying to several jobs in one session.

## Solution

Ensure the submissions query orders by the full datetime (including time component), not just the date portion. The `submittedAt` or `createdAt` column likely stores a Unix timestamp — the ORDER BY should use the raw timestamp value descending so same-day submissions sort by time. Check if the frontend is also truncating to date-only when sorting.
