import { useEffect, useState } from 'react'
import InlineEdit from './InlineEdit'

interface Reference {
  id: number
  name: string
  reference: string
}

function ReferenceList(): React.JSX.Element {
  const [items, setItems] = useState<Reference[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    window.api.references.list().then((data) => {
      setItems(data as Reference[])
      setLoading(false)
    })
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (!newName.trim()) return
    const created = await window.api.references.create({ name: newName.trim() })
    setItems((prev) => [...prev, created as Reference])
    setNewName('')
    setAdding(false)
  }

  const handleUpdate = async (id: number, data: Partial<Reference>): Promise<void> => {
    const updated = await window.api.references.update(id, data as Parameters<typeof window.api.references.update>[1])
    setItems((prev) => prev.map((item) => (item.id === id ? (updated as Reference) : item)))
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.references.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading references...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            + Add Reference
          </button>
        </div>
      )}

      {adding && (
        <div
          className="bg-zinc-800 rounded-lg border border-zinc-700"
          style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <input
            type="text"
            placeholder="Reference name (required)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            className="w-full bg-zinc-700 text-zinc-100 rounded px-2 py-1 outline-none border border-zinc-600 focus:border-indigo-500 text-sm"
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewName('') }}
              className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm" style={{ marginBottom: '12px' }}>
            No references yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
          >
            + Add Reference
          </button>
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-800 rounded-lg border border-zinc-700"
            style={{ padding: '12px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <InlineEdit
                  value={item.name}
                  placeholder="Name"
                  onSave={(val) => handleUpdate(item.id, { name: val })}
                  className="text-zinc-100 font-medium text-sm"
                />
                <div style={{ marginTop: '8px' }}>
                  <InlineEdit
                    value={item.reference || ''}
                    placeholder="Reference text..."
                    onSave={(val) => handleUpdate(item.id, { reference: val })}
                    className="text-zinc-400 text-sm"
                    multiline
                  />
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                style={{ marginLeft: '8px', flexShrink: 0 }}
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default ReferenceList
