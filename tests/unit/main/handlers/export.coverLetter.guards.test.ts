import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('cover letter export guards', () => {
  test.todo('D-15: CoverLetterPrintApp does not reference resolveTemplate, PagedContent, or TEMPLATE_DEFAULTS')
  test.todo('D-15: print-letter.html carries the same Content-Security-Policy as print.html')
  test.todo('V5: CoverLetterPrintApp does not use dangerouslySetInnerHTML')
})
