import JobList from './JobList'
import SkillList from './SkillList'

function ExperienceTab(): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-[calc(100vh-48px)]">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Work History Section */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Work History</h2>
          <JobList />
        </section>

        {/* Skills Section */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Skills</h2>
          <SkillList />
        </section>
      </div>
    </div>
  )
}

export default ExperienceTab
