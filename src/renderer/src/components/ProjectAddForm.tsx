import { useEffect, useRef, useState } from 'react'

interface ProjectAddFormProps {
  onSave: (data: { name: string }) => void
  onCancel: () => void
}

function ProjectAddForm({ onSave, onCancel }: ProjectAddFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim() })
  }

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
      }}
    >
      <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: 'var(--space-3)' }}>Add Project</h3>

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <label style={labelStyle}>Project Name</label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Project"
          style={{
            width: '100%',
            backgroundColor: 'var(--color-bg-input)',
            border: `1px solid ${focusedField === 'name' ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: 'var(--font-size-base)',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
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

export default ProjectAddForm
