/**
 * Shared margin constants.
 *
 * MARGIN_FLOOR — the minimum allowed margin value in inches.
 * Consumed by:
 *   - Phase 40: slider `min` attribute in OptimizeVariant margin controls (D-02/D-03)
 *   - Phase 41: auto-fit clamp lower bound (prevents infinite shrink)
 *
 * Keeping this in one place ensures the manual-drag floor and the auto-fit
 * floor can never drift apart (CONTEXT.md D-03).
 */
export const MARGIN_FLOOR = 0.4  // inches
