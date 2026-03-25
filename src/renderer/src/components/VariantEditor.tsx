import { useState, useEffect } from 'react'
import { TemplateVariant } from '../../../preload/index.d'
import InlineEdit from './InlineEdit'
import VariantBuilder from './VariantBuilder'
import VariantPreview from './VariantPreview'
import { useToast } from './Toast'

interface VariantEditorProps {
  variant: TemplateVariant
  onRename: (id: number, name: string) => void
  onDelete: (id: number) => void
  onOptimizeVariant?: (analysisId: number) => void
}

interface JobPostingRow {
  variantId: number | null
  matchScore: number | null
  analysisId: number | null
  analysisCreatedAt: string | null
}

function scoreBadgeColor(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: 'var(--color-success-bg, rgba(34,197,94,0.15))', text: 'var(--color-success)' }
  if (score >= 50) return { bg: 'var(--color-warning-bg, rgba(251,191,36,0.15))', text: 'var(--color-warning)' }
  return { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)' }
}

const paneLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

function VariantEditor({ variant, onRename, onDelete, onOptimizeVariant }: VariantEditorProps): React.JSX.Element {
  const [previewVersion, setPreviewVersion] = useState(0)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [themes, setThemes] = useState<Array<{ key: string; displayName: string }>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [layoutTemplate, setLayoutTemplate] = useState(
    variant.layoutTemplate && variant.layoutTemplate !== 'traditional' && variant.layoutTemplate !== 'professional'
      ? variant.layoutTemplate
      : 'classic'
  )
  const [showSummary, setShowSummary] = useState(true)
  const [analysisScore, setAnalysisScore] = useState<number | null>(null)
  const [analysisId, setAnalysisId] = useState<number | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    window.api.themes.list().then(setThemes)
  }, [])

  useEffect(() => {
    const tpl = variant.layoutTemplate
    setLayoutTemplate(tpl && tpl !== 'traditional' && tpl !== 'professional' ? tpl : 'classic')
  }, [variant.id])

  // Look up analysis score for this variant
  useEffect(() => {
    setAnalysisScore(null)
    setAnalysisId(null)
    window.api.jobPostings.list().then((rows) => {
      const typed = rows as JobPostingRow[]
      // Filter rows that match this variant and have a score
      const matches = typed.filter(
        (r) => r.variantId === variant.id && r.matchScore != null && r.analysisId != null
      )
      if (matches.length === 0) return
      // Pick the most recent by analysisCreatedAt
      const latest = matches.reduce((best, cur) => {
        if (!best.analysisCreatedAt) return cur
        if (!cur.analysisCreatedAt) return best
        return cur.analysisCreatedAt > best.analysisCreatedAt ? cur : best
      })
      if (latest.matchScore != null) setAnalysisScore(latest.matchScore)
      if (latest.analysisId != null) setAnalysisId(latest.analysisId)
    })
  }, [variant.id])

  const sanitize = (s: string): string =>
    s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')

  const handleThemeChange = async (newTheme: string): Promise<void> => {
    setLayoutTemplate(newTheme)
    await window.api.templates.setLayoutTemplate(variant.id, newTheme)
  }

  const handleExportPdf = async (): Promise<void> => {
    if (exporting) return
    setExporting('pdf')
    try {
      const profile = await window.api.profile.get()
      const filename = `${sanitize(profile.name || 'Resume')}_Resume_${sanitize(variant.name)}.pdf`
      const result = await window.api.exportFile.pdf(variant.id, filename)
      if (!result.canceled) {
        showToast('Resume exported as PDF')
      }
    } finally {
      setExporting(null)
    }
  }

  const handleExportDocx = async (): Promise<void> => {
    if (exporting) return
    setExporting('docx')
    try {
      const profile = await window.api.profile.get()
      const filename = `${sanitize(profile.name || 'Resume')}_Resume_${sanitize(variant.name)}.docx`
      const result = await window.api.exportFile.docx(variant.id, filename)
      if (!result.canceled) {
        showToast('Resume exported as DOCX')
      }
    } finally {
      setExporting(null)
    }
  }

  const badgeColors = analysisScore != null ? scoreBadgeColor(analysisScore) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor header — variant name + delete */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '12px 20px',
          backgroundColor: 'var(--color-bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <InlineEdit
          value={variant.name}
          onSave={(name) => onRename(variant.id, name)}
          placeholder="Untitled Variant"
          className="text-lg font-semibold"
        />
        <button
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete variant"
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-danger)',
            fontSize: 'var(--font-size-xs)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-sans)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          Delete
        </button>
      </div>

      {/* Split-pane content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Builder pane */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--color-border-subtle)',
            minWidth: 0,
          }}
        >
          {/* Builder pane header */}
          <div
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--color-border-subtle)',
              padding: '8px 16px',
              backgroundColor: 'var(--color-bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <span style={paneLabelStyle}>Builder</span>

            {/* Analysis score badge */}
            {analysisScore != null && badgeColors && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  backgroundColor: badgeColors.bg,
                  color: badgeColors.text,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {analysisScore}% match
              </span>
            )}

            {/* AI suggest button */}
            {analysisId != null && onOptimizeVariant && (
              <button
                onClick={() => onOptimizeVariant(analysisId)}
                style={{
                  padding: '3px 10px',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-accent)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-bg, rgba(99,102,241,0.1))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                AI suggest
              </button>
            )}
          </div>

          {/* Builder pane body */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <VariantBuilder
              variantId={variant.id}
              onToggle={() => setPreviewVersion((v) => v + 1)}
            />
          </div>
        </div>

        {/* Preview pane */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          {/* Preview pane header */}
          <div
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--color-border-subtle)',
              padding: '8px 16px',
              backgroundColor: 'var(--color-bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <span style={paneLabelStyle}>Preview</span>

            <div style={{ flex: 1 }} />

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={showSummary}
                onChange={(e) => {
                  setShowSummary(e.target.checked)
                  setPreviewVersion((v) => v + 1)
                }}
                style={{ margin: 0 }}
              />
              Summary
            </label>

            {themes.length > 0 && (
              <select
                value={layoutTemplate}
                onChange={(e) => handleThemeChange(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 8px',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  height: 26,
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {themes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.displayName}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleExportPdf}
              disabled={exporting !== null}
              style={{
                padding: '3px 10px',
                fontSize: 'var(--font-size-xs)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: exporting ? 'not-allowed' : 'pointer',
                opacity: exporting ? 0.5 : 1,
                height: 26,
                fontFamily: 'var(--font-sans)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
            </button>

            <button
              onClick={handleExportDocx}
              disabled={exporting !== null}
              style={{
                padding: '3px 10px',
                fontSize: 'var(--font-size-xs)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'var(--color-success)',
                color: 'var(--color-text-on-accent, #fff)',
                cursor: exporting ? 'not-allowed' : 'pointer',
                opacity: exporting ? 0.5 : 1,
                height: 26,
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {exporting === 'docx' ? 'Exporting...' : 'DOCX'}
            </button>
          </div>

          {/* Preview pane body */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: 'var(--color-bg-elevated)',
            }}
          >
            <VariantPreview
              variantId={variant.id}
              layoutTemplate={layoutTemplate}
              refreshKey={previewVersion}
              showSummary={showSummary}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-overlay)',
              border: '1px solid var(--color-border-emphasis)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              maxWidth: 420,
              width: '90%',
              fontFamily: 'var(--font-sans)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-3) 0',
              }}
            >
              Delete variant
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 var(--space-5) 0',
              }}
            >
              Delete <strong style={{ color: 'var(--color-text-primary)' }}>{variant.name}</strong>? This will remove the variant and all its item selections. Your experience data (jobs, skills, projects) will not be affected. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '7px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  onDelete(variant.id)
                }}
                style={{
                  padding: '7px 16px',
                  backgroundColor: 'var(--color-danger)',
                  color: 'var(--color-text-on-accent, white)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VariantEditor
