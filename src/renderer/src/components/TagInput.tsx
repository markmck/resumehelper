import { createPortal } from 'react-dom'
import { useRef, useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  onInputChange?: (value: string) => void
  className?: string
  suggestions?: string[]
}

function TagInput({ tags, onChange, onInputChange, className = '', suggestions }: TagInputProps): React.JSX.Element {
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
      className={`flex flex-wrap gap-1 items-center min-h-[32px] ${className}`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-zinc-700 text-zinc-200 text-xs px-2 py-0.5 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(i)
            }}
            className="text-zinc-400 hover:text-zinc-100 leading-none transition-colors"
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
        className="flex-1 min-w-[80px] bg-transparent text-zinc-100 text-xs outline-none placeholder-zinc-500"
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
          background: '#27272a',
          border: '1px solid #3f3f46',
          borderRadius: '6px',
          padding: '4px 0',
          margin: 0,
          listStyle: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
                fontSize: '12px',
                color: i === activeIndex ? '#f4f4f5' : '#a1a1aa',
                background: i === activeIndex ? '#3f3f46' : 'transparent',
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
