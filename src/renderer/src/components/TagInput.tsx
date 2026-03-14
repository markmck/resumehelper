import { useRef, useState } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  onInputChange?: (value: string) => void
  className?: string
}

function TagInput({ tags, onChange, onInputChange, className = '' }: TagInputProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string): void => {
    const trimmed = raw.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInputValue('')
    onInputChange?.('')
  }

  const removeTag = (index: number): void => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
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
    }
  }

  return (
    <div
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
        placeholder={tags.length === 0 && inputValue === '' ? 'Add tag...' : ''}
        className="flex-1 min-w-[80px] bg-transparent text-zinc-100 text-xs outline-none placeholder-zinc-500"
      />
    </div>
  )
}

export default TagInput
