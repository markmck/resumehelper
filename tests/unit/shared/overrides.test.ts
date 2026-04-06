import { describe, it, expect } from 'vitest'
import { applyOverrides, BulletOverride } from '../../../src/shared/overrides'

describe('applyOverrides', () => {
  it('returns bullets unchanged when no overrides exist', () => {
    const bullets = [{ id: 1, text: 'original' }]
    expect(applyOverrides(bullets, [])).toEqual([{ id: 1, text: 'original' }])
  })

  it('replaces text for matching bullet id', () => {
    const bullets = [{ id: 1, text: 'original' }]
    const overrides: BulletOverride[] = [
      { bulletId: 1, overrideText: 'replaced', source: 'ai_suggestion', suggestionId: null }
    ]
    const result = applyOverrides(bullets, overrides)
    expect(result).toEqual([{ id: 1, text: 'replaced' }])
  })

  it('leaves non-matching bullets unchanged', () => {
    const bullets = [
      { id: 1, text: 'first' },
      { id: 2, text: 'second' },
    ]
    const overrides: BulletOverride[] = [
      { bulletId: 1, overrideText: 'replaced', source: 'manual_edit', suggestionId: null }
    ]
    const result = applyOverrides(bullets, overrides)
    expect(result).toEqual([
      { id: 1, text: 'replaced' },
      { id: 2, text: 'second' },
    ])
  })

  it('empty bullets with empty overrides returns empty array', () => {
    expect(applyOverrides([], [])).toEqual([])
  })

  it('override for nonexistent bullet id is silently ignored (orphan)', () => {
    const bullets = [{ id: 1, text: 'original' }]
    const overrides: BulletOverride[] = [
      { bulletId: 99, overrideText: 'orphan', source: 'ai_suggestion', suggestionId: null }
    ]
    const result = applyOverrides(bullets, overrides)
    expect(result).toEqual([{ id: 1, text: 'original' }])
  })

  it('last override wins when multiple overrides target same bullet', () => {
    const bullets = [{ id: 1, text: 'original' }]
    const overrides: BulletOverride[] = [
      { bulletId: 1, overrideText: 'first', source: 'ai_suggestion', suggestionId: null },
      { bulletId: 1, overrideText: 'second', source: 'manual_edit', suggestionId: null },
    ]
    const result = applyOverrides(bullets, overrides)
    expect(result[0].text).toBe('second')
  })

  it('handles ai_suggestion and manual_edit sources identically', () => {
    const bullets = [
      { id: 1, text: 'first original' },
      { id: 2, text: 'second original' },
    ]
    const overrides: BulletOverride[] = [
      { bulletId: 1, overrideText: 'ai replaced', source: 'ai_suggestion', suggestionId: 'abc' },
      { bulletId: 2, overrideText: 'manual replaced', source: 'manual_edit', suggestionId: null },
    ]
    const result = applyOverrides(bullets, overrides)
    expect(result).toEqual([
      { id: 1, text: 'ai replaced' },
      { id: 2, text: 'manual replaced' },
    ])
  })
})
