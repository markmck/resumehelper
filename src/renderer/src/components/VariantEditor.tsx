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

  // Fetch theme list on mount
  useEffect(() => {
    window.api.themes.list().then(setThemes)
  }, [])

  // Sync layoutTemplate when variant changes
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

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex-shrink-0 border-b border-zinc-800 px-6 py-3">
        {/* Variant name — inline editable */}
        <div className="mb-2">
          <InlineEdit
            value={variant.name}
            onSave={(name) => onRename(variant.id, name)}
            placeholder="Untitled Variant"
            className="text-lg font-semibold"
          />
        </div>

        {/* Sub-tab bar + theme selector + export buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {(['builder', 'preview'] as SubTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  activeSubTab === tab
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Theme selector + export buttons — only shown on preview sub-tab */}
          {activeSubTab === 'preview' && (
            <div className="flex items-center gap-2">
              {themes.length > 0 && (
                <select
                  value={layoutTemplate}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="px-2 py-1.5 text-sm font-medium rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-500 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
              </button>
              <button
                onClick={handleExportDocx}
                disabled={exporting !== null}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'docx' ? 'Exporting…' : 'Export DOCX'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'builder' && <VariantBuilder variantId={variant.id} />}
        {activeSubTab === 'preview' && (
          <VariantPreview variantId={variant.id} layoutTemplate={layoutTemplate} />
        )}
      </div>
    </div>
  )
}

export default VariantEditor
