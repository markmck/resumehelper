import { createPortal } from 'react-dom'
import { useRef, useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  onInputChange?: (value: string) => void
  style?: React.CSSProperties
  suggestions?: string[]
}

function TagInput({ tags, onChange, onInputChange, style = {}, suggestions }: TagInputProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = (suggestions ?? []).filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  )
  const showDropdown = dropdownOpen && filtered.length > 0 && inputValue.length > 0

  const addTag = (raw: string): void => {
    const trimmed = raw.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInputValue('')
    onInputChange?.('')
    setDropdownOpen(false)
    setActiveIndex(-1)
  }

  const removeTag = (index: number): void => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (showDropdown && e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (showDropdown && e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
      return
    }
    if (showDropdown && e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      addTag(filtered[activeIndex])
      setActiveIndex(-1)
      setDropdownOpen(false)
      return
    }
    if (e.key === 'Escape') {
      setDropdownOpen(false)
      setActiveIndex(-1)
      return
    }
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    // Auto-split on comma typed
    if (val.endsWith(',')) {
      addTag(val.slice(0, -1))
    } else {
      setInputValue(val)
      onInputChange?.(val)
      setDropdownOpen(true)
      setActiveIndex(-1)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-1)',
        alignItems: 'center',
        minHeight: '32px',
        ...style,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            backgroundColor: 'var(--color-blue-bg)',
            color: 'var(--color-blue)',
            fontSize: 'var(--font-size-xs)',
            padding: '2px 8px',
            borderRadius: '9999px',
          }}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(i)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-blue)',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              fontSize: 'var(--font-size-sm)',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7' }}
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setDropdownOpen(false)
          setActiveIndex(-1)
        }}
        placeholder={tags.length === 0 && inputValue === '' ? 'Add tag...' : ''}
        style={{
          flex: 1,
          minWidth: '80px',
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-xs)',
          outline: 'none',
          border: 'none',
          fontFamily: 'var(--font-sans)',
        }}
      />
      {showDropdown && containerRef.current && createPortal(
        <ul style={{
          position: 'fixed',
          top: containerRef.current.getBoundingClientRect().bottom + 4,
          left: containerRef.current.getBoundingClientRect().left,
          width: containerRef.current.getBoundingClientRect().width,
          maxHeight: '160px',
          overflowY: 'auto',
          zIndex: 9999,
          background: 'var(--color-bg-overlay)',
          border: '1px solid var(--color-border-emphasis)',
          borderRadius: 'var(--radius-md)',
          padding: '4px 0',
          margin: 0,
          listStyle: 'none',
        }}>
          {filtered.map((s, i) => (
            <li
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                addTag(s)
                setActiveIndex(-1)
              }}
              style={{
                padding: '6px 12px',
                fontSize: 'var(--font-size-xs)',
                color: i === activeIndex ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: i === activeIndex ? 'var(--color-bg-raised)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {s}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}

export default TagInput
