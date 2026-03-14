import { useEffect, useState } from 'react'
import { BuilderData, BuilderJob, BuilderSkill } from '../../../preload/index.d'

interface VariantPreviewProps {
  variantId: number
  layoutTemplate: string
}

function VariantPreview({ variantId, layoutTemplate }: VariantPreviewProps): React.JSX.Element {
  const [builderData, setBuilderData] = useState<BuilderData | null>(null)

  useEffect(() => {
    setBuilderData(null)
    window.api.templates.getBuilderData(variantId).then(setBuilderData)
  }, [variantId])

  if (!builderData) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Loading...
      </div>
    )
  }

  const includedJobs = builderData.jobs.filter((j) => !j.excluded)
  const includedSkills = builderData.skills.filter((s) => !s.excluded)

  // Group included skills by first tag
  const skillGroups = includedSkills.reduce<Record<string, BuilderSkill[]>>((acc, skill) => {
    const groupKey = skill.tags.length > 0 ? skill.tags[0] : 'Other'
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(skill)
    return acc
  }, {})

  if (layoutTemplate === 'modern') {
    return <ModernLayout includedJobs={includedJobs} skillGroups={skillGroups} />
  }
  if (layoutTemplate === 'compact') {
    return <CompactLayout includedJobs={includedJobs} skillGroups={skillGroups} />
  }
  return <TraditionalLayout includedJobs={includedJobs} skillGroups={skillGroups} />
}

// ---- Layout sub-components ----

interface LayoutProps {
  includedJobs: BuilderJob[]
  skillGroups: Record<string, BuilderSkill[]>
}

function TraditionalLayout({ includedJobs, skillGroups }: LayoutProps): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-full px-8 py-6 max-w-3xl mx-auto">
      {/* Header placeholder */}
      <div className="mb-8 pb-4 border-b border-zinc-700">
        <div className="h-7 w-48 bg-zinc-700 rounded mb-2" />
        <div className="h-4 w-64 bg-zinc-800 rounded" />
      </div>

      {/* Work Experience */}
      {includedJobs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 pb-1 border-b border-zinc-800">
            Work Experience
          </h2>
          <div className="space-y-5">
            {includedJobs.map((job) => {
              const bullets = job.bullets.filter((b) => !b.excluded)
              return (
                <div key={job.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-semibold text-zinc-200">{job.role}</p>
                    <p className="text-xs text-zinc-500">
                      {job.startDate} — {job.endDate ?? 'Present'}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{job.company}</p>
                  {bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {bullets.map((b) => (
                        <li key={b.id} className="text-xs text-zinc-400 leading-relaxed">
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Skills */}
      {Object.keys(skillGroups).length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 pb-1 border-b border-zinc-800">
            Skills
          </h2>
          <div className="space-y-2">
            {Object.entries(skillGroups).map(([group, skills]) => (
              <div key={group} className="flex gap-2 items-baseline">
                <span className="text-xs font-medium text-zinc-500 w-24 flex-shrink-0">{group}</span>
                <span className="text-xs text-zinc-300">{skills.map((s) => s.name).join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {includedJobs.length === 0 && Object.keys(skillGroups).length === 0 && (
        <p className="text-sm text-zinc-600 text-center py-12">
          No items included. Toggle items in the Builder tab.
        </p>
      )}
    </div>
  )
}

function ModernLayout({ includedJobs, skillGroups }: LayoutProps): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-full flex">
      {/* Left column — Skills sidebar */}
      <aside className="w-52 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 px-5 py-6">
        {/* Header placeholder */}
        <div className="mb-8">
          <div className="h-6 w-32 bg-zinc-700 rounded mb-1.5" />
          <div className="h-3 w-40 bg-zinc-800 rounded" />
        </div>

        {Object.keys(skillGroups).length > 0 ? (
          <>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
              Skills
            </h3>
            <div className="space-y-3">
              {Object.entries(skillGroups).map(([group, skills]) => (
                <div key={group}>
                  <p className="text-xs font-medium text-zinc-500 mb-1">{group}</p>
                  <ul className="space-y-0.5">
                    {skills.map((s) => (
                      <li key={s.id} className="text-xs text-zinc-300">
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-600">No skills included.</p>
        )}
      </aside>

      {/* Right column — Work Experience */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {includedJobs.length > 0 ? (
          <>
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 pb-1 border-b border-zinc-800">
              Work Experience
            </h2>
            <div className="space-y-5">
              {includedJobs.map((job) => {
                const bullets = job.bullets.filter((b) => !b.excluded)
                return (
                  <div key={job.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-sm font-semibold text-zinc-200">{job.role}</p>
                      <p className="text-xs text-zinc-500">
                        {job.startDate} — {job.endDate ?? 'Present'}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{job.company}</p>
                    {bullets.length > 0 && (
                      <ul className="list-disc list-inside space-y-1">
                        {bullets.map((b) => (
                          <li key={b.id} className="text-xs text-zinc-400 leading-relaxed">
                            {b.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-600 text-center py-12">
            No jobs included. Toggle jobs in the Builder tab.
          </p>
        )}
      </div>
    </div>
  )
}

function CompactLayout({ includedJobs, skillGroups }: LayoutProps): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-full px-8 py-4 max-w-2xl mx-auto text-xs">
      {/* Header placeholder */}
      <div className="mb-4 pb-2 border-b border-zinc-800">
        <div className="h-5 w-36 bg-zinc-700 rounded mb-1" />
        <div className="h-3 w-48 bg-zinc-800 rounded" />
      </div>

      {/* Work Experience — compact */}
      {includedJobs.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 pb-0.5 border-b border-zinc-800">
            Experience
          </h2>
          <div className="space-y-3">
            {includedJobs.map((job) => {
              const bullets = job.bullets.filter((b) => !b.excluded)
              return (
                <div key={job.id}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-zinc-200">
                      {job.role} · {job.company}
                    </span>
                    <span className="text-zinc-500">
                      {job.startDate} – {job.endDate ?? 'Present'}
                    </span>
                  </div>
                  {bullets.length > 0 && (
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                      {bullets.map((b) => (
                        <li key={b.id} className="text-zinc-400 leading-snug">
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Skills — compact inline */}
      {Object.keys(skillGroups).length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 pb-0.5 border-b border-zinc-800">
            Skills
          </h2>
          <div className="space-y-1">
            {Object.entries(skillGroups).map(([group, skills]) => (
              <div key={group} className="flex gap-2">
                <span className="font-medium text-zinc-500 w-20 flex-shrink-0">{group}:</span>
                <span className="text-zinc-300">{skills.map((s) => s.name).join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {includedJobs.length === 0 && Object.keys(skillGroups).length === 0 && (
        <p className="text-zinc-600 text-center py-8">
          No items included. Toggle items in the Builder tab.
        </p>
      )}
    </div>
  )
}

export default VariantPreview
