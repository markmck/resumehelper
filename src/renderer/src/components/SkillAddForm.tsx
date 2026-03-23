import { useEffect, useRef, useState } from 'react'
import TagInput from './TagInput'

interface SkillAddFormProps {
  onSave: (data: { name: string; tags: string[] }) => void
  onCancel: () => void
  allTags?: string[]
}

function SkillAddForm({ onSave, onCancel, allTags }: SkillAddFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [tagAreaFocused, setTagAreaFocused] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const pendingTagRef = useRef('')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const errs: string[] = []
    if (!name.trim()) errs.push('Skill name is required')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    // Include any pending tag text that wasn't committed with Enter/comma
    const finalTags = [...tags]
    const pending = pendingTagRef.current.trim()
    if (pending && !finalTags.includes(pending)) {
      finalTags.push(pending)
    }
    onSave({ name: name.trim(), tags: finalTags })
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
        marginBottom: 'var(--space-3)',
      }}
    >
      <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: 'var(--space-3)' }}>Add Skill</h3>

      {errors.length > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {errors.map((err, i) => (
            <p key={i} style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', margin: '0 0 4px 0' }}>
              {err}
            </p>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <label style={labelStyle}>Skill Name</label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. React, TypeScript, Leadership"
          style={inputStyle('name')}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={labelStyle}>Tags</label>
        <div
          style={{
            backgroundColor: 'var(--color-bg-input)',
            border: `1px solid ${tagAreaFocused ? 'var(--color-accent)' : 'var(--color-border-default)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            transition: 'border-color 0.15s',
          }}
          onFocusCapture={() => setTagAreaFocused(true)}
          onBlurCapture={() => setTagAreaFocused(false)}
        >
          <TagInput tags={tags} onChange={setTags} onInputChange={(val) => { pendingTagRef.current = val }} suggestions={allTags} />
        </div>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)', marginBottom: 0 }}>
          Press Enter or comma to add a tag
        </p>
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

export default SkillAddForm
