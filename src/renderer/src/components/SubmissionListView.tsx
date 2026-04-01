import { useState, useEffect, useMemo } from 'react'
import type { Submission, SubmissionMetrics } from '../../../preload/index.d'
import { SubmissionPipelineDots } from './SubmissionPipelineDots'

interface Props {
  onViewDetail: (submissionId: number) => void
  onLogSubmission: () => void
}

type FilterKey = 'all' | 'applied' | 'in_progress' | 'offer' | 'closed'

const FILTER_PILLS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'offer', label: 'Offer' },
  { key: 'closed', label: 'Closed' },
]

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--color-success)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function formatDate(val: Date | null | string): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function filterSubmissions(subs: Submission[], filter: FilterKey, search: string): Submission[] {
  let result = subs
  if (filter === 'applied') {
    result = result.filter((s) => s.status === 'applied')
  } else if (filter === 'in_progress') {
    result = result.filter((s) => s.status === 'screening' || s.status === 'interview')
  } else if (filter === 'offer') {
    result = result.filter((s) => s.status === 'offer')
  } else if (filter === 'closed') {
    result = result.filter((s) => s.status === 'result' || s.status === 'withdrawn')
  }
  if (search.trim()) {
    const lower = search.toLowerCase()
    result = result.filter((s) => s.company.toLowerCase().includes(lower))
  }
  return result
}

function SubmissionListView({ onViewDetail, onLogSubmission }: Props): React.JSX.Element {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [metrics, setMetrics] = useState<SubmissionMetrics | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.submissions.list(),
      window.api.submissions.metrics(),
    ]).then(([subs, m]) => {
      setSubmissions(subs)
      setMetrics(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => filterSubmissions(submissions, activeFilter, searchText),
    [submissions, activeFilter, searchText],
  )

  const buttonBase: React.CSSProperties = {
    backgroundColor: 'var(--color-accent)',
    color: 'white', /* intentional contrast on accent button */
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
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'var(--space-10)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          Submissions
        </h1>
        <button onClick={onLogSubmission} style={buttonBase}>
          + Log Submission
        </button>
      </div>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-6)', marginTop: 0 }}>
        Track your job applications and see which resume variants perform best.
      </p>

      {/* Metric cards */}
      {metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          {/* Total Applied */}
          <div style={{
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-subtle)',
            padding: 'var(--space-6)',
          }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
              Total Applied
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0', lineHeight: 1 }}>
              {metrics.total}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
              {metrics.thisMonth} this month
            </p>
          </div>

          {/* Active */}
          <div style={{
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-subtle)',
            padding: 'var(--space-6)',
          }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
              Active
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0', lineHeight: 1 }}>
              {metrics.active}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
              Awaiting response
            </p>
          </div>

          {/* Response Rate */}
          <div style={{
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-subtle)',
            padding: 'var(--space-6)',
          }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
              Response Rate
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0', lineHeight: 1 }}>
              {metrics.responseRate}%
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
              {metrics.respondedCount} of {metrics.total} got responses
            </p>
          </div>

          {/* Avg Score */}
          <div style={{
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-subtle)',
            padding: 'var(--space-6)',
          }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
              Avg Score
            </p>
            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0', lineHeight: 1 }}>
              {metrics.avgScore != null ? `${Math.round(metrics.avgScore)}%` : '—'}
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>
              Responded avg: {metrics.respondedAvgScore != null ? `${Math.round(metrics.respondedAvgScore)}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill.key}
            onClick={() => setActiveFilter(pill.key)}
            style={{
              padding: '5px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              backgroundColor: activeFilter === pill.key ? 'var(--color-accent)' : 'var(--color-bg-surface)',
              color: activeFilter === pill.key ? 'white' /* intentional contrast on active pill */ : 'var(--color-text-secondary)',
              transition: 'background-color 0.1s ease',
            }}
          >
            {pill.label}
          </button>
        ))}
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search companies..."
          style={{
            marginLeft: 'auto',
            padding: '5px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            width: 200,
          }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading...</p>
      )}

      {/* Empty state */}
      {!loading && submissions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-16) 0',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}>
          No submissions yet. Click &apos;+ Log Submission&apos; to log your first application.
        </div>
      )}

      {/* No results after filter */}
      {!loading && submissions.length > 0 && filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-10) 0',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}>
          No submissions match your filter.
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-surface)' }}>
                  Company / Role
                </th>
                <th style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-surface)' }}>
                  Variant
                </th>
                <th style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-surface)' }}>
                  Score
                </th>
                <th style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-surface)' }}>
                  Pipeline
                </th>
                <th style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-surface)', whiteSpace: 'nowrap' }}>
                  Applied
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  onClick={() => onViewDetail(sub.id)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const cells = e.currentTarget.querySelectorAll('td')
                    cells.forEach((cell) => { (cell as HTMLElement).style.backgroundColor = 'var(--color-bg-raised)' })
                  }}
                  onMouseLeave={(e) => {
                    const cells = e.currentTarget.querySelectorAll('td')
                    cells.forEach((cell) => { (cell as HTMLElement).style.backgroundColor = '' })
                  }}
                >
                  {/* Company / Role */}
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                      {sub.company}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {sub.role}
                    </div>
                  </td>

                  {/* Variant */}
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {sub.variantName ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        backgroundColor: 'var(--color-accent-bg)',
                        color: 'var(--color-accent)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 500,
                      }}>
                        {sub.variantName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Score */}
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {sub.scoreAtSubmit != null ? (
                      <span style={{
                        fontWeight: 600,
                        fontSize: 'var(--font-size-sm)',
                        color: getScoreColor(sub.scoreAtSubmit),
                      }}>
                        {sub.scoreAtSubmit}%
                      </span>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Pipeline */}
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <SubmissionPipelineDots status={sub.status} />
                  </td>

                  {/* Applied date */}
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDate(sub.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SubmissionListView
