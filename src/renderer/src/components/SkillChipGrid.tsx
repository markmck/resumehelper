import { useEffect, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Skill {
  id: number
  name: string
  tags: string[]
  categoryId: number | null
  categoryName: string | null
}

interface SkillCategory {
  id: number
  name: string
  sortOrder: number
}

// ─── SkillChip ───────────────────────────────────────────────────────────────

interface SkillChipProps {
  skill: Skill
  onDelete: (id: number) => void
  isOverlay?: boolean
}

function SkillChip({ skill, onDelete, isOverlay = false }: SkillChipProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: skill.id,
    data: { categoryId: skill.categoryId },
  })

  const [hovered, setHovered] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    background: 'var(--color-bg-raised)',
    color: hovered && !isDragging ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    cursor: isOverlay ? 'grabbing' : 'grab',
    border: isOverlay
      ? '1px solid var(--color-accent)'
      : isDragging
        ? '1px solid var(--color-accent)'
        : hovered
          ? '1px solid var(--color-border-emphasis)'
          : '1px solid transparent',
    opacity: isDragging && !isOverlay ? 0.5 : 1,
    boxShadow: isOverlay ? '0 4px 12px rgba(0,0,0,0.4)' : undefined,
    fontFamily: 'var(--font-sans)',
    userSelect: 'none',
  }

  return (
    <span
      ref={setNodeRef}
      style={chipStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...listeners}
      {...attributes}
    >
      {skill.name}
      <span
        onClick={(e) => {
          e.stopPropagation()
          onDelete(skill.id)
        }}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
        style={{
          cursor: 'pointer',
          opacity: deleteHovered ? 1 : 0.4,
          fontSize: '11px',
          lineHeight: 1,
          marginLeft: '2px',
        }}
        aria-label={`Remove ${skill.name}`}
      >
        x
      </span>
    </span>
  )
}

// ─── AddChip ─────────────────────────────────────────────────────────────────

interface AddChipProps {
  categoryId: number | null
  isAdding: boolean
  onStartAdd: () => void
  onAdd: (name: string, categoryId: number | null) => void
  onCancel: () => void
}

function AddChip({ categoryId, isAdding, onStartAdd, onAdd, onCancel }: AddChipProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const [hovered, setHovered] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      const trimmed = inputValue.trim()
      if (trimmed) {
        onAdd(trimmed, categoryId)
        setInputValue('')
      }
    } else if (e.key === 'Escape') {
      setInputValue('')
      onCancel()
    }
  }

  const handleBlur = (): void => {
    if (!inputValue.trim()) {
      setInputValue('')
      onCancel()
    }
  }

  if (isAdding) {
    return (
      <input
        autoFocus
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Skill name"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          background: 'var(--color-bg-input)',
          border: '1px solid var(--color-accent)',
          color: 'var(--color-text-primary)',
          outline: 'none',
          fontFamily: 'var(--font-sans)',
          minWidth: '120px',
        }}
      />
    )
  }

  return (
    <button
      onClick={onStartAdd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '12px',
        color: hovered ? 'var(--color-text-tertiary)' : 'var(--color-text-muted)',
        border: hovered
          ? '1px dashed var(--color-border-emphasis)'
          : '1px dashed var(--color-border-default)',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
    >
      + Add
    </button>
  )
}

// ─── CategoryNameEditor ───────────────────────────────────────────────────────

interface CategoryNameEditorProps {
  category: SkillCategory
  editing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onRename: (id: number, name: string) => void
}

function CategoryNameEditor({
  category,
  editing,
  onStartEdit,
  onStopEdit,
  onRename,
}: CategoryNameEditorProps): React.JSX.Element {
  const [draft, setDraft] = useState(category.name)

  useEffect(() => {
    if (editing) {
      setDraft(category.name)
    }
  }, [editing, category.name])

  const commit = (): void => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== category.name) {
      onRename(category.id, trimmed)
    } else {
      setDraft(category.name)
    }
    onStopEdit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      commit()
    } else if (e.key === 'Escape') {
      setDraft(category.name)
      onStopEdit()
    }
  }

  const baseStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        style={{
          ...baseStyle,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          borderBottom: '1px solid var(--color-accent)',
          width: '180px',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-sans)',
          padding: '0 0 1px 0',
        }}
      />
    )
  }

  return (
    <span
      onClick={onStartEdit}
      style={{
        ...baseStyle,
        color: 'var(--color-text-tertiary)',
        cursor: 'text',
      }}
    >
      {category.name}
    </span>
  )
}

