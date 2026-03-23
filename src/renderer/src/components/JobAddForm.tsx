import { useEffect, useRef, useState } from 'react'

interface JobAddFormProps {
  onSave: (data: {
    company: string
    role: string
    startDate: string
    endDate?: string
  }) => void
  onCancel: () => void
}

function JobAddForm({ onSave, onCancel }: JobAddFormProps): React.JSX.Element {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentJob, setCurrentJob] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const companyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    companyRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const errs: string[] = []
    if (!company.trim()) errs.push('Company is required')
    if (!role.trim()) errs.push('Role is required')
    if (!startDate) errs.push('Start date is required')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    onSave({
      company: company.trim(),
      role: role.trim(),
      startDate,
      endDate: currentJob ? undefined : endDate || undefined,
    })
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    backgroundColor: 'var(--color-bg-input)',
    border: `1px solid ${focusedField === field ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  })

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-tertiary)',
    marginBottom: 'var(--space-2)',
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}
    >
      <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: 'var(--space-3)' }}>Add Job</h3>

      {errors.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {errors.map((err, i) => (
            <p key={i} style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', margin: '0 0 4px 0' }}>
              {err}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <label style={labelStyle}>Company</label>
          <input
            ref={companyRef}
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            style={inputStyle('company')}
            onFocus={() => setFocusedField('company')}
            onBlur={() => setFocusedField(null)}
          />
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Software Engineer"
            style={inputStyle('role')}
            onFocus={() => setFocusedField('role')}
            onBlur={() => setFocusedField(null)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            type="month"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle('startDate')}
            onFocus={() => setFocusedField('startDate')}
            onBlur={() => setFocusedField(null)}
          />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input
            type="month"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={currentJob}
            style={{
              ...inputStyle('endDate'),
              opacity: currentJob ? 0.4 : 1,
              cursor: currentJob ? 'not-allowed' : undefined,
            }}
            onFocus={() => setFocusedField('endDate')}
            onBlur={() => setFocusedField(null)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <input
          type="checkbox"
          id="currentJob"
          checked={currentJob}
          onChange={(e) => {
            setCurrentJob(e.target.checked)
            if (e.target.checked) setEndDate('')
          }}
          style={{ accentColor: 'var(--color-accent)' }}
        />
        <label htmlFor="currentJob" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
          I currently work here
        </label>
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
            border: '1px solid var(--color-border-default)',
            color: 'var(--color-text-secondary)',
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

export default JobAddForm
