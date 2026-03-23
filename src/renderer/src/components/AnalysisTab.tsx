import { useState } from 'react'
import AnalysisList from './AnalysisList'
import NewAnalysisForm from './NewAnalysisForm'
import AnalyzingProgress from './AnalyzingProgress'
import AnalysisResults from './AnalysisResults'

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
      <AnalyzingProgress
        jobPostingId={screen.jobPostingId}
        variantId={screen.variantId}
        onComplete={(analysisId) => setScreen({ name: 'results', analysisId })}
        onError={() => setScreen({ name: 'list' })}
      />
    )
  }

  // screen.name === 'results'
  return (
    <AnalysisResults
      analysisId={screen.analysisId}
      onBack={() => setScreen({ name: 'list' })}
      onReanalyze={(jobPostingId, variantId) => setScreen({ name: 'analyzing', jobPostingId, variantId })}
    />
  )
}

export default AnalysisTab
