import type { VariantOverrideRow } from '../../../preload/index.d'

/**
 * Phase 37 D-03 indicator derivation (RWD-04), extracted as a pure helper.
 *
 * Phase 36 D-03 locked in that `getVariantOverrides` returns RAW variant-tier
 * rows and the UI derives the per-field "overridden" indicator by matching
 * those rows against the builder fields it already renders. This isolates that
 * matching from the JSX so it is unit-testable without a renderer harness.
 *
 * Locked tokens (verbatim, matching the Phase 36 setVariantOverride / merge
 * handlers — see src/main/handlers/templates.ts):
 *   - 'job_bullet'   → bullet text override, keyed on bulletId
 *   - 'project_name' → project title override, keyed on projectId
 *   - 'summary'      → variant summary override, no FK (one summary per variant)
 */

export interface OverrideSet {
  /** bulletId of every overridden job bullet */
  bullets: Set<number>
  /** projectId of every overridden project title */
  projects: Set<number>
  /** true iff the variant has a summary override (no FK to match) */
  hasSummary: boolean
}

/**
 * Map raw variant-override rows to the set of overridden entity ids + a summary
 * flag. Pure: no side effects, no DB/IPC, no React. Rows whose FK id is null are
 * skipped (a malformed bullet/project row cannot mark any rendered field).
 */
export function deriveOverrideSet(rows: VariantOverrideRow[]): OverrideSet {
  const bullets = new Set<number>()
  const projects = new Set<number>()
  let hasSummary = false

  for (const row of rows) {
    if (row.entityType === 'job_bullet') {
      if (row.bulletId != null) bullets.add(row.bulletId)
    } else if (row.entityType === 'project_name') {
      if (row.projectId != null) projects.add(row.projectId)
    } else if (row.entityType === 'summary') {
      hasSummary = true
    }
  }

  return { bullets, projects, hasSummary }
}
