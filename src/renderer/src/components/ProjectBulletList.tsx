import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useState } from 'react'
import BulletItem from './BulletItem'

interface ProjectBullet {
  id: number
  projectId: number
  text: string
  sortOrder: number
}

interface ProjectBulletListProps {
  projectId: number
  initialBullets: ProjectBullet[]
}

function ProjectBulletList({ projectId, initialBullets }: ProjectBulletListProps): React.JSX.Element {
  const [bullets, setBullets] = useState<ProjectBullet[]>(initialBullets)
  const [focusBulletId, setFocusBulletId] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = bullets.findIndex((b) => b.id === active.id)
    const newIndex = bullets.findIndex((b) => b.id === over.id)

    const reordered = arrayMove(bullets, oldIndex, newIndex)
    setBullets(reordered)

    await window.api.projectBullets.reorder(
      projectId,
      reordered.map((b) => b.id),
    )
  }

  const handleAddBullet = async (): Promise<void> => {
    const newBullet = await window.api.projectBullets.create({
      projectId,
      text: '',
      sortOrder: bullets.length,
    })
    setBullets((prev) => [...prev, newBullet])
    setFocusBulletId(newBullet.id)
  }

  const handleUpdateBullet = async (id: number, text: string): Promise<void> => {
    await window.api.projectBullets.update(id, { text })
    setBullets((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)))
  }

  const handleDeleteBullet = async (id: number): Promise<void> => {
    await window.api.projectBullets.delete(id)
    setBullets((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="mt-3 pl-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={bullets.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {bullets.map((bullet) => (
            <BulletItem
              key={bullet.id}
              id={bullet.id}
              text={bullet.text}
              onUpdate={(text) => handleUpdateBullet(bullet.id, text)}
              onDelete={() => handleDeleteBullet(bullet.id)}
              onEnterKey={handleAddBullet}
              autoFocus={bullet.id === focusBulletId}
              onFocused={() => setFocusBulletId(null)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={handleAddBullet}
        className="mt-2 ml-4 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
      >
        + Add bullet
      </button>
    </div>
  )
}

export default ProjectBulletList
