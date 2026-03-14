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
    <div className="flex h-[calc(100vh-48px)]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
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
      <div className="flex-1 overflow-hidden">
        {selectedVariant ? (
          <VariantEditor
            variant={selectedVariant}
            onRename={handleRename}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <p className="mb-4 text-sm">No variants yet</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
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
