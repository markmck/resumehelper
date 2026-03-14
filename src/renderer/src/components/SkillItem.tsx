import InlineEdit from './InlineEdit'
import TagInput from './TagInput'

interface Skill {
  id: number
  name: string
  tags: string[]
}

interface SkillItemProps {
  skill: Skill
  onUpdate: (id: number, data: { name?: string; tags?: string[] }) => void
  onDelete: (id: number) => void
}

function SkillItem({ skill, onUpdate, onDelete }: SkillItemProps): React.JSX.Element {
  return (
    <div className="group flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800/60 border border-zinc-800 rounded-lg px-3 py-2 mb-2 transition-colors">
      {/* Skill name — inline editable */}
      <div className="w-40 shrink-0">
        <InlineEdit
          value={skill.name}
          onSave={(newName) => onUpdate(skill.id, { name: newName })}
          placeholder="Skill name"
          className="text-sm font-medium"
        />
      </div>

      {/* Tags — chip-style editable */}
      <div className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md px-2 py-1">
        <TagInput
          tags={skill.tags}
          onChange={(newTags) => onUpdate(skill.id, { tags: newTags })}
        />
      </div>

      {/* Delete button — visible on hover */}
      <button
        type="button"
        onClick={() => onDelete(skill.id)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-all"
        aria-label="Delete skill"
      >
        ×
      </button>
    </div>
  )
}

export default SkillItem
