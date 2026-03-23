import { useState } from 'react'
import BulletList from './BulletList'
import InlineEdit from './InlineEdit'

interface Bullet {
  id: number
  jobId: number
  text: string
  sortOrder: number
}

interface Job {
  id: number
  company: string
  role: string
  startDate: string
  endDate: string | null
  createdAt: Date
  bullets: Bullet[]
}

interface JobItemProps {
  job: Job
  onUpdate: (updatedJob: Job) => void
  onDelete: (id: number) => void
}

function formatMonthDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month] = dateStr.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function JobItem({ job, onUpdate, onDelete }: JobItemProps): React.JSX.Element {
  const [editingStart, setEditingStart] = useState(false)
  const [editingEnd, setEditingEnd] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [startFocused, setStartFocused] = useState(false)
  const [endFocused, setEndFocused] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)
  const [startHovered, setStartHovered] = useState(false)
  const [endHovered, setEndHovered] = useState(false)

  const handleFieldUpdate = async (
    field: 'company' | 'role' | 'startDate' | 'endDate',
    value: string,
  ): Promise<void> => {
    const updated = await window.api.jobs.update(job.id, {
      [field]: value === '' ? null : value,
    })
    onUpdate({ ...job, ...updated })
  }

  const handleDelete = async (): Promise<void> => {
    await window.api.jobs.delete(job.id)
    onDelete(job.id)
  }

  const startDisplay = job.startDate ? formatMonthDate(job.startDate) : 'Start date'
  const endDisplay = job.endDate ? formatMonthDate(job.endDate) : 'Present'

  const dateInputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-default)',
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 8px',
    fontSize: 'var(--font-size-xs)',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Company and Role */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 8px', marginBottom: '4px' }}>
            <InlineEdit
              value={job.company}
              onSave={(v) => handleFieldUpdate('company', v)}
              placeholder="Company"
              style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}
            />
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>·</span>
            <InlineEdit
              value={job.role}
              onSave={(v) => handleFieldUpdate('role', v)}
              placeholder="Role"
              style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}
            />
          </div>

          {/* Dates */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
            {editingStart ? (
              <input
                type="month"
                defaultValue={job.startDate ?? ''}
                autoFocus
                onBlur={(e) => {
                  setEditingStart(false)
                  if (e.target.value) handleFieldUpdate('startDate', e.target.value)
                }}
                onFocus={() => setStartFocused(true)}
                style={{
                  ...dateInputStyle,
                  borderColor: startFocused ? 'var(--color-accent)' : 'var(--color-border-default)',
                }}
              />
            ) : (
              <span
                onClick={() => setEditingStart(true)}
                onMouseEnter={() => setStartHovered(true)}
                onMouseLeave={() => setStartHovered(false)}
                style={{
                  cursor: 'pointer',
                  padding: '0 4px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'color 0.15s, background-color 0.15s',
                  color: startHovered ? 'var(--color-text-primary)' : undefined,
                  backgroundColor: startHovered ? 'var(--color-bg-raised)' : undefined,
                }}
              >
                {startDisplay}
              </span>
            )}
            <span>–</span>
            {editingEnd ? (
              <input
                type="month"
                defaultValue={job.endDate ?? ''}
                autoFocus
                onBlur={(e) => {
                  setEditingEnd(false)
                  handleFieldUpdate('endDate', e.target.value)
                }}
                onFocus={() => setEndFocused(true)}
                style={{
                  ...dateInputStyle,
                  borderColor: endFocused ? 'var(--color-accent)' : 'var(--color-border-default)',
                }}
              />
            ) : (
              <span
                onClick={() => setEditingEnd(true)}
                onMouseEnter={() => setEndHovered(true)}
                onMouseLeave={() => setEndHovered(false)}
                style={{
                  cursor: 'pointer',
                  padding: '0 4px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'color 0.15s, background-color 0.15s',
                  color: endHovered ? 'var(--color-text-primary)' : undefined,
                  backgroundColor: endHovered ? 'var(--color-bg-raised)' : undefined,
                }}
              >
                {endDisplay}
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
            backgroundColor: deleteHovered ? 'var(--color-bg-raised)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            transition: 'color 0.15s, background-color 0.15s',
            opacity: hovered ? 1 : 0,
            padding: 0,
          }}
          aria-label="Delete job"
        >
          ×
        </button>
      </div>

      {/* Bullets */}
      <BulletList jobId={job.id} initialBullets={job.bullets} />
    </div>
  )
}

export default JobItem
