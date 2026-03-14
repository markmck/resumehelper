import { useState } from 'react'
import JobList from './JobList'
import SkillList from './SkillList'
import ProfileSettings from './ProfileSettings'

function ExperienceTab(): React.JSX.Element {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="overflow-y-auto h-[calc(100vh-48px)]">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Profile Section — collapsible */}
        <section style={{ marginBottom: '48px' }}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300 transition-colors"
            style={{ marginBottom: profileOpen ? '16px' : '0' }}
          >
            <span style={{ display: 'inline-block', transform: profileOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
            Profile
          </button>
          {profileOpen && <ProfileSettings />}
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
