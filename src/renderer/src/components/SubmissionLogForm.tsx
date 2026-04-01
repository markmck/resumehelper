import { useState, useEffect } from 'react'
import type { TemplateVariant } from '../../../preload/index.d'
import { getScoreColor } from '../lib/scoreColor'

interface LinkedAnalysis {
  id: number
  company: string
  role: string
  score: number
  variantId: number
  variantName: string
  createdAt: string
}

interface Props {
  linkedAnalysisId?: number
  onSaved: () => void
  onBack: () => void
}

function formatRelativeDate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'result', label: 'Result' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

function todayString(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-default)',
  backgroundColor: 'var(--color-bg-raised)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-base)',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 4,
  display: 'block',
}

function SubmissionLogForm({ linkedAnalysisId, onSaved, onBack }: Props): React.JSX.Element {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('applied')
  const [variantId, setVariantId] = useState<number | ''>('')
  const [submittedAt, setSubmittedAt] = useState(todayString())
  const [linkedAnalysis, setLinkedAnalysis] = useState<LinkedAnalysis | null>(null)
  const [threshold, setThreshold] = useState<number | null>(null)
  const [variants, setVariants] = useState<TemplateVariant[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    // Load variants
    window.api.templates.list().then((list) => setVariants(list)).catch(() => {})

    // Load linked analysis if provided
    if (linkedAnalysisId != null) {
      window.api.submissions.getAnalysisById(linkedAnalysisId).then((data) => {
        if (data) {
          setLinkedAnalysis(data)
          setCompany(data.company)
          setRole(data.role)
          setVariantId(data.variantId)
          if (data.variantId != null) {
            window.api.templates.getThreshold(data.variantId).then((t) => setThreshold(t))
          }
        }
      }).catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : 'Failed to load analysis')
      })
    }
  }, [linkedAnalysisId])

  const handleUnlink = (): void => {
    setLinkedAnalysis(null)
    setCompany('')
    setRole('')
    setVariantId('')
  }

  const handleSubmit = async (): Promise<void> => {
    if (!company.trim() || !role.trim()) return
    setIsSubmitting(true)
    try {
      await window.api.submissions.create({
        company: company.trim(),
        role: role.trim(),
        submittedAt: new Date(submittedAt),
        variantId: variantId !== '' ? Number(variantId) : null,
        url: url.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        scoreAtSubmit: linkedAnalysis?.score ?? null,
        analysisId: linkedAnalysis?.id ?? null,
      })
      onSaved()
    } catch (e) {
      console.error('Failed to create submission:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLinked = linkedAnalysis != null

  // Preview values
  const previewCompany = company || '—'
  const previewRole = role || '—'
  const previewVariant = variants.find((v) => v.id === Number(variantId))?.name ?? null
  const previewScore = linkedAnalysis?.score ?? null
  const previewDate = submittedAt
    ? new Date(submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'

  const prefillBorder = isLinked ? '2px solid var(--color-accent)' : '1px solid var(--color-border-default)'

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'var(--space-10)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-start' }}>
        {/* Left column: form */}
        <div style={{ flex: 2 }}>
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
              padding: 0,
              marginBottom: 'var(--space-4)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            ← Back to submissions
          </button>

          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-6) 0' }}>
            Log Submission
          </h1>

          {/* Load error */}
          {loadError && (
            <div style={{ padding: 'var(--space-3)', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
              {loadError}
            </div>
          )}

          {/* Linked analysis card */}
          {linkedAnalysis && (
            <div style={{
              backgroundColor: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-base)' }}>
                  {linkedAnalysis.role} @ {linkedAnalysis.company}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: getScoreColor(linkedAnalysis.score) }}>
                    {linkedAnalysis.score}% match
                  </span>
                  <span style={{ padding: '2px 8px', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                    {linkedAnalysis.variantName}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    Analyzed {formatRelativeDate(linkedAnalysis.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleUnlink}
                style={{
                  padding: '4px 10px',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  flexShrink: 0,
                }}
              >
                Unlink
              </button>
            </div>
          )}

          {/* Below-target warning */}
          {linkedAnalysis && threshold != null && linkedAnalysis.score < threshold && (
            <div style={{
              background: 'var(--color-warning-bg)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: 'var(--space-4)',
            }}>
              <p style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 600,
                color: 'var(--color-warning)',
                margin: 0,
              }}>
                Below target ({linkedAnalysis.score}/{threshold})
              </p>
              <p style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 400,
                color: 'var(--color-text-secondary)',
                margin: '4px 0 0 0',
              }}>
                This variant&apos;s match score is below your target. You can still submit.
              </p>
            </div>
          )}

          {/* Form fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Company */}
            <div>
              <label style={labelStyle}>Company *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                style={{ ...inputStyle, borderLeft: isLinked ? prefillBorder : inputStyle.border }}
              />
            </div>

            {/* Role */}
            <div>
              <label style={labelStyle}>Role *</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                style={{ ...inputStyle, borderLeft: isLinked ? prefillBorder : inputStyle.border }}
              />
            </div>

            {/* Applied Date */}
            <div>
              <label style={labelStyle}>Applied Date</label>
              <input
                type="date"
                value={submittedAt}
                onChange={(e) => setSubmittedAt(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Variant */}
            <div>
              <label style={labelStyle}>Variant</label>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value === '' ? '' : Number(e.target.value))}
                style={{
                  ...inputStyle,
                  borderLeft: isLinked && variantId !== '' ? prefillBorder : inputStyle.border,
                }}
              >
                <option value="">No variant selected</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* URL */}
            <div>
              <label style={labelStyle}>Job URL (optional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any context about this application -- referral, cover letter notes, specific team, etc."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Status pills */}
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-subtle)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      backgroundColor: status === opt.value ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                      color: status === opt.value ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !company.trim() || !role.trim()}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: !company.trim() || !role.trim() ? 'var(--color-bg-raised)' : 'var(--color-accent)',
                color: !company.trim() || !role.trim() ? 'var(--color-text-muted)' : '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 500,
                cursor: !company.trim() || !role.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                marginTop: 'var(--space-2)',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Log Submission'}
            </button>
          </div>
        </div>

        {/* Right column: preview card */}
        <div style={{ flex: 1, position: 'sticky', top: 'var(--space-10)' }}>
          <div style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
          }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', margin: '0 0 var(--space-4) 0' }}>
              Preview
            </p>

            {/* Company / Role */}
            <p style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', margin: '0 0 2px 0' }}>
              {previewCompany}
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4) 0' }}>
              {previewRole}
            </p>

            {/* Applied date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Applied</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{previewDate}</span>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Status</span>
              <span style={{
                padding: '2px 10px',
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
              }}>
                {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}
              </span>
            </div>

            {/* Score bar */}
            {previewScore != null && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Score at submit</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: getScoreColor(previewScore) }}>
                    {previewScore}%
                  </span>
                </div>
                <div style={{ height: 6, backgroundColor: 'var(--color-bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${previewScore}%`,
                    backgroundColor: getScoreColor(previewScore),
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Variant */}
            {previewVariant && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Variant</span>
                <span style={{
                  padding: '2px 8px',
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 500,
                }}>
                  {previewVariant} {'\uD83D\uDD12'}
                </span>
              </div>
            )}

            {/* Snapshot note */}
            <div style={{
              marginTop: 'var(--space-4)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--color-border-subtle)',
            }}>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic' }}>
                This resume version will be frozen as a snapshot when you log this submission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmissionLogForm
