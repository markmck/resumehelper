import { useEffect, useState } from 'react'
import InlineEdit from './InlineEdit'

interface Award {
  id: number
  title: string
  date: string | null
  awarder: string
  summary: string
}

function AwardList(): React.JSX.Element {
  const [items, setItems] = useState<Award[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    window.api.awards.list().then((data) => {
      setItems(data as Award[])
      setLoading(false)
    })
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (!newTitle.trim()) return
    const created = await window.api.awards.create({ title: newTitle.trim() })
    setItems((prev) => [...prev, created as Award])
    setNewTitle('')
    setAdding(false)
  }

  const handleUpdate = async (id: number, data: Partial<Award>): Promise<void> => {
    const updated = await window.api.awards.update(id, data as Parameters<typeof window.api.awards.update>[1])
    setItems((prev) => prev.map((item) => (item.id === id ? (updated as Award) : item)))
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.awards.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading awards...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            + Add Award
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
            placeholder="Award title (required)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
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
              onClick={() => { setAdding(false); setNewTitle('') }}
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
            No awards yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
          >
            + Add Award
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <InlineEdit
                    value={item.title}
                    placeholder="Title"
                    onSave={(val) => handleUpdate(item.id, { title: val })}
                    className="text-zinc-100 font-medium text-sm"
                  />
                  {item.awarder && (
                    <>
                      <span className="text-zinc-500 text-sm">—</span>
                      <InlineEdit
                        value={item.awarder}
                        placeholder="Awarder"
                        onSave={(val) => handleUpdate(item.id, { awarder: val })}
                        className="text-zinc-300 text-sm"
                      />
                    </>
                  )}
                  {item.date && (
                    <>
                      <span className="text-zinc-500 text-sm">(</span>
                      <InlineEdit
                        value={item.date}
                        placeholder="Date"
                        onSave={(val) => handleUpdate(item.id, { date: val || null })}
                        className="text-zinc-400 text-sm"
                      />
                      <span className="text-zinc-500 text-sm">)</span>
                    </>
                  )}
                  {!item.date && (
                    <InlineEdit
                      value=""
                      placeholder="+ date"
                      onSave={(val) => handleUpdate(item.id, { date: val || null })}
                      className="text-zinc-500 text-xs"
                    />
                  )}
                </div>
                {item.summary && (
                  <div style={{ marginTop: '6px' }}>
                    <InlineEdit
                      value={item.summary}
                      placeholder="Summary"
                      onSave={(val) => handleUpdate(item.id, { summary: val })}
                      className="text-zinc-400 text-xs"
                      multiline
                    />
                  </div>
                )}
                {!item.summary && (
                  <div style={{ marginTop: '4px' }}>
                    <InlineEdit
                      value=""
                      placeholder="+ summary"
                      onSave={(val) => handleUpdate(item.id, { summary: val })}
                      className="text-zinc-500 text-xs"
                    />
                  </div>
                )}
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

export default AwardList
