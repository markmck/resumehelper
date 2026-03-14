import { useEffect, useRef, useState } from 'react'

interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  onEnter?: () => void
  placeholder?: string
  className?: string
  multiline?: boolean
}

function InlineEdit({
  value,
  onSave,
  onEnter,
  placeholder = 'Click to edit',
  className = '',
  multiline = false,
}: InlineEditProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const handleClick = (): void => {
    setDraft(value)
    setEditing(true)
  }

  const handleSave = (): void => {
    setEditing(false)
    if (draft !== value) {
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
    }
  }

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      className: `w-full bg-zinc-800 text-zinc-100 rounded px-2 py-1 outline-none border border-zinc-600 focus:border-indigo-500 ${className}`,
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
      className={`cursor-text rounded px-2 py-1 hover:bg-zinc-800 transition-colors ${
        value ? 'text-zinc-100' : 'text-zinc-500 opacity-40'
      } ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

export default InlineEdit
