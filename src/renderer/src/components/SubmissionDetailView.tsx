import { useState, useEffect, useCallback } from 'react'
import type { Submission, SubmissionEvent, SubmissionSnapshot } from '../../../preload/index.d'
import SubmissionEventTimeline from './SubmissionEventTimeline'
import SnapshotViewer from './SnapshotViewer'

interface Props {
  submissionId: number
  onBack: () => void
  onViewAnalysis?: (analysisId: number) => void
  onDelete: () => void
}

const STAGES = ['applied', 'screening', 'interview', 'offer', 'result']
const STAGE_LABELS = ['Applied', 'Screening', 'Interview', 'Offer', 'Result']
const ALL_STATUSES = ['applied', 'screening', 'interview', 'offer', 'result', 'withdrawn']

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--color-success)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function formatDate(val: Date | null | string): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

interface PipelineBarProps {
  status: string
}

function PipelineBar({ status }: PipelineBarProps): React.JSX.Element {
  const isWithdrawn = status === 'withdrawn'
  const stageIndex = isWithdrawn ? -1 : STAGES.indexOf(status)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
      {/* Connecting lines behind dots */}
      {STAGES.map((_, i) => {
        if (i === STAGES.length - 1) return null

        let lineColor: string
        if (isWithdrawn) {
          lineColor = 'var(--color-border-subtle)'
        } else if (status === 'result') {
          lineColor = 'var(--color-success)'
        } else if (i < stageIndex) {
          lineColor = 'var(--color-success)'
        } else {
          lineColor = 'var(--color-border-subtle)'
        }

        return (
          <div
            key={`line-${i}`}
            style={{
              position: 'absolute',
              top: 8,
              left: `calc(${(i / (STAGES.length - 1)) * 100}% + 8px)`,
              width: `calc(${(1 / (STAGES.length - 1)) * 100}% - 16px)`,
              height: 2,
              backgroundColor: lineColor,
              zIndex: 0,
            }}
          />
        )
      })}

      {/* Stage dots + labels */}
      {STAGES.map((stage, i) => {
        let circleColor: string
        let circleBorder: string
        let isCurrentStage = false

        if (isWithdrawn) {
          circleColor = 'transparent'
          circleBorder = 'var(--color-border-subtle)'
        } else if (status === 'result') {
          circleColor = 'var(--color-success)'
          circleBorder = 'var(--color-success)'
        } else if (i < stageIndex) {
          circleColor = 'var(--color-success)'
          circleBorder = 'var(--color-success)'
        } else if (i === stageIndex) {
          isCurrentStage = true
          if (stageIndex === 0) {
            circleColor = 'var(--color-accent)'
            circleBorder = 'var(--color-accent)'
          } else {
            circleColor = 'var(--color-warning)'
            circleBorder = 'var(--color-warning)'
          }
        } else {
          circleColor = 'transparent'
          circleBorder = 'var(--color-border-subtle)'
        }

        return (
          <div
            key={stage}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)',
              zIndex: 1,
              flex: 1,
            }}
          >
            <div
              style={{
                width: isCurrentStage ? 20 : 16,
                height: isCurrentStage ? 20 : 16,
                borderRadius: '50%',
                backgroundColor: circleColor,
                border: `2px solid ${circleBorder}`,
                boxShadow: isCurrentStage ? `0 0 0 3px ${circleBorder}22` : undefined,
                flexShrink: 0,
                marginTop: isCurrentStage ? -2 : 0,
              }}
            />
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: i === stageIndex ? 600 : 400,
                color: i === stageIndex
                  ? 'var(--color-text-primary)'
                  : i < stageIndex || status === 'result'
                    ? 'var(--color-text-secondary)'
                    : 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {STAGE_LABELS[i]}
            </span>
          </div>
        )
      })}

      {/* Withdrawn indicator overlaid at start */}
      {isWithdrawn && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-2)',
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'var(--color-danger)',
              border: '2px solid var(--color-danger)',
              marginTop: -2,
            }}
          />
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              color: 'var(--color-danger)',
              whiteSpace: 'nowrap',
            }}
          >
            Withdrawn
          </span>
        </div>
      )}
    </div>
  )
}

