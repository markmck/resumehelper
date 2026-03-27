import { useState } from 'react'
import JobList from './JobList'
import SkillChipGrid from './SkillChipGrid'
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
  badge?: string
}

function CollapsibleSection({ title, defaultOpen, children, badge }: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section style={{ marginBottom: 'var(--space-12)' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'var(--font-sans)',
          marginBottom: open ? 'var(--space-4)' : '0',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
      >
        <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>&#9654;</span>
        {title}
        {badge && (
          <span style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-bg-raised)',
            borderRadius: 'var(--radius-sm)',
            padding: '1px 6px',
            marginLeft: 'var(--space-1)',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}>
            {badge}
          </span>
        )}
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
    <div style={{ overflow: 'auto', height: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-10)' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Experience</h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={handleImportClick}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-secondary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-base)',
                cursor: 'pointer',
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Import JSON
            </button>
          </div>
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', marginTop: 0 }}>
          Your complete work history. Toggle sections open to edit. Drag to reorder.
        </p>

        <CollapsibleSection title="Profile" defaultOpen={false}>
          <ProfileSettings key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Work History" defaultOpen={true}>
          <JobList key={refreshKey} />
        </CollapsibleSection>

        <section style={{ marginBottom: 'var(--space-12)' }}>
          <SkillChipGrid key={refreshKey} />
        </section>

        <CollapsibleSection title="Projects" defaultOpen={false}>
          <ProjectList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Education" defaultOpen={false}>
          <EducationList key={refreshKey} />
        </CollapsibleSection>

        <CollapsibleSection title="Volunteer" defaultOpen={false}>
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
