import type { SubmissionEvent } from '../../../preload/index.d'

interface Props {
  events: SubmissionEvent[]
}

function getEventDotColor(status: string): string {
  if (status === 'withdrawn' || status === 'result') return 'var(--color-danger)'
  if (status === 'screening' || status === 'interview' || status === 'offer') return 'var(--color-success)'
  if (status === 'applied') return 'var(--color-accent)'
  return 'var(--color-warning)'
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatEventDate(val: Date | string): string {
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SubmissionEventTimeline({ events }: Props): React.JSX.Element {
  if (events.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
        No activity yet.
      </p>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical connecting line — spans from first dot to last dot */}
      {events.length > 1 && (
        <div
          style={{
            position: 'absolute',
            left: 3,
            top: 6,
            bottom: 6,
            width: 2,
            backgroundColor: 'var(--color-border-subtle)',
          }}
        />
      )}

      {events.map((event, index) => {
        const dotColor = getEventDotColor(event.status)
        const isLast = index === events.length - 1

        const isCreationEvent = event.note === 'Submission created'
        const label = isCreationEvent
          ? 'Submission created'
          : `Status changed to ${capitalize(event.status)}`

        return (
          <div
            key={event.id}
            style={{
              position: 'relative',
              paddingBottom: isLast ? 0 : 'var(--space-5)',
            }}
          >
            {/* Dot — positioned over the vertical line */}
            <div
              style={{
                position: 'absolute',
                left: -20,
                top: 4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: dotColor,
                border: '2px solid var(--color-bg-surface)',
                zIndex: 1,
                marginLeft: -1,
              }}
            />

            {/* Content */}
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {label}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {formatEventDate(event.createdAt)}
            </p>
            {event.note && !isCreationEvent && (
              <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                {event.note}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SubmissionEventTimeline
