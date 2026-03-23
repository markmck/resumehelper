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
}

function VariantEditor({ variant, onRename }: VariantEditorProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('builder')
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [themes, setThemes] = useState<Array<{ key: string; displayName: string }>>([])
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
        {/* Variant name */}
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <InlineEdit
            value={variant.name}
            onSave={(name) => onRename(variant.id, name)}
            placeholder="Untitled Variant"
            className="text-lg font-semibold"
          />
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
    </div>
  )
}

export default VariantEditor
