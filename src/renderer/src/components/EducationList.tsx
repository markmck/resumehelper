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

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-subtle)',
  padding: 'var(--space-3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
}

const addInputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--color-bg-input)',
  color: 'var(--color-text-primary)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  outline: 'none',
  border: '1px solid var(--color-border-default)',
  fontSize: 'var(--font-size-sm)',
  fontFamily: 'var(--font-sans)',
  height: 36,
  boxSizing: 'border-box' as const,
}

function EducationList(): React.JSX.Element {
  const [items, setItems] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newInstitution, setNewInstitution] = useState('')
  const [newArea, setNewArea] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

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
      startDate: newStartDate.trim() || undefined,
      endDate: newEndDate.trim() || undefined,
    })
    setItems((prev) => [...prev, created as Education])
    setNewInstitution('')
    setNewArea('')
    setNewStartDate('')
    setNewEndDate('')
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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
    e.currentTarget.style.borderColor = 'var(--color-accent)'
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    e.currentTarget.style.borderColor = 'var(--color-border-default)'
  }

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading education...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-accent-light)',
              border: 'none',
              backgroundColor: 'transparent',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-bg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            + Add Education
          </button>
        </div>
      )}

      {adding && (
        <div style={cardStyle}>
          <input
            type="text"
            placeholder="Institution (required)"
            value={newInstitution}
            onChange={(e) => setNewInstitution(e.target.value)}
            style={addInputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            autoFocus
          />
          <input
            type="text"
            placeholder="Area of study"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            style={addInputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="text"
              placeholder="Start date (e.g. 2020-09)"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              style={{ ...addInputStyle, flex: 1 }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              type="text"
              placeholder="End date (e.g. 2024-05)"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setNewInstitution(''); setNewArea(''); setNewStartDate(''); setNewEndDate(''); setNewStartDate(''); setNewEndDate('') }
              }}
              style={{ ...addInputStyle, flex: 1 }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={handleAdd}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 500,
                cursor: 'pointer',
                height: 36,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewInstitution(''); setNewArea(''); setNewStartDate(''); setNewEndDate('') }}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-default)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 500,
                cursor: 'pointer',
                height: 36,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
            No education entries yet.
          </p>
          <button
            onClick={() => setAdding(true)}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-default)',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              height: 36,
              fontFamily: 'var(--font-sans)',
            }}
          >
            + Add Education
          </button>
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-subtle)',
              padding: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <InlineEdit
                    value={item.institution}
                    placeholder="Institution"
                    onSave={(val) => handleUpdate(item.id, { institution: val })}
                    style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}
                  />
                  {item.area && (
                    <>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>—</span>
                      <InlineEdit
                        value={item.area}
                        placeholder="Area"
                        onSave={(val) => handleUpdate(item.id, { area: val })}
                        style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}
                      />
                    </>
                  )}
                  {!item.area && (
                    <InlineEdit
                      value=""
                      placeholder="+ area"
                      onSave={(val) => handleUpdate(item.id, { area: val })}
                      style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}
                    />
                  )}
                  {item.studyType && (
                    <>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>(</span>
                      <InlineEdit
                        value={item.studyType}
                        placeholder="Degree type"
                        onSave={(val) => handleUpdate(item.id, { studyType: val })}
                        style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}
                      />
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>)</span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-1)', flexWrap: 'wrap' }}>
                  <InlineEdit
                    value={item.startDate || ''}
                    placeholder="Start date"
                    onSave={(val) => handleUpdate(item.id, { startDate: val })}
                    style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}
                  />
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>–</span>
                  <InlineEdit
                    value={item.endDate || ''}
                    placeholder="End date"
                    onSave={(val) => handleUpdate(item.id, { endDate: val || null })}
                    style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}
                  />
                  {item.score && (
                    <>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>|</span>
                      <InlineEdit
                        value={item.score}
                        placeholder="Score/GPA"
                        onSave={(val) => handleUpdate(item.id, { score: val })}
                        style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}
                      />
                    </>
                  )}
                </div>
                {item.courses.length > 0 && (
                  <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                    {item.courses.map((course, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: 'var(--color-bg-raised)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 'var(--font-size-xs)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 8px',
                        }}
                      >
                        {course}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 'var(--space-1)' }}>
                  <InlineEdit
                    value={item.courses.join(', ')}
                    placeholder="Courses (comma-separated)"
                    onSave={(val) => handleCoursesUpdate(item.id, val)}
                    style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}
                  />
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-xs)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  marginLeft: 'var(--space-2)',
                  flexShrink: 0,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
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
