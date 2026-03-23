import { useEffect, useState } from 'react'
import ProjectAddForm from './ProjectAddForm'
import ProjectItem from './ProjectItem'

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

function ProjectList(): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addHovered, setAddHovered] = useState(false)
  const [emptyAddHovered, setEmptyAddHovered] = useState(false)

  useEffect(() => {
    window.api.projects.list().then((data) => {
      setProjects(data as Project[])
      setLoading(false)
    })
  }, [])

  const handleAddProject = async (data: { name: string }): Promise<void> => {
    const newProject = await window.api.projects.create(data)
    setProjects((prev) => [...prev, { ...newProject, bullets: [] } as Project])
    setAdding(false)
  }

  const handleUpdateProject = (updatedProject: Project): void => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === updatedProject.id ? { ...updatedProject, bullets: p.bullets } : p,
      ),
    )
  }

  const handleDeleteProject = (id: number): void => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) {
    return <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading projects...</div>
  }

  const ghostButtonStyle = (isHovered: boolean): React.CSSProperties => ({
    backgroundColor: 'transparent',
    border: 'none',
    color: isHovered ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
    padding: '4px 8px',
    fontSize: 'var(--font-size-xs)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'color 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Add Project button */}
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
            style={ghostButtonStyle(addHovered)}
          >
            + Add Project
          </button>
        </div>
      )}

      {/* Inline add form */}
      {adding && (
        <ProjectAddForm onSave={handleAddProject} onCancel={() => setAdding(false)} />
      )}

      {/* Project list */}
      {projects.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
            No projects yet. Add your first project to get started.
          </p>
          <button
            onClick={() => setAdding(true)}
            onMouseEnter={() => setEmptyAddHovered(true)}
            onMouseLeave={() => setEmptyAddHovered(false)}
            style={ghostButtonStyle(emptyAddHovered)}
          >
            + Add Project
          </button>
        </div>
      ) : (
        projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            onUpdate={handleUpdateProject}
            onDelete={handleDeleteProject}
          />
        ))
      )}
    </div>
  )
}

export default ProjectList
