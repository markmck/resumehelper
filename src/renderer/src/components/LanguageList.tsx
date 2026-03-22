import { useEffect, useState } from 'react'
import InlineEdit from './InlineEdit'

interface Language {
  id: number
  language: string
  fluency: string
}

function LanguageList(): React.JSX.Element {
  const [items, setItems] = useState<Language[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newLanguage, setNewLanguage] = useState('')
  const [newFluency, setNewFluency] = useState('')

  useEffect(() => {
    window.api.languages.list().then((data) => {
      setItems(data as Language[])
      setLoading(false)
    })
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (!newLanguage.trim()) return
    const created = await window.api.languages.create({
      language: newLanguage.trim(),
      fluency: newFluency.trim() || undefined,
    })
    setItems((prev) => [...prev, created as Language])
    setNewLanguage('')
    setNewFluency('')
    setAdding(false)
  }

  const handleUpdate = async (id: number, data: Partial<Language>): Promise<void> => {
    const updated = await window.api.languages.update(id, data as Parameters<typeof window.api.languages.update>[1])
    setItems((prev) => prev.map((item) => (item.id === id ? (updated as Language) : item)))
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.languages.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading languages...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            + Add Language
          </button>
        </div>
      )}

      {adding && (
        <div
          className="bg-zinc-800 rounded-lg border border-zinc-700"
          style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}
        >
          <input
            type="text"
            placeholder="Language (required)"
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 outline-none border border-zinc-600 focus:border-indigo-500 text-sm"
            style={{ flex: '1 1 120px' }}
            autoFocus
          />
          <input
            type="text"
            placeholder="Fluency level"
            value={newFluency}
            onChange={(e) => setNewFluency(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewLanguage(''); setNewFluency('') }
            }}
            className="bg-zinc-700 text-zinc-100 rounded px-2 py-1 outline-none border border-zinc-600 focus:border-indigo-500 text-sm"
            style={{ flex: '1 1 120px' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewLanguage(''); setNewFluency('') }}
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
            No languages yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
          >
            + Add Language
          </button>
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-800 rounded-lg border border-zinc-700"
            style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <InlineEdit
                value={item.language}
                placeholder="Language"
                onSave={(val) => handleUpdate(item.id, { language: val })}
                className="text-zinc-100 font-medium text-sm"
              />
              <span className="text-zinc-500 text-sm">—</span>
              <InlineEdit
                value={item.fluency || ''}
                placeholder="Fluency"
                onSave={(val) => handleUpdate(item.id, { fluency: val })}
                className="text-zinc-400 text-sm"
              />
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
        ))
      )}
    </div>
  )
}

export default LanguageList
