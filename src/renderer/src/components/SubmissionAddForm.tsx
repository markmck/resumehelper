import { useEffect, useRef, useState } from 'react'
import { TemplateVariant } from '../../../preload/index.d'

interface SubmissionAddFormProps {
  onSaved: () => void
  onCancel: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--color-bg-input)',
  border: '1px solid var(--color-border-default)',
  color: 'var(--color-text-primary)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  fontSize: 'var(--font-size-base)',
  height: 36,
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box' as const,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary)',
  marginBottom: 'var(--space-1)',
}

function SubmissionAddForm({ onSaved, onCancel }: SubmissionAddFormProps): React.JSX.Element {
  const today = new Date().toISOString().split('T')[0]
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [submittedAt, setSubmittedAt] = useState(today)
  const [variantId, setVariantId] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [variants, setVariants] = useState<TemplateVariant[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const companyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.templates.list().then(setVariants)
    companyRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const errs: string[] = []
    if (!company.trim()) errs.push('Company is required')
    if (!role.trim()) errs.push('Role is required')
    if (!submittedAt) errs.push('Date is required')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    await window.api.submissions.create({
      company: company.trim(),
      role: role.trim(),
      submittedAt: new Date(submittedAt + 'T00:00:00'),
      variantId,
      url: url || undefined,
      notes: notes || undefined,
    })

    onSaved()
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    e.currentTarget.style.borderColor = 'var(--color-accent)'
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    e.currentTarget.style.borderColor = 'var(--color-border-default)'
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-4)',
      }}
    >
      <h3 style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        marginTop: 0,
        marginBottom: 'var(--space-3)',
      }}>
        Log Submission
      </h3>

      {errors.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {errors.map((err, i) => (
            <p key={i} style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', margin: '2px 0' }}>
              {err}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <label style={labelStyle}>
            Company <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            ref={companyRef}
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Role <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Software Engineer"
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <label style={labelStyle}>
            Date <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="date"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Resume Variant
          </label>
          <select
            value={variantId ?? ''}
            onChange={(e) =>
              setVariantId(e.target.value === '' ? null : Number(e.target.value))
            }
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          >
            <option value="">-- No variant --</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <label style={labelStyle}>
          URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/job"
          style={inputStyle}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={labelStyle}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this application..."
          rows={2}
          style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          type="submit"
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
            fontFamily: 'var(--font-sans)',
          }}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border-default)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            cursor: 'pointer',
            height: 36,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default SubmissionAddForm
