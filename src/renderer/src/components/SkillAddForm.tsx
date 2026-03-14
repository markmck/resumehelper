import { useEffect, useRef, useState } from 'react'
import TagInput from './TagInput'

interface SkillAddFormProps {
  onSave: (data: { name: string; tags: string[] }) => void
  onCancel: () => void
}

function SkillAddForm({ onSave, onCancel }: SkillAddFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const pendingTagRef = useRef('')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const errs: string[] = []
    if (!name.trim()) errs.push('Skill name is required')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    // Include any pending tag text that wasn't committed with Enter/comma
    const finalTags = [...tags]
    const pending = pendingTagRef.current.trim()
    if (pending && !finalTags.includes(pending)) {
      finalTags.push(pending)
    }
    onSave({ name: name.trim(), tags: finalTags })
  }

  const inputClass =
    'w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-zinc-500'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-3"
    >
      <h3 className="text-sm font-medium text-zinc-300 mb-3">Add Skill</h3>

      {errors.length > 0 && (
        <div className="mb-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-red-400 text-xs">
              {err}
            </p>
          ))}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs text-zinc-400 mb-1">Skill Name</label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. React, TypeScript, Leadership"
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs text-zinc-400 mb-1">Tags</label>
        <div className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 focus-within:border-indigo-500 transition-colors">
          <TagInput tags={tags} onChange={setTags} onInputChange={(val) => { pendingTagRef.current = val }} />
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Press Enter or comma to add a tag
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-md transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default SkillAddForm
