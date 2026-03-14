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

interface Bullet {
  id: number
  jobId: number
  text: string
  sortOrder: number
}

interface BulletListProps {
  jobId: number
  initialBullets: Bullet[]
}

function BulletList({ jobId, initialBullets }: BulletListProps): React.JSX.Element {
  const [bullets, setBullets] = useState<Bullet[]>(initialBullets)

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

    await window.api.bullets.reorder(
      jobId,
      reordered.map((b) => b.id),
    )
  }

  const handleAddBullet = async (): Promise<void> => {
    const newBullet = await window.api.bullets.create({
      jobId,
      text: '',
      sortOrder: bullets.length,
    })
    setBullets((prev) => [...prev, newBullet])
  }

  const handleUpdateBullet = async (id: number, text: string): Promise<void> => {
    await window.api.bullets.update(id, { text })
    setBullets((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)))
  }

  const handleDeleteBullet = async (id: number): Promise<void> => {
    await window.api.bullets.delete(id)
    setBullets((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="mt-2 pl-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={bullets.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {bullets.map((bullet) => (
            <BulletItem
              key={bullet.id}
              id={bullet.id}
              text={bullet.text}
              onUpdate={(text) => handleUpdateBullet(bullet.id, text)}
              onDelete={() => handleDeleteBullet(bullet.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={handleAddBullet}
        className="mt-1 ml-5 text-sm text-zinc-500 hover:text-indigo-400 transition-colors"
      >
        + Add bullet
      </button>
    </div>
  )
}

export default BulletList
