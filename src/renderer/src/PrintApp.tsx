import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { resolveTemplate } from './components/templates/resolveTemplate'

const PAGE_HEIGHT = 1056 // 11in * 96dpi

/**
 * In iframe (preview) mode: measures the rendered content, then splits it
 * into fixed-height page boxes with gaps between them — like a PDF viewer.
 * In BrowserWindow (PDF export) mode: renders flat (Chromium's printToPDF
 * handles pagination).
 */
function PagedContent({ children, isIframe }: { children: React.ReactNode; isIframe: boolean }): React.JSX.Element {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)

  useLayoutEffect(() => {
    if (!isIframe) return
    const el = measureRef.current
    if (!el) return
    const height = el.scrollHeight
    setPageCount(Math.max(1, Math.ceil(height / PAGE_HEIGHT)))
  })

  if (!isIframe) {
    // PDF export: render flat, Chromium handles page breaks
    return <>{children}</>
  }

  return (
    <>
      {/* Hidden measurer — renders content off-screen to get true height */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '816px',
          visibility: 'hidden',
        }}
      >
        {children}
      </div>
      {/* Visible paged view — clips content into page-sized boxes */}
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          className="print-page"
          style={{
            width: '816px',
            height: `${PAGE_HEIGHT}px`,
            background: 'white',
            margin: '0 auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            marginTop: i > 0 ? '16px' : '0',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: `-${i * PAGE_HEIGHT}px`,
              left: 0,
              width: '816px',
            }}
          >
            {children}
          </div>
        </div>
      ))}
    </>
  )
}
import {
  BuilderJob,
  BuilderProject,
  BuilderSkill,
  BuilderEducation,
  BuilderVolunteer,
  BuilderAward,
  BuilderPublication,
  BuilderLanguage,
  BuilderInterest,
  BuilderReference,
  Profile,
} from '../../preload/index.d'

interface PrintData {
  profile: Profile
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]
  education?: BuilderEducation[]
  volunteer?: BuilderVolunteer[]
  awards?: BuilderAward[]
  publications?: BuilderPublication[]
  languages?: BuilderLanguage[]
  interests?: BuilderInterest[]
  references?: BuilderReference[]
}

function PrintApp(): React.JSX.Element {
  const [data, setData] = useState<PrintData | null>(null)
  const [templateKey, setTemplateKey] = useState<string>('classic')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const variantId = Number(params.get('variantId'))
    const key = params.get('template') ?? 'classic'
    setTemplateKey(key)

    // In a BrowserWindow (PDF export), window.api is available via preload.
    // In an iframe (preview), preload doesn't inject — receive data via postMessage instead.
    if (typeof window.api !== 'undefined' && window.api?.profile) {
      Promise.all([window.api.profile.get(), window.api.templates.getBuilderData(variantId)]).then(
        ([profileData, builderData]) => {
          setData({
            profile: profileData,
            jobs: builderData.jobs,
            skills: builderData.skills,
            projects: builderData.projects,
            education: builderData.education,
            volunteer: builderData.volunteer,
            awards: builderData.awards,
            publications: builderData.publications,
            languages: builderData.languages,
            interests: builderData.interests,
            references: builderData.references,
          })
        }
      )
    } else {
      // iframe mode: listen for data from parent VariantPreview
      const handler = (event: MessageEvent): void => {
        if (event.data?.type === 'print-data') {
          setData(event.data.payload)
          if (event.data.template) {
            setTemplateKey(event.data.template)
          }
        }
      }
      window.addEventListener('message', handler)
      // Signal to parent that we're ready to receive data
      window.parent.postMessage({ type: 'print-ready' }, '*')
      return () => window.removeEventListener('message', handler)
    }
  }, [])

  const contentRef = useRef<HTMLDivElement>(null)

  // Report content height to parent iframe (for preview auto-sizing)
  useEffect(() => {
    if (data === null) return
    if (window.parent === window) return // not in iframe

    const reportHeight = (): void => {
      const el = contentRef.current
      if (!el) return
      window.parent.postMessage({ type: 'print-height', height: el.scrollHeight }, '*')
    }

    // Give React frames to paint + PagedContent to measure, then report
    requestAnimationFrame(() => {
      setTimeout(reportHeight, 100)
    })
  }, [data])

  useEffect(() => {
    if (data !== null && typeof window.electron !== 'undefined') {
      // Give React one frame to paint before signalling readiness (PDF export only)
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.electron.ipcRenderer.send('print:ready')
        }, 0)
      })
    }
  }, [data])

  if (!data) {
    return <div style={{ background: 'white' }} />
  }

  const TemplateComponent = resolveTemplate(templateKey)
  const isIframe = window.parent !== window

  return (
    <div ref={contentRef} style={{ background: isIframe ? '#1c1c1f' : 'white' }}>
      {isIframe && (
        <style>{`
          html, body { background: #1c1c1f; margin: 0; padding: 0; overflow-x: hidden; }
          .print-page {
            width: 816px;
            min-height: 1056px;
            background: white;
            margin: 0 auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            overflow: hidden;
            position: relative;
          }
          .print-page + .print-page {
            margin-top: 16px;
          }
          .print-content {
            column-count: 1;
            column-fill: auto;
            height: auto;
          }
        `}</style>
      )}
      <PagedContent isIframe={isIframe}>
        <TemplateComponent
          profile={data.profile}
          jobs={data.jobs}
          skills={data.skills}
          projects={data.projects}
          education={data.education}
          volunteer={data.volunteer}
          awards={data.awards}
          publications={data.publications}
          languages={data.languages}
          interests={data.interests}
          references={data.references}
          accentColor="#cccccc"
        />
      </PagedContent>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<PrintApp />)

export default PrintApp
