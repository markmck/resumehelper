import { useState } from 'react'
import JobList from './JobList'
import SkillList from './SkillList'
import ProfileSettings from './ProfileSettings'
import ProjectList from './ProjectList'
import EducationList from './EducationList'
import VolunteerList from './VolunteerList'
import AwardList from './AwardList'
import PublicationList from './PublicationList'
import LanguageList from './LanguageList'
import InterestList from './InterestList'
import ReferenceList from './ReferenceList'

interface CollapsibleSectionProps {
  title: string
  defaultOpen: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, defaultOpen, children }: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section style={{ marginBottom: '48px' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-300 transition-colors"
        style={{ marginBottom: open ? '16px' : '0' }}
      >
        <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>&#9654;</span>
        {title}
      </button>
      {open && children}
    </section>
  )
}

function ExperienceTab(): React.JSX.Element {
  return (
    <div className="overflow-y-auto h-[calc(100vh-48px)]">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <CollapsibleSection title="Profile" defaultOpen={false}>
          <ProfileSettings />
        </CollapsibleSection>

        <CollapsibleSection title="Work History" defaultOpen={true}>
          <JobList />
        </CollapsibleSection>

        <CollapsibleSection title="Skills" defaultOpen={true}>
          <SkillList />
        </CollapsibleSection>

        <CollapsibleSection title="Projects" defaultOpen={true}>
          <ProjectList />
        </CollapsibleSection>

        <CollapsibleSection title="Education" defaultOpen={true}>
          <EducationList />
        </CollapsibleSection>

        <CollapsibleSection title="Volunteer" defaultOpen={true}>
          <VolunteerList />
        </CollapsibleSection>

        <CollapsibleSection title="Awards" defaultOpen={false}>
          <AwardList />
        </CollapsibleSection>

        <CollapsibleSection title="Publications" defaultOpen={false}>
          <PublicationList />
        </CollapsibleSection>

        <CollapsibleSection title="Languages" defaultOpen={false}>
          <LanguageList />
        </CollapsibleSection>

        <CollapsibleSection title="Interests" defaultOpen={false}>
          <InterestList />
        </CollapsibleSection>

        <CollapsibleSection title="References" defaultOpen={false}>
          <ReferenceList />
        </CollapsibleSection>
      </div>
    </div>
  )
}

export default ExperienceTab
