import { useEffect } from 'react'

interface DbRelocateConfirmModalProps {
  targetPath: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  activeStep?: string
}

const STEPS = [
  'Copy — copy the database file to the new location',
  'Verify — run an integrity check on the copied file',
  'Switch — write the new path to the bootstrap config',
  'Backup — rename the original file to app.db.bak for safety',
  'Restart — relaunch the app to open the new database',
]

function DbRelocateConfirmModal({
  targetPath,
  onConfirm,
  onCancel,
  loading,
  activeStep,
}: DbRelocateConfirmModalProps): React.JSX.Element {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

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
        style={{ maxWidth: '480px', width: '100%', padding: '24px' }}
      >
        <h2 className="text-lg font-semibold text-zinc-100" style={{ marginBottom: '16px' }}>
          Move Database
        </h2>

        <p className="text-sm text-zinc-400" style={{ marginBottom: '12px' }}>
          Moving to:{' '}
          <span className="text-zinc-200 font-mono text-xs" title={targetPath}>
            {targetPath}
          </span>
        </p>

        <div style={{ marginBottom: '16px' }}>
          <p className="text-sm text-zinc-400" style={{ marginBottom: '8px' }}>
            The following steps will be performed:
          </p>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5em' }}>
            {STEPS.map((step, i) => (
              <li key={i} className="text-sm text-zinc-300" style={{ marginBottom: '4px' }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div
          className="bg-amber-950/50 border-amber-800/50 text-amber-300 border rounded-md text-sm"
          style={{ padding: '10px 14px', marginBottom: '20px' }}
        >
          Your original database is preserved as <code>app.db.bak</code> until you choose to delete
          it.
        </div>

        {loading && activeStep && (
          <p className="text-sm text-zinc-400" style={{ marginBottom: '12px' }}>
            {activeStep}
          </p>
        )}

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
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? (activeStep ?? 'Moving…') : 'Move Database'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DbRelocateConfirmModal
