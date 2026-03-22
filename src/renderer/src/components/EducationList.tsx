import { useEffect, useState } from 'react'
import InlineEdit from './InlineEdit'

interface Education {
  id: number
  institution: string
  area: string
  studyType: string
  startDate: string
  endDate: string | null
  score: string | null
  courses: string[]
}

function EducationList(): React.JSX.Element {
  const [items, setItems] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newInstitution, setNewInstitution] = useState('')
  const [newArea, setNewArea] = useState('')

  useEffect(() => {
    window.api.education.list().then((data) => {
      setItems(data as Education[])
      setLoading(false)
    })
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (!newInstitution.trim()) return
    const created = await window.api.education.create({
      institution: newInstitution.trim(),
      area: newArea.trim() || undefined,
    })
    setItems((prev) => [...prev, created as Education])
    setNewInstitution('')
    setNewArea('')
    setAdding(false)
  }

  const handleUpdate = async (id: number, data: Partial<Education>): Promise<void> => {
    const updated = await window.api.education.update(id, data as Parameters<typeof window.api.education.update>[1])
    setItems((prev) => prev.map((item) => (item.id === id ? (updated as Education) : item)))
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.education.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleCoursesUpdate = async (id: number, coursesText: string): Promise<void> => {
    const courses = coursesText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
    await handleUpdate(id, { courses })
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading education...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
          >
            + Add Education
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
            placeholder="Institution (required)"
            value={newInstitution}
            onChange={(e) => setNewInstitution(e.target.value)}
            className="w-full bg-zinc-700 text-zinc-100 rounded px-2 py-1 outline-none border border-zinc-600 focus:border-indigo-500 text-sm"
            autoFocus
          />
          <input
            type="text"
            placeholder="Area of study"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewInstitution(''); setNewArea('') }
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
              onClick={() => { setAdding(false); setNewInstitution(''); setNewArea('') }}
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
            No education entries yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
          >
            + Add Education
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
                    value={item.institution}
                    placeholder="Institution"
                    onSave={(val) => handleUpdate(item.id, { institution: val })}
                    className="text-zinc-100 font-medium text-sm"
                  />
                  {item.area && (
                    <>
                      <span className="text-zinc-500 text-sm">—</span>
                      <InlineEdit
                        value={item.area}
                        placeholder="Area"
                        onSave={(val) => handleUpdate(item.id, { area: val })}
                        className="text-zinc-300 text-sm"
                      />
                    </>
                  )}
                  {!item.area && (
                    <InlineEdit
                      value=""
                      placeholder="+ area"
                      onSave={(val) => handleUpdate(item.id, { area: val })}
                      className="text-zinc-500 text-sm"
                    />
                  )}
                  {item.studyType && (
                    <>
                      <span className="text-zinc-500 text-sm">(</span>
                      <InlineEdit
                        value={item.studyType}
                        placeholder="Degree type"
                        onSave={(val) => handleUpdate(item.id, { studyType: val })}
                        className="text-zinc-400 text-sm"
                      />
                      <span className="text-zinc-500 text-sm">)</span>
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
                  {item.score && (
                    <>
                      <span className="text-zinc-600 text-xs">|</span>
                      <InlineEdit
                        value={item.score}
                        placeholder="Score/GPA"
                        onSave={(val) => handleUpdate(item.id, { score: val })}
                        className="text-zinc-400 text-xs"
                      />
                    </>
                  )}
                </div>
                {item.courses.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {item.courses.map((course, i) => (
                      <span
                        key={i}
                        className="bg-zinc-700 text-zinc-300 text-xs rounded px-2 py-0.5"
                      >
                        {course}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '6px' }}>
                  <InlineEdit
                    value={item.courses.join(', ')}
                    placeholder="Courses (comma-separated)"
                    onSave={(val) => handleCoursesUpdate(item.id, val)}
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

export default EducationList
