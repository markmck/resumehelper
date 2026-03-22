import { useEffect, useState } from 'react'
import { BuilderData, BuilderJob, BuilderProject, BuilderSkill } from '../../../preload/index.d'

interface VariantBuilderProps {
  variantId: number
}

function VariantBuilder({ variantId }: VariantBuilderProps): React.JSX.Element {
  const [builderData, setBuilderData] = useState<BuilderData | null>(null)

  useEffect(() => {
    setBuilderData(null)
    window.api.templates.getBuilderData(variantId).then(setBuilderData)
  }, [variantId])

  const handleJobToggle = async (job: BuilderJob): Promise<void> => {
    const newExcluded = !job.excluded
    // Optimistic update
    setBuilderData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        jobs: prev.jobs.map((j) =>
          j.id === job.id
            ? {
                ...j,
                excluded: newExcluded,
                // When job excluded, visually mark bullets as disabled
              }
            : j,
        ),
      }
    })
    await window.api.templates.setItemExcluded(variantId, 'job', job.id, newExcluded)
  }

  const handleBulletToggle = async (
    jobId: number,
    bulletId: number,
    currentExcluded: boolean,
  ): Promise<void> => {
    const newExcluded = !currentExcluded
    // Optimistic update
    setBuilderData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        jobs: prev.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                bullets: j.bullets.map((b) =>
                  b.id === bulletId ? { ...b, excluded: newExcluded } : b,
                ),
              }
            : j,
        ),
      }
    })
    await window.api.templates.setItemExcluded(variantId, 'bullet', bulletId, newExcluded)
  }

  const handleSkillToggle = async (skill: BuilderSkill): Promise<void> => {
    const newExcluded = !skill.excluded
    // Optimistic update
    setBuilderData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        skills: prev.skills.map((s) => (s.id === skill.id ? { ...s, excluded: newExcluded } : s)),
      }
    })
    await window.api.templates.setItemExcluded(variantId, 'skill', skill.id, newExcluded)
  }

  const handleProjectToggle = async (project: BuilderProject): Promise<void> => {
    const newExcluded = !project.excluded
    // Optimistic update
    setBuilderData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === project.id
            ? {
                ...p,
                excluded: newExcluded,
              }
            : p,
        ),
      }
    })
    await window.api.templates.setItemExcluded(variantId, 'project', project.id, newExcluded)
  }

  const handleProjectBulletToggle = async (
    projectId: number,
    bulletId: number,
    currentExcluded: boolean,
  ): Promise<void> => {
    const newExcluded = !currentExcluded
    // Optimistic update
    setBuilderData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                bullets: p.bullets.map((b) =>
                  b.id === bulletId ? { ...b, excluded: newExcluded } : b,
                ),
              }
            : p,
        ),
      }
    })
    await window.api.templates.setItemExcluded(variantId, 'projectBullet', bulletId, newExcluded)
  }

  if (!builderData) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Loading...
      </div>
    )
  }

  // Group skills by tags
  const skillGroups = builderData.skills.reduce<Record<string, BuilderSkill[]>>((acc, skill) => {
    const groupKey = skill.tags.length > 0 ? skill.tags[0] : 'Other'
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(skill)
    return acc
  }, {})

  return (
    <div className="overflow-y-auto h-full px-6 py-4 space-y-8">
      {/* Work History section */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Work History
        </h3>
        {builderData.jobs.length === 0 ? (
          <p className="text-sm text-zinc-600">No jobs yet. Add jobs in the Experience tab.</p>
        ) : (
          <div className="space-y-4">
            {builderData.jobs.map((job) => (
              <div key={job.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                {/* Job row */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!job.excluded}
                    onChange={() => handleJobToggle(job)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 cursor-pointer"
                  />
                  <span
                    className={`text-sm font-medium ${job.excluded ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}
                  >
                    {job.company} — {job.role}
                  </span>
                </label>

                {/* Bullets */}
                {job.bullets.length > 0 && (
                  <div className="mt-2 ml-6 space-y-1">
                    {job.bullets.map((bullet) => (
                      <label
                        key={bullet.id}
                        className={`flex items-start gap-2 ${job.excluded ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={!bullet.excluded}
                          disabled={job.excluded}
                          onChange={() =>
                            !job.excluded &&
                            handleBulletToggle(job.id, bullet.id, bullet.excluded)
                          }
                          className="mt-0.5 w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span
                          className={`text-xs leading-relaxed ${
                            job.excluded || bullet.excluded
                              ? 'text-zinc-600 line-through'
                              : 'text-zinc-400'
                          }`}
                        >
                          {bullet.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skills section */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Skills
        </h3>
        {builderData.skills.length === 0 ? (
          <p className="text-sm text-zinc-600">No skills yet. Add skills in the Experience tab.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(skillGroups).map(([groupName, skills]) => (
              <div key={groupName}>
                <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                  {groupName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <label
                      key={skill.id}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!skill.excluded}
                        onChange={() => handleSkillToggle(skill)}
                        className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 cursor-pointer"
                      />
                      <span
                        className={`text-sm ${skill.excluded ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}
                      >
                        {skill.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Projects section */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Projects
        </h3>
        {builderData.projects.length === 0 ? (
          <p className="text-sm text-zinc-600">No projects yet. Add projects in the Experience tab.</p>
        ) : (
          <div className="space-y-4">
            {builderData.projects.map((project) => (
              <div key={project.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
                {/* Project row */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!project.excluded}
                    onChange={() => handleProjectToggle(project)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 cursor-pointer"
                  />
                  <span
                    className={`text-sm font-medium ${project.excluded ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}
                  >
                    {project.name}
                  </span>
                </label>

                {/* Bullets */}
                {project.bullets.length > 0 && (
                  <div className="mt-2 ml-6 space-y-1">
                    {project.bullets.map((bullet) => (
                      <label
                        key={bullet.id}
                        className={`flex items-start gap-2 ${project.excluded ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={!bullet.excluded}
                          disabled={project.excluded}
                          onChange={() =>
                            !project.excluded &&
                            handleProjectBulletToggle(project.id, bullet.id, bullet.excluded)
                          }
                          className="mt-0.5 w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span
                          className={`text-xs leading-relaxed ${
                            project.excluded || bullet.excluded
                              ? 'text-zinc-600 line-through'
                              : 'text-zinc-400'
                          }`}
                        >
                          {bullet.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default VariantBuilder
