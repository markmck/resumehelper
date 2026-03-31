---
created: 2026-03-31T23:37:43.880Z
title: Add margin controls to OptimizeVariant preview
area: ui
files:
  - src/renderer/src/components/OptimizeVariant.tsx
  - src/renderer/src/components/VariantPreview.tsx
  - src/renderer/src/components/VariantBuilder.tsx
---

## Problem

When optimizing variants (reviewing AI suggestions in OptimizeVariant), there is no way to adjust the resume margins. The VariantBuilder has margin sliders (marginTop, marginBottom, marginSides) via templateOptions, but the OptimizeVariant screen only shows the preview without margin controls. Users need to go back to the variant builder to tweak margins, then return to the optimize screen — extra navigation for a common adjustment.

## Solution

Add margin slider controls (or at minimum expose the existing templateOptions margin values) to the OptimizeVariant screen's preview pane. Could reuse the same margin slider components from VariantBuilder, or add a simplified controls panel next to the VariantPreview iframe. The preview already receives templateOptions via getBuilderData — the controls just need to be surfaced in the OptimizeVariant UI.
