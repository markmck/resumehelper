import { useEffect, useState } from 'react'
import InlineEdit from './InlineEdit'

interface Volunteer {
  id: number
  organization: string
  position: string
  startDate: string
  endDate: string | null
  summary: string
  highlights: string[]
}

function VolunteerList(): React.JSX.Element {
  const [items, setItems] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newOrg, setNewOrg] = useState('')
  const [newPosition, setNewPosition] = useState('')

  useEffect(() => {
    window.api.volunteer.list().then((data) => {
      setItems(data as Volunteer[])
      setLoading(false)
    })
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (!newOrg.trim()) return
    const created = await window.api.volunteer.create({
      organization: newOrg.trim(),
      position: newPosition.trim() || undefined,
    })
    setItems((prev) => [...prev, created as Volunteer])
    setNewOrg('')
    setNewPosition('')
    setAdding(false)
  }

  const handleUpdate = async (id: number, data: Partial<Volunteer>): Promise<void> => {
    const updated = await window.api.volunteer.update(id, data as Parameters<typeof window.api.volunteer.update>[1])
    setItems((prev) => prev.map((item) => (item.id === id ? (updated as Volunteer) : item)))
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.volunteer.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading volunteer experience...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            + Add Volunteer
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
            placeholder="Organization (required)"
            value={newOrg}
            onChange={(e) => setNewOrg(e.target.value)}
            className="w-full bg-zinc-700 text-zinc-100 rounded px-2 py-1 outline-none border border-zinc-600 focus:border-indigo-500 text-sm"
            autoFocus
          />
          <input
            type="text"
            placeholder="Position / Role"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewOrg(''); setNewPosition('') }
            }}
            className="w-full bg-zinc-700 text-zinc-100 rounded px-2 py-1 outline-none border border-zinc-600 focus:border-indigo-500 text-sm"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewOrg(''); setNewPosition('') }}
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
            No volunteer experience yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
          >
            + Add Volunteer
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
                    value={item.organization}
                    placeholder="Organization"
                    onSave={(val) => handleUpdate(item.id, { organization: val })}
                    className="text-zinc-100 font-medium text-sm"
                  />
                  {item.position && (
                    <>
                      <span className="text-zinc-500 text-sm">—</span>
                      <InlineEdit
                        value={item.position}
                        placeholder="Position"
                        onSave={(val) => handleUpdate(item.id, { position: val })}
                        className="text-zinc-300 text-sm"
                      />
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <InlineEdit
                    value={item.startDate || ''}
                    placeholder="Start date"
                    onSave={(val) => handleUpdate(item.id, { startDate: val })}
                    className="text-zinc-400 text-xs"
                  />
                  <span className="text-zinc-600 text-xs">–</span>
                  <InlineEdit
                    value={item.endDate || ''}
                    placeholder="End date"
                    onSave={(val) => handleUpdate(item.id, { endDate: val || null })}
                    className="text-zinc-400 text-xs"
                  />
                </div>
                {item.summary && (
                  <div style={{ marginTop: '8px' }}>
                    <InlineEdit
                      value={item.summary}
                      placeholder="Summary"
                      onSave={(val) => handleUpdate(item.id, { summary: val })}
                      className="text-zinc-400 text-xs"
                      multiline
                    />
                  </div>
                )}
                {item.highlights.length > 0 && (
                  <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
                    {item.highlights.map((h, i) => (
                      <li key={i} className="text-zinc-400 text-xs" style={{ listStyleType: 'disc', marginBottom: '2px' }}>
                        {h}
                      </li>
                    ))}
                  </ul>
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

export default VolunteerList
