import JobList from './JobList'
import SkillList from './SkillList'

function ExperienceTab(): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-[calc(100vh-48px)]">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Work History Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Work History</h2>
          </div>
          <JobList />
        </section>

        {/* Skills Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Skills</h2>
          </div>
          <SkillList />
        </section>
      </div>
    </div>
  )
}

export default ExperienceTab
