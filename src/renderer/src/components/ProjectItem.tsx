import { useState } from 'react'
import InlineEdit from './InlineEdit'
import ProjectBulletList from './ProjectBulletList'

interface ProjectBullet {
  id: number
  projectId: number
  text: string
  sortOrder: number
}

interface Project {
  id: number
  name: string
  sortOrder: number
  bullets: ProjectBullet[]
}

interface ProjectItemProps {
  project: Project
  onUpdate: (updatedProject: Project) => void
  onDelete: (id: number) => void
}

function ProjectItem({ project, onUpdate, onDelete }: ProjectItemProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)

  const handleNameUpdate = async (name: string): Promise<void> => {
    const updated = await window.api.projects.update(project.id, { name })
    onUpdate({ ...project, ...updated })
  }

  const handleDelete = async (): Promise<void> => {
    await window.api.projects.delete(project.id)
    onDelete(project.id)
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: hovered
          ? '1px solid var(--color-border-default)'
          : '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row — title (like company name) + delete + collapse */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '10px 12px',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineEdit
            value={project.name}
            onSave={handleNameUpdate}
            placeholder="Project Name"
            style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}
          />
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
            backgroundColor: deleteHovered ? 'var(--color-bg-raised)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            transition: 'color 0.15s, background-color 0.15s',
            opacity: hovered ? 1 : 0,
            padding: 0,
          }}
          aria-label="Delete project"
        >
          ×
        </button>

        {/* Chevron toggle */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            padding: 0,
            transition: 'color 0.15s',
          }}
          aria-label={isOpen ? 'Collapse project' : 'Expand project'}
        >
          <span
            style={{
              display: 'inline-block',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
              fontSize: '10px',
            }}
          >
            &#9654;
          </span>
        </button>
      </div>

      {/* Expanded body — bullets indented beneath the title */}
      {isOpen && (
        <div style={{ padding: '0 12px 14px 12px', borderTop: '1px solid var(--color-border-subtle)' }}>
          <ProjectBulletList projectId={project.id} initialBullets={project.bullets} />
        </div>
      )}
    </div>
  )
}

export default ProjectItem
