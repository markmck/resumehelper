import { useState, useEffect } from 'react'
import { TemplateVariant } from '../../../preload/index.d'

interface Props {
  onBack: () => void
  onStartAnalysis: (jobPostingId: number, variantId: number) => void
}

type InputTab = 'paste' | 'url'

function NewAnalysisForm({ onBack, onStartAnalysis }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<InputTab>('paste')
  const [rawText, setRawText] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [variants, setVariants] = useState<TemplateVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [buttonLabel, setButtonLabel] = useState('Run analysis')
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    window.api.templates
      .list()
      .then((data) => {
        setVariants(data)
      })
      .catch(() => setVariants([]))
      .finally(() => setVariantsLoading(false))
  }, [])

  const canRun = rawText.trim().length > 0 && selectedVariantId != null

  async function handleRunAnalysis(): Promise<void> {
    if (!canRun || submitting) return
    setSubmitting(true)
    setButtonLabel('Starting...')
    setErrorText('')
    try {
      const result = await window.api.jobPostings.create({
        company: company.trim(),
        role: role.trim(),
        rawText: rawText.trim(),
      })
      if ('error' in (result as object)) {
        throw new Error((result as { error: string }).error)
      }
      const posting = result as { id: number }
      onStartAnalysis(posting.id, selectedVariantId!)
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Failed to start analysis')
      setSubmitting(false)
      setButtonLabel('Run analysis')
    }
  }

  async function handleSaveDraft(): Promise<void> {
    if (rawText.trim().length === 0) return
    try {
      await window.api.jobPostings.create({
        company: company.trim(),
        role: role.trim(),
        rawText: rawText.trim(),
      })
      onBack()
    } catch {
      // silently ignore draft save errors
      onBack()
    }
  }

  const charCount = rawText.length

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 'var(--space-10)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Back link */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          marginBottom: 'var(--space-6)',
          fontFamily: 'var(--font-sans)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back to analyses
      </button>

      {/* Title */}
      <h1
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: '0 0 var(--space-2)',
        }}
      >
        New analysis
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
          margin: '0 0 var(--space-8)',
          maxWidth: 520,
          lineHeight: 1.6,
        }}
      >
        Paste a job posting to analyze how well your resume matches. The AI will extract requirements,
        score your keywords, identify gaps, and suggest improvements.
      </p>

      {/* Job posting section */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <label
          style={{
            display: 'block',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          Job posting
        </label>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border-subtle)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <button
            onClick={() => setActiveTab('paste')}
            style={{
              padding: '8px 16px',
              fontSize: 'var(--font-size-sm)',
              color: activeTab === 'paste' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              cursor: 'pointer',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: activeTab === 'paste'
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              marginBottom: -1,
              background: 'none',
              fontWeight: activeTab === 'paste' ? 500 : 400,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Paste text
          </button>
          <button
            disabled
            title="Coming soon"
            style={{
              padding: '8px 16px',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              cursor: 'not-allowed',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: '2px solid transparent',
              marginBottom: -1,
              background: 'none',
              opacity: 0.5,
              fontFamily: 'var(--font-sans)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            From URL
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              (Coming soon)
            </span>
          </button>
        </div>

        {/* Paste textarea */}
        {activeTab === 'paste' && (
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the full job posting text here..."
              style={{
                width: '100%',
                minHeight: 200,
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-accent-bg)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-muted)',
                textAlign: 'right',
                marginTop: 'var(--space-1)',
              }}
            >
              {charCount.toLocaleString()} characters
            </div>
          </div>
        )}
      </div>

      {/* Variant selection */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <label
          style={{
            display: 'block',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          Compare against variant
        </label>
        <span
          style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Select which resume variant to analyze
        </span>

        {variantsLoading ? (
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              padding: 'var(--space-4)',
            }}
          >
            Loading variants...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-4)',
            }}
          >
            {variants.map((variant) => {
              const isSelected = selectedVariantId === variant.id
              return (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  style={{
                    backgroundColor: isSelected ? 'var(--color-accent-bg)' : 'var(--color-bg-surface)',
                    border: isSelected
                      ? '1px solid var(--color-accent)'
                      : '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--color-border-emphasis)'
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-raised)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--color-border-default)'
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-surface)'
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--font-size-base)',
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                          marginBottom: 'var(--space-1)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {variant.name}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: isSelected ? 'var(--color-accent-light)' : 'var(--color-text-tertiary)',
                        }}
                      >
                        {variant.createdAt
                          ? `Last edited ${new Date(variant.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : 'No date'}
                      </div>
                    </div>
                    {/* Radio indicator */}
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: isSelected
                          ? '1px solid var(--color-accent)'
                          : '1px solid var(--color-border-default)',
                        backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {isSelected && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Auto-generate placeholder card */}
            <div
              style={{
                backgroundColor: 'var(--color-bg-surface)',
                border: '1px dashed var(--color-border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 72,
                opacity: 0.5,
                cursor: 'not-allowed',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-muted)',
                }}
              >
                + Auto-generate variant from posting
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Company / Role overrides */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <label
          style={{
            display: 'block',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Options
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Company name (optional)
            </div>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              style={{
                width: '100%',
                height: 36,
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0 var(--space-3)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-default)' }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Role title (optional)
            </div>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Auto-detected from posting"
              style={{
                width: '100%',
                height: 36,
                backgroundColor: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0 var(--space-3)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-default)' }}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {errorText && (
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-danger)',
            marginBottom: 'var(--space-3)',
          }}
        >
          {errorText}
        </p>
      )}

      {/* Action row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
        }}
      >
        <button
          onClick={handleRunAnalysis}
          disabled={!canRun || submitting}
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            padding: '8px 24px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 500,
            cursor: !canRun || submitting ? 'not-allowed' : 'pointer',
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontFamily: 'var(--font-sans)',
            opacity: !canRun || submitting ? 0.4 : 1,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="5.5" />
            <path d="M8 5v3.5l2.5 1.5" />
          </svg>
          {buttonLabel}
        </button>

        <button
          onClick={handleSaveDraft}
          disabled={rawText.trim().length === 0}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border-default)',
            color: 'var(--color-text-secondary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-base)',
            cursor: rawText.trim().length === 0 ? 'not-allowed' : 'pointer',
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontFamily: 'var(--font-sans)',
            opacity: rawText.trim().length === 0 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (rawText.trim().length > 0) {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-raised)'
              e.currentTarget.style.borderColor = 'var(--color-border-emphasis)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.borderColor = 'var(--color-border-default)'
          }}
        >
          Save as draft
        </button>

        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            marginLeft: 'auto',
          }}
        >
          Analysis typically takes 10-15 seconds
        </span>
      </div>
    </div>
  )
}

export default NewAnalysisForm
