import { useEffect } from 'react'

interface ImportConfirmModalProps {
  counts: Record<string, number>
  hasProfile: boolean
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  mode?: 'replace' | 'append'
}

const sectionLabels: Record<string, string> = {
  jobs: 'jobs',
  skills: 'skills',
  projects: 'projects',
  education: 'education entries',
  volunteer: 'volunteer entries',
  awards: 'awards',
  publications: 'publications',
  languages: 'languages',
  interests: 'interests',
  references: 'references',
}

function ImportConfirmModal({
  counts,
  hasProfile,
  onConfirm,
  onCancel,
  loading,
  mode = 'replace',
}: ImportConfirmModalProps): React.JSX.Element {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const nonZeroEntries = Object.entries(counts)
    .filter(([key, val]) => val > 0 && key !== 'hasProfile')
    .map(([key, val]) => `${val} ${sectionLabels[key] ?? key}`)

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl"
        style={{ maxWidth: '420px', width: '100%', padding: '24px' }}
      >
        <h2 className="text-lg font-semibold text-zinc-100" style={{ marginBottom: '16px' }}>
          {mode === 'append' ? 'Import from PDF' : 'Import resume.json'}
        </h2>

        <div
          className={`${mode === 'append' ? 'bg-blue-950/50 border-blue-800/50 text-blue-300' : 'bg-amber-950/50 border-amber-800/50 text-amber-300'} border rounded-md text-sm`}
          style={{ padding: '10px 14px', marginBottom: '16px' }}
        >
          {mode === 'append'
            ? 'New entries will be added alongside your existing data'
            : 'This will replace all existing data'}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p className="text-sm text-zinc-400" style={{ marginBottom: '8px' }}>
            The following will be imported:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.5em' }}>
            {hasProfile && (
              <li className="text-sm text-zinc-300" style={{ marginBottom: '4px' }}>
                Profile information
              </li>
            )}
            {nonZeroEntries.map((entry) => (
              <li key={entry} className="text-sm text-zinc-300" style={{ marginBottom: '4px' }}>
                {entry}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-1.5 ${mode === 'append' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'} text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50`}
          >
            {loading ? 'Importing...' : mode === 'append' ? 'Import Data' : 'Replace All Data'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportConfirmModal
