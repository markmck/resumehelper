import { useEffect, useRef, useState } from 'react'

interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  onEnter?: () => void
  placeholder?: string
  style?: React.CSSProperties
  className?: string
  multiline?: boolean
  autoFocus?: boolean
  onFocused?: () => void
  alwaysFireSave?: boolean
}

function InlineEdit({
  value,
  onSave,
  onEnter,
  placeholder = 'Click to edit',
  style = {},
  multiline = false,
  autoFocus = false,
  onFocused,
  alwaysFireSave = false,
}: InlineEditProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  useEffect(() => {
    if (autoFocus) {
      setEditing(true)
      onFocused?.()
    }
  }, [autoFocus])

  const handleClick = (): void => {
    setDraft(value)
    setEditing(true)
  }

  const handleSave = (): void => {
    setEditing(false)
    setFocused(false)
    if (alwaysFireSave || draft !== value) {
      onSave(draft)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
      onEnter?.()
    } else if (e.key === 'Escape') {
      setDraft(value)
      setEditing(false)
      setFocused(false)
    }
  }

  if (editing) {
    const inputStyle: React.CSSProperties = {
      width: '100%',
      backgroundColor: 'var(--color-bg-input)',
      color: 'var(--color-text-primary)',
      borderRadius: 'var(--radius-md)',
      padding: '4px 8px',
      outline: 'none',
      border: focused
        ? '1px solid var(--color-accent)'
        : '1px solid var(--color-border-default)',
      fontSize: 'var(--font-size-base)',
      fontFamily: 'var(--font-sans)',
      ...style,
    }

    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      onFocus: () => setFocused(true),
      style: inputStyle,
    }

    return multiline ? (
      <textarea
        {...sharedProps}
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        rows={3}
      />
    ) : (
      <input {...sharedProps} ref={inputRef as React.RefObject<HTMLInputElement>} type="text" />
    )
  }

  return (
    <span
      onClick={handleClick}
      style={{
        cursor: 'text',
        borderRadius: 'var(--radius-md)',
        padding: '4px 8px',
        transition: 'background-color 0.15s',
        color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        opacity: value ? 1 : 0.4,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-raised)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {value || placeholder}
    </span>
  )
}

export default InlineEdit
