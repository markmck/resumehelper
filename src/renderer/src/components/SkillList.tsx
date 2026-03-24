import { useEffect, useState } from 'react'
import SkillAddForm from './SkillAddForm'
import SkillItem from './SkillItem'

interface Skill {
  id: number
  name: string
  tags: string[]
}

function SkillList(): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addHovered, setAddHovered] = useState(false)
  const [emptyAddHovered, setEmptyAddHovered] = useState(false)

  useEffect(() => {
    window.api.skills.list().then((data) => {
      setSkills(data as Skill[])
      setLoading(false)
    })
  }, [])

  const handleAddSkill = async (data: { name: string; tags: string[] }): Promise<void> => {
    const newSkill = await window.api.skills.create(data)
    setSkills((prev) => [...prev, newSkill as Skill])
    setAdding(false)
  }

  const handleUpdateSkill = async (
    id: number,
    data: { name?: string; tags?: string[] },
  ): Promise<void> => {
    const updated = await window.api.skills.update(id, data)
    setSkills((prev) => prev.map((s) => (s.id === id ? (updated as Skill) : s)))
  }

  const handleDeleteSkill = async (id: number): Promise<void> => {
    await window.api.skills.delete(id)
    setSkills((prev) => prev.filter((s) => s.id !== id))
  }

  // Group skills by tag — a skill with multiple tags appears in each tag's group
  const computeGroups = (): Map<string, Skill[]> => {
    const groups = new Map<string, Skill[]>()

    for (const skill of skills) {
      if (skill.tags.length === 0) {
        const uncategorized = groups.get('Uncategorized') ?? []
        groups.set('Uncategorized', [...uncategorized, skill])
      } else {
        for (const tag of skill.tags) {
          const group = groups.get(tag) ?? []
          groups.set(tag, [...group, skill])
        }
      }
    }

    return groups
  }

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading skills...</div>
  }

  const groups = computeGroups()
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Add Skill button */}
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
            style={ghostButtonStyle(addHovered)}
          >
            + Add Skill
          </button>
        </div>
      )}

      {/* Inline add form */}
      {adding && (
        <SkillAddForm onSave={handleAddSkill} onCancel={() => setAdding(false)} allTags={allTags} />
      )}

      {/* Empty state */}
      {skills.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
            No skills added yet. Add your first skill to get started.
          </p>
          <button
            onClick={() => setAdding(true)}
            onMouseEnter={() => setEmptyAddHovered(true)}
            onMouseLeave={() => setEmptyAddHovered(false)}
            style={ghostButtonStyle(emptyAddHovered)}
          >
            + Add Skill
          </button>
        </div>
      ) : (
        // Tag-grouped display
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {Array.from(groups.entries()).map(([tag, tagSkills]) => (
            <div key={tag}>
              <h3 style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
                marginBottom: 'var(--space-1)',
              }}>
                {tag}
              </h3>
              <div>
                {tagSkills.map((skill) => (
                  <SkillItem
                    key={skill.id}
                    skill={skill}
                    allTags={allTags}
                    onUpdate={handleUpdateSkill}
                    onDelete={handleDeleteSkill}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SkillList
