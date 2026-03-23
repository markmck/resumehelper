import { useEffect, useState } from 'react'
import { BuilderSkill, SubmissionSnapshot } from '../../../preload/index.d'
import ProfessionalLayout from './ProfessionalLayout'

interface SnapshotViewerProps {
  snapshot: SubmissionSnapshot
  onClose: () => void
}

function isBuiltIn(layoutTemplate: string | undefined): boolean {
  return !layoutTemplate || layoutTemplate === 'professional' || layoutTemplate === 'traditional'
}

function SnapshotViewer({ snapshot, onClose }: SnapshotViewerProps): React.JSX.Element {
  const isProfessional = isBuiltIn(snapshot.layoutTemplate)
  const [themeHtml, setThemeHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isProfessional)

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Load theme HTML for non-professional snapshots
  useEffect(() => {
    if (isProfessional) return
    window.api.themes
      .renderSnapshotHtml(snapshot.layoutTemplate, snapshot)
      .then((result) => {
        if (typeof result === 'string') {
          setThemeHtml(result)
        } else {
          setThemeHtml(`<html><body style="font-family:sans-serif;padding:2rem;color:#ef4444">
            <h2>Theme render error</h2><p>${result.error}</p>
          </body></html>`)
        }
      })
      .finally(() => setLoading(false))
  }, [snapshot, isProfessional])

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

        {/* Modal body */}
        <div>
          {isProfessional ? (
            <ProfessionalLayout
              jobs={snapshot.jobs}
              skills={skills}
              projects={snapshot.projects ?? []}
              education={snapshot.education ?? []}
              volunteer={snapshot.volunteer ?? []}
              awards={snapshot.awards ?? []}
              publications={snapshot.publications ?? []}
              languages={snapshot.languages ?? []}
              interests={snapshot.interests ?? []}
              references={snapshot.references ?? []}
            />
          ) : loading ? (
            <div className="flex items-center justify-center text-zinc-500 text-sm" style={{ padding: '48px' }}>
              Loading theme...
            </div>
          ) : (
            <iframe
              srcDoc={themeHtml ?? ''}
              style={{ width: '100%', height: '70vh', border: 'none', background: 'white' }}
              sandbox="allow-same-origin allow-scripts"
              title="Resume Snapshot"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default SnapshotViewer
