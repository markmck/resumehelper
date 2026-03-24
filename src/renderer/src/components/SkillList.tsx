import { useEffect, useState } from 'react'
import SkillAddForm from './SkillAddForm'

interface Skill {
  id: number
  name: string
  tags: string[]
}

interface SkillListProps {
  onCountChange?: (count: number) => void
}

const CHIP_LIMIT = 8

function SkillList({ onCountChange }: SkillListProps): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [addHovered, setAddHovered] = useState(false)

  useEffect(() => {
    window.api.skills.list().then((data) => {
      const loaded = data as Skill[]
      setSkills(loaded)
      setLoading(false)
      onCountChange?.(loaded.length)
    })
  }, [])

  const handleAddSkill = async (data: { name: string; tags: string[] }): Promise<void> => {
    const newSkill = await window.api.skills.create(data)
    const updated = [...skills, newSkill as Skill]
    setSkills(updated)
    setAdding(false)
    onCountChange?.(updated.length)
  }

  const handleDeleteSkill = async (id: number): Promise<void> => {
    await window.api.skills.delete(id)
    const updated = skills.filter((s) => s.id !== id)
    setSkills(updated)
    onCountChange?.(updated.length)
  }

  const allTags = [...new Set(skills.flatMap((s) => s.tags))]

  const ghostButtonStyle = (isHovered: boolean): React.CSSProperties => ({
    backgroundColor: 'transparent',
    border: 'none',
    color: isHovered ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
    padding: '4px 8px',
    fontSize: 'var(--font-size-xs)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'color 0.15s',
  })

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading skills...</div>
  }

  const visibleSkills = showAll ? skills : skills.slice(0, CHIP_LIMIT)
  const overflowCount = skills.length - CHIP_LIMIT

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Chip display */}
      {skills.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
            No skills added yet. Add your first skill to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
          {visibleSkills.map((skill) => (
            <SkillChip
              key={skill.id}
              skill={skill}
              onDelete={() => handleDeleteSkill(skill.id)}
            />
          ))}

          {/* Overflow chip */}
          {!showAll && overflowCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                backgroundColor: 'var(--color-bg-raised)',
                color: 'var(--color-text-secondary)',
                border: '1px dashed var(--color-border-default)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
                padding: '3px 10px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-input)'
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-raised)'
                e.currentTarget.style.borderColor = 'var(--color-border-default)'
              }}
            >
              +{overflowCount} more
            </button>
          )}

          {/* Collapse chip when expanded */}
          {showAll && skills.length > CHIP_LIMIT && (
            <button
              onClick={() => setShowAll(false)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text-muted)',
                border: 'none',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                padding: '3px 6px',
              }}
            >
              show less
            </button>
          )}
        </div>
      )}

      {/* Add Skill button */}
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
            style={ghostButtonStyle(addHovered)}
          >
            + Add skill
          </button>
        </div>
      )}

      {/* Inline add form */}
      {adding && (
        <SkillAddForm onSave={handleAddSkill} onCancel={() => setAdding(false)} allTags={allTags} />
      )}
    </div>
  )
}

interface SkillChipProps {
  skill: { id: number; name: string }
  onDelete: () => void
}

function SkillChip({ skill, onDelete }: SkillChipProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        backgroundColor: 'var(--color-blue-bg)',
        color: 'var(--color-blue)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 500,
        padding: '3px 10px',
        userSelect: 'none',
      }}
    >
      <span>{skill.name}</span>
      <button
        onClick={onDelete}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: hovered ? 'var(--color-blue)' : 'var(--color-blue)',
          opacity: hovered ? 1 : 0.6,
          padding: '0 0 0 2px',
          fontSize: '13px',
          lineHeight: 1,
          transition: 'opacity 0.15s',
          fontFamily: 'var(--font-sans)',
        }}
        aria-label={`Remove ${skill.name}`}
      >
        ×
      </button>
    </div>
  )
}

export default SkillList
