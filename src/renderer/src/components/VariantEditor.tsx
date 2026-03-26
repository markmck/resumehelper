import { useState, useEffect, useRef, useCallback } from 'react'
import { TemplateVariant } from '../../../preload/index.d'
import InlineEdit from './InlineEdit'
import VariantBuilder from './VariantBuilder'
import VariantPreview from './VariantPreview'
import { useToast } from './Toast'
import { TEMPLATE_DEFAULTS } from './templates/types'

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

const PRESET_SWATCHES = [
  '#000000',
  '#1e3a5f',
  '#2563EB',
  '#0d9488',
  '#166534',
  '#7f1d1d',
]

function isValidHex(value: string): boolean {
  const cleaned = value.startsWith('#') ? value.slice(1) : value
  return /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned)
}

function normalizeHex(value: string): string {
  const cleaned = value.startsWith('#') ? value : `#${value}`
  return cleaned.toLowerCase()
}

function VariantEditor({ variant, onRename, onDelete, onOptimizeVariant }: VariantEditorProps): React.JSX.Element {
  const [previewVersion, setPreviewVersion] = useState(0)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [layoutTemplate, setLayoutTemplate] = useState(
    variant.layoutTemplate && variant.layoutTemplate !== 'traditional' && variant.layoutTemplate !== 'professional'
      ? variant.layoutTemplate
      : 'classic'
  )
  const [showSummary, setShowSummary] = useState(true)
  const [marginsDirty, setMarginsDirty] = useState(false)
  const [analysisScore, setAnalysisScore] = useState<number | null>(null)
  const [analysisId, setAnalysisId] = useState<number | null>(null)

  // New template option states
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined)
  const [skillsDisplay, setSkillsDisplay] = useState<'grouped' | 'inline' | undefined>(undefined)
  const [marginTop, setMarginTop] = useState<number | undefined>(undefined)
  const [marginBottom, setMarginBottom] = useState<number | undefined>(undefined)
  const [marginSides, setMarginSides] = useState<number | undefined>(undefined)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [hexInput, setHexInput] = useState('')

  const colorPickerRef = useRef<HTMLDivElement>(null)
  const colorDotRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const tpl = variant.layoutTemplate
    const resolvedTpl = tpl && tpl !== 'traditional' && tpl !== 'professional' ? tpl : 'classic'
    setLayoutTemplate(resolvedTpl)

    // Load templateOptions from variant
    const opts = variant.templateOptions
    if (opts) {
      setAccentColor(opts.accentColor ?? undefined)
      setSkillsDisplay(opts.skillsDisplay ?? undefined)
      setMarginTop(opts.marginTop ?? undefined)
      setMarginBottom(opts.marginBottom ?? undefined)
      setMarginSides(opts.marginSides ?? undefined)
      // Dirty if any margin is explicitly set
      setMarginsDirty(
        opts.marginTop != null || opts.marginBottom != null || opts.marginSides != null
      )
    } else {
      setAccentColor(undefined)
      setSkillsDisplay(undefined)
      setMarginTop(undefined)
      setMarginBottom(undefined)
      setMarginSides(undefined)
      setMarginsDirty(false)
    }

    // Initialize showSummary from builderData.summaryExcluded
    window.api.templates.getBuilderData(variant.id).then((bd) => {
      setShowSummary(!(bd.summaryExcluded ?? false))
    })
  }, [variant.id])

  // Sync hex input when accentColor changes
  useEffect(() => {
    setHexInput(accentColor ?? '')
  }, [accentColor])

  // On template switch: snap non-dirty margins to new template defaults
  const prevLayoutTemplateRef = useRef<string>(layoutTemplate)
  useEffect(() => {
    if (prevLayoutTemplateRef.current === layoutTemplate) {
      prevLayoutTemplateRef.current = layoutTemplate
      return
    }
    prevLayoutTemplateRef.current = layoutTemplate
    if (!marginsDirty) {
      // Snap to new template defaults (undefined = use default)
      setMarginTop(undefined)
      setMarginBottom(undefined)
      setMarginSides(undefined)
    }
    // If marginsDirty, keep custom values — reset link will be visible
  }, [layoutTemplate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist template options on change (debounced 300ms)
  const saveOptionsRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveOptions = useCallback(() => {
    if (saveOptionsRef.current) clearTimeout(saveOptionsRef.current)
    saveOptionsRef.current = setTimeout(() => {
      window.api.templates.setOptions(variant.id, {
        accentColor,
        skillsDisplay,
        marginTop,
        marginBottom,
        marginSides,
      })
    }, 300)
  }, [variant.id, accentColor, skillsDisplay, marginTop, marginBottom, marginSides])

  useEffect(() => {
    saveOptions()
    return () => {
      if (saveOptionsRef.current) clearTimeout(saveOptionsRef.current)
    }
  }, [saveOptions])

  // Close color picker on click outside
  useEffect(() => {
    if (!colorPickerOpen) return
    const handler = (e: MouseEvent): void => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node) &&
        colorDotRef.current &&
        !colorDotRef.current.contains(e.target as Node)
      ) {
        setColorPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorPickerOpen])

  // Look up analysis score for this variant
  useEffect(() => {
    setAnalysisScore(null)
    setAnalysisId(null)
    window.api.jobPostings.list().then((rows) => {
      const typed = rows as JobPostingRow[]
      const matches = typed.filter(
        (r) => r.variantId === variant.id && r.matchScore != null && r.analysisId != null
      )
      if (matches.length === 0) return
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

  const handleShowSummaryChange = (shown: boolean): void => {
    setShowSummary(shown)
    // Persist via sentinel exclusion pattern: excluded = !shown
    window.api.templates.setItemExcluded(variant.id, 'summary', 0, !shown)
    setPreviewVersion((v) => v + 1)
  }

  const handleMarginChange = (field: 'top' | 'bottom' | 'sides', value: number): void => {
    if (field === 'top') setMarginTop(value)
    else if (field === 'bottom') setMarginBottom(value)
    else setMarginSides(value)
    setMarginsDirty(true)
    // saveOptions is triggered by the dependency change via useEffect
  }

  const handleMarginsReset = (): void => {
    setMarginTop(undefined)
    setMarginBottom(undefined)
    setMarginSides(undefined)
    setMarginsDirty(false)
    // saveOptions triggered by state change
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

  const effectiveAccentColor = accentColor ?? TEMPLATE_DEFAULTS[layoutTemplate]?.accent ?? '#000000'
  const effectiveSkillsDisplay = skillsDisplay ?? TEMPLATE_DEFAULTS[layoutTemplate]?.skillsDisplay ?? 'grouped'
  const effectiveMarginTop = marginTop ?? TEMPLATE_DEFAULTS[layoutTemplate]?.top ?? 1.0
  const effectiveMarginBottom = marginBottom ?? TEMPLATE_DEFAULTS[layoutTemplate]?.bottom ?? 1.0
  const effectiveMarginSides = marginSides ?? TEMPLATE_DEFAULTS[layoutTemplate]?.sides ?? 1.0

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
              showSummary={showSummary}
              onShowSummaryChange={handleShowSummaryChange}
              marginTop={effectiveMarginTop}
              marginBottom={effectiveMarginBottom}
              marginSides={effectiveMarginSides}
              onMarginChange={handleMarginChange}
              layoutTemplate={layoutTemplate}
              onMarginsReset={handleMarginsReset}
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
          {/* Preview pane header — single row */}
          <div
            style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--color-border-subtle)',
              padding: '8px 16px',
              backgroundColor: 'var(--color-bg-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              position: 'relative',
            }}
          >
            <span style={paneLabelStyle}>Preview</span>

            {/* Template selection dropdown */}
            <select
              value={layoutTemplate}
              onChange={(e) => {
                setLayoutTemplate(e.target.value)
                window.api.templates.setLayoutTemplate(variant.id, e.target.value)
              }}
              style={{
                fontSize: 13,
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              {Object.keys(TEMPLATE_DEFAULTS).map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl.charAt(0).toUpperCase() + tpl.slice(1)}
                </option>
              ))}
            </select>

            {/* Color dot trigger — white ring for visibility on dark colors */}
            <div
              ref={colorDotRef}
              onClick={() => setColorPickerOpen(!colorPickerOpen)}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: effectiveAccentColor,
                border: '2px solid rgba(255,255,255,0.9)',
                boxShadow: '0 0 0 1px var(--color-border-default)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Accent color"
            />

            {/* Color picker popover */}
            {colorPickerOpen && (
              <div
                ref={colorPickerRef}
                style={{
                  position: 'absolute',
                  top: 40,
                  left: 60,
                  zIndex: 50,
                  background: 'var(--color-bg-raised)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: 12,
                  minWidth: 160,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}
              >
                {/* Swatch grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 28px)', gap: 6, marginBottom: 10 }}>
                  {PRESET_SWATCHES.map((swatch) => (
                    <div
                      key={swatch}
                      onClick={() => setAccentColor(swatch)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: swatch,
                        cursor: 'pointer',
                        border: effectiveAccentColor.toLowerCase() === swatch.toLowerCase()
                          ? '3px solid var(--color-accent)'
                          : '2px solid transparent',
                        boxSizing: 'border-box',
                      }}
                      title={swatch}
                    />
                  ))}
                </div>

                {/* Hex input */}
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  onBlur={(e) => {
                    const val = e.target.value.trim()
                    if (isValidHex(val)) {
                      setAccentColor(normalizeHex(val))
                    } else {
                      setHexInput(accentColor ?? '')
                    }
                  }}
                  placeholder="#hex"
                  style={{
                    width: 120,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    padding: '3px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-input)',
                    color: 'var(--color-text-primary)',
                    display: 'block',
                    marginBottom: accentColor !== undefined ? 6 : 0,
                  }}
                />

                {/* Reset to template default */}
                {accentColor !== undefined && (
                  <span
                    onClick={() => setAccentColor(undefined)}
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      display: 'block',
                    }}
                  >
                    Reset to template default
                  </span>
                )}
              </div>
            )}

            {/* Skills display dropdown */}
            <select
              value={effectiveSkillsDisplay}
              onChange={(e) => setSkillsDisplay(e.target.value as 'grouped' | 'inline')}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-default)',
                background: 'var(--color-bg-input)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
                height: 26,
              }}
            >
              <option value="grouped">Skills: Grouped</option>
              <option value="inline">Skills: Inline</option>
            </select>

            <div style={{ flex: 1 }} />

            {/* Export buttons — right side */}
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
              accentColor={accentColor}
              skillsDisplay={skillsDisplay}
              marginTop={marginTop}
              marginBottom={marginBottom}
              marginSides={marginSides}
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
