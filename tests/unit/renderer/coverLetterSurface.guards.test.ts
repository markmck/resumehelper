import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Phase 42 Plan 06 — source guards for the cover-letter renderer surface.
 *
 * This project has no click-simulation harness (`@testing-library/react` is not
 * installed) and adding one is explicitly out of scope (42-VALIDATION.md). These
 * are static `readFileSync` source assertions, NOT interaction tests. The real
 * behavioral gate for the D-12/T-03 gating and the PDF layout is the manual
 * checkpoint (task 06.4).
 */

const logFormPath = resolve(
  __dirname,
  '../../../src/renderer/src/components/SubmissionLogForm.tsx',
)
const detailViewPath = resolve(
  __dirname,
  '../../../src/renderer/src/components/SubmissionDetailView.tsx',
)

const logFormSource = readFileSync(logFormPath, 'utf-8')
const detailViewSource = readFileSync(detailViewPath, 'utf-8')

// Strip comment-only lines before any "does NOT contain" assertion, so
// explanatory comments referencing forbidden identifiers cannot invalidate
// their own guard.
function stripComments(source: string): string {
  return source
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
}

const logFormNoComments = stripComments(logFormSource)
const detailViewNoComments = stripComments(detailViewSource)

describe('SubmissionLogForm cover letter guards', () => {
  test('D-12 / T-03: the generate button disabled expression gates on linkedAnalysis == null', () => {
    expect(logFormSource).toContain('linkedAnalysis == null')
  })

  test('D-12: a visible "Requires a linked analysis" reason is rendered', () => {
    expect(logFormSource).toContain('Requires a linked analysis')
  })

  test('calls generateCoverLetter and saveCoverLetterDraft through the preload bridge', () => {
    expect(logFormSource).toContain('window.api.ai.generateCoverLetter(')
    expect(logFormSource).toContain('window.api.ai.saveCoverLetterDraft(')
  })

  test('D-10 / T-02: no window.confirm overwrite-warning guard exists', () => {
    expect(logFormNoComments).not.toContain('window.confirm')
  })

  test('D-13: no InlineEdit per-field editor is used for the letter', () => {
    expect(logFormNoComments).not.toContain('InlineEdit')
  })

  test('ASVS V5: no dangerouslySetInnerHTML in the log form', () => {
    expect(logFormSource).not.toContain('dangerouslySetInnerHTML')
  })

  test('handleSubmit threads coverLetter into the submissions.create payload', () => {
    const start = logFormSource.indexOf('const handleSubmit')
    expect(start).toBeGreaterThan(-1)
    const rest = logFormSource.slice(start + 'const handleSubmit'.length)
    const nextConstIdx = rest.indexOf('\n  const ')
    const handleSubmitSlice = nextConstIdx === -1 ? rest : rest.slice(0, nextConstIdx)
    expect(handleSubmitSlice).toContain('coverLetter:')
  })

  test('handleSubmit does not also call saveCoverLetterDraft (no double-write race)', () => {
    const start = logFormSource.indexOf('const handleSubmit')
    expect(start).toBeGreaterThan(-1)
    const rest = logFormSource.slice(start + 'const handleSubmit'.length)
    const nextConstIdx = rest.indexOf('\n  const ')
    const handleSubmitSlice = nextConstIdx === -1 ? rest : rest.slice(0, nextConstIdx)
    expect(handleSubmitSlice).not.toContain('saveCoverLetterDraft')
  })
})

describe('SubmissionDetailView cover letter guards', () => {
  test('D-11 / Pitfall 2: exports from the frozen resumeSnapshot, never a live getCoverLetter query', () => {
    expect(detailViewSource).toContain('resumeSnapshot')
    expect(detailViewNoComments).not.toContain('getCoverLetter')
  })

  test('renders the letter with pre-wrap whitespace and calls coverLetterPdf', () => {
    expect(detailViewSource).toContain('window.api.exportFile.coverLetterPdf(')
    expect(detailViewSource).toContain('parsed.coverLetter')
    expect(detailViewSource).toContain("whiteSpace: 'pre-wrap'")
  })

  test('ASVS V5: no dangerouslySetInnerHTML in the detail view', () => {
    expect(detailViewSource).not.toContain('dangerouslySetInnerHTML')
  })
})
