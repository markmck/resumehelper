import JobList from './JobList'
import SkillList from './SkillList'
import ProfileSettings from './ProfileSettings'

function ExperienceTab(): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-[calc(100vh-48px)]">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Profile Section */}
        <section style={{ marginBottom: '48px' }}>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider" style={{ marginBottom: '16px' }}>Profile</h2>
          <ProfileSettings />
        </section>

        {/* Work History Section */}
        <section style={{ marginBottom: '48px' }}>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider" style={{ marginBottom: '16px' }}>Work History</h2>
          <JobList />
        </section>

        {/* Skills Section */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider" style={{ marginBottom: '16px' }}>Skills</h2>
          <SkillList />
        </section>
      </div>
    </div>
  )
}

export default ExperienceTab
