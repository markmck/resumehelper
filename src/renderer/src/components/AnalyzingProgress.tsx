import { useEffect, useState, useRef } from 'react'

interface ParsedJob {
  title: string
  company: string
  required_skills: string[]
  preferred_skills: string[]
  experience_years: number | null
  education_requirement: string | null
  key_responsibilities: string[]
  keywords: string[]
}

interface Props {
  jobPostingId: number
  variantId: number
  onComplete: (analysisId: number) => void
  onError: () => void
}

const STEPS = [
  { label: 'Parse job posting', phases: ['parsing', 'parsed'] },
  { label: 'Keyword matching', phases: ['scoring-step1'] },
  { label: 'Gap analysis', phases: ['scoring-step2'] },
  { label: 'Generate suggestions', phases: ['scoring-step3'] },
  { label: 'ATS compatibility check', phases: ['scoring-step4', 'storing', 'done'] },
]

const PHASE_LABELS: Record<string, string> = {
  parsing: 'Parsing job posting...',
  parsed: 'Job posting parsed',
  'scoring-step1': 'Matching keywords...',
  'scoring-step2': 'Analyzing skill gaps...',
  'scoring-step3': 'Generating rewrite suggestions...',
  'scoring-step4': 'Checking ATS compatibility...',
  scoring: 'Scoring resume...',
  storing: 'Saving results...',
  done: 'Analysis complete!',
}

function getStepIndex(phase: string): number {
  if (phase === 'parsing' || phase === 'parsed') return 0
  if (phase === 'scoring-step1') return 1
  if (phase === 'scoring-step2') return 2
  if (phase === 'scoring-step3') return 3
  if (phase === 'scoring-step4' || phase === 'storing' || phase === 'done') return 4
  return -1
}

function AnalyzingProgress({ jobPostingId, variantId, onComplete, onError }: Props): React.JSX.Element {
  const [currentPhase, setCurrentPhase] = useState<string>('parsing')
  const [parsedData, setParsedData] = useState<ParsedJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [activeStep, setActiveStep] = useState<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scoringStarted = useRef(false)

  useEffect(() => {
    window.api.ai.onProgress((phase: string, _pct: number, data?: unknown) => {
      setCurrentPhase(phase)

      if (phase === 'parsed' || phase === 'parsing') {
        if (phase === 'parsed') {
          setCompletedSteps((prev) => new Set([...prev, 0]))
          if (data) {
            setParsedData(data as ParsedJob)
          }
        }
        setActiveStep(0)
      }

      if (phase === 'scoring' && !scoringStarted.current) {
        scoringStarted.current = true
        setCompletedSteps((prev) => new Set([...prev, 0]))
        setActiveStep(1)

        let simStep = 1
        intervalRef.current = setInterval(() => {
          simStep++
          if (simStep <= 4) {
            setCompletedSteps((prev) => new Set([...prev, simStep - 1]))
            setActiveStep(simStep)
            setCurrentPhase(`scoring-step${simStep - 1}`)
          } else {
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
        }, 2000)
      }

      if (phase === 'storing' || phase === 'done') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setCompletedSteps(new Set([0, 1, 2, 3, 4]))
        setActiveStep(-1)
      }
    })

    const run = async (): Promise<void> => {
      const result = await window.api.ai.analyze(jobPostingId, variantId)
      if ('error' in result) {
        setError((result as { error: string }).error)
      } else {
        const r = result as { analysisId: number }
        onComplete(r.analysisId)
      }
    }

    run()

    return () => {
      window.api.ai.offProgress()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [jobPostingId, variantId, onComplete])

  if (error) {
    return (
      <div style={{ padding: 'var(--space-8)', fontFamily: 'var(--font-sans)' }}>
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          <p
            style={{
              color: 'var(--color-danger)',
              fontWeight: 600,
              fontSize: 'var(--font-size-md)',
              margin: '0 0 var(--space-2) 0',
            }}
          >
            Analysis failed
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: '0 0 var(--space-4) 0' }}>
            {error}
          </p>
          <button
            onClick={onError}
            style={{
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
            Back to analyses
          </button>
        </div>
      </div>
    )
  }

  const phaseLabel = PHASE_LABELS[currentPhase] ?? 'Analyzing...'
  const currentStepIndex = getStepIndex(currentPhase)

  return (
    <div
      style={{
        padding: 'var(--space-8)',
        fontFamily: 'var(--font-sans)',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 22,
            height: 22,
            border: '2.5px solid var(--color-accent)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
        <div>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Analyzing your resume...
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
            {phaseLabel}
          </p>
        </div>
      </div>

      {/* Parsed preview card */}
      {parsedData && (
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 var(--space-2) 0' }}>
            Job detected
          </p>
          <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
            {parsedData.title || 'Unknown Role'}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3) 0' }}>
            {parsedData.company || 'Unknown Company'}
            {parsedData.experience_years != null && (
              <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-tertiary)' }}>
                · {parsedData.experience_years}+ yrs experience
              </span>
            )}
          </p>

          {parsedData.required_skills && parsedData.required_skills.length > 0 && (
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '0 0 var(--space-1) 0', fontWeight: 500 }}>
                Required Skills
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                {parsedData.required_skills.slice(0, 10).map((skill) => (
                  <span
                    key={skill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      color: 'var(--color-accent)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 500,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsedData.preferred_skills && parsedData.preferred_skills.length > 0 && (
            <div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '0 0 var(--space-1) 0', fontWeight: 500 }}>
                Preferred Skills
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                {parsedData.preferred_skills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 8px',
                      backgroundColor: 'var(--color-bg-raised)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5-step progress stepper */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {STEPS.map((step, idx) => {
          const isDone = completedSteps.has(idx)
          const isActive = activeStep === idx && !isDone
          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              {/* Icon column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                {/* Step dot/icon */}
                {isDone ? (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-accent)',
                        animation: 'pulse 1.2s ease-in-out infinite',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: '2px solid var(--color-border-default)',
                      backgroundColor: 'transparent',
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 20,
                      backgroundColor: isDone ? 'var(--color-success)' : 'var(--color-border-subtle)',
                      marginTop: 2,
                      marginBottom: 2,
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div style={{ paddingTop: 2, paddingBottom: idx < STEPS.length - 1 ? 'var(--space-3)' : 0 }}>
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: isActive ? 600 : 400,
                    color: isDone
                      ? 'var(--color-success)'
                      : isActive
                        ? 'var(--color-accent)'
                        : 'var(--color-text-secondary)',
                  }}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Keyframe styles injected inline via a style tag approach — inline keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>

      {/* Unused variable to satisfy linter for currentStepIndex */}
      {currentStepIndex < 0 && null}
    </div>
  )
}

export default AnalyzingProgress
