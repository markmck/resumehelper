import { describe, test, expect } from 'vitest'
import { deriveOverrideSet } from '../../../src/renderer/src/components/overrideIndicator'
import type { VariantOverrideRow } from '../../../src/preload/index.d'

/**
 * Phase 37 Plan 02 — RED→GREEN unit coverage for deriveOverrideSet (RWD-04).
 *
 * deriveOverrideSet is the pure derivation extracted from Phase 36 D-03
 * ("getVariantOverrides returns RAW rows; the UI derives the indicator by
 * matching"). It consumes already-fetched VariantOverrideRow[] and produces
 * an OverrideSet the JSX consults to mark overridden fields. Locked tokens:
 * 'job_bullet' / 'project_name' / 'summary' (verbatim, matching the Phase 36
 * setVariantOverride / merge handlers). No DB, no React — plain literals.
 */

function row(partial: Partial<VariantOverrideRow>): VariantOverrideRow {
  return {
    entityType: 'job_bullet',
    field: 'text',
    bulletId: null,
    projectId: null,
    overrideText: 'x',
    source: 'user',
    createdAt: 0,
    ...partial,
  }
}

describe('deriveOverrideSet (RWD-04)', () => {
  test('empty input → empty sets and hasSummary false', () => {
    const set = deriveOverrideSet([])
    expect(set.bullets.size).toBe(0)
    expect(set.projects.size).toBe(0)
    expect(set.hasSummary).toBe(false)
  })

  test('a job_bullet row populates bullets only', () => {
    const set = deriveOverrideSet([row({ entityType: 'job_bullet', bulletId: 5 })])
    expect(set.bullets.has(5)).toBe(true)
    expect(set.bullets.size).toBe(1)
    expect(set.projects.size).toBe(0)
    expect(set.hasSummary).toBe(false)
  })

  test('a project_name row populates projects only', () => {
    const set = deriveOverrideSet([
      row({ entityType: 'project_name', field: 'name', projectId: 9 }),
    ])
    expect(set.projects.has(9)).toBe(true)
    expect(set.projects.size).toBe(1)
    expect(set.bullets.size).toBe(0)
    expect(set.hasSummary).toBe(false)
  })

  test('a summary row sets hasSummary true', () => {
    const set = deriveOverrideSet([row({ entityType: 'summary', field: 'text' })])
    expect(set.hasSummary).toBe(true)
    expect(set.bullets.size).toBe(0)
    expect(set.projects.size).toBe(0)
  })

  test('mixed rows populate all three correctly; no cross-contamination', () => {
    const set = deriveOverrideSet([
      row({ entityType: 'job_bullet', bulletId: 5 }),
      row({ entityType: 'job_bullet', bulletId: 6 }),
      row({ entityType: 'project_name', field: 'name', projectId: 9 }),
      row({ entityType: 'summary', field: 'text' }),
    ])
    expect(set.bullets.has(5)).toBe(true)
    expect(set.bullets.has(6)).toBe(true)
    expect(set.bullets.size).toBe(2)
    expect(set.projects.has(9)).toBe(true)
    expect(set.projects.size).toBe(1)
    expect(set.hasSummary).toBe(true)
    // a job_bullet row does NOT add to projects, and vice-versa
    expect(set.projects.has(5)).toBe(false)
    expect(set.bullets.has(9)).toBe(false)
  })

  test('rows with null FK ids are skipped (no NaN/null in sets)', () => {
    const set = deriveOverrideSet([
      row({ entityType: 'job_bullet', bulletId: null }),
      row({ entityType: 'project_name', field: 'name', projectId: null }),
    ])
    expect(set.bullets.size).toBe(0)
    expect(set.projects.size).toBe(0)
    expect(set.hasSummary).toBe(false)
  })
})
