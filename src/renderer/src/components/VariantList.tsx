import { useState } from 'react'
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
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [headerBtnHover, setHeaderBtnHover] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Variants
        </span>
        <button
          onClick={onCreate}
          title="New Variant"
          onMouseEnter={() => setHeaderBtnHover(true)}
          onMouseLeave={() => setHeaderBtnHover(false)}
          style={{
            background: headerBtnHover ? 'var(--color-bg-raised)' : 'none',
            border: 'none',
            color: headerBtnHover ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s, background-color 0.15s',
          }}
        >
          <svg
            width={16}
            height={16}
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
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-1) 0' }}>
        {variants.length === 0 ? (
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              padding: '8px 12px',
              margin: 0,
            }}
          >
            No variants yet
          </p>
        ) : (
          variants.map((variant) => {
            const isActive = selectedId === variant.id
            const isHovered = hoveredId === variant.id
            return (
              <VariantRow
                key={variant.id}
                variant={variant}
                isActive={isActive}
                isHovered={isHovered}
                onMouseEnter={() => setHoveredId(variant.id)}
                onMouseLeave={() => setHoveredId(null)}
                onSelect={onSelect}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

interface VariantRowProps {
  variant: TemplateVariant
  isActive: boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onSelect: (id: number) => void
  onDuplicate: (id: number) => void
  onDelete: (id: number) => void
}

function VariantRow({
  variant,
  isActive,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onSelect,
  onDuplicate,
  onDelete,
}: VariantRowProps): React.JSX.Element {
  const [dupHover, setDupHover] = useState(false)
  const [delHover, setDelHover] = useState(false)

  return (
    <div
      onClick={() => onSelect(variant.id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        cursor: 'pointer',
        transition: 'background-color 0.15s, color 0.15s',
        backgroundColor: isActive
          ? 'var(--color-accent-bg)'
          : isHovered
            ? 'var(--color-bg-raised)'
            : 'transparent',
        color: isActive
          ? 'var(--color-accent-light)'
          : isHovered
            ? 'var(--color-text-primary)'
            : 'var(--color-text-secondary)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {variant.name}
      </span>

      {/* Contextual controls — visible on hover */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s',
          marginLeft: 'var(--space-1)',
        }}
      >
        {/* Duplicate */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(variant.id)
          }}
          onMouseEnter={() => setDupHover(true)}
          onMouseLeave={() => setDupHover(false)}
          title="Duplicate"
          style={{
            padding: 'var(--space-1)',
            borderRadius: 'var(--radius-sm)',
            background: dupHover ? 'var(--color-bg-raised)' : 'none',
            border: 'none',
            color: dupHover ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s, background-color 0.15s',
          }}
        >
          <svg
            width={14}
            height={14}
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
          onMouseEnter={() => setDelHover(true)}
          onMouseLeave={() => setDelHover(false)}
          title="Delete"
          style={{
            padding: 'var(--space-1)',
            borderRadius: 'var(--radius-sm)',
            background: delHover ? 'var(--color-bg-raised)' : 'none',
            border: 'none',
            color: delHover ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s, background-color 0.15s',
          }}
        >
          <svg
            width={14}
            height={14}
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
  )
}

export default VariantList