function SubmissionDetailView({ submissionId, onBack, onViewAnalysis, onDelete }: Props): React.JSX.Element {
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [events, setEvents] = useState<SubmissionEvent[]>([])
  const [newStatus, setNewStatus] = useState<string>('applied')
  const [statusNote, setStatusNote] = useState<string>('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState<string>('')
  const [viewingSnapshot, setViewingSnapshot] = useState<SubmissionSnapshot | null>(null)
  const [saving, setSaving] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [subs, evts] = await Promise.all([
        window.api.submissions.list(),
        window.api.submissions.getEvents(submissionId),
      ])
      const found = subs.find((s) => s.id === submissionId) ?? null
      setSubmission(found)
      if (found) {
        setNewStatus(found.status)
        setNotesText(found.notes ?? '')
      }
      setEvents(evts)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleUpdateStatus(): Promise<void> {
    if (!submission) return
    setSaving(true)
    try {
      await window.api.submissions.updateStatus(submissionId, newStatus, statusNote || undefined)
      setStatusNote('')
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotes(): Promise<void> {
    if (!submission) return
    setSaving(true)
    try {
      await window.api.submissions.update(submissionId, { notes: notesText })
      setEditingNotes(false)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm(`Delete submission for ${submission?.company ?? 'this company'}? This cannot be undone.`)) return
    await window.api.submissions.delete(submissionId)
    onDelete()
  }

  function handleViewSnapshot(): void {
    if (!submission) return
    try {
      const parsed = JSON.parse(submission.resumeSnapshot) as SubmissionSnapshot
      setViewingSnapshot(parsed)
    } catch {
      alert('Could not parse resume snapshot.')
    }
  }

  async function handleExportPdf(): Promise<void> {
    if (!submission) return
    setExportingPdf(true)
    try {
      const parsed = JSON.parse(submission.resumeSnapshot) as SubmissionSnapshot
      const filename = `${submission.company}_${submission.role}_resume.pdf`
        .replace(/[^a-zA-Z0-9_\-. ]/g, '_')
        .replace(/\s+/g, '_')
      await window.api.exportFile.snapshotPdf(parsed, filename)
    } catch {
      alert('Could not export PDF.')
    } finally {
      setExportingPdf(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-4)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 'var(--space-1)',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-primary)',
  }

  const buttonBase: React.CSSProperties = {
    padding: '7px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border-subtle)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    backgroundColor: 'var(--color-bg-surface)',
    color: 'var(--color-text-secondary)',
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-10)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-sans)' }}>
        Loading...
      </div>
    )
  }

  if (!submission) {
    return (
      <div style={{ padding: 'var(--space-10)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-sans)' }}>
        Submission not found.
        <button onClick={onBack} style={{ ...buttonBase, marginLeft: 'var(--space-4)' }}>Back</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-10)', fontFamily: 'var(--font-sans)' }}>
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'var(--color-accent)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-sans)',
          marginBottom: 'var(--space-4)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
        }}
      >
        &larr; Back to submissions
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
            {submission.role}
          </h1>
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {submission.company}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {submission.analysisId != null && onViewAnalysis != null && (
            <button
              onClick={() => onViewAnalysis(submission!.analysisId!)}
              style={buttonBase}
            >
              View Analysis
            </button>
          )}
          <button
            onClick={handleDelete}
            style={{
              ...buttonBase,
              color: 'var(--color-danger)',
              borderColor: 'var(--color-danger)',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Pipeline bar */}
      <div style={cardStyle}>
        <PipelineBar status={submission.status} />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start' }}>

        {/* Left column */}
        <div style={{ flex: 2, minWidth: 0 }}>

          {/* Details card */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-4) 0' }}>
              Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <p style={labelStyle}>Company</p>
                <p style={{ ...valueStyle, margin: 0 }}>{submission.company}</p>
              </div>
              <div>
                <p style={labelStyle}>Role</p>
                <p style={{ ...valueStyle, margin: 0 }}>{submission.role}</p>
              </div>
              <div>
                <p style={labelStyle}>Applied Date</p>
                <p style={{ ...valueStyle, margin: 0 }}>{formatDate(submission.submittedAt)}</p>
              </div>
              <div>
                <p style={labelStyle}>Status</p>
                <p style={{ ...valueStyle, margin: 0 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: submission.status === 'withdrawn' || submission.status === 'result'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : submission.status === 'offer'
                        ? 'rgba(34, 197, 94, 0.12)'
                        : submission.status === 'applied'
                          ? 'rgba(139, 92, 246, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                    color: submission.status === 'withdrawn' || submission.status === 'result'
                      ? 'var(--color-danger)'
                      : submission.status === 'offer'
                        ? 'var(--color-success)'
                        : submission.status === 'applied'
                          ? 'var(--color-accent)'
                          : 'var(--color-warning)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 500,
                  }}>
                    {capitalize(submission.status)}
                  </span>
                </p>
              </div>
              {submission.url && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={labelStyle}>URL</p>
                  <a
                    href={submission.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...valueStyle, margin: 0, color: 'var(--color-accent)', textDecoration: 'none', wordBreak: 'break-all' }}
                  >
                    {submission.url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Activity card */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-4) 0' }}>
              Activity
            </h3>
            <SubmissionEventTimeline events={events} />

            {/* Update Status section */}
            <div style={{ borderTop: '1px solid var(--color-border-subtle)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-3) 0' }}>
                Update Status
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-bg-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{capitalize(s)}</option>
                  ))}
                </select>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Add a note about this update..."
                  rows={2}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-bg-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={handleUpdateStatus}
                  disabled={saving}
                  style={{
                    ...buttonBase,
                    backgroundColor: 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                    alignSelf: 'flex-start',
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>

          {/* Notes card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                Notes
              </h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  style={{ ...buttonBase, padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={4}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: 'var(--color-bg-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-sans)',
                    resize: 'vertical',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    onClick={handleSaveNotes}
                    disabled={saving}
                    style={{
                      ...buttonBase,
                      backgroundColor: 'var(--color-accent)',
                      color: '#fff',
                      border: 'none',
                      opacity: saving ? 0.6 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingNotes(false); setNotesText(submission.notes ?? '') }}
                    style={buttonBase}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{
                fontSize: 'var(--font-size-sm)',
                color: submission.notes ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}>
                {submission.notes || 'Any context about this application -- referral, cover letter notes, specific team, etc.'}
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, position: 'sticky', top: 'var(--space-6)', minWidth: 0 }}>

          {/* Resume Snapshot card */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-4) 0' }}>
              Resume Snapshot
            </h3>

            {/* Score */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <p style={labelStyle}>Score at Submit</p>
              <p style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 700,
                margin: 0,
                color: submission.scoreAtSubmit != null ? getScoreColor(submission.scoreAtSubmit) : 'var(--color-text-muted)',
              }}>
                {submission.scoreAtSubmit != null ? `${submission.scoreAtSubmit}%` : '—'}
              </p>
            </div>

            {/* Variant tag */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <p style={labelStyle}>Variant</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {submission.variantName ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                    color: 'var(--color-accent)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 500,
                  }}>
                    <span>&#128274;</span> {submission.variantName} (locked)
                  </span>
                ) : (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>No variant</span>
                )}
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0 0' }}>
                This is a frozen snapshot of the resume at submit time.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <button
                onClick={handleViewSnapshot}
                style={{
                  ...buttonBase,
                  width: '100%',
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                View Submitted Resume
              </button>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                style={{
                  ...buttonBase,
                  width: '100%',
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: exportingPdf ? 0.6 : 1,
                  cursor: exportingPdf ? 'not-allowed' : 'pointer',
                }}
              >
                {exportingPdf ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SnapshotViewer modal */}
      {viewingSnapshot != null && (
        <SnapshotViewer
          snapshot={viewingSnapshot}
          onClose={() => setViewingSnapshot(null)}
        />
      )}
    </div>
  )
}

export default SubmissionDetailView
