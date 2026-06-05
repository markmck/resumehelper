import { useState, useEffect } from 'react'
import CloudPathWarningModal from './CloudPathWarningModal'
import DbRelocateConfirmModal from './DbRelocateConfirmModal'
import RestartRequiredModal from './RestartRequiredModal'

type CardStatus = 'idle' | 'loading' | 'success' | 'error'

const cardStyle: React.CSSProperties = {
  padding: 'var(--space-6)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-bg-surface)',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-lg)',
  color: 'var(--color-text-primary)',
  fontWeight: 600,
  margin: 0,
  marginBottom: 'var(--space-5)',
}

/** Truncate a long path by keeping the start and end, replacing the middle with "…" */
function truncatePath(p: string, maxLen = 60): string {
  if (p.length <= maxLen) return p
  const keep = Math.floor((maxLen - 3) / 2)
  return p.slice(0, keep) + '…' + p.slice(p.length - keep)
}

export function DatabaseLocationCard(): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [status, setStatus] = useState<CardStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')

  // Write-permission error from pickFolder probe
  const [writeError, setWriteError] = useState<string>('')

  // Modal visibility state
  const [modalOpen, setModalOpen] = useState<false | 'cloud' | 'confirm' | 'restart'>(false)

  // Pending folder from pickFolder (held while awaiting cloud confirmation)
  const [pendingFolder, setPendingFolder] = useState<string>('')
  const [pendingCloudReason, setPendingCloudReason] = useState<string>('')

  // Relocate loading
  const [relocating, setRelocating] = useState<boolean>(false)
  const [activeStep, setActiveStep] = useState<string | undefined>(undefined)

  // Backup state
  const [backups, setBackups] = useState<Array<{ path: string; mtime: number }>>([])
  const [deletingBackup, setDeletingBackup] = useState<boolean>(false)

  // Restart-pending badge
  const [restartPending, setRestartPending] = useState<boolean>(false)

  const anyModalOpen = modalOpen !== false

  useEffect(() => {
    window.api.dbLocation.getCurrentPath().then((p) => {
      setCurrentPath(p)
    })
    // Load backup list on mount too (in case app was restarted after relocation)
    window.api.dbLocation.listBackups().then((list) => {
      setBackups(list)
    })
  }, [])

  async function handleReveal(): Promise<void> {
    await window.api.dbLocation.revealInExplorer()
  }

  async function handleChange(): Promise<void> {
    if (anyModalOpen) return
    setWriteError('')
    setStatusMessage('')
    setStatus('idle')

    const result = await window.api.dbLocation.pickFolder()

    if (result.canceled) return

    // WRITE-PERMISSION GATE (DB-02): block on non-writable folder
    if (!result.writable) {
      setWriteError(
        `Cannot write to that folder${result.probeError ? ': ' + result.probeError : ''}. Pick a different location.`,
      )
      return
    }

    // Cloud path warning gate
    if (result.cloudWarning.match) {
      setPendingFolder(result.folder)
      setPendingCloudReason(result.cloudWarning.reason)
      setModalOpen('cloud')
      return
    }

    // No cloud warning — go straight to confirm
    setPendingFolder(result.folder)
    setModalOpen('confirm')
  }

  function handleCloudProceed(): void {
    setModalOpen('confirm')
  }

  function handleCloudCancel(): void {
    setModalOpen(false)
    setPendingFolder('')
    setPendingCloudReason('')
  }

  async function handleConfirm(): Promise<void> {
    setRelocating(true)
    setActiveStep('Step 1 of 5: Copying database…')

    try {
      const result = await window.api.dbLocation.relocate(pendingFolder)

      if (!result.ok) {
        setRelocating(false)
        setActiveStep(undefined)
        setModalOpen(false)
        setStatus('error')
        setStatusMessage(`Relocation failed (${result.stage}): ${result.error}`)
        return
      }

      // Success — update current path and open restart modal
      setCurrentPath(result.newPath)
      setRelocating(false)
      setActiveStep(undefined)
      setModalOpen('restart')

      // Refresh backup list
      const list = await window.api.dbLocation.listBackups()
      setBackups(list)
    } catch (err) {
      setRelocating(false)
      setActiveStep(undefined)
      setModalOpen(false)
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Relocation failed')
    }
  }

  function handleConfirmCancel(): void {
    if (relocating) return
    setModalOpen(false)
    setPendingFolder('')
  }

  async function handleRestartNow(): Promise<void> {
    await window.api.dbLocation.restart()
  }

  function handleRestartLater(): void {
    setModalOpen(false)
    setRestartPending(true)
    setPendingFolder('')
    setStatus('success')
    setStatusMessage('Database moved successfully.')
  }

  async function handleDeleteBackup(): Promise<void> {
    setDeletingBackup(true)
    try {
      await window.api.dbLocation.deleteOldestBackup()
      const list = await window.api.dbLocation.listBackups()
      setBackups(list)
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Failed to delete backup')
    } finally {
      setDeletingBackup(false)
    }
  }

  return (
    <>
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Database Location</h2>

        {/* Current path display */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Current Location
          </p>
          <p
            className="font-mono"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              wordBreak: 'break-all',
            }}
            title={currentPath}
          >
            {currentPath ? truncatePath(currentPath) : 'Loading…'}
          </p>
        </div>

        {/* Write-permission error */}
        {writeError && (
          <p
            style={{
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
            }}
          >
            {writeError}
          </p>
        )}

        {/* Inline status message */}
        {status === 'error' && statusMessage && (
          <p
            style={{
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {statusMessage}
          </p>
        )}
        {status === 'success' && statusMessage && (
          <p
            style={{
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {statusMessage}
          </p>
        )}

        {/* Restart-pending badge (D-20) */}
        {restartPending && (
          <div
            className="bg-yellow-950/50 border-yellow-800/50 text-yellow-300 border rounded-md text-sm"
            style={{ padding: '10px 14px', marginBottom: 'var(--space-4)' }}
          >
            Restart required to use the new location — changes you make before restarting may not
            carry over.
          </div>
        )}

        {/* Button row */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleReveal}
            style={{
              height: '36px',
              padding: '0 var(--space-4)',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
            }}
          >
            Reveal in Explorer
          </button>
          <button
            type="button"
            onClick={handleChange}
            disabled={anyModalOpen}
            style={{
              height: '36px',
              padding: '0 var(--space-4)',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: 'var(--font-size-sm)',
              cursor: anyModalOpen ? 'not-allowed' : 'pointer',
              opacity: anyModalOpen ? 0.7 : 1,
            }}
          >
            Change location
          </button>

          {/* Delete old backup button — only when backups exist (DB-09) */}
          {backups.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteBackup}
              disabled={deletingBackup}
              style={{
                height: '36px',
                padding: '0 var(--space-4)',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
                fontSize: 'var(--font-size-sm)',
                cursor: deletingBackup ? 'not-allowed' : 'pointer',
                opacity: deletingBackup ? 0.7 : 1,
              }}
            >
              {deletingBackup ? 'Deleting…' : 'Delete old backup'}
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalOpen === 'cloud' && (
        <CloudPathWarningModal
          reason={pendingCloudReason}
          onProceed={handleCloudProceed}
          onCancel={handleCloudCancel}
        />
      )}

      {modalOpen === 'confirm' && (
        <DbRelocateConfirmModal
          targetPath={pendingFolder}
          onConfirm={handleConfirm}
          onCancel={handleConfirmCancel}
          loading={relocating}
          activeStep={activeStep}
        />
      )}

      {modalOpen === 'restart' && (
        <RestartRequiredModal
          onRestartNow={handleRestartNow}
          onLater={handleRestartLater}
        />
      )}
    </>
  )
}

export default DatabaseLocationCard
