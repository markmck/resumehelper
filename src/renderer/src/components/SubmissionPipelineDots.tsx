interface Props {
  status: string
}

const STAGES = ['applied', 'screening', 'interview', 'offer', 'result']

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SubmissionPipelineDots({ status }: Props): React.JSX.Element {
  const isWithdrawn = status === 'withdrawn'

  // For 'withdrawn': show red dot at position 0, rest transparent
  // For 'result': all 5 dots green (completed)
  // For others: find current stage index
  const stageIndex = isWithdrawn ? -1 : STAGES.indexOf(status)

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {/* Dots */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        {STAGES.map((stage, i) => {
          let bgColor: string
          let borderColor: string
          let opacity = 1

          if (isWithdrawn) {
            // First dot is red, rest are fully transparent
            if (i === 0) {
              bgColor = 'var(--color-danger)'
              borderColor = 'var(--color-danger)'
            } else {
              bgColor = 'transparent'
              borderColor = 'transparent'
              opacity = 0
            }
          } else if (stageIndex === -1) {
            // Unknown status — all hollow
            bgColor = 'transparent'
            borderColor = 'var(--color-border-subtle)'
          } else if (status === 'result') {
            // All stages completed = all green
            bgColor = 'var(--color-success)'
            borderColor = 'var(--color-success)'
          } else if (i < stageIndex) {
            // Completed stage: green
            bgColor = 'var(--color-success)'
            borderColor = 'var(--color-success)'
          } else if (i === stageIndex) {
            // Current stage: blue for 'applied' (index 0), amber for others
            bgColor = stageIndex === 0 ? 'var(--color-accent)' : 'var(--color-warning)'
            borderColor = stageIndex === 0 ? 'var(--color-accent)' : 'var(--color-warning)'
          } else {
            // Future stage: solid gray
            bgColor = 'var(--color-bg-raised)'
            borderColor = 'var(--color-bg-raised)'
          }

          return (
            <div
              key={stage}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: bgColor,
                border: `1px solid ${borderColor}`,
                flexShrink: 0,
                opacity,
              }}
            />
          )
        })}
      </div>

      {/* Status label */}
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: isWithdrawn
            ? 'var(--color-danger)'
            : stageIndex === -1
              ? 'var(--color-text-muted)'
              : 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
        }}
      >
        {capitalize(status)}
      </span>
    </div>
  )
}

export default SubmissionPipelineDots
