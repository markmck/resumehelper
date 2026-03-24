import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  const [isOpen, setIsOpen] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [dragHovered, setDragHovered] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)
  const [editingStart, setEditingStart] = useState(false)
  const [editingEnd, setEditingEnd] = useState(false)
  const [startFocused, setStartFocused] = useState(false)
  const [endFocused, setEndFocused] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
  })

  const displayOpen = isOpen && !isDragging

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

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
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'var(--color-bg-surface)',
        border: hovered ? '1px solid var(--color-border-default)' : '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        transition: 'border-color 0.15s, opacity 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Collapsed header row — always visible */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '10px 12px',
          userSelect: 'none',
        }}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          onMouseEnter={() => setDragHovered(true)}
          onMouseLeave={() => setDragHovered(false)}
          style={{
            flexShrink: 0,
            color: dragHovered ? 'var(--color-text-tertiary)' : 'var(--color-text-muted)',
            cursor: 'grab',
            background: 'none',
            border: 'none',
            padding: 0,
            opacity: hovered ? 1 : 0,
            transition: 'color 0.15s, opacity 0.15s',
            display: 'flex',
            alignItems: 'center',
          }}
          tabIndex={-1}
          aria-label="Drag to reorder job"
        >
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="9" cy="8" r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
            <circle cx="9" cy="13" r="1.5" />
          </svg>
        </button>

        {/* Job summary — company, role, dates */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
            {job.company || 'Company'}
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>·</span>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            {job.role || 'Role'}
          </span>
        </div>

        {/* Date range */}
        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginRight: 'var(--space-2)',
        }}>
          {startDisplay} – {endDisplay}
        </span>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
            backgroundColor: deleteHovered ? 'var(--color-bg-raised)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            transition: 'color 0.15s, background-color 0.15s',
            opacity: hovered ? 1 : 0,
            padding: 0,
          }}
          aria-label="Delete job"
        >
          ×
        </button>

        {/* Chevron toggle */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            padding: 0,
            transition: 'color 0.15s',
          }}
          aria-label={isOpen ? 'Collapse job' : 'Expand job'}
        >
          <span style={{
            display: 'inline-block',
            transform: displayOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
            fontSize: '10px',
          }}>
            &#9654;
          </span>
        </button>
      </div>

      {/* Expanded body */}
      {displayOpen && (
        <div style={{ padding: '0 12px 14px 12px', borderTop: '1px solid var(--color-border-subtle)' }}>
          {/* 2-column form grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3) var(--space-4)',
            marginTop: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
          }}>
            {/* Company */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-1)',
              }}>
                Company
              </label>
              <InlineEdit
                value={job.company}
                onSave={(v) => handleFieldUpdate('company', v)}
                placeholder="Company name"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  display: 'block',
                  width: '100%',
                }}
              />
            </div>

            {/* Role/Title */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-1)',
              }}>
                Title
              </label>
              <InlineEdit
                value={job.role}
                onSave={(v) => handleFieldUpdate('role', v)}
                placeholder="Job title"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  display: 'block',
                  width: '100%',
                }}
              />
            </div>

            {/* Start Date */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-1)',
              }}>
                Start Date
              </label>
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
                  style={{
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    display: 'block',
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-raised)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
                >
                  {startDisplay}
                </span>
              )}
            </div>

            {/* End Date */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-1)',
              }}>
                End Date
              </label>
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
                  style={{
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    display: 'block',
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-raised)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}
                >
                  {endDisplay}
                </span>
              )}
            </div>
          </div>

          {/* Bullet list */}
          <BulletList jobId={job.id} initialBullets={job.bullets} />
        </div>
      )}
    </div>
  )
}

export default JobItem
