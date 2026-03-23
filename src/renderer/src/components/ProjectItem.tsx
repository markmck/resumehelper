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
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineEdit
            value={project.name}
            onSave={handleNameUpdate}
            placeholder="Project Name"
            style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}
          />
        </div>

        <button
          onClick={handleDelete}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
            backgroundColor: deleteHovered ? 'var(--color-bg-raised)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            transition: 'color 0.15s, background-color 0.15s',
            opacity: hovered ? 1 : 0,
            padding: 0,
          }}
          aria-label="Delete project"
        >
          ×
        </button>
      </div>

      <ProjectBulletList projectId={project.id} initialBullets={project.bullets} />
    </div>
  )
}

export default ProjectItem
