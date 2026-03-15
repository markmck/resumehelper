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
  const handleNameUpdate = async (name: string): Promise<void> => {
    const updated = await window.api.projects.update(project.id, { name })
    onUpdate({ ...project, ...updated })
  }

  const handleDelete = async (): Promise<void> => {
    await window.api.projects.delete(project.id)
    onDelete(project.id)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3.5 group/project">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={project.name}
            onSave={handleNameUpdate}
            placeholder="Project Name"
            className="text-base font-semibold text-zinc-100"
          />
        </div>

        <button
          onClick={handleDelete}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover/project:opacity-100 text-lg leading-none"
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