// ─── CategoryBlock ────────────────────────────────────────────────────────────

interface CategoryBlockProps {
  category: SkillCategory
  skills: Skill[]
  isUncategorized?: boolean
  editingCategoryId: number | null
  addingInCategoryId: number | null
  confirmDeleteCategoryId: number | null
  onStartEditCategory: (id: number) => void
  onStopEditCategory: () => void
  onRenameCategory: (id: number, name: string) => void
  onStartAddInCategory: (id: number | null) => void
  onAddSkill: (name: string, categoryId: number | null) => void
  onCancelAdd: () => void
  onDeleteSkill: (id: number) => void
  onStartDeleteCategory: (id: number) => void
  onConfirmDeleteCategory: (id: number) => void
  onCancelDeleteCategory: () => void
  skillCount: number
  dragHandleListeners?: ReturnType<typeof useSortable>['listeners']
  dragHandleAttributes?: ReturnType<typeof useSortable>['attributes']
  sortableStyle?: React.CSSProperties
  sortableRef?: (node: HTMLElement | null) => void
}

function CategoryBlock({
  category,
  skills,
  isUncategorized = false,
  editingCategoryId,
  addingInCategoryId,
  confirmDeleteCategoryId,
  onStartEditCategory,
  onStopEditCategory,
  onRenameCategory,
  onStartAddInCategory,
  onAddSkill,
  onCancelAdd,
  onDeleteSkill,
  onStartDeleteCategory,
  onConfirmDeleteCategory,
  onCancelDeleteCategory,
  skillCount,
  dragHandleListeners,
  dragHandleAttributes,
  sortableStyle,
  sortableRef,
}: CategoryBlockProps): React.JSX.Element {
  const droppableId = isUncategorized ? 'category-uncategorized' : `category-${category.id}`
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: droppableId })

  const setCombinedRef = (node: HTMLElement | null): void => {
    if (sortableRef) sortableRef(node)
  }

  const [renameHovered, setRenameHovered] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)
  const [confirmDeleteHovered, setConfirmDeleteHovered] = useState(false)
  const [keepHovered, setKeepHovered] = useState(false)

  const isEditing = editingCategoryId === category.id
  const isAdding = addingInCategoryId === category.id
  const isConfirmingDelete = confirmDeleteCategoryId === category.id

  const catBtnStyle = (hov: boolean): React.CSSProperties => ({
    background: hov ? 'var(--color-bg-raised)' : 'none',
    border: 'none',
    color: hov ? 'var(--color-text-tertiary)' : 'var(--color-text-muted)',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  })

  return (
    <div
      ref={setCombinedRef}
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-3)',
        ...sortableStyle,
      }}
    >
      {/* Category header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* Drag handle for category reorder */}
          {!isUncategorized && (
            <span
              {...(dragHandleListeners ?? {})}
              {...(dragHandleAttributes ?? {})}
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '12px',
                cursor: 'grab',
                userSelect: 'none',
                touchAction: 'none',
              }}
            >
              ⋮⋮
            </span>
          )}
          {isUncategorized ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-tertiary)',
              }}
            >
              UNCATEGORIZED
            </span>
          ) : (
            <CategoryNameEditor
              category={category}
              editing={isEditing}
              onStartEdit={() => onStartEditCategory(category.id)}
              onStopEdit={onStopEditCategory}
              onRename={onRenameCategory}
            />
          )}
        </div>

        {/* Action buttons */}
        {!isUncategorized && (
          <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
            {isConfirmingDelete ? (
              <>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    marginRight: '4px',
                  }}
                >
                  Delete — this will move {skillCount} skill{skillCount !== 1 ? 's' : ''} to Uncategorized. Confirm?
                </span>
                <button
                  onClick={() => onConfirmDeleteCategory(category.id)}
                  onMouseEnter={() => setConfirmDeleteHovered(true)}
                  onMouseLeave={() => setConfirmDeleteHovered(false)}
                  style={{
                    background: confirmDeleteHovered ? 'rgba(239,68,68,0.15)' : 'none',
                    border: 'none',
                    color: 'var(--color-danger)',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={onCancelDeleteCategory}
                  onMouseEnter={() => setKeepHovered(true)}
                  onMouseLeave={() => setKeepHovered(false)}
                  style={catBtnStyle(keepHovered)}
                >
                  Keep Category
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onStartEditCategory(category.id)}
                  onMouseEnter={() => setRenameHovered(true)}
                  onMouseLeave={() => setRenameHovered(false)}
                  style={catBtnStyle(renameHovered)}
                >
                  Rename
                </button>
                <button
                  onClick={() => onStartDeleteCategory(category.id)}
                  onMouseEnter={() => setDeleteHovered(true)}
                  onMouseLeave={() => setDeleteHovered(false)}
                  style={catBtnStyle(deleteHovered)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chip grid (droppable) */}
      <div
        ref={setDroppableRef}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          minHeight: '32px',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: isOver ? '1px dashed rgba(139,92,246,0.3)' : '1px solid transparent',
          background: isOver ? 'rgba(139,92,246,0.06)' : 'transparent',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {skills.map((skill) => (
          <SkillChip key={skill.id} skill={skill} onDelete={onDeleteSkill} />
        ))}
        <AddChip
          categoryId={isUncategorized ? null : category.id}
          isAdding={isAdding}
          onStartAdd={() => onStartAddInCategory(isUncategorized ? null : category.id)}
          onAdd={onAddSkill}
          onCancel={onCancelAdd}
        />
      </div>
    </div>
  )
}

// ─── SortableCategoryBlock ────────────────────────────────────────────────────

function SortableCategoryBlock(props: Omit<CategoryBlockProps, 'dragHandleListeners' | 'dragHandleAttributes' | 'sortableStyle' | 'sortableRef'>): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `category-sort-${props.category.id}`,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <CategoryBlock
      {...props}
      dragHandleListeners={listeners}
      dragHandleAttributes={attributes}
      sortableStyle={style}
      sortableRef={setNodeRef}
    />
  )
}

// ─── DropZoneNewCategory ──────────────────────────────────────────────────────

function DropZoneNewCategory(): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-zone-new-category' })

  return (
    <div
      style={{
        background: 'rgba(139,92,246,0.03)',
        border: '1px dashed rgba(139,92,246,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-3)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}
      >
        {/* Hidden drag handle placeholder for spacing alignment */}
        <span style={{ visibility: 'hidden', fontSize: '12px' }}>⋮⋮</span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-accent-light)',
            opacity: 0.6,
          }}
        >
          DROP SKILL HERE TO CREATE NEW CATEGORY
        </span>
      </div>

      {/* Inner droppable chip-grid area */}
      <div
        ref={setNodeRef}
        style={{
          minHeight: '40px',
          borderRadius: 'var(--radius-md)',
          border: isOver ? '1px dashed rgba(139,92,246,0.3)' : '1px solid transparent',
          background: isOver ? 'rgba(139,92,246,0.06)' : 'transparent',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      />
    </div>
  )
}

// ─── SkillChipGrid (top-level) ────────────────────────────────────────────────

function SkillChipGrid(): React.JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [categories, setCategories] = useState<SkillCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [addingInCategoryId, setAddingInCategoryId] = useState<number | null | 'null-key'>(null)
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<number | null>(null)
  const [addSkillHovered, setAddSkillHovered] = useState(false)
  const [addCategoryHovered, setAddCategoryHovered] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    Promise.all([window.api.skills.list(), window.api.skills.categories.list()]).then(
      ([skillsData, categoriesData]) => {
        setSkills(skillsData as Skill[])
        setCategories(categoriesData as SkillCategory[])
        setLoading(false)
      },
    )
  }, [])

  // Group skills by categoryId
  const groupedSkills = (): Map<number | null, Skill[]> => {
    const groups = new Map<number | null, Skill[]>()
    for (const skill of skills) {
      const key = skill.categoryId
      const group = groups.get(key) ?? []
      groups.set(key, [...group, skill])
    }
    return groups
  }

  const groups = groupedSkills()
  const uncategorizedSkills = groups.get(null) ?? []

  const activeSkill = activeId !== null ? skills.find((s) => s.id === activeId) ?? null : null

  // ── Drag handlers ──

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    // Handle category reorder
    const activeStr = String(active.id)
    const overStr = String(over.id)
    if (activeStr.startsWith('category-sort-') && overStr.startsWith('category-sort-')) {
      const fromId = parseInt(activeStr.replace('category-sort-', ''), 10)
      const toId = parseInt(overStr.replace('category-sort-', ''), 10)
      if (fromId === toId) return

      const oldIndex = categories.findIndex((c) => c.id === fromId)
      const newIndex = categories.findIndex((c) => c.id === toId)
      if (oldIndex === -1 || newIndex === -1) return

      // Reorder optimistically
      const reordered = [...categories]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      setCategories(reordered)

      // Persist new sortOrder values
      for (let i = 0; i < reordered.length; i++) {
        reordered[i] = { ...reordered[i], sortOrder: i }
        window.api.skills.categories.update(reordered[i].id, { sortOrder: i })
      }
      return
    }

    const skillId = active.id as number
    const skill = skills.find((s) => s.id === skillId)
    if (!skill) return

    const overId = String(over.id)

    let targetCategoryId: number | null

    if (overId === 'drop-zone-new-category') {
      // Create a new category and move skill into it
      try {
        const newCategory = await window.api.skills.categories.create({ name: 'New Category' })
        setCategories((prev) => [...prev, newCategory as SkillCategory])
        const newCat = newCategory as SkillCategory
        // Move skill optimistically
        setSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, categoryId: newCat.id, categoryName: newCat.name } : s)),
        )
        await window.api.skills.update(skillId, { categoryId: newCat.id })
        // Enter edit mode on new category
        setEditingCategoryId(newCat.id)
      } catch (err) {
        console.error('Failed to create new category on drop:', err)
      }
      return
    }

    if (overId === 'category-uncategorized') {
      targetCategoryId = null
    } else if (overId.startsWith('category-')) {
      targetCategoryId = parseInt(overId.replace('category-', ''), 10)
    } else {
      return
    }

    if (skill.categoryId === targetCategoryId) return

    // Optimistic update
    const targetCategory = targetCategoryId !== null ? categories.find((c) => c.id === targetCategoryId) : null
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId
          ? { ...s, categoryId: targetCategoryId, categoryName: targetCategory?.name ?? null }
          : s,
      ),
    )

    try {
      await window.api.skills.update(skillId, { categoryId: targetCategoryId })
    } catch (err) {
      console.error('Failed to update skill category:', err)
    }
  }

  const handleDragCancel = (): void => {
    setActiveId(null)
  }

  // ── Category CRUD ──

  const handleRenameCategory = async (id: number, name: string): Promise<void> => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
    setSkills((prev) => prev.map((s) => (s.categoryId === id ? { ...s, categoryName: name } : s)))
    try {
      await window.api.skills.categories.update(id, { name })
    } catch (err) {
      console.error('Failed to rename category:', err)
    }
  }

  const handleAddCategory = async (): Promise<void> => {
    try {
      const newCategory = await window.api.skills.categories.create({ name: 'New Category' })
      const newCat = newCategory as SkillCategory
      setCategories((prev) => [...prev, newCat])
      setEditingCategoryId(newCat.id)
    } catch (err) {
      console.error('Failed to create category:', err)
    }
  }

  const handleConfirmDeleteCategory = async (id: number): Promise<void> => {
    setConfirmDeleteCategoryId(null)
    // Optimistically move skills to uncategorized
    setSkills((prev) => prev.map((s) => (s.categoryId === id ? { ...s, categoryId: null, categoryName: null } : s)))
    setCategories((prev) => prev.filter((c) => c.id !== id))
    try {
      await window.api.skills.categories.delete(id)
    } catch (err) {
      console.error('Failed to delete category:', err)
    }
  }

  // ── Skill CRUD ──

  const handleAddSkill = async (name: string, categoryId: number | null): Promise<void> => {
    setAddingInCategoryId(null)
    try {
      const newSkill = await window.api.skills.create({ name, tags: [], categoryId })
      const category = categoryId !== null ? categories.find((c) => c.id === categoryId) : null
      setSkills((prev) => [
        ...prev,
        { ...(newSkill as Skill), categoryId, categoryName: category?.name ?? null },
      ])
    } catch (err) {
      console.error('Failed to create skill:', err)
    }
  }

  const handleDeleteSkill = async (id: number): Promise<void> => {
    setSkills((prev) => prev.filter((s) => s.id !== id))
    try {
      await window.api.skills.delete(id)
    } catch (err) {
      console.error('Failed to delete skill:', err)
    }
  }

  // ── "Add skill" top button — focus on first available category ──

  const handleTopAddSkill = (): void => {
    if (categories.length > 0) {
      setAddingInCategoryId(categories[0].id)
    } else {
      // Use null key sentinel to signal uncategorized add
      setAddingInCategoryId('null-key')
    }
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
        Loading skills...
      </div>
    )
  }

  const totalSkills = skills.length

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        style={{
          background: 'var(--color-bg-base)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-primary)',
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Skills
            </span>
            <span
              style={{
                fontSize: '12px',
                background: 'var(--color-bg-raised)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 8px',
                color: 'var(--color-text-secondary)',
              }}
            >
              {totalSkills} skill{totalSkills !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={handleTopAddSkill}
            onMouseEnter={() => setAddSkillHovered(true)}
            onMouseLeave={() => setAddSkillHovered(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              background: addSkillHovered ? 'var(--color-bg-raised)' : 'transparent',
              border: addSkillHovered
                ? '1px solid var(--color-border-emphasis)'
                : '1px solid var(--color-border-default)',
              color: addSkillHovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            + Add skill
          </button>
        </div>

        {/* Empty state */}
        {totalSkills === 0 && categories.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-sm)',
              padding: '24px 0',
            }}
          >
            No skills added yet. Use &quot;+ Add skill&quot; to get started.
          </div>
        ) : (
          <>
            {/* Category blocks — sortable for reordering */}
            <SortableContext
              items={categories.map((c) => `category-sort-${c.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map((category) => {
                const catSkills = groups.get(category.id) ?? []
                return (
                  <SortableCategoryBlock
                    key={category.id}
                    category={category}
                    skills={catSkills}
                    isUncategorized={false}
                    editingCategoryId={editingCategoryId}
                    addingInCategoryId={addingInCategoryId as number | null}
                    confirmDeleteCategoryId={confirmDeleteCategoryId}
                    onStartEditCategory={(id) => setEditingCategoryId(id)}
                    onStopEditCategory={() => setEditingCategoryId(null)}
                    onRenameCategory={handleRenameCategory}
                    onStartAddInCategory={(id) => setAddingInCategoryId(id)}
                    onAddSkill={handleAddSkill}
                    onCancelAdd={() => setAddingInCategoryId(null)}
                    onDeleteSkill={handleDeleteSkill}
                    onStartDeleteCategory={(id) => setConfirmDeleteCategoryId(id)}
                    onConfirmDeleteCategory={handleConfirmDeleteCategory}
                    onCancelDeleteCategory={() => setConfirmDeleteCategoryId(null)}
                    skillCount={catSkills.length}
                  />
                )
              })}
            </SortableContext>

            {/* Uncategorized group — only if any uncategorized skills exist */}
            {uncategorizedSkills.length > 0 && (
              <CategoryBlock
                key="uncategorized"
                category={{ id: -1, name: 'UNCATEGORIZED', sortOrder: 9999 }}
                skills={uncategorizedSkills}
                isUncategorized={true}
                editingCategoryId={editingCategoryId}
                addingInCategoryId={
                  addingInCategoryId === null || addingInCategoryId === 'null-key'
                    ? null
                    : addingInCategoryId
                }
                confirmDeleteCategoryId={confirmDeleteCategoryId}
                onStartEditCategory={() => {}}
                onStopEditCategory={() => setEditingCategoryId(null)}
                onRenameCategory={() => {}}
                onStartAddInCategory={() => setAddingInCategoryId(null)}
                onAddSkill={handleAddSkill}
                onCancelAdd={() => setAddingInCategoryId(null)}
                onDeleteSkill={handleDeleteSkill}
                onStartDeleteCategory={() => {}}
                onConfirmDeleteCategory={() => {}}
                onCancelDeleteCategory={() => setConfirmDeleteCategoryId(null)}
                skillCount={uncategorizedSkills.length}
              />
            )}
          </>
        )}

        {/* Drop zone — create new category */}
        <DropZoneNewCategory />

        {/* Add category button */}
        <button
          onClick={handleAddCategory}
          onMouseEnter={() => setAddCategoryHovered(true)}
          onMouseLeave={() => setAddCategoryHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            border: addCategoryHovered
              ? '1px dashed var(--color-border-emphasis)'
              : '1px dashed var(--color-border-default)',
            borderRadius: 'var(--radius-lg)',
            color: addCategoryHovered ? 'var(--color-text-tertiary)' : 'var(--color-text-muted)',
            fontSize: '13px',
            background: 'none',
            width: '100%',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            marginBottom: '8px',
          }}
        >
          + Add category
        </button>

        {/* Hint text */}
        <p
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            marginTop: '8px',
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          Drag skills between categories to reorganize.
        </p>
      </div>

      {/* DragOverlay — floating chip clone while dragging */}
      <DragOverlay>
        {activeSkill ? (
          <SkillChip skill={activeSkill} onDelete={() => {}} isOverlay={true} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default SkillChipGrid
