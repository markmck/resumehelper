import { useState, useEffect } from 'react'

interface AnalysisRow {
  id: number          // job_postings.id
  analysisId: number  // analysis_results.id
  company: string
  role: string
  variantId: number | null
  variantName: string | null
  matchScore: number
  status: string
  keywordHits: number
  keywordMisses: number
  createdAt: Date | string | null
}

type SortOption = 'recent' | 'score-high' | 'score-low'

interface Props {
  onNewAnalysis: () => void
  onViewResult: (analysisId: number) => void
  onReanalyze: (jobPostingId: number, variantId: number) => void
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--color-success)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'var(--color-success-bg)'
  if (score >= 50) return 'var(--color-warning-bg)'
  return 'var(--color-danger-bg)'
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'optimized':
      return {
        backgroundColor: 'var(--color-success-bg)',
        color: 'var(--color-success)',
      }
    case 'reviewed':
      return {
        backgroundColor: 'var(--color-blue-bg)',
        color: 'var(--color-blue)',
      }
    case 'submitted':
      return {
        backgroundColor: 'var(--color-accent-bg)',
        color: 'var(--color-accent-light)',
      }
    default: // unreviewed
      return {
        backgroundColor: 'var(--color-bg-raised)',
        color: 'var(--color-text-tertiary)',
      }
  }
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'optimized': return 'Optimized'
    case 'reviewed': return 'Reviewed'
    case 'submitted': return 'Submitted'
    default: return 'Unreviewed'
  }
}

function formatDate(val: Date | string | null): string {
  if (!val) return ''
  const d = new Date(val as string)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const thStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary)',
  textAlign: 'left',
  padding: '10px 16px',
  borderBottom: '1px solid var(--color-border-subtle)',
}

const tdStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-base)',
  padding: '14px 16px',
  borderBottom: '1px solid var(--color-border-subtle)',
  color: 'var(--color-text-secondary)',
}

function AnalysisList({ onNewAnalysis, onViewResult, onReanalyze }: Props): React.JSX.Element {
  const [rows, setRows] = useState<AnalysisRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('recent')

  useEffect(() => {
    setLoading(true)
    window.api.jobPostings
      .list()
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setRows(data as AnalysisRow[])
        } else {
          setRows([])
        }
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  // Only rows that have an analysis result
  const analyzedRows = rows.filter((r) => r.analysisId != null)

  // Metrics
  const analysesCount = analyzedRows.length
  const avgScore =
    analysesCount > 0
      ? Math.round(analyzedRows.reduce((sum, r) => sum + r.matchScore, 0) / analysesCount)
      : 0
  const optimizedCount = analyzedRows.filter((r) => r.status === 'optimized').length

  // Filter + sort
  const filtered = analyzedRows
    .filter((r) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return r.company.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sort === 'score-high') return b.matchScore - a.matchScore
      if (sort === 'score-low') return a.matchScore - b.matchScore
      // Most recent — compare createdAt
      const da = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
      return db - da
    })

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 'var(--space-10)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-2)',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Analysis
        </h1>
        <button
          onClick={onNewAnalysis}
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            cursor: 'pointer',
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          New analysis
        </button>
      </div>
      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-8)',
          marginTop: 0,
        }}
      >
        Analyze job postings against your resume variants. Compare keywords, identify gaps, and
        optimize before applying.
      </p>

      {/* Metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {/* Analyses run */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Analyses run
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {loading ? '—' : analysesCount}
          </div>
        </div>

        {/* Avg match score */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Avg match score
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 600,
              color: loading || analysesCount === 0 ? 'var(--color-text-primary)' : getScoreColor(avgScore),
            }}
          >
            {loading ? '—' : analysesCount === 0 ? '—' : avgScore}
          </div>
        </div>

        {/* Optimized */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Optimized
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 600,
              color:
                !loading && optimizedCount > 0
                  ? 'var(--color-success)'
                  : 'var(--color-text-primary)',
            }}
          >
            {loading ? '—' : optimizedCount}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!loading && analyzedRows.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-16) 0',
            color: 'var(--color-text-muted)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: 'var(--color-bg-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.5 }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 16l3-4 3 3 2-3 2 4" />
            </svg>
          </div>
          <p
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              margin: '0 0 var(--space-1)',
            }}
          >
            No analyses yet
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              margin: '0 auto var(--space-5)',
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            Paste a job posting to analyze how well your resume matches and get keyword suggestions.
          </p>
          <button
            onClick={onNewAnalysis}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 500,
              cursor: 'pointer',
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            New Analysis
          </button>
        </div>
      )}

      {/* Search + sort row */}
      {!loading && analyzedRows.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company or role..."
              style={{
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                width: 220,
                height: 32,
                fontFamily: 'var(--font-sans)',
              }}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              style={{
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                outline: 'none',
                height: 32,
                fontFamily: 'var(--font-sans)',
                marginLeft: 'auto',
                cursor: 'pointer',
              }}
            >
              <option value="recent">Most recent</option>
              <option value="score-high">Highest score</option>
              <option value="score-low">Lowest score</option>
            </select>
          </div>

          {/* Table */}
          <div
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Company / Role</th>
                  <th style={thStyle}>Variant</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Keywords</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        ...tdStyle,
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        padding: 'var(--space-8)',
                      }}
                    >
                      No results match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <AnalysisTableRow
                      key={row.analysisId}
                      row={row}
                      onViewResult={onViewResult}
                      onReanalyze={onReanalyze}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

