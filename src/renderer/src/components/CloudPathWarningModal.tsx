import { useEffect } from 'react'

interface CloudPathWarningModalProps {
  reason: string
  onProceed: () => void
  onCancel: () => void
}

function CloudPathWarningModal({
  reason,
  onProceed,
  onCancel,
}: CloudPathWarningModalProps): React.JSX.Element {
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
        style={{ maxWidth: '440px', width: '100%', padding: '24px' }}
      >
        <h2 className="text-lg font-semibold text-zinc-100" style={{ marginBottom: '16px' }}>
          Cloud Storage Warning
        </h2>

        <div
          className="bg-amber-950/50 border-amber-800/50 text-amber-300 border rounded-md text-sm"
          style={{ padding: '10px 14px', marginBottom: '16px' }}
        >
          <p style={{ marginBottom: '6px' }}>
            <strong>SQLite WAL journaling can corrupt the database on network or cloud-sync
            drives.</strong> Sync clients may upload partial writes, creating inconsistent state.
          </p>
          <p>{reason}</p>
        </div>

        <p className="text-sm text-zinc-400" style={{ marginBottom: '20px' }}>
          You can still proceed, but storing your database on a cloud-synced folder is not
          recommended. Consider a local folder instead.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium rounded-md transition-colors"
          >
            Proceed anyway
          </button>
        </div>
      </div>
    </div>
  )
}

export default CloudPathWarningModal
