/**
 * Phase 41 Plan 05 RED tests — analysis→variant pure transforms.
 *
 * bakeAnalysisOverrideRows: maps analysis-tier entity_overrides rows to variant-tier rows
 * by rebinding variantId and setting analysisId=null. Covers all four override kinds.
 *
 * mergeMarginIntoOptions: merges margin override into a variant's templateOptions JSON.
 * Handles null override (passthrough), null existing, accentColor/showSummary preservation,
 * and malformed JSON fallback.
 *
 * No DB, no IO — pure function tests only.
 */
import { describe, it, expect } from 'vitest'
import {
  bakeAnalysisOverrideRows,
  mergeMarginIntoOptions,
} from '../../../../src/main/handlers/templates'

describe('bakeAnalysisOverrideRows', () => {
  it('case 1: accepted rewrite (job_bullet, field=text, source=ai_suggestion, bulletId set) — variantId rebinds, analysisId=null', () => {
    const rows = [
      {
        entityType: 'job_bullet',
        field: 'text',
        bulletId: 42,
        projectId: null,
        jobId: null,
        projectBulletId: null,
        overrideText: 'Rewrote this bullet',
        source: 'ai_suggestion',
      },
    ]
    const result = bakeAnalysisOverrideRows(rows, 99)
    expect(result).toHaveLength(1)
    expect(result[0].variantId).toBe(99)
    expect(result[0].analysisId).toBeNull()
    expect(result[0].entityType).toBe('job_bullet')
    expect(result[0].field).toBe('text')
    expect(result[0].bulletId).toBe(42)
    expect(result[0].projectId).toBeNull()
    expect(result[0].jobId).toBeNull()
    expect(result[0].projectBulletId).toBeNull()
    expect(result[0].overrideText).toBe('Rewrote this bullet')
    expect(result[0].source).toBe('ai_suggestion')
  })

  it('case 2: re-included excluded bullet (field=inclusion, source=inclusion, overrideText=empty string) — all fields preserved', () => {
    const rows = [
      {
        entityType: 'job_bullet',
        field: 'inclusion',
        bulletId: 7,
        projectId: null,
        jobId: null,
        projectBulletId: null,
        overrideText: '',
        source: 'inclusion',
      },
    ]
    const result = bakeAnalysisOverrideRows(rows, 55)
    expect(result).toHaveLength(1)
    expect(result[0].variantId).toBe(55)
    expect(result[0].analysisId).toBeNull()
    expect(result[0].field).toBe('inclusion')
    expect(result[0].overrideText).toBe('')
    expect(result[0].source).toBe('inclusion')
    expect(result[0].bulletId).toBe(7)
  })

  it('case 3: summary override (entityType=summary, field=text, bulletId=null) — transforms correctly', () => {
    const rows = [
      {
        entityType: 'summary',
        field: 'text',
        bulletId: null,
        projectId: null,
        jobId: null,
        projectBulletId: null,
        overrideText: 'My tailored summary',
        source: 'ai_suggestion',
      },
    ]
    const result = bakeAnalysisOverrideRows(rows, 77)
    expect(result).toHaveLength(1)
    expect(result[0].variantId).toBe(77)
    expect(result[0].analysisId).toBeNull()
    expect(result[0].entityType).toBe('summary')
    expect(result[0].field).toBe('text')
    expect(result[0].bulletId).toBeNull()
    expect(result[0].overrideText).toBe('My tailored summary')
  })

  it('case 4: project_name override (entityType=project_name, field=text, projectId set) — transforms correctly', () => {
    const rows = [
      {
        entityType: 'project_name',
        field: 'text',
        bulletId: null,
        projectId: 13,
        jobId: null,
        projectBulletId: null,
        overrideText: 'Renamed Project',
        source: 'user',
      },
    ]
    const result = bakeAnalysisOverrideRows(rows, 20)
    expect(result).toHaveLength(1)
    expect(result[0].variantId).toBe(20)
    expect(result[0].analysisId).toBeNull()
    expect(result[0].entityType).toBe('project_name')
    expect(result[0].projectId).toBe(13)
    expect(result[0].bulletId).toBeNull()
    expect(result[0].overrideText).toBe('Renamed Project')
    expect(result[0].source).toBe('user')
  })

  it('case 5: multiple rows — all get variantId=newVariantId and analysisId=null invariants', () => {
    const rows = [
      { entityType: 'job_bullet', field: 'text', bulletId: 1, projectId: null, jobId: null, projectBulletId: null, overrideText: 'A', source: 'ai_suggestion' },
      { entityType: 'summary',    field: 'text', bulletId: null, projectId: null, jobId: null, projectBulletId: null, overrideText: 'B', source: 'ai_suggestion' },
      { entityType: 'project_name', field: 'text', bulletId: null, projectId: 5, jobId: null, projectBulletId: null, overrideText: 'C', source: 'user' },
    ]
    const result = bakeAnalysisOverrideRows(rows, 101)
    expect(result).toHaveLength(3)
    for (const row of result) {
      expect(row.variantId).toBe(101)
      expect(row.analysisId).toBeNull()
    }
  })

  it('case 6: empty input array → empty output array', () => {
    const result = bakeAnalysisOverrideRows([], 5)
    expect(result).toEqual([])
  })
})

describe('mergeMarginIntoOptions', () => {
  it('case 1: null layoutOverride → returns existingOptionsJson unchanged (non-null)', () => {
    const existing = JSON.stringify({ accentColor: '#ff0000' })
    const result = mergeMarginIntoOptions(existing, null)
    expect(result).toBe(existing)
  })

  it('case 2: null layoutOverride + null existing → returns null (passthrough)', () => {
    const result = mergeMarginIntoOptions(null, null)
    expect(result).toBeNull()
  })

  it('case 3: override present + null existing → JSON string with exactly the three margin keys', () => {
    const override = { marginTop: 0.5, marginBottom: 0.6, marginSides: 0.4 }
    const result = mergeMarginIntoOptions(null, override)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result!)
    expect(parsed.marginTop).toBe(0.5)
    expect(parsed.marginBottom).toBe(0.6)
    expect(parsed.marginSides).toBe(0.4)
    // Only three keys
    expect(Object.keys(parsed)).toHaveLength(3)
  })

  it('case 4: override + existing JSON with accentColor/showSummary → margins merged in AND existing keys preserved', () => {
    const existing = JSON.stringify({ accentColor: '#336699', showSummary: true })
    const override = { marginTop: 0.75, marginBottom: 0.80, marginSides: 0.55 }
    const result = mergeMarginIntoOptions(existing, override)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result!)
    expect(parsed.accentColor).toBe('#336699')
    expect(parsed.showSummary).toBe(true)
    expect(parsed.marginTop).toBe(0.75)
    expect(parsed.marginBottom).toBe(0.80)
    expect(parsed.marginSides).toBe(0.55)
  })

  it('case 5: override + malformed existing JSON → treats existing as empty object (no throw), returns margins only', () => {
    const override = { marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 }
    const result = mergeMarginIntoOptions('not-valid-json{{', override)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result!)
    expect(parsed.marginTop).toBe(1.0)
    expect(parsed.marginBottom).toBe(1.0)
    expect(parsed.marginSides).toBe(1.0)
  })
})
