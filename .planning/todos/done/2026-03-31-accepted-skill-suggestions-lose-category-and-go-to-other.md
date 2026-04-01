---
created: 2026-03-31T23:40:00.000Z
title: Accepted skill suggestions lose category and go to Other
area: ui
files:
  - src/renderer/src/components/OptimizeVariant.tsx
  - src/main/handlers/ai.ts
  - src/main/handlers/submissions.ts
---

## Problem

When accepting AI-suggested skills during optimization, the accepted skills get placed into the "Other" category instead of preserving the category suggested by the AI analysis. The `analysis_skill_additions` table has a `category` column that stores the AI's suggested category (e.g., "Cloud & DevOps"), but when these skills are rendered in the preview or merged into a snapshot, the category mapping is lost and they default to "Other".

## Solution

Trace the data flow from `analysis_skill_additions.category` through to wherever accepted skills are rendered or merged. The issue is likely in one of:
1. `buildSnapshotForVariant` in submissions.ts — the skill addition merge may not be mapping the `category` field to `categoryName` correctly
2. The preview rendering path — `getBuilderData` may return accepted skill additions without their category
3. The `ensureSkillAdditions` seeding — the category from `gapSkills` in the analysis may not be getting stored correctly

Fix whichever link in the chain is dropping the category value.
