import { useEffect, useState } from 'react'
import { Submission, SubmissionSnapshot } from '../../../preload/index.d'
import InlineEdit from './InlineEdit'
import SubmissionAddForm from './SubmissionAddForm'
import SnapshotViewer from './SnapshotViewer'

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
        <div className="text-center py-16 text-zinc-500 text-sm">
          No submissions yet. Click '+ Log Submission' to log your first application.
        </div>
      )}

      {/* Table */}
      {submissions.length > 0 && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-zinc-500 text-xs uppercase tracking-wider px-4 py-3">
                  Company
                </th>
                <th className="text-zinc-500 text-xs uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-zinc-500 text-xs uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-zinc-500 text-xs uppercase tracking-wider px-4 py-3">
                  Variant
                </th>
                <th className="text-zinc-500 text-xs uppercase tracking-wider px-4 py-3">URL</th>
                <th className="text-zinc-500 text-xs uppercase tracking-wider px-4 py-3">Notes</th>
                <th className="text-zinc-500 text-xs uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => (
                <tr
                  key={sub.id}
                  className={idx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/50'}
                >
                  {/* Company */}
                  <td className="text-zinc-300 border-b border-zinc-800 px-2 py-2">
                    <InlineEdit
                      value={sub.company}
                      onSave={(v) => handleUpdate(sub.id, { company: v })}
                    />
                  </td>

                  {/* Role */}
                  <td className="text-zinc-300 border-b border-zinc-800 px-2 py-2">
                    <InlineEdit
                      value={sub.role}
                      onSave={(v) => handleUpdate(sub.id, { role: v })}
                    />
                  </td>

                  {/* Date */}
                  <td className="text-zinc-300 border-b border-zinc-800 px-4 py-2 whitespace-nowrap">
                    {formatDate(sub.submittedAt)}
                  </td>

                  {/* Variant */}
                  <td className="text-zinc-400 border-b border-zinc-800 px-4 py-2 text-xs">
                    {sub.variantName ?? ''}
                  </td>

                  {/* URL */}
                  <td className="border-b border-zinc-800 px-2 py-2 text-xs">
                    <InlineEdit
                      value={sub.url ?? ''}
                      onSave={(v) => handleUpdate(sub.id, { url: v || null })}
                      placeholder="Add URL..."
                      className="text-xs text-zinc-400"
                    />
                  </td>

                  {/* Notes */}
                  <td className="border-b border-zinc-800 px-2 py-2 text-xs">
                    <InlineEdit
                      value={sub.notes ?? ''}
                      onSave={(v) => handleUpdate(sub.id, { notes: v || null })}
                      placeholder="Add notes..."
                      className="text-xs text-zinc-400"
                    />
                  </td>

                  {/* Actions */}
                  <td className="border-b border-zinc-800 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewResume(sub)}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded transition-colors"
                      >
                        View Resume
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-red-900/50 text-zinc-500 hover:text-red-400 text-xs rounded transition-colors"
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
