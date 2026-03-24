import { useState, useEffect } from 'react'
import { TemplateVariant } from '../../../preload/index.d'
import InlineEdit from './InlineEdit'
import VariantBuilder from './VariantBuilder'
import VariantPreview from './VariantPreview'
import { useToast } from './Toast'

type SubTab = 'builder' | 'preview'

interface VariantEditorProps {
  variant: TemplateVariant
  onRename: (id: number, name: string) => void
  onDelete: (id: number) => void
}

function VariantEditor({ variant, onRename, onDelete }: VariantEditorProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('builder')
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [themes, setThemes] = useState<Array<{ key: string; displayName: string }>>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [layoutTemplate, setLayoutTemplate] = useState(
    variant.layoutTemplate && variant.layoutTemplate !== 'traditional'
      ? variant.layoutTemplate
      : 'professional'
  )
  const { showToast } = useToast()

  useEffect(() => {
    window.api.themes.list().then(setThemes)
  }, [])

  useEffect(() => {
    const tpl = variant.layoutTemplate
    setLayoutTemplate(tpl && tpl !== 'traditional' ? tpl : 'professional')
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

  const subTabStyle = (tab: SubTab): React.CSSProperties => ({
    padding: '4px 10px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    textTransform: 'capitalize' as const,
    backgroundColor: activeSubTab === tab ? 'var(--color-bg-raised)' : 'transparent',
    color: activeSubTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor header */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '12px 20px',
          backgroundColor: 'var(--color-bg-surface)',
        }}
      >
        {/* Variant name + delete */}
        <div style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

        {/* Sub-tab bar + theme + export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            {(['builder', 'preview'] as SubTab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveSubTab(tab)} style={subTabStyle(tab)}>
                {tab}
              </button>
            ))}
          </div>

          {activeSubTab === 'preview' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {themes.length > 0 && (
                <select
                  value={layoutTemplate}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  style={{
                    backgroundColor: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    height: 28,
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
                  padding: '4px 10px',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-default)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  opacity: exporting ? 0.5 : 1,
                  height: 28,
                  fontFamily: 'var(--font-sans)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
              </button>
              <button
                onClick={handleExportDocx}
                disabled={exporting !== null}
                style={{
                  padding: '4px 10px',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'var(--color-success)',
                  color: '#fff',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  opacity: exporting ? 0.5 : 1,
                  height: 28,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                {exporting === 'docx' ? 'Exporting...' : 'DOCX'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeSubTab === 'builder' && <VariantBuilder variantId={variant.id} />}
        {activeSubTab === 'preview' && (
          <VariantPreview variantId={variant.id} layoutTemplate={layoutTemplate} />
        )}
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
                  color: 'white',
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
