/**
 * Auto-fit pure math helpers — Phase 41 plan 01.
 *
 * Zero imports. No React, no DOM, no side effects.
 * All margin floor enforcement uses MARGIN_FLOOR from marginConstants.ts as a
 * *parameter* (callers supply it) so this module stays free of cross-module deps.
 *
 * Consumers:
 *   - OptimizeVariant.tsx (auto-fit iteration loop)
 *   - tests/unit/shared/autoFit.test.ts (unit coverage)
 *
 * PAGE_HEIGHT_PX mirrors PAGE_HEIGHT in PrintApp.tsx (line 6).
 * PAGE_GAP_PX mirrors the 16px gap between stacked page boxes in the preview.
 * These are declared locally — do NOT import across the iframe boundary.
 */

/** 11in × 96dpi — matches PAGE_HEIGHT in PrintApp.tsx. */
export const PAGE_HEIGHT_PX = 1056

/** Gap in pixels between stacked page boxes in the preview iframe. */
export const PAGE_GAP_PX = 16

/**
 * Derive page count from the total stacked-page iframe height.
 *
 * Inverse of: iframeHeight = n * PAGE_HEIGHT_PX + (n - 1) * PAGE_GAP_PX
 * Solving for n: n = (iframeHeight + PAGE_GAP_PX) / (PAGE_HEIGHT_PX + PAGE_GAP_PX)
 *
 * Always returns at least 1.
 */
export function pageCountFromIframeHeight(iframeHeight: number): number {
  return Math.max(1, Math.round((iframeHeight + PAGE_GAP_PX) / (PAGE_HEIGHT_PX + PAGE_GAP_PX)))
}

/**
 * Derive usable height per page (in pixels) given top and bottom margins in inches.
 *
 * Mirrors PrintApp.tsx PagedContent:
 *   usableHeight = PAGE_HEIGHT - Math.round(marginTopIn * 96) - Math.round(marginBottomIn * 96)
 */
export function usableHeightPx(marginTopIn: number, marginBottomIn: number): number {
  return PAGE_HEIGHT_PX - Math.round(marginTopIn * 96) - Math.round(marginBottomIn * 96)
}

/**
 * Compute the next margin step toward the floor.
 *
 * Subtracts `stepIn` from each margin, applies `parseFloat(.toFixed(4))` to guard
 * against float drift (Pitfall 7), then clamps to `floor` via Math.max.
 *
 * Returns null when no margin changed (all three were already at or below floor).
 *
 * @param top - current top margin in inches
 * @param bottom - current bottom margin in inches
 * @param sides - current sides margin in inches
 * @param floor - minimum allowed margin value (e.g. MARGIN_FLOOR = 0.4)
 * @param stepIn - step size in inches (e.g. 0.05)
 */
export function nextMarginStep(
  top: number,
  bottom: number,
  sides: number,
  floor: number,
  stepIn: number
): { top: number; bottom: number; sides: number } | null {
  const newTop = Math.max(floor, parseFloat((top - stepIn).toFixed(4)))
  const newBottom = Math.max(floor, parseFloat((bottom - stepIn).toFixed(4)))
  const newSides = Math.max(floor, parseFloat((sides - stepIn).toFixed(4)))
  if (newTop === top && newBottom === bottom && newSides === sides) return null
  return { top: newTop, bottom: newBottom, sides: newSides }
}

/**
 * Returns true when all three margins are at or below the floor.
 *
 * Uses `<=` so that a value already clamped slightly below floor (due to
 * external rounding) still registers as "at floor".
 */
export function allAtFloor(top: number, bottom: number, sides: number, floor: number): boolean {
  return top <= floor && bottom <= floor && sides <= floor
}

/**
 * Decide whether auto-fit is worth attempting before the iteration loop begins.
 *
 * Auto-fit only collapses a single orphan page — the iteration loop in
 * OptimizeVariant bails when there are more than 2 pages — so feasibility breaks
 * down by page count:
 *   - ≤ 1 page  → already fits, trivially true.
 *   - > 2 pages → cannot be margin-fit; false.
 *   - = 2 pages → worth trying *iff* there is vertical headroom left to shrink,
 *     i.e. the current top/bottom margins are still above the floor. (The exact
 *     content height isn't directly measurable from the stacked iframe — each
 *     page box is a fixed PAGE_HEIGHT_PX regardless of fill — so this is an
 *     optimistic gate. The step-and-remeasure loop re-measures after every step
 *     and remains the source of truth, reporting "cannot fit" if it reaches the
 *     floor still on two pages.)
 *
 * NB: the previous implementation used `pageCount × currentUsable` as a content
 * estimate and required it to fit within a single floor page, which is
 * impossible for any real two-page document — so it always returned false and
 * auto-fit never ran.
 *
 * @param iframeHeight - total stacked iframe height from the print-height postMessage
 * @param marginTop - current top margin in inches
 * @param marginBottom - current bottom margin in inches
 * @param floor - minimum allowed margin value (e.g. MARGIN_FLOOR = 0.4)
 */
export function canAutoFitSucceed(
  iframeHeight: number,
  marginTop: number,
  marginBottom: number,
  floor: number
): boolean {
  const pageCount = pageCountFromIframeHeight(iframeHeight)
  if (pageCount <= 1) return true
  if (pageCount > 2) return false
  // Two pages: feasible only while there's still room to tighten the margins.
  return usableHeightPx(marginTop, marginBottom) < usableHeightPx(floor, floor)
}
