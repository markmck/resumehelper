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

describe('export:coverLetterPdf handler guards (D-15 / D-11)', () => {
  const fullSource = readFileSync(
    resolve(__dirname, '../../../../src/main/handlers/export.ts'),
    'utf-8',
  )

  // Slice out just the export:coverLetterPdf handler body. Whole-file greps do NOT work here:
  // export.ts legitimately contains V2_TEMPLATES, DOCX_MARGIN_DEFAULTS, and layoutTemplate for
  // the resume export handlers.
  const handlerStart = fullSource.indexOf("'export:coverLetterPdf'")
  const nextHandlerIndex = fullSource.indexOf('ipcMain.handle(', handlerStart + 1)
  const handlerSliceRaw =
    nextHandlerIndex === -1
      ? fullSource.slice(handlerStart)
      : fullSource.slice(handlerStart, nextHandlerIndex)

  // Strip comment-only lines so the explanatory D-15/D-11 comment above the handler cannot
  // invalidate its own guard (it legitimately mentions the forbidden identifiers by name).
  const handlerSlice = handlerSliceRaw
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')

  test('handlerStart and nextHandlerIndex slice bounds were found', () => {
    expect(handlerStart).toBeGreaterThan(-1)
  })

  test('loads print-letter.html, never print.html', () => {
    expect(handlerSlice).toContain('print-letter.html')
    expect(handlerSlice).not.toMatch(/print\.html/)
  })

  test.each([
    'V2_TEMPLATES',
    'resolveTemplate',
    'DOCX_MARGIN_DEFAULTS',
    'layoutTemplate',
    'templateVariants',
    'buildMergedBuilderData',
  ])('does not reference %s (D-15 / T-05: layout is not template-aware)', (identifier) => {
    expect(handlerSlice).not.toContain(identifier)
  })

  test('does not reference coverLetters or cover_letters (D-11: no live re-query)', () => {
    expect(handlerSlice).not.toContain('coverLetters')
    expect(handlerSlice).not.toContain('cover_letters')
  })

  test('uses fixed 1in top/bottom margins, not template-derived', () => {
    expect(handlerSlice).toContain('margins: { top: 1, bottom: 1, left: 0, right: 0 }')
  })

  test('uses ipcMain.once for the print:ready handshake, not ipcMain.on (Pitfall 1)', () => {
    expect(handlerSlice).toContain("ipcMain.once('print:ready'")
  })

  test('main process does not import from renderer', () => {
    expect(fullSource).not.toMatch(/from ['"].*renderer/)
  })
})
