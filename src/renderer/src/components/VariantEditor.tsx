import { useState } from 'react'
import { TemplateVariant } from '../../../preload/index.d'
import InlineEdit from './InlineEdit'
import VariantBuilder from './VariantBuilder'
import VariantPreview from './VariantPreview'

type SubTab = 'builder' | 'preview'

const LAYOUT_TEMPLATES = [
  { id: 'traditional', label: 'Traditional' },
  { id: 'modern', label: 'Modern' },
  { id: 'compact', label: 'Compact' },
]

interface VariantEditorProps {
  variant: TemplateVariant
  onRename: (id: number, name: string) => void
  onLayoutChange: (id: number, layoutTemplate: string) => void
}

function VariantEditor({
  variant,
  onRename,
  onLayoutChange,
}: VariantEditorProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('builder')

  return (
    <div className="flex flex-col h-full">
      {/* Editor header */}
      <div className="flex-shrink-0 border-b border-zinc-800 px-6 py-3">
        {/* Variant name — inline editable */}
        <div className="mb-3">
          <InlineEdit
            value={variant.name}
            onSave={(name) => onRename(variant.id, name)}
            placeholder="Untitled Variant"
            className="text-lg font-semibold"
          />
        </div>

        {/* Layout template selector */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-zinc-500">Layout:</span>
          <div className="flex gap-1">
            {LAYOUT_TEMPLATES.map((lt) => (
              <button
                key={lt.id}
                onClick={() => onLayoutChange(variant.id, lt.id)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  variant.layoutTemplate === lt.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {lt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-tab bar */}
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
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'builder' && <VariantBuilder variantId={variant.id} />}
        {activeSubTab === 'preview' && (
          <VariantPreview variantId={variant.id} layoutTemplate={variant.layoutTemplate} />
        )}
      </div>
    </div>
  )
}

export default VariantEditor
