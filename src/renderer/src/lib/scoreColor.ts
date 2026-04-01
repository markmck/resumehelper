/**
 * Score color utility — threshold-aware for OptimizeVariant, fixed bands elsewhere.
 *
 * When threshold is provided (OptimizeVariant only — D-09):
 *   green = score >= threshold
 *   yellow = score >= threshold - 15
 *   red = score < threshold - 15
 *
 * When threshold is omitted (AnalysisList, AnalysisResults, SubmissionLogForm — D-10/D-11):
 *   green = score >= 80
 *   yellow = score >= 50
 *   red = score < 50
 */
export function getScoreColor(score: number, threshold?: number): string {
  if (threshold != null) {
    if (score >= threshold) return 'var(--color-success)'
    if (score >= threshold - 15) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }
  if (score >= 80) return 'var(--color-success)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

export function getScoreBg(score: number, threshold?: number): string {
  if (threshold != null) {
    if (score >= threshold) return 'var(--color-success-bg)'
    if (score >= threshold - 15) return 'var(--color-warning-bg)'
    return 'var(--color-danger-bg)'
  }
  if (score >= 80) return 'var(--color-success-bg)'
  if (score >= 50) return 'var(--color-warning-bg)'
  return 'var(--color-danger-bg)'
}
