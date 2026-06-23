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
 * Estimate whether auto-fit is feasible before the iteration loop begins.
 *
 * Uses a pessimistic upper-bound: assumes all current pages are fully packed
 * (contentHeightEst = pageCount × currentUsable). If that estimate already fits
 * within the floor usable height, returns true (worth trying). If it cannot
 * possibly fit even at the floor, returns false immediately.
 *
 * This is a fast pre-flight check — the actual loop still re-measures after
 * every step and may stop earlier.
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
  const currentUsable = usableHeightPx(marginTop, marginBottom)
  const floorUsable = usableHeightPx(floor, floor)
  const pageCount = pageCountFromIframeHeight(iframeHeight)
  // Pessimistic content height upper bound
  const contentHeightEst = pageCount * currentUsable
  return contentHeightEst <= floorUsable
}
