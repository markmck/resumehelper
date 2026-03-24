import { useState, useRef, useCallback, useEffect } from 'react'
import SubmissionListView from './SubmissionListView'
import SubmissionLogForm from './SubmissionLogForm'

type SubmissionScreen =
  | { name: 'list' }
  | { name: 'detail'; submissionId: number }
  | { name: 'log'; linkedAnalysisId?: number }

interface Props {
  initialLogAnalysisId?: number | null
  onLogAnalysisConsumed?: () => void
}

function SubmissionsTab({ initialLogAnalysisId, onLogAnalysisConsumed }: Props): React.JSX.Element {
  const [screen, setScreen] = useState<SubmissionScreen>({ name: 'list' })
  const screenHistory = useRef<SubmissionScreen[]>([{ name: 'list' }])

  const navigateScreen = useCallback((s: SubmissionScreen) => {
    screenHistory.current.push(s)
    setScreen(s)
  }, [])

  // Handle back navigation from App
  useEffect(() => {
    const handler = (e: Event): void => {
      if (screenHistory.current.length > 1) {
        e.preventDefault()
        screenHistory.current.pop()
        const prev = screenHistory.current[screenHistory.current.length - 1]
        setScreen(prev)
      }
    }
    window.addEventListener('app:navigate-back', handler)
    return () => window.removeEventListener('app:navigate-back', handler)
  }, [])

  // Navigate to log screen if initialLogAnalysisId is provided
  useEffect(() => {
    if (initialLogAnalysisId != null && initialLogAnalysisId > 0) {
      navigateScreen({ name: 'log', linkedAnalysisId: initialLogAnalysisId })
      onLogAnalysisConsumed?.()
    }
  }, [initialLogAnalysisId, navigateScreen, onLogAnalysisConsumed])

  if (screen.name === 'list') {
    return (
      <SubmissionListView
        onViewDetail={(id) => navigateScreen({ name: 'detail', submissionId: id })}
        onLogSubmission={() => navigateScreen({ name: 'log' })}
      />
    )
  }

  if (screen.name === 'detail') {
    return (
      <div style={{ padding: 'var(--space-10)', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>
        Detail view for submission {screen.submissionId} (Plan 03)
      </div>
    )
  }

  // screen.name === 'log'
  return (
    <SubmissionLogForm
      linkedAnalysisId={screen.linkedAnalysisId}
      onSaved={() => navigateScreen({ name: 'list' })}
      onBack={() => navigateScreen({ name: 'list' })}
    />
  )
}

export default SubmissionsTab
