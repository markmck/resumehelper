import { useEffect } from 'react'
import { BuilderSkill, SubmissionSnapshot } from '../../../preload/index.d'
import ProfessionalLayout from './ProfessionalLayout'

interface SnapshotViewerProps {
  snapshot: SubmissionSnapshot
  onClose: () => void
}

function SnapshotViewer({ snapshot, onClose }: SnapshotViewerProps): React.JSX.Element {
  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose()
  }

  // Narrow type: SubmissionSnapshot skills are BuilderSkill[] already
  const skills = snapshot.skills as BuilderSkill[]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg border border-zinc-300 w-full overflow-y-auto"
        style={{ maxWidth: '48rem', maxHeight: '90vh' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between border-b border-zinc-200 px-6 py-4"
          style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10 }}
        >
          <h2 className="text-sm font-semibold text-zinc-700">Resume Snapshot</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal body — rendered layout */}
        <div>
          <ProfessionalLayout jobs={snapshot.jobs} skills={skills} />
        </div>
      </div>
    </div>
  )
}

export default SnapshotViewer
