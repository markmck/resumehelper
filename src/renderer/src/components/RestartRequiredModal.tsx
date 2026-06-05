import { useEffect } from 'react'

interface RestartRequiredModalProps {
  onRestartNow: () => void
  onLater: () => void
}

function RestartRequiredModal({
  onRestartNow,
  onLater,
}: RestartRequiredModalProps): React.JSX.Element {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onLater()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onLater])

  return (
    <div
      onClick={onLater}
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
          Restart Required
        </h2>

        <p className="text-sm text-zinc-300" style={{ marginBottom: '8px' }}>
          The database has been moved successfully. ResumeHelper needs to restart to use the new
          location.
        </p>

        <p className="text-sm text-zinc-400" style={{ marginBottom: '20px' }}>
          You can restart now or continue working and restart later. Until you restart, the app
          continues using the old database location.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onLater}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-md transition-colors"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onRestartNow}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            Restart now
          </button>
        </div>
      </div>
    </div>
  )
}

export default RestartRequiredModal