interface RowProps {
  row: AnalysisRow
  onViewResult: (analysisId: number) => void
  onReanalyze: (jobPostingId: number, variantId: number) => void
}

function AnalysisTableRow({ row, onViewResult, onReanalyze }: RowProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const scoreColor = getScoreColor(row.matchScore)
  const scoreBg = getScoreBgColor(row.matchScore)
  const totalKeywords = row.keywordHits + row.keywordMisses

  return (
    <tr
      style={{ cursor: 'pointer' }}
      onClick={() => onViewResult(row.analysisId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Company / Role */}
      <td
        style={{
          ...tdStyle,
          backgroundColor: hovered ? 'var(--color-bg-raised)' : undefined,
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {row.company || '—'}
        </div>
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            marginTop: 2,
          }}
        >
          {row.role || '—'}
        </div>
      </td>

      {/* Variant */}
      <td
        style={{
          ...tdStyle,
          backgroundColor: hovered ? 'var(--color-bg-raised)' : undefined,
        }}
      >
        {row.variantName ? (
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              backgroundColor: 'var(--color-bg-raised)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {row.variantName}
          </span>
        ) : (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>—</span>
        )}
      </td>

      {/* Score */}
      <td
        style={{
          ...tdStyle,
          backgroundColor: hovered ? 'var(--color-bg-raised)' : undefined,
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 600,
            color: scoreColor,
          }}
        >
          {row.matchScore}
        </div>
        <div
          style={{
            width: 60,
            height: 4,
            backgroundColor: 'var(--color-bg-raised)',
            borderRadius: 2,
            overflow: 'hidden',
            marginTop: 4,
          }}
        >
          <div
            style={{
              width: `${Math.min(row.matchScore, 100)}%`,
              height: '100%',
              backgroundColor: scoreColor,
              borderRadius: 2,
            }}
          />
        </div>
        {/* invisible bg for score bar hover */}
        <span style={{ display: 'none' }}>{scoreBg}</span>
      </td>

      {/* Keywords */}
      <td
        style={{
          ...tdStyle,
          backgroundColor: hovered ? 'var(--color-bg-raised)' : undefined,
        }}
      >
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {row.keywordHits}/{totalKeywords > 0 ? totalKeywords : '?'}
        </span>
      </td>

      {/* Status */}
      <td
        style={{
          ...tdStyle,
          backgroundColor: hovered ? 'var(--color-bg-raised)' : undefined,
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            ...getStatusBadgeStyle(row.status),
          }}
        >
          {formatStatusLabel(row.status)}
        </span>
      </td>

      {/* Date */}
      <td
        style={{
          ...tdStyle,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          whiteSpace: 'nowrap',
          backgroundColor: hovered ? 'var(--color-bg-raised)' : undefined,
        }}
      >
        {formatDate(row.createdAt)}
      </td>

      {/* Actions */}
      <td
        style={{
          ...tdStyle,
          backgroundColor: hovered ? 'var(--color-bg-raised)' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
          <ActionBtn
            label="View"
            variant="primary"
            onClick={() => onViewResult(row.analysisId)}
          />
          <ActionBtn
            label="Re-analyze"
            variant="default"
            onClick={() => {
              if (row.variantId != null) {
                onReanalyze(row.id, row.variantId)
              }
            }}
            disabled={row.variantId == null}
          />
          <ActionBtn
            label="Optimize"
            variant="default"
            onClick={() => {}}
            disabled={true}
            title="Coming in Phase 10"
          />
          <ActionBtn
            label="Submit"
            variant="default"
            onClick={() => {}}
            disabled={true}
            title="Coming in Phase 11"
          />
        </div>
      </td>
    </tr>
  )
}

interface ActionBtnProps {
  label: string
  variant: 'primary' | 'default'
  onClick: () => void
  disabled?: boolean
  title?: string
}

function ActionBtn({ label, variant, onClick, disabled, title }: ActionBtnProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  const baseStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    fontFamily: 'var(--font-sans)',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 0.1s, color 0.1s',
  }

  const primaryStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: hovered && !disabled ? 'var(--color-accent-bg)' : 'transparent',
    color: 'var(--color-accent-light)',
  }

  const defaultStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: hovered && !disabled ? 'var(--color-bg-raised)' : 'transparent',
    color: 'var(--color-text-tertiary)',
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={variant === 'primary' ? primaryStyle : defaultStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      disabled={disabled}
    >
      {label}
    </button>
  )
}

export default AnalysisList
