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
    return <div className="text-zinc-500 text-sm">Loading projects...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Add Project button */}
      {!adding && (
        <div>
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
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
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm" style={{ marginBottom: '12px' }}>
            No projects yet. Add your first project to get started.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
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
