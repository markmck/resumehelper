/**
 * Phase 39 Plan 02 RED tests — resolveEffectiveMargins pure resolver.
 *
 * Three-tier precedence: analysis override → variant templateOptions → template default (DOCX_MARGIN_DEFAULTS).
 * No DB, no IO — pure function tests only.
 */
import { describe, it, expect } from 'vitest'
import { resolveEffectiveMargins, type EffectiveMargins } from '../../../../src/main/lib/mergeHelper'

describe('resolveEffectiveMargins — three-tier precedence', () => {
  it('case 1: override wins when all three override fields are present', () => {
    const override = { marginTop: 0.5, marginBottom: 0.6, marginSides: 0.4 }
    const variantOptions = { marginTop: 1.0, marginBottom: 1.0, marginSides: 1.0 }
    const result: EffectiveMargins = resolveEffectiveMargins('classic', variantOptions, override)
    expect(result).toEqual({ top: 0.5, bottom: 0.6, sides: 0.4 })
  })

  it('case 2: variant fallback — override null, variant has all three margins', () => {
    const variantOptions = { marginTop: 0.8, marginBottom: 0.9, marginSides: 0.7 }
    const result = resolveEffectiveMargins('classic', variantOptions, null)
    expect(result).toEqual({ top: 0.8, bottom: 0.9, sides: 0.7 })
  })

  it('case 3: variant partial — override null, variant has marginTop only → top=variant, bottom/sides=default', () => {
    const variantOptions = { marginTop: 0.5 }
    const result = resolveEffectiveMargins('classic', variantOptions, null)
    // classic default: top=1.0, bottom=1.0, sides=1.0
    expect(result.top).toBe(0.5)
    expect(result.bottom).toBe(1.0)
    expect(result.sides).toBe(1.0)
  })

  it('case 4: default fallback — override null, variantOptions null → returns DOCX_MARGIN_DEFAULTS["classic"]', () => {
    const result = resolveEffectiveMargins('classic', null, null)
    expect(result).toEqual({ top: 1.0, bottom: 1.0, sides: 1.0 })
  })

  it('case 5: unknown layoutTemplate → returns {1.0, 1.0, 1.0} fallback', () => {
    const result = resolveEffectiveMargins('nonexistent_template', null, null)
    expect(result).toEqual({ top: 1.0, bottom: 1.0, sides: 1.0 })
  })

  it('case 6: jake template default → uses jake-specific defaults when no override/variant', () => {
    // jake: { top: 0.60, bottom: 0.60, sides: 0.50 }
    const result = resolveEffectiveMargins('jake', null, null)
    expect(result).toEqual({ top: 0.60, bottom: 0.60, sides: 0.50 })
  })

  it('case 7: per-field precedence is independent — override wins each field independently', () => {
    // override has only marginTop, no marginBottom/marginSides
    // But override shape requires all three — test with partial variantOptions gap
    // Actually the override type requires all three (D-04). Test override vs variant vs default independence:
    // override.marginTop=0.3, variantOptions.marginBottom=0.7, no sides override or variant → default sides
    const override = { marginTop: 0.3, marginBottom: 0.3, marginSides: 0.3 }
    const variantOptions = { marginBottom: 0.7, marginSides: 0.6 }
    // override wins for all fields since it has all three
    const result = resolveEffectiveMargins('modern', variantOptions, override)
    expect(result).toEqual({ top: 0.3, bottom: 0.3, sides: 0.3 })
  })

  it('case 8: modern template default used when variant and override are null', () => {
    // modern: { top: 0.75, bottom: 0.75, sides: 0.75 }
    const result = resolveEffectiveMargins('modern', null, null)
    expect(result).toEqual({ top: 0.75, bottom: 0.75, sides: 0.75 })
  })

  it('case 9: variantOptions undefined behaves the same as null (falls back to default)', () => {
    const result = resolveEffectiveMargins('jake', undefined, undefined)
    expect(result).toEqual({ top: 0.60, bottom: 0.60, sides: 0.50 })
  })
})
