import { useEffect, useRef, useState } from 'react'
import { TemplateVariant } from '../../../preload/index.d'

interface SubmissionAddFormProps {
  onSaved: () => void
  onCancel: () => void
}

function SubmissionAddForm({ onSaved, onCancel }: SubmissionAddFormProps): React.JSX.Element {
  const today = new Date().toISOString().split('T')[0]
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [submittedAt, setSubmittedAt] = useState(today)
  const [variantId, setVariantId] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [variants, setVariants] = useState<TemplateVariant[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const companyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.templates.list().then(setVariants)
    companyRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const errs: string[] = []
    if (!company.trim()) errs.push('Company is required')
    if (!role.trim()) errs.push('Role is required')
    if (!submittedAt) errs.push('Date is required')
    if (errs.length > 0) {
      setErrors(errs)
      return
    }

    await window.api.submissions.create({
      company: company.trim(),
      role: role.trim(),
      submittedAt: new Date(submittedAt + 'T00:00:00'),
      variantId,
      url: url || undefined,
      notes: notes || undefined,
    })

    onSaved()
  }

  const inputClass =
    'w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-zinc-500'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
      style={{ marginBottom: '16px' }}
    >
      <h3 className="text-sm font-medium text-zinc-300" style={{ marginBottom: '12px' }}>
        Log Submission
      </h3>

      {errors.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {errors.map((err, i) => (
            <p key={i} className="text-red-400 text-xs">
              {err}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '12px' }}>
        <div>
          <label className="block text-xs text-zinc-400" style={{ marginBottom: '4px' }}>
            Company <span className="text-red-400">*</span>
          </label>
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
          <label className="block text-xs text-zinc-400" style={{ marginBottom: '4px' }}>
            Role <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Software Engineer"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '12px' }}>
        <div>
          <label className="block text-xs text-zinc-400" style={{ marginBottom: '4px' }}>
            Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400" style={{ marginBottom: '4px' }}>
            Resume Variant
          </label>
          <select
            value={variantId ?? ''}
            onChange={(e) =>
              setVariantId(e.target.value === '' ? null : Number(e.target.value))
            }
            className={inputClass}
          >
            <option value="">-- No variant --</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label className="block text-xs text-zinc-400" style={{ marginBottom: '4px' }}>
          URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/job"
          className={inputClass}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label className="block text-xs text-zinc-400" style={{ marginBottom: '4px' }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this application..."
          rows={2}
          className={inputClass}
          style={{ resize: 'vertical' }}
        />
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

export default SubmissionAddForm
