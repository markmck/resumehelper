import { useState, useEffect, useRef, useCallback } from 'react'
import AnalysisList from './AnalysisList'
import NewAnalysisForm from './NewAnalysisForm'
import AnalyzingProgress from './AnalyzingProgress'
import AnalysisResults from './AnalysisResults'
import OptimizeVariant from './OptimizeVariant'

type AnalysisScreen =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'analyzing'; jobPostingId: number; variantId: number }
  | { name: 'results'; analysisId: number }
  | { name: 'optimize'; analysisId: number }

interface AnalysisTabProps {
  onLogSubmission?: (analysisId: number) => void
  onViewSubmission?: (submissionId: number) => void
  initialOptimizeAnalysisId?: number | null
  onOptimizeAnalysisConsumed?: () => void
}

function AnalysisTab({ onLogSubmission, onViewSubmission, initialOptimizeAnalysisId, onOptimizeAnalysisConsumed }: AnalysisTabProps): React.JSX.Element {
  const [screen, setScreen] = useState<AnalysisScreen>({ name: 'list' })
  const screenHistory = useRef<AnalysisScreen[]>([{ name: 'list' }])

  const navigateScreen = useCallback((s: AnalysisScreen) => {
    screenHistory.current.push(s)
    setScreen(s)
  }, [])

  // Navigate to optimize screen when triggered from VariantEditor
  useEffect(() => {
    if (initialOptimizeAnalysisId != null) {
      navigateScreen({ name: 'optimize', analysisId: initialOptimizeAnalysisId })
      onOptimizeAnalysisConsumed?.()
    }
  }, [initialOptimizeAnalysisId])

  // Listen for mouse back button / Alt+Left from App
  useEffect(() => {
    const handler = (e: Event): void => {
      if (screenHistory.current.length > 1) {
        e.preventDefault() // Tell App we handled it
        screenHistory.current.pop()
        const prev = screenHistory.current[screenHistory.current.length - 1]
        setScreen(prev)
      }
    }
    window.addEventListener('app:navigate-back', handler)
    return () => window.removeEventListener('app:navigate-back', handler)
  }, [])

  if (screen.name === 'list') {
    return (
      <AnalysisList
        onNewAnalysis={() => navigateScreen({ name: 'new' })}
        onViewResult={(analysisId) => navigateScreen({ name: 'results', analysisId })}
        onReanalyze={(jobPostingId, variantId) =>
          navigateScreen({ name: 'analyzing', jobPostingId, variantId })
        }
        onOptimize={(analysisId) => navigateScreen({ name: 'optimize', analysisId })}
      />
    )
  }

  if (screen.name === 'new') {
    return (
      <NewAnalysisForm
        onBack={() => navigateScreen({ name: 'list' })}
        onStartAnalysis={(jobPostingId, variantId) =>
          navigateScreen({ name: 'analyzing', jobPostingId, variantId })
        }
      />
    )
  }

  if (screen.name === 'analyzing') {
    return (
      <AnalyzingProgress
        jobPostingId={screen.jobPostingId}
        variantId={screen.variantId}
        onComplete={(analysisId) => navigateScreen({ name: 'results', analysisId })}
        onError={() => navigateScreen({ name: 'list' })}
      />
    )
  }

  if (screen.name === 'optimize') {
    return (
      <OptimizeVariant
        analysisId={screen.analysisId}
        onBack={() => navigateScreen({ name: 'results', analysisId: screen.analysisId })}
      />
    )
  }

  // screen.name === 'results'
  return (
    <AnalysisResults
      analysisId={screen.analysisId}
      onBack={() => navigateScreen({ name: 'list' })}
      onReanalyze={(jobPostingId, variantId) => navigateScreen({ name: 'analyzing', jobPostingId, variantId })}
      onOptimize={() => navigateScreen({ name: 'optimize', analysisId: screen.analysisId })}
      onLogSubmission={onLogSubmission}
      onViewSubmission={onViewSubmission}
    />
  )
}

export default AnalysisTab
