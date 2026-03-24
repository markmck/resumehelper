import { useEffect, useState } from 'react'
import { TemplateVariant } from '../../../preload/index.d'
import VariantEditor from './VariantEditor'

interface TemplatesTabProps {
  selectedVariantId: number | null
  onVariantsLoaded: (variants: Array<{ id: number; name: string }>) => void
  onSelectedChange: (id: number | null) => void
  onOptimizeVariant?: (analysisId: number) => void
}

function TemplatesTab({ selectedVariantId, onVariantsLoaded, onSelectedChange, onOptimizeVariant }: TemplatesTabProps): React.JSX.Element {
  const [variants, setVariants] = useState<TemplateVariant[]>([])

  useEffect(() => {
    window.api.templates.list().then((list) => {
      setVariants(list)
      onVariantsLoaded(list.map((v) => ({ id: v.id, name: v.name })))
      if (list.length > 0 && selectedVariantId === null) {
        onSelectedChange(list[0].id)
      }
    })
  }, [])

  const handleCreate = async (): Promise<void> => {
    const newVariant = await window.api.templates.create({ name: 'Untitled Variant' })
    setVariants((prev) => {
      const updated = [...prev, newVariant]
      onVariantsLoaded(updated.map((v) => ({ id: v.id, name: v.name })))
      return updated
    })
    onSelectedChange(newVariant.id)
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.templates.delete(id)
    setVariants((prev) => {
      const updated = prev.filter((v) => v.id !== id)
      onVariantsLoaded(updated.map((v) => ({ id: v.id, name: v.name })))
      if (selectedVariantId === id) {
        onSelectedChange(updated.length > 0 ? updated[0].id : null)
      }
      return updated
    })
  }

  const handleRename = async (id: number, newName: string): Promise<void> => {
    const updated = await window.api.templates.rename(id, newName)
    setVariants((prev) => {
      const list = prev.map((v) => (v.id === id ? updated : v))
      onVariantsLoaded(list.map((v) => ({ id: v.id, name: v.name })))
      return list
    })
  }

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedVariant ? (
          <VariantEditor
            variant={selectedVariant}
            onRename={handleRename}
            onDelete={handleDelete}
            onOptimizeVariant={onOptimizeVariant}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)' }}>
            <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>No variants yet</p>
            <button
              onClick={handleCreate}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-on-accent, #fff)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                fontWeight: 500,
                cursor: 'pointer',
                height: 36,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Create your first variant
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TemplatesTab
