import { useEffect, useState } from 'react'

interface Gap {
  skill: string
  severity: 'critical' | 'moderate'
  reason?: string
}

interface RewriteSuggestion {
  original_text: string
  suggested_text: string
  target_keywords: string[]
}

interface ScoreBreakdown {
  keyword_score: number
  skills_score: number
  experience_score: number
  ats_score: number
}

interface AnalysisData {
  id: number
  jobPostingId: number
  variantId: number
  matchScore: number
  keywordHits: string[]
  keywordMisses: string[]
  semanticMatches: string[]
  gapSkills: Gap[]
  suggestions: RewriteSuggestion[]
  atsFlags: string[]
  scoreBreakdown: ScoreBreakdown | null
  status: string
  createdAt: Date
  company: string
  role: string
  variantName: string
}

interface ParsedAnalysis {
  raw: AnalysisData
  exactMatches: string[]
  missingKeywords: string[]
  semanticMatches: string[]
  gaps: Gap[]
  rewrites: RewriteSuggestion[]
  scoreBreakdown: ScoreBreakdown | null
}

interface Props {
  analysisId: number
  onBack: () => void
  onReanalyze: (jobPostingId: number, variantId: number) => void
  onOptimize: () => void
  onLogSubmission?: (analysisId: number) => void
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--color-success)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'var(--color-success-bg)'
  if (score >= 50) return 'var(--color-warning-bg)'
  return 'var(--color-danger-bg)'
}


function formatDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function AnalysisResults({ analysisId, onBack, onReanalyze, onOptimize, onLogSubmission }: Props): React.JSX.Element {
  const [analysis, setAnalysis] = useState<ParsedAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const raw = await window.api.jobPostings.getAnalysis(analysisId)
        if (!raw || 'error' in raw) {
          setError('Failed to load analysis data.')
          setLoading(false)
          return
        }

        const data = raw as unknown as AnalysisData
        setAnalysis({
          raw: data,
          exactMatches: data.keywordHits ?? [],
          missingKeywords: data.keywordMisses ?? [],
          semanticMatches: data.semanticMatches ?? [],
          gaps: data.gapSkills ?? [],
          rewrites: data.suggestions ?? [],
          scoreBreakdown: data.scoreBreakdown ?? null,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [analysisId])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-secondary)',
          gap: 'var(--space-3)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 18,
            height: 18,
            border: '2px solid var(--color-accent)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'ar-spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 'var(--font-size-sm)' }}>Loading analysis...</span>
        <style>{`@keyframes ar-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div style={{ padding: 'var(--space-8)', fontFamily: 'var(--font-sans)' }}>
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          <p style={{ color: 'var(--color-danger)', fontWeight: 600, margin: '0 0 var(--space-2) 0' }}>
            Failed to load analysis
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: '0 0 var(--space-4) 0' }}>
            {error ?? 'No data returned.'}
          </p>
          <button
            onClick={onBack}
            style={{
              padding: '6px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Back to analyses
          </button>
        </div>
      </div>
    )
  }

  const { raw, exactMatches, missingKeywords, semanticMatches, gaps, rewrites, scoreBreakdown } = analysis

  const totalKeywords = exactMatches.length + semanticMatches.length + missingKeywords.length
  const keywordCoverage = totalKeywords > 0
    ? Math.round(((exactMatches.length + semanticMatches.length * 0.5) / totalKeywords) * 100)
    : 0
  const atsScore = scoreBreakdown?.ats_score ?? 0
  const gapCount = gaps.length

  return (
    <div
      style={{
        padding: 'var(--space-6)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          background: 'none',
          border: 'none',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          padding: '0',
          marginBottom: 'var(--space-4)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        ← Back to analyses
      </button>

      {/* Job metadata bar */}
      <div
        style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4) var(--space-5)',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            {raw.role || 'Unknown Role'}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
            {raw.company || 'Unknown Company'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {raw.variantName && (
            <span
              style={{
                padding: '2px 10px',
                backgroundColor: 'rgba(139, 92, 246, 0.12)',
                color: 'var(--color-accent)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
              }}
            >
              {raw.variantName}
            </span>
          )}
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            Analyzed {formatDate(raw.createdAt)}
          </span>
        </div>
      </div>

      {/* 4 metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Match Score */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
            Match Score
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              color: getScoreColor(raw.matchScore),
              margin: '0 0 var(--space-1) 0',
              lineHeight: 1,
            }}
          >
            {raw.matchScore}%
          </p>
          <div
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              backgroundColor: getScoreBg(raw.matchScore),
              color: getScoreColor(raw.matchScore),
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
            }}
          >
            {raw.matchScore >= 80 ? 'Strong' : raw.matchScore >= 50 ? 'Moderate' : 'Weak'}
          </div>
        </div>

        {/* Keyword Coverage */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
            Keyword Coverage
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              color: getScoreColor(keywordCoverage),
              margin: '0 0 var(--space-1) 0',
              lineHeight: 1,
            }}
          >
            {keywordCoverage}%
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
            {exactMatches.length} exact · {semanticMatches.length} semantic
          </p>
        </div>

        {/* Skill Gaps */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
            Skill Gaps
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              color: gapCount === 0 ? 'var(--color-success)' : gapCount <= 3 ? 'var(--color-warning)' : 'var(--color-danger)',
              margin: '0 0 var(--space-1) 0',
              lineHeight: 1,
            }}
          >
            {gapCount}
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
            {gaps.filter((g) => g.severity === 'critical').length} critical
          </p>
        </div>

        {/* ATS Compatibility */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
          }}
        >
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
            ATS Compatibility
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              color: getScoreColor(atsScore),
              margin: '0 0 var(--space-1) 0',
              lineHeight: 1,
            }}
          >
            {atsScore}%
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
            {atsScore >= 80 ? 'ATS-friendly' : atsScore >= 50 ? 'Needs work' : 'Flagged'}
          </p>
        </div>
      </div>

      {/* Two-column layout: keywords+gaps | suggestions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Keyword Analysis */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-4) 0',
              }}
            >
              Keyword Analysis
            </h3>

            {/* Exact matches */}
            {exactMatches.length > 0 && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, margin: '0 0 var(--space-2) 0' }}>
                  Matched ({exactMatches.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {exactMatches.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        backgroundColor: 'rgba(34, 197, 94, 0.15)',
                        color: 'var(--color-success)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 500,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Semantic matches */}
            {semanticMatches.length > 0 && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, margin: '0 0 var(--space-2) 0' }}>
                  Semantic Matches ({semanticMatches.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {semanticMatches.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--color-warning)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 500,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing keywords */}
            {missingKeywords.length > 0 && (
              <div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, margin: '0 0 var(--space-2) 0' }}>
                  Missing ({missingKeywords.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {missingKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: 'var(--color-danger)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 500,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exactMatches.length === 0 && semanticMatches.length === 0 && missingKeywords.length === 0 && (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                No keyword data available.
              </p>
            )}
          </div>

          {/* Gap Analysis */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-4) 0',
              }}
            >
              Gap Analysis
            </h3>

            {gaps.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)', margin: 0 }}>
                No skill gaps detected!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {gaps.map((gap, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-2)',
                    }}
                  >
                    {/* Severity dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: gap.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)',
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {gap.skill}
                        </span>
                        <span
                          style={{
                            padding: '1px 6px',
                            backgroundColor: gap.severity === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: gap.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 500,
                          }}
                        >
                          {gap.severity === 'critical' ? 'Required' : 'Preferred'}
                        </span>
                      </div>
                      {gap.reason && (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                          {gap.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Suggested Rewrites */}
        <div>
          <div
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                Suggested Rewrites
              </h3>
              {rewrites.length > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    color: 'var(--color-accent)',
                    borderRadius: '50%',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                  }}
                >
                  {rewrites.length}
                </span>
              )}
            </div>

            {rewrites.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', margin: 0 }}>
                No rewrite suggestions generated.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {rewrites.map((rw, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'var(--color-bg-raised)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                    }}
                  >
                    {/* Original */}
                    <p
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        margin: '0 0 var(--space-1) 0',
                      }}
                    >
                      Original
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        margin: '0 0 var(--space-2) 0',
                        lineHeight: 1.5,
                      }}
                    >
                      {rw.original_text}
                    </p>

                    {/* Divider */}
                    <div
                      style={{
                        height: 1,
                        backgroundColor: 'var(--color-border-subtle)',
                        margin: 'var(--space-2) 0',
                      }}
                    />

                    {/* Suggested */}
                    <p
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-accent)',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        margin: '0 0 var(--space-1) 0',
                      }}
                    >
                      Suggested
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-primary)',
                        margin: '0 0 var(--space-2) 0',
                        lineHeight: 1.5,
                      }}
                    >
                      {rw.suggested_text}
                    </p>

                    {/* Target keywords */}
                    {rw.target_keywords && rw.target_keywords.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
                        {rw.target_keywords.map((kw) => (
                          <span
                            key={kw}
                            style={{
                              padding: '1px 6px',
                              backgroundColor: 'rgba(139, 92, 246, 0.12)',
                              color: 'var(--color-accent-light)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--font-size-xs)',
                            }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 'var(--space-2) 0 0 0', fontStyle: 'italic' }}>
                  Optimization available in a future update
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons row */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
        }}
      >
        <button
          onClick={onOptimize}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Optimize Variant
        </button>

        <button
          onClick={() => onLogSubmission?.(raw.id)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Log Submission
        </button>

        <button
          onClick={() => onReanalyze(raw.jobPostingId, raw.variantId)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Re-analyze
        </button>
      </div>
    </div>
  )
}

export default AnalysisResults
