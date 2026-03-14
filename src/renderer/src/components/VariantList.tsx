import { TemplateVariant } from '../../../preload/index.d'

interface VariantListProps {
  variants: TemplateVariant[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: () => void
  onDelete: (id: number) => void
  onDuplicate: (id: number) => void
}

function VariantList({
  variants,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
}: VariantListProps): React.JSX.Element {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Variants</span>
        <button
          onClick={onCreate}
          title="New Variant"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded p-1 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {variants.length === 0 ? (
          <p className="text-xs text-zinc-600 px-3 py-2">No variants yet</p>
        ) : (
          variants.map((variant) => (
            <div
              key={variant.id}
              onClick={() => onSelect(variant.id)}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                selectedId === variant.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <span className="text-sm truncate flex-1">{variant.name}</span>

              {/* Contextual controls — visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                {/* Duplicate */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(variant.id)
                  }}
                  title="Duplicate"
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(variant.id)
                  }}
                  title="Delete"
                  className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default VariantList
