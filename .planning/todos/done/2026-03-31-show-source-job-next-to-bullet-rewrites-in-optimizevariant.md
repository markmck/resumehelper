---
created: 2026-03-31T23:38:00.000Z
title: Show source job next to bullet rewrites in OptimizeVariant
area: ui
files:
  - src/renderer/src/components/OptimizeVariant.tsx
---

## Problem

In the OptimizeVariant screen, bullet rewrite suggestions show the original and suggested text but don't indicate which job/company the bullet belongs to. The user sees the job of the application (the posting being analyzed) but not which of their experience entries the bullet comes from. When a user has many jobs with similar bullets, it's hard to tell which job a rewrite suggestion refers to without context.

## Solution

Display the source job (company + role) next to each bullet rewrite suggestion in OptimizeVariant. The bullet ID maps to a jobBullet which belongs to a job — the data is available via the builderData that's already loaded. Could show as a small label/tag above or beside each suggestion group: "From: Acme Corp — Senior Developer".
