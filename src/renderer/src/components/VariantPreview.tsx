import { useEffect, useRef, useState } from 'react'

interface VariantPreviewProps {
  variantId: number
  layoutTemplate?: string
  refreshKey?: number
}

function VariantPreview({ variantId, layoutTemplate, refreshKey }: VariantPreviewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number>(0)

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
          height: `${1056 * scale}px`,
          overflow: 'hidden',
        }}
      >
        <iframe
          key={`${variantId}-${layoutTemplate}-${refreshKey}`}
          src={printUrl}
          style={{
            width: '816px',
            height: '1056px',
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
