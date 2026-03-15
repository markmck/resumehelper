import { useEffect, useRef, useState } from 'react'

interface ProjectAddFormProps {
  onSave: (data: { name: string }) => void
  onCancel: () => void
}

function ProjectAddForm({ onSave, onCancel }: ProjectAddFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim() })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
    >
      <h3 className="text-sm font-medium text-zinc-300" style={{ marginBottom: '12px' }}>Add Project</h3>

      <div style={{ marginBottom: '12px' }}>
        <label className="block text-xs text-zinc-400" style={{ marginBottom: '4px' }}>Project Name</label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Project"
          className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-zinc-500"
        />
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

export default ProjectAddForm
