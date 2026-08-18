import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

export interface CoverLetterPrintPayload {
  coverLetter: string
  profile?: {
    name: string
    email: string
    phone: string
    location: string
    linkedin: string
  }
  company?: string
  role?: string
  dateString?: string
}

function CoverLetterPrintApp(): React.JSX.Element {
  const [payload, setPayload] = useState<CoverLetterPrintPayload | null>(null)

  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      if (event.data?.type === 'print-data') {
        setPayload(event.data.payload as CoverLetterPrintPayload)
      }
    }
    window.addEventListener('message', handler)

    if (typeof window.electron !== 'undefined') {
      window.electron.ipcRenderer.send('print:ready')
    }

    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    if (payload !== null && typeof window.electron !== 'undefined') {
      // Give React one frame to paint before signalling render-complete readiness.
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.electron.ipcRenderer.send('print:ready')
        }, 0)
      })
    }
  }, [payload])

  if (!payload) {
    return <div style={{ background: 'white' }} />
  }

  const contactLine = [
    payload.profile?.email,
    payload.profile?.phone,
    payload.profile?.location,
    payload.profile?.linkedin,
  ]
    .filter((v) => v && v.length > 0)
    .join(' | ')

  return (
    <div
      style={{
        width: '8.5in',
        boxSizing: 'border-box',
        padding: '0 1in',
        fontFamily: "'EB Garamond', Georgia, serif",
        fontSize: '11pt',
        lineHeight: 1.5,
        color: '#000',
        background: 'white',
      }}
    >
      {payload.profile?.name && <div>{payload.profile.name}</div>}
      {contactLine && <div>{contactLine}</div>}
      {payload.dateString && <div style={{ marginTop: '1em' }}>{payload.dateString}</div>}
      {(payload.company || payload.role) && (
        <div style={{ marginTop: '1em' }}>
          {[payload.role, payload.company].filter((v) => v && v.length > 0).join(', ')}
        </div>
      )}
      <div style={{ marginTop: '1.5em', whiteSpace: 'pre-wrap' }}>{payload.coverLetter}</div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<CoverLetterPrintApp />)

export default CoverLetterPrintApp
