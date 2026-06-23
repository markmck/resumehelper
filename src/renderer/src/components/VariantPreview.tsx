import { useEffect, useRef, useState, useCallback } from 'react'
import { BuilderData, Profile } from '../../../preload/index.d'

interface VariantPreviewProps {
  variantId: number
  analysisId?: number     // when provided, getBuilderData returns merged override data
  layoutTemplate?: string
  refreshKey?: number
  showSummary?: boolean
  accentColor?: string
  skillsDisplay?: 'grouped' | 'inline'
  marginTop?: number
  marginBottom?: number
  marginSides?: number
  onContentHeight?: (iframeH: number, pageCount?: number) => void
}

function VariantPreview({
  variantId,
  analysisId,
  layoutTemplate,
  refreshKey,
  showSummary = true,
  accentColor,
  skillsDisplay,
  marginTop,
  marginBottom,
  marginSides,
  onContentHeight,
}: VariantPreviewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState<number>(0)
  const [iframeHeight, setIframeHeight] = useState<number>(1056) // default one page
  const [builderData, setBuilderData] = useState<BuilderData | null>(null)
  const [profileData, setProfileData] = useState<Profile | null>(null)

  // Measure container to compute scale
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 32 // subtract padding (16px each side)
        setScale(width / 816)
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Fetch data when variantId, analysisId, or refreshKey changes
  useEffect(() => {
    Promise.all([
      window.api.templates.getBuilderData(variantId, analysisId),
      window.api.profile.get(),
    ]).then(([builder, profile]) => {
      setBuilderData(builder)
      setProfileData(profile)
    })
  }, [variantId, refreshKey, analysisId])

  // Send data to iframe via postMessage when data or iframe changes
  const sendDataToIframe = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow || !builderData || !profileData) return

    // Apply the variant's per-variant summary override onto the base profile so the
    // template renders the variant summary, not the base profile.summary. Mirrors
    // VariantBuilder's effectiveSummary (`summaryOverride ?? profile.summary`).
    const effectiveProfile = {
      ...profileData,
      summary: builderData.summaryOverride ?? profileData.summary,
    }

    iframe.contentWindow.postMessage({
      type: 'print-data',
      template: layoutTemplate ?? 'classic',
      showSummary,
      accentColor,
      skillsDisplay,
      marginTop,
      marginBottom,
      marginSides,
      payload: {
        profile: effectiveProfile,
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
      },
    }, '*')
  }, [builderData, profileData, layoutTemplate, showSummary, accentColor, skillsDisplay, marginTop, marginBottom, marginSides])

  // Listen for iframe messages (ready signal + content height)
  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      if (event.data?.type === 'print-ready') {
        sendDataToIframe()
      } else if (event.data?.type === 'print-height' && typeof event.data.height === 'number') {
        setIframeHeight(event.data.height)
        onContentHeight?.(event.data.height, event.data.pageCount as number | undefined)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [sendDataToIframe, onContentHeight])

  // Also send data when builderData/profileData update (iframe may already be ready)
  useEffect(() => {
    sendDataToIframe()
  }, [sendDataToIframe])

  const base = (window as Window & { __printBase?: string }).__printBase ?? window.location.origin
  const printUrl = `${base}/print.html?variantId=${variantId}&template=${layoutTemplate ?? 'classic'}`

  if (scale === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          background: 'var(--color-bg-raised)',
          overflowY: 'auto',
          height: '100%',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: 'var(--color-bg-raised)',
        overflowY: 'auto',
        height: '100%',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          height: `${iframeHeight * scale}px`,
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          key={`${variantId}-${layoutTemplate}-${refreshKey}`}
          src={printUrl}
          style={{
            width: '816px',
            height: `${iframeHeight}px`,
            border: 'none',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            display: 'block',
          }}
        />
      </div>
    </div>
  )
}

export default VariantPreview
