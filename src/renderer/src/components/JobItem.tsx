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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 mb-2 group/job">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Company and Role */}
          <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
            <InlineEdit
              value={job.company}
              onSave={(v) => handleFieldUpdate('company', v)}
              placeholder="Company"
              className="text-base font-semibold text-zinc-100"
            />
            <span className="text-zinc-500 text-sm">·</span>
            <InlineEdit
              value={job.role}
              onSave={(v) => handleFieldUpdate('role', v)}
              placeholder="Role"
              className="text-sm text-zinc-300"
            />
          </div>

          {/* Dates */}
          <div className="flex items-center gap-1 text-sm text-zinc-400">
            {editingStart ? (
              <input
                type="month"
                defaultValue={job.startDate ?? ''}
                autoFocus
                onBlur={(e) => {
                  setEditingStart(false)
                  if (e.target.value) handleFieldUpdate('startDate', e.target.value)
                }}
                className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-0.5 text-xs outline-none focus:border-indigo-500"
              />
            ) : (
              <span
                onClick={() => setEditingStart(true)}
                className="cursor-pointer hover:text-zinc-200 hover:bg-zinc-800 px-1 rounded transition-colors"
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
                className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-0.5 text-xs outline-none focus:border-indigo-500"
              />
            ) : (
              <span
                onClick={() => setEditingEnd(true)}
                className="cursor-pointer hover:text-zinc-200 hover:bg-zinc-800 px-1 rounded transition-colors"
              >
                {endDisplay}
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover/job:opacity-100 text-lg leading-none"
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
