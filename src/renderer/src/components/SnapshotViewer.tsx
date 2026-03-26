import { useEffect, useRef, useState } from 'react'
import { Profile, SubmissionSnapshot } from '../../../preload/index.d'

interface SnapshotViewerProps {
  snapshot: SubmissionSnapshot
  onClose: () => void
  onReExport?: () => void
}

// V2.1 template keys that use the print.html pipeline
const V2_TEMPLATES = new Set(['classic', 'modern', 'jake', 'minimal', 'executive'])

function SnapshotViewer({ snapshot, onClose, onReExport }: SnapshotViewerProps): React.JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [profileData, setProfileData] = useState<Profile | null>(null)

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Fetch profile on mount — snapshot data does not include profile info
  useEffect(() => {
    window.api.profile.get().then(setProfileData)
  }, [])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose()
  }

  // Resolve template key — old/unknown values fall back to classic
  const resolvedTemplate = V2_TEMPLATES.has(snapshot.layoutTemplate) ? snapshot.layoutTemplate : 'classic'

  // Build print URL using __printBase (same pattern as VariantPreview)
  const base = (window as Window & { __printBase?: string }).__printBase ?? window.location.origin
  const printUrl = `${base}/print.html?variantId=0&template=${resolvedTemplate}`

  // Listen for print-ready from iframe, then send snapshot data via postMessage
  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      if (event.data?.type !== 'print-ready') return
      const iframe = iframeRef.current
      if (!iframe?.contentWindow || !profileData) return

      iframe.contentWindow.postMessage({
        type: 'print-data',
        template: resolvedTemplate,
        showSummary: true,
        payload: {
          profile: profileData,
          jobs: snapshot.jobs,
          skills: snapshot.skills,
          projects: snapshot.projects ?? [],
          education: snapshot.education ?? [],
          volunteer: snapshot.volunteer ?? [],
          awards: snapshot.awards ?? [],
          publications: snapshot.publications ?? [],
          languages: snapshot.languages ?? [],
          interests: snapshot.interests ?? [],
          references: snapshot.references ?? [],
        },
      }, '*')
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [profileData, resolvedTemplate, snapshot])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg border border-zinc-300 w-full overflow-y-auto"
        style={{ maxWidth: '56rem', maxHeight: '90vh' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between border-b border-zinc-200 px-6 py-4"
          style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10 }}
        >
          <h2 className="text-sm font-semibold text-zinc-700">Resume Snapshot</h2>
          <div className="flex items-center gap-3">
            {onReExport && (
              <button
                onClick={onReExport}
                className="text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-300 rounded px-2 py-1 transition-colors"
              >
                Re-export PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 text-lg leading-none transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal body — iframe renders resume via print.html + postMessage */}
        <div style={{ padding: '0' }}>
          <iframe
            ref={iframeRef}
            src={printUrl}
            style={{ width: '100%', height: '70vh', border: 'none', background: 'white', display: 'block' }}
            sandbox="allow-same-origin allow-scripts"
            title="Resume Snapshot"
          />
        </div>
      </div>
    </div>
  )
}

export default SnapshotViewer
