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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group py-0.5"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing transition-colors opacity-0 group-hover:opacity-100"
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
      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-500" />

      {/* Bullet text */}
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={text}
          onSave={onUpdate}
          onEnter={onEnterKey}
          placeholder="Add bullet text..."
          multiline={false}
          className="text-sm text-zinc-300 block w-full"
          autoFocus={autoFocus}
          onFocused={onFocused}
        />
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm leading-none"
        aria-label="Delete bullet"
      >
        ×
      </button>
    </div>
  )
}

export default BulletItem
