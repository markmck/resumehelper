import { useEffect, useState } from 'react'
import InlineEdit from './InlineEdit'

interface Publication {
  id: number
  name: string
  publisher: string
  releaseDate: string | null
  url: string
  summary: string
}

function PublicationList(): React.JSX.Element {
  const [items, setItems] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    window.api.publications.list().then((data) => {
      setItems(data as Publication[])
      setLoading(false)
    })
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (!newName.trim()) return
    const created = await window.api.publications.create({ name: newName.trim() })
    setItems((prev) => [...prev, created as Publication])
    setNewName('')
    setAdding(false)
  }

  const handleUpdate = async (id: number, data: Partial<Publication>): Promise<void> => {
    const updated = await window.api.publications.update(id, data as Parameters<typeof window.api.publications.update>[1])
    setItems((prev) => prev.map((item) => (item.id === id ? (updated as Publication) : item)))
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.publications.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading publications...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            + Add Publication
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
            placeholder="Publication name (required)"
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
            No publications yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
          >
            + Add Publication
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
                    value={item.name}
                    placeholder="Name"
                    onSave={(val) => handleUpdate(item.id, { name: val })}
                    className="text-zinc-100 font-medium text-sm"
                  />
                  {item.publisher && (
                    <>
                      <span className="text-zinc-500 text-sm">—</span>
                      <InlineEdit
                        value={item.publisher}
                        placeholder="Publisher"
                        onSave={(val) => handleUpdate(item.id, { publisher: val })}
                        className="text-zinc-300 text-sm"
                      />
                    </>
                  )}
                  {item.releaseDate && (
                    <>
                      <span className="text-zinc-500 text-sm">(</span>
                      <InlineEdit
                        value={item.releaseDate}
                        placeholder="Date"
                        onSave={(val) => handleUpdate(item.id, { releaseDate: val || null })}
                        className="text-zinc-400 text-sm"
                      />
                      <span className="text-zinc-500 text-sm">)</span>
                    </>
                  )}
                  {!item.releaseDate && (
                    <InlineEdit
                      value=""
                      placeholder="+ date"
                      onSave={(val) => handleUpdate(item.id, { releaseDate: val || null })}
                      className="text-zinc-500 text-xs"
                    />
                  )}
                </div>
                {item.url && (
                  <div style={{ marginTop: '4px' }}>
                    <InlineEdit
                      value={item.url}
                      placeholder="URL"
                      onSave={(val) => handleUpdate(item.id, { url: val })}
                      className="text-indigo-400 text-xs"
                    />
                  </div>
                )}
                {!item.url && (
                  <div style={{ marginTop: '4px' }}>
                    <InlineEdit
                      value=""
                      placeholder="+ url"
                      onSave={(val) => handleUpdate(item.id, { url: val })}
                      className="text-zinc-500 text-xs"
                    />
                  </div>
                )}
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

export default PublicationList
