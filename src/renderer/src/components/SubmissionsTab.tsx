import { useEffect, useState } from 'react'
import { Submission, SubmissionSnapshot } from '../../../preload/index.d'
import InlineEdit from './InlineEdit'
import SubmissionAddForm from './SubmissionAddForm'
import SnapshotViewer from './SnapshotViewer'

const thStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary)',
  textAlign: 'left',
  padding: '10px 16px',
  borderBottom: '1px solid var(--color-border-subtle)',
  backgroundColor: 'var(--color-bg-surface)',
}

const tdStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-base)',
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border-subtle)',
  color: 'var(--color-text-secondary)',
}

function SubmissionsTab(): React.JSX.Element {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewingSnapshot, setViewingSnapshot] = useState<{
    data: SubmissionSnapshot
    variantName: string | null
  } | null>(null)

  const loadSubmissions = (): void => {
    window.api.submissions.list().then(setSubmissions)
  }

  useEffect(() => {
    loadSubmissions()
  }, [])

  const handleUpdate = (
    id: number,
    data: { company?: string; role?: string; url?: string | null; notes?: string | null },
  ): void => {
    window.api.submissions.update(id, data).then(() => loadSubmissions())
  }

  const handleDelete = (id: number): void => {
    window.api.submissions.delete(id).then(() => loadSubmissions())
  }

  const handleViewResume = (sub: Submission): void => {
    const snapshot = JSON.parse(sub.resumeSnapshot) as SubmissionSnapshot
    setViewingSnapshot({ data: snapshot, variantName: sub.variantName })
  }

  const formatDate = (val: Date | null): string => {
    if (!val) return ''
    return new Date(val).toLocaleDateString()
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-10)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Submissions</h1>
        <button
          onClick={() => setShowAddForm((prev) => !prev)}
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
          + Log Submission
        </button>
      </div>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-8)', marginTop: 0 }}>
        Track your job applications and see which resume variants perform best.
      </p>

      {/* Add Form */}
      {showAddForm && (
        <SubmissionAddForm
          onSaved={() => {
            setShowAddForm(false)
            loadSubmissions()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Empty state */}
      {submissions.length === 0 && !showAddForm && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-16) 0',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}>
          No submissions yet. Click &apos;+ Log Submission&apos; to log your first application.
        </div>
      )}

      {/* Table */}
      {submissions.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Variant</th>
                <th style={thStyle}>URL</th>
                <th style={thStyle}>Notes</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr
                  key={sub.id}
                  onMouseEnter={(e) => {
                    const cells = e.currentTarget.querySelectorAll('td')
                    cells.forEach((cell) => { (cell as HTMLElement).style.backgroundColor = 'var(--color-bg-raised)' })
                  }}
                  onMouseLeave={(e) => {
                    const cells = e.currentTarget.querySelectorAll('td')
                    cells.forEach((cell) => { (cell as HTMLElement).style.backgroundColor = '' })
                  }}
                >
                  {/* Company */}
                  <td style={tdStyle}>
                    <InlineEdit
                      value={sub.company}
                      onSave={(v) => handleUpdate(sub.id, { company: v })}
                    />
                  </td>

                  {/* Role */}
                  <td style={tdStyle}>
                    <InlineEdit
                      value={sub.role}
                      onSave={(v) => handleUpdate(sub.id, { role: v })}
                    />
                  </td>

                  {/* Date */}
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {formatDate(sub.submittedAt)}
                  </td>

                  {/* Variant */}
                  <td style={{ ...tdStyle, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    {sub.variantName ?? ''}
                  </td>

                  {/* URL */}
                  <td style={{ ...tdStyle, fontSize: 'var(--font-size-xs)' }}>
                    <InlineEdit
                      value={sub.url ?? ''}
                      onSave={(v) => handleUpdate(sub.id, { url: v || null })}
                      placeholder="Add URL..."
                      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}
                    />
                  </td>

                  {/* Notes */}
                  <td style={{ ...tdStyle, fontSize: 'var(--font-size-xs)' }}>
                    <InlineEdit
                      value={sub.notes ?? ''}
                      onSave={(v) => handleUpdate(sub.id, { notes: v || null })}
                      placeholder="Add notes..."
                      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}
                    />
                  </td>

                  {/* Actions */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <button
                        onClick={() => handleViewResume(sub)}
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-accent-light)',
                          border: 'none',
                          backgroundColor: 'transparent',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-bg)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        View Resume
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-muted)',
                          border: 'none',
                          backgroundColor: 'transparent',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
                        title="Delete submission"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Snapshot Viewer Modal */}
      {viewingSnapshot && (
        <SnapshotViewer
          snapshot={viewingSnapshot.data}
          onClose={() => setViewingSnapshot(null)}
        />
      )}
    </div>
  )
}

export default SubmissionsTab
