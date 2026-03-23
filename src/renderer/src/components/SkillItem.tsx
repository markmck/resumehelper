import { useState } from 'react'
import InlineEdit from './InlineEdit'
import TagInput from './TagInput'

interface Skill {
  id: number
  name: string
  tags: string[]
}

interface SkillItemProps {
  skill: Skill
  allTags: string[]
  onUpdate: (id: number, data: { name?: string; tags?: string[] }) => void
  onDelete: (id: number) => void
}

function SkillItem({ skill, allTags, onUpdate, onDelete }: SkillItemProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        backgroundColor: hovered ? 'var(--color-bg-raised)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 8px',
        margin: '0 -8px',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Skill name — inline editable */}
      <div style={{ width: 112, flexShrink: 0 }}>
        <InlineEdit
          value={skill.name}
          onSave={(newName) => onUpdate(skill.id, { name: newName })}
          placeholder="Skill name"
          style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}
        />
      </div>

      {/* Tags — chip-style editable */}
      <div style={{ flex: 1 }}>
        <TagInput
          tags={skill.tags}
          onChange={(newTags) => onUpdate(skill.id, { tags: newTags })}
          suggestions={allTags}
        />
      </div>

      {/* Delete button — visible on hover */}
      <button
        type="button"
        onClick={() => onDelete(skill.id)}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
        style={{
          opacity: hovered ? 1 : 0,
          flexShrink: 0,
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
          background: 'none',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          padding: 0,
          transition: 'color 0.15s, opacity 0.15s',
        }}
        aria-label="Delete skill"
      >
        ×
      </button>
    </div>
  )
}

export default SkillItem
