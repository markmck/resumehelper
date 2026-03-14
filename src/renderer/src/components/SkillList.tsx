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
    return <div className="text-zinc-500 text-sm">Loading skills...</div>
  }

  const groups = computeGroups()

  return (
    <div>
      {/* Add Skill button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mb-4 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md transition-colors"
        >
          + Add Skill
        </button>
      )}

      {/* Inline add form */}
      {adding && (
        <SkillAddForm onSave={handleAddSkill} onCancel={() => setAdding(false)} />
      )}

      {/* Empty state */}
      {skills.length === 0 && !adding ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm mb-4">
            No skills added yet. Add your first skill to get started.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md transition-colors"
          >
            + Add Skill
          </button>
        </div>
      ) : (
        // Tag-grouped display
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([tag, tagSkills]) => (
            <div key={tag}>
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
                {tag}
              </h3>
              <div>
                {tagSkills.map((skill) => (
                  <SkillItem
                    key={skill.id}
                    skill={skill}
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
