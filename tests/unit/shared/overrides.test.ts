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
})
