import { describe, it, expect } from 'vitest'
import { extractJsonFromText } from '../../../../src/main/lib/aiProvider'

describe('extractJsonFromText', () => {
  it('parses fenced JSON with language hint', () => {
    const input = '```json\n{"a":1}\n```'
    expect(extractJsonFromText(input)).toEqual({ a: 1 })
  })

  it('parses fenced JSON without language hint', () => {
    const input = '```\n{"b":2}\n```'
    expect(extractJsonFromText(input)).toEqual({ b: 2 })
  })

  it('parses unfenced JSON', () => {
    expect(extractJsonFromText('{"c":3}')).toEqual({ c: 3 })
  })

  it('handles leading and trailing whitespace', () => {
    expect(extractJsonFromText('  \n  {"d":4}  \n  ')).toEqual({ d: 4 })
  })

  it('parses minimal valid JSON (empty object)', () => {
    expect(extractJsonFromText('{}')).toEqual({})
  })

  it('parses JSON arrays', () => {
    expect(extractJsonFromText('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('throws on malformed JSON (unfenced)', () => {
    expect(() => extractJsonFromText('{invalid json}')).toThrow()
  })

  it('throws on malformed JSON inside a code fence', () => {
    expect(() => extractJsonFromText('```json\nnot valid\n```')).toThrow()
  })
})
