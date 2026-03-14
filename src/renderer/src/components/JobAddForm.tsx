import { useEffect, useRef, useState } from 'react'

interface JobAddFormProps {
  onSave: (data: {
    company: string
    role: string
    startDate: string
    endDate?: string
  }) => void
  onCancel: () => void
}

function JobAddForm({ onSave, onCancel }: JobAddFormProps): React.JSX.Element {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentJob, setCurrentJob] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const companyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    companyRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const errs: string[] = []
    if (!company.trim()) errs.push('Company is required')
    if (!role.trim()) errs.push('Role is required')
    if (!startDate) errs.push('Start date is required')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    onSave({
      company: company.trim(),
      role: role.trim(),
      startDate,
      endDate: currentJob ? undefined : endDate || undefined,
    })
  }

  const inputClass =
    'w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-zinc-500'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4"
    >
      <h3 className="text-sm font-medium text-zinc-300 mb-3">Add Job</h3>

      {errors.length > 0 && (
        <div className="mb-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-red-400 text-xs">
              {err}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Company</label>
          <input
            ref={companyRef}
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Software Engineer"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Start Date</label>
          <input
            type="month"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">End Date</label>
          <input
            type="month"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={currentJob}
            className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="currentJob"
          checked={currentJob}
          onChange={(e) => {
            setCurrentJob(e.target.checked)
            if (e.target.checked) setEndDate('')
          }}
          className="accent-indigo-500"
        />
        <label htmlFor="currentJob" className="text-xs text-zinc-400">
          I currently work here
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-md transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default JobAddForm
