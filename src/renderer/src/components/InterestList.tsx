import { useEffect, useState } from 'react'
import InlineEdit from './InlineEdit'

interface Interest {
  id: number
  name: string
  keywords: string[]
}

function InterestList(): React.JSX.Element {
  const [items, setItems] = useState<Interest[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    window.api.interests.list().then((data) => {
      setItems(data as Interest[])
      setLoading(false)
    })
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (!newName.trim()) return
    const created = await window.api.interests.create({ name: newName.trim() })
    setItems((prev) => [...prev, created as Interest])
    setNewName('')
    setAdding(false)
  }

  const handleUpdate = async (id: number, data: Partial<Interest>): Promise<void> => {
    const updated = await window.api.interests.update(id, data as Parameters<typeof window.api.interests.update>[1])
    setItems((prev) => prev.map((item) => (item.id === id ? (updated as Interest) : item)))
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.interests.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleKeywordsUpdate = async (id: number, keywordsText: string): Promise<void> => {
    const keywords = keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    await handleUpdate(id, { keywords })
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading interests...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            + Add Interest
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
            placeholder="Interest name (required)"
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
            No interests yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
          >
            + Add Interest
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
                  placeholder="Interest name"
                  onSave={(val) => handleUpdate(item.id, { name: val })}
                  className="text-zinc-100 font-medium text-sm"
                />
                {item.keywords.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {item.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="bg-zinc-700 text-zinc-300 text-xs rounded px-2 py-0.5"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  <InlineEdit
                    value={item.keywords.join(', ')}
                    placeholder="Keywords (comma-separated)"
                    onSave={(val) => handleKeywordsUpdate(item.id, val)}
                    className="text-zinc-500 text-xs"
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

export default InterestList
