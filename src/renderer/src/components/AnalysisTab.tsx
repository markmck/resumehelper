import { useState } from 'react'
import AnalysisList from './AnalysisList'
import NewAnalysisForm from './NewAnalysisForm'

type AnalysisScreen =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'analyzing'; jobPostingId: number; variantId: number }
  | { name: 'results'; analysisId: number }

function AnalysisTab(): React.JSX.Element {
  const [screen, setScreen] = useState<AnalysisScreen>({ name: 'list' })

  if (screen.name === 'list') {
    return (
      <AnalysisList
        onNewAnalysis={() => setScreen({ name: 'new' })}
        onViewResult={(analysisId) => setScreen({ name: 'results', analysisId })}
        onReanalyze={(jobPostingId, variantId) =>
          setScreen({ name: 'analyzing', jobPostingId, variantId })
        }
      />
    )
  }

  if (screen.name === 'new') {
    return (
      <NewAnalysisForm
        onBack={() => setScreen({ name: 'list' })}
        onStartAnalysis={(jobPostingId, variantId) =>
          setScreen({ name: 'analyzing', jobPostingId, variantId })
        }
      />
    )
  }

  if (screen.name === 'analyzing') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '60vh',
          gap: 'var(--space-4)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <p style={{ fontSize: 'var(--font-size-md)', margin: 0 }}>Analyzing...</p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', margin: 0 }}>
          Job posting {screen.jobPostingId} · Variant {screen.variantId}
        </p>
        <button
          onClick={() => setScreen({ name: 'list' })}
          style={{
            marginTop: 'var(--space-2)',
            padding: '6px 14px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Back to list
        </button>
      </div>
    )
  }

  // screen.name === 'results'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '60vh',
        gap: 'var(--space-4)',
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <p style={{ fontSize: 'var(--font-size-md)', margin: 0 }}>
        Analysis Results — ID {screen.analysisId}
      </p>
      <button
        onClick={() => setScreen({ name: 'list' })}
        style={{
          marginTop: 'var(--space-2)',
          padding: '6px 14px',
          backgroundColor: 'transparent',
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Back to list
      </button>
    </div>
  )
}

export default AnalysisTab
