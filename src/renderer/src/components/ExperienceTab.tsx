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
import ImportConfirmModal from './ImportConfirmModal'
import { useToast } from './Toast'

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

interface ImportData {
  counts: Record<string, number>
  data: unknown
  hasProfile: boolean
}

const sectionLabels: Record<string, string> = {
  jobs: 'jobs',
  skills: 'skills',
  projects: 'projects',
  education: 'education entries',
  volunteer: 'volunteer entries',
  awards: 'awards',
  publications: 'publications',
  languages: 'languages',
  interests: 'interests',
  references: 'references',
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .filter(([key, val]) => val > 0 && key !== 'hasProfile')
    .map(([key, val]) => `${val} ${sectionLabels[key] ?? key}`)
    .join(', ')
}

function ExperienceTab(): React.JSX.Element {
  const { showToast } = useToast()
  const [importData, setImportData] = useState<ImportData | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleImportClick = async (): Promise<void> => {
    const result = await window.api.import_.parse()
    if (result.canceled) return
    if (result.error) {
      showToast(result.error)
      return
    }
    setImportData({
      counts: result.counts as Record<string, number>,
      data: result.data,
      hasProfile: !!(result.counts as Record<string, number>).hasProfile,
    })
  }

  const handleImportConfirm = async (): Promise<void> => {
    if (!importData) return
    setImportLoading(true)
    try {
      await window.api.import_.confirmReplace(importData.data)
      showToast(`Imported: ${formatCounts(importData.counts)}`)
      setImportData(null)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      showToast('Import failed: ' + (err as Error).message)
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className="overflow-y-auto h-[calc(100vh-48px)]">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Header with Import button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <button
            onClick={handleImportClick}
            className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium rounded-md transition-colors"
          >
            Import from resume.json
          </button>
        </div>

        <CollapsibleSection title="Profile" defaultOpen={false}>
          <ProfileSettings key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Work History" defaultOpen={true}>
          <JobList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Skills" defaultOpen={true}>
          <SkillList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Projects" defaultOpen={true}>
          <ProjectList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Education" defaultOpen={true}>
          <EducationList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Volunteer" defaultOpen={true}>
          <VolunteerList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Awards" defaultOpen={false}>
          <AwardList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Publications" defaultOpen={false}>
          <PublicationList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Languages" defaultOpen={false}>
          <LanguageList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Interests" defaultOpen={false}>
          <InterestList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="References" defaultOpen={false}>
          <ReferenceList key={refreshKey} />
        </CollapsibleSection>
      </div>

      {importData && (
        <ImportConfirmModal
          counts={importData.counts}
          hasProfile={importData.hasProfile}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportData(null)}
          loading={importLoading}
        />
      )}
    </div>
  )
}

export default ExperienceTab
