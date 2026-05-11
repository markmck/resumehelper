import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from '../../../src/shared/sanitizeFilename'

describe('sanitizeFilename', () => {
  it('replaces whitespace runs with underscores', () => {
    expect(sanitizeFilename('Mark Mc Donald')).toBe('Mark_Mc_Donald')
  })

  it('strips characters outside [a-zA-Z0-9_-]', () => {
    expect(sanitizeFilename('foo/bar*baz?.txt')).toBe('foobarbaztxt')
  })

  it('preserves alphanumerics, underscores, and hyphens', () => {
    expect(sanitizeFilename('A_B-C_123')).toBe('A_B-C_123')
  })
})
