import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import InlineEdit from './InlineEdit'

interface BulletItemProps {
  id: number
  text: string
  onUpdate: (text: string) => void
  onDelete: () => void
  onEnterKey?: () => void
  autoFocus?: boolean
  onFocused?: () => void
  editOnMount?: boolean
}

function BulletItem({ id, text, onUpdate, onDelete, onEnterKey, autoFocus, onFocused }: BulletItemProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const [hovered, setHovered] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)
  const [dragHovered, setDragHovered] = useState(false)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: '2px 0',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onMouseEnter={() => setDragHovered(true)}
        onMouseLeave={() => setDragHovered(false)}
        style={{
          flexShrink: 0,
          color: dragHovered ? 'var(--color-text-tertiary)' : 'var(--color-text-muted)',
          cursor: 'grab',
          background: 'none',
          border: 'none',
          padding: 0,
          opacity: hovered ? 1 : 0,
          transition: 'color 0.15s, opacity 0.15s',
        }}
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <svg
          width="12"
          height="16"
          viewBox="0 0 12 16"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>

      {/* Bullet dot */}
      <span style={{
        flexShrink: 0,
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: 'var(--color-text-muted)',
      }} />

      {/* Bullet text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineEdit
          value={text}
          onSave={(v) => {
            if (!v.trim()) {
              onDelete()
            } else {
              onUpdate(v)
            }
          }}
          onEnter={onEnterKey}
          placeholder="Add bullet text..."
          multiline={false}
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'block', width: '100%' }}
          autoFocus={autoFocus}
          onFocused={onFocused}
          alwaysFireSave
        />
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
        style={{
          flexShrink: 0,
          color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontSize: 'var(--font-size-sm)',
          lineHeight: 1,
          opacity: hovered ? 1 : 0,
          transition: 'color 0.15s, opacity 0.15s',
        }}
        aria-label="Delete bullet"
      >
        ×
      </button>
    </div>
  )
}

export default BulletItem
