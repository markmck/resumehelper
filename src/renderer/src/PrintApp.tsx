import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { resolveTemplate } from './components/templates/resolveTemplate'
import { TEMPLATE_DEFAULTS } from './components/templates/types'

const PAGE_HEIGHT = 1056 // 11in * 96dpi

/**
 * In iframe (preview) mode: measures the rendered content, then splits it
 * into fixed-height page boxes with gaps between them — like a PDF viewer.
 * In BrowserWindow (PDF export) mode: renders flat (Chromium's printToPDF
 * handles pagination).
 */
interface PagedContentProps {
  children: React.ReactNode
  isIframe: boolean
  marginTopIn?: number   // top margin in inches (per page)
  marginBottomIn?: number // bottom margin in inches (per page)
}

function PagedContent({ children, isIframe, marginTopIn = 1.0, marginBottomIn = 1.0 }: PagedContentProps): React.JSX.Element {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)

  const topPx = Math.round(marginTopIn * 96)
  const bottomPx = Math.round(marginBottomIn * 96)
  const usableHeight = PAGE_HEIGHT - topPx - bottomPx

  useLayoutEffect(() => {
    if (!isIframe) return
    const el = measureRef.current
    if (!el) return
    const height = el.scrollHeight
    setPageCount(Math.max(1, Math.ceil(height / usableHeight)))
  })

  if (!isIframe) {
    // PDF export: render flat, Chromium's printToPDF handles per-page margins
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
      {/* Visible paged view — clips content into page-sized boxes with per-page margins */}
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
          {/* Content area clipped to usable height, offset by top margin */}
          <div
            style={{
              position: 'absolute',
              top: `${topPx}px`,
              left: 0,
              width: '816px',
              height: `${usableHeight}px`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: `-${i * usableHeight}px`,
                left: 0,
                width: '816px',
              }}
            >
              {children}
            </div>
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
  const [showSummary, setShowSummary] = useState<boolean>(true)
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined)
  const [skillsDisplay, setSkillsDisplay] = useState<'grouped' | 'inline' | undefined>(undefined)
  const [marginTop, setMarginTop] = useState<number | undefined>(undefined)
  const [marginBottom, setMarginBottom] = useState<number | undefined>(undefined)
  const [marginSides, setMarginSides] = useState<number | undefined>(undefined)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const variantId = Number(params.get('variantId'))
    const key = params.get('template') ?? 'classic'
    setTemplateKey(key)

    // variantId=0 is the sentinel for snapshot mode — data always arrives via postMessage.
    // This covers both iframe mode (SnapshotViewer) and BrowserWindow mode (snapshotPdf handler).
    const isSnapshotMode = variantId === 0

    // In a BrowserWindow (PDF export) for a real variant, window.api is available via preload.
    // In snapshot mode or an iframe (preview), receive data via postMessage instead.
    if (!isSnapshotMode && typeof window.api !== 'undefined' && window.api?.profile) {
      Promise.all([
        window.api.profile.get(),
        window.api.templates.getBuilderData(variantId),
        window.api.templates.getOptions(variantId),
      ]).then(([profileData, builderData, opts]) => {
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
        // Apply showSummary from builderData exclusion state
        setShowSummary(!(builderData.summaryExcluded ?? false))
        // Apply templateOptions from DB for PDF export path
        if (opts) {
          if (opts.accentColor !== undefined) setAccentColor(opts.accentColor)
          if (opts.skillsDisplay) setSkillsDisplay(opts.skillsDisplay)
          if (typeof opts.marginTop === 'number') setMarginTop(opts.marginTop)
          if (typeof opts.marginBottom === 'number') setMarginBottom(opts.marginBottom)
          if (typeof opts.marginSides === 'number') setMarginSides(opts.marginSides)
        }
      })
      return
    } else {
      // Snapshot mode (variantId=0) or iframe mode: listen for data via postMessage.
      const handler = (event: MessageEvent): void => {
        if (event.data?.type === 'print-data') {
          setData(event.data.payload)
          if (event.data.template) {
            setTemplateKey(event.data.template)
          }
          if (typeof event.data.showSummary === 'boolean') {
            setShowSummary(event.data.showSummary)
          }
          if (event.data.accentColor !== undefined) setAccentColor(event.data.accentColor)
          if (event.data.skillsDisplay) setSkillsDisplay(event.data.skillsDisplay)
          if (typeof event.data.marginTop === 'number') setMarginTop(event.data.marginTop)
          if (typeof event.data.marginBottom === 'number') setMarginBottom(event.data.marginBottom)
          if (typeof event.data.marginSides === 'number') setMarginSides(event.data.marginSides)
        }
      }
      window.addEventListener('message', handler)

      if (isSnapshotMode && typeof window.electron !== 'undefined') {
        // Snapshot BrowserWindow mode: signal main process that we're ready to receive data.
        // The snapshotPdf handler listens for this IPC once, then sends data via executeJavaScript postMessage.
        window.electron.ipcRenderer.send('print:ready')
      } else {
        // iframe mode (SnapshotViewer or VariantPreview): signal parent frame
        window.parent.postMessage({ type: 'print-ready' }, '*')
      }

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
      <PagedContent isIframe={isIframe} marginTopIn={marginTop ?? TEMPLATE_DEFAULTS[templateKey]?.top ?? 1.0} marginBottomIn={marginBottom ?? TEMPLATE_DEFAULTS[templateKey]?.bottom ?? 1.0}>
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
          showSummary={showSummary}
          accentColor={accentColor}
          skillsDisplay={skillsDisplay}
          marginTop={marginTop}
          marginBottom={marginBottom}
          marginSides={marginSides}
        />
      </PagedContent>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<PrintApp />)

export default PrintApp
