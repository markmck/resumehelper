import { useEffect, useState } from 'react'
import { TemplateVariant } from '../../../preload/index.d'
import VariantEditor from './VariantEditor'
import VariantList from './VariantList'

function TemplatesTab(): React.JSX.Element {
  const [variants, setVariants] = useState<TemplateVariant[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    window.api.templates.list().then((list) => {
      setVariants(list)
      if (list.length > 0) {
        setSelectedId(list[0].id)
      }
    })
  }, [])

  const handleCreate = async (): Promise<void> => {
    const newVariant = await window.api.templates.create({ name: 'Untitled Variant' })
    setVariants((prev) => [...prev, newVariant])
    setSelectedId(newVariant.id)
  }

  const handleDelete = async (id: number): Promise<void> => {
    await window.api.templates.delete(id)
    setVariants((prev) => {
      const updated = prev.filter((v) => v.id !== id)
      if (selectedId === id) {
        setSelectedId(updated.length > 0 ? updated[0].id : null)
      }
      return updated
    })
  }

  const handleDuplicate = async (id: number): Promise<void> => {
    const copy = await window.api.templates.duplicate(id)
    setVariants((prev) => [...prev, copy])
    setSelectedId(copy.id)
  }

  const handleRename = async (id: number, newName: string): Promise<void> => {
    const updated = await window.api.templates.rename(id, newName)
    setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)))
  }

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Variant list sidebar */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          backgroundColor: 'var(--color-bg-surface)',
          borderRight: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <VariantList
          variants={variants}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </aside>

      {/* Editor area */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedVariant ? (
          <VariantEditor
            variant={selectedVariant}
            onRename={handleRename}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)' }}>
            <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>No variants yet</p>
            <button
              onClick={handleCreate}
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
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
