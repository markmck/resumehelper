import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('cover letter export guards', () => {
  test('D-15: CoverLetterPrintApp does not reference resolveTemplate, PagedContent, or TEMPLATE_DEFAULTS', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../../src/renderer/src/CoverLetterPrintApp.tsx'),
      'utf-8',
    )
    expect(source).not.toMatch(/resolveTemplate/)
    expect(source).not.toMatch(/PagedContent/)
    expect(source).not.toMatch(/TEMPLATE_DEFAULTS/)
  })

  test('D-15: print-letter.html carries the same Content-Security-Policy as print.html', () => {
    const printHtml = readFileSync(resolve(__dirname, '../../../../src/renderer/print.html'), 'utf-8')
    const letterHtml = readFileSync(
      resolve(__dirname, '../../../../src/renderer/print-letter.html'),
      'utf-8',
    )

    const extractCsp = (html: string): string => {
      const match = html.match(/content="([^"]*)"/)
      if (!match) throw new Error('CSP content attribute not found')
      return match[1]
    }

    expect(extractCsp(letterHtml)).toBe(extractCsp(printHtml))
  })

  test('V5: CoverLetterPrintApp does not use dangerouslySetInnerHTML', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../../src/renderer/src/CoverLetterPrintApp.tsx'),
      'utf-8',
    )
    expect(source).not.toMatch(/dangerouslySetInnerHTML/)
  })
})
