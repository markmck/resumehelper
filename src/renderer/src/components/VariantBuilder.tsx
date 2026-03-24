import { useEffect, useState } from 'react'
import {
  BuilderData,
  BuilderSkill,
  BuilderEducation,
  BuilderVolunteer,
  BuilderAward,
  BuilderPublication,
  BuilderLanguage,
  BuilderInterest,
  BuilderReference,
} from '../../../preload/index.d'

interface VariantBuilderProps {
  variantId: number
  onToggle?: () => void
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 'var(--space-3)',
}

const cbStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  accentColor: 'var(--color-accent)',
  cursor: 'pointer',
  flexShrink: 0,
}

const cbSmallStyle: React.CSSProperties = {
  ...cbStyle,
  width: 14,
  height: 14,
  marginTop: 3,
}

const toggleTextStyle = (excluded: boolean): React.CSSProperties => ({
  fontSize: 'var(--font-size-sm)',
  lineHeight: 1.5,
  color: excluded ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
  textDecoration: excluded ? 'line-through' : 'none',
})

const toggleHeaderStyle = (excluded: boolean): React.CSSProperties => ({
  fontSize: 'var(--font-size-base)',
  fontWeight: 500,
  color: excluded ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
  textDecoration: excluded ? 'line-through' : 'none',
})

const companyStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-tertiary)',
}

function VariantBuilder({ variantId, onToggle }: VariantBuilderProps): React.JSX.Element {
  const [builderData, setBuilderData] = useState<BuilderData | null>(null)
  const [summaryIncluded, setSummaryIncluded] = useState(true)
  const [profileSummary, setProfileSummary] = useState('')

  useEffect(() => {
    setBuilderData(null)
    window.api.templates.getBuilderData(variantId).then(setBuilderData)
    window.api.profile.get().then((p) => setProfileSummary(p.summary ?? ''))
  }, [variantId])

  const handleBulletToggle = async (jobId: number, bulletId: number, currentExcluded: boolean): Promise<void> => {
    const newExcluded = !currentExcluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, jobs: prev.jobs.map((j) => j.id === jobId ? { ...j, bullets: j.bullets.map((b) => b.id === bulletId ? { ...b, excluded: newExcluded } : b) } : j) }
    })
    await window.api.templates.setItemExcluded(variantId, 'bullet', bulletId, newExcluded)
    onToggle?.()
  }

  const handleSkillToggle = async (skill: BuilderSkill): Promise<void> => {
    const newExcluded = !skill.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, skills: prev.skills.map((s) => s.id === skill.id ? { ...s, excluded: newExcluded } : s) }
    })
    await window.api.templates.setItemExcluded(variantId, 'skill', skill.id, newExcluded)
    onToggle?.()
  }

  const handleProjectBulletToggle = async (projectId: number, bulletId: number, currentExcluded: boolean): Promise<void> => {
    const newExcluded = !currentExcluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, projects: prev.projects.map((p) => p.id === projectId ? { ...p, bullets: p.bullets.map((b) => b.id === bulletId ? { ...b, excluded: newExcluded } : b) } : p) }
    })
    await window.api.templates.setItemExcluded(variantId, 'projectBullet', bulletId, newExcluded)
    onToggle?.()
  }

  const handleEducationToggle = async (edu: BuilderEducation): Promise<void> => {
    const newExcluded = !edu.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, education: (prev.education ?? []).map((e) => e.id === edu.id ? { ...e, excluded: newExcluded } : e) }
    })
    await window.api.templates.setItemExcluded(variantId, 'education', edu.id, newExcluded)
    onToggle?.()
  }

  const handleVolunteerToggle = async (vol: BuilderVolunteer): Promise<void> => {
    const newExcluded = !vol.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, volunteer: (prev.volunteer ?? []).map((v) => v.id === vol.id ? { ...v, excluded: newExcluded } : v) }
    })
    await window.api.templates.setItemExcluded(variantId, 'volunteer', vol.id, newExcluded)
    onToggle?.()
  }

  const handleAwardToggle = async (award: BuilderAward): Promise<void> => {
    const newExcluded = !award.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, awards: (prev.awards ?? []).map((a) => a.id === award.id ? { ...a, excluded: newExcluded } : a) }
    })
    await window.api.templates.setItemExcluded(variantId, 'award', award.id, newExcluded)
    onToggle?.()
  }

  const handlePublicationToggle = async (pub: BuilderPublication): Promise<void> => {
    const newExcluded = !pub.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, publications: (prev.publications ?? []).map((p) => p.id === pub.id ? { ...p, excluded: newExcluded } : p) }
    })
    await window.api.templates.setItemExcluded(variantId, 'publication', pub.id, newExcluded)
    onToggle?.()
  }

  const handleLanguageToggle = async (lang: BuilderLanguage): Promise<void> => {
    const newExcluded = !lang.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, languages: (prev.languages ?? []).map((l) => l.id === lang.id ? { ...l, excluded: newExcluded } : l) }
    })
    await window.api.templates.setItemExcluded(variantId, 'language', lang.id, newExcluded)
    onToggle?.()
  }

  const handleInterestToggle = async (interest: BuilderInterest): Promise<void> => {
    const newExcluded = !interest.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, interests: (prev.interests ?? []).map((i) => i.id === interest.id ? { ...i, excluded: newExcluded } : i) }
    })
    await window.api.templates.setItemExcluded(variantId, 'interest', interest.id, newExcluded)
    onToggle?.()
  }

  const handleReferenceToggle = async (ref: BuilderReference): Promise<void> => {
    const newExcluded = !ref.excluded
    setBuilderData((prev) => {
      if (!prev) return prev
      return { ...prev, references: (prev.references ?? []).map((r) => r.id === ref.id ? { ...r, excluded: newExcluded } : r) }
    })
    await window.api.templates.setItemExcluded(variantId, 'reference', ref.id, newExcluded)
    onToggle?.()
  }

  if (!builderData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
        Loading...
      </div>
    )
  }

  const skillGroups = builderData.skills.reduce<Record<string, BuilderSkill[]>>((acc, skill) => {
    const groupKey = skill.tags.length > 0 ? skill.tags[0] : 'Other'
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(skill)
    return acc
  }, {})

  const educationList = builderData.education ?? []
  const volunteerList = builderData.volunteer ?? []
  const awardsList = builderData.awards ?? []
  const publicationsList = builderData.publications ?? []
  const languagesList = builderData.languages ?? []
  const interestsList = builderData.interests ?? []
  const referencesList = builderData.references ?? []

  const renderEntityToggle = (
    id: number,
    label: string,
    excluded: boolean,
    onToggle: () => void,
  ): React.JSX.Element => (
    <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', padding: '6px 0' }}>
      <input type="checkbox" checked={!excluded} onChange={onToggle} style={cbStyle} />
      <span style={toggleHeaderStyle(excluded)}>{label}</span>
    </label>
  )

  return (
    <div style={{ overflow: 'auto', height: '100%', padding: 'var(--space-5)' }}>
      {/* Summary toggle */}
      {profileSummary && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Summary</div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}>
            <input type="checkbox" checked={summaryIncluded} onChange={() => setSummaryIncluded(!summaryIncluded)} style={{ ...cbStyle, marginTop: 3 }} />
            <span style={toggleTextStyle(!summaryIncluded)}>{profileSummary}</span>
          </label>
          <div style={{ height: 1, backgroundColor: 'var(--color-border-subtle)', marginTop: 'var(--space-5)' }} />
        </div>
      )}

      {/* Work History */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={sectionTitleStyle}>Work History</div>
        {builderData.jobs.length === 0 ? (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No jobs yet. Add jobs in the Experience tab.</p>
        ) : (
          builderData.jobs.map((job) => (
            <div key={job.id} style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px 0', marginBottom: 'var(--space-2)' }}>
                <span style={toggleHeaderStyle(job.excluded)}>{job.company}</span>
                <span style={companyStyle}>{job.role}</span>
              </div>
              {job.bullets.map((bullet) => (
                <div key={bullet.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: '6px 0' }}>
                  <input
                    type="checkbox"
                    checked={!bullet.excluded}
                    disabled={job.excluded}
                    onChange={() => !job.excluded && handleBulletToggle(job.id, bullet.id, bullet.excluded)}
                    style={{ ...cbSmallStyle, cursor: job.excluded ? 'not-allowed' : 'pointer', opacity: job.excluded ? 0.4 : 1 }}
                  />
                  <span style={{ ...toggleTextStyle(job.excluded || bullet.excluded), fontSize: 'var(--font-size-sm)' }}>
                    {bullet.text}
                  </span>
                </div>
              ))}
              <div style={{ height: 1, backgroundColor: 'var(--color-border-subtle)', marginTop: 'var(--space-1)' }} />
            </div>
          ))
        )}
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={sectionTitleStyle}>Skills</div>
        {builderData.skills.length === 0 ? (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>No skills yet.</p>
        ) : (
          Object.entries(skillGroups).map(([groupName, skills]) => (
            <div key={groupName} style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                {groupName}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 var(--space-4)' }}>
                {skills.map((skill) => (
                  <label key={skill.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer', marginBottom: 6 }}>
                    <input type="checkbox" checked={!skill.excluded} onChange={() => handleSkillToggle(skill)} style={cbSmallStyle} />
                    <span style={{ fontSize: 'var(--font-size-sm)', color: skill.excluded ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>{skill.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Projects */}
      {builderData.projects.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Projects</div>
          {builderData.projects.map((project) => (
            <div key={project.id} style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px 0', marginBottom: 'var(--space-2)' }}>
                <span style={toggleHeaderStyle(project.excluded)}>{project.name}</span>
              </div>
              {project.bullets.map((bullet) => (
                <div key={bullet.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: '6px 0' }}>
                  <input
                    type="checkbox"
                    checked={!bullet.excluded}
                    disabled={project.excluded}
                    onChange={() => !project.excluded && handleProjectBulletToggle(project.id, bullet.id, bullet.excluded)}
                    style={{ ...cbSmallStyle, cursor: project.excluded ? 'not-allowed' : 'pointer', opacity: project.excluded ? 0.4 : 1 }}
                  />
                  <span style={{ ...toggleTextStyle(project.excluded || bullet.excluded), fontSize: 'var(--font-size-sm)' }}>
                    {bullet.text}
                  </span>
                </div>
              ))}
              <div style={{ height: 1, backgroundColor: 'var(--color-border-subtle)', marginTop: 'var(--space-1)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {educationList.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Education</div>
          {educationList.map((edu) => renderEntityToggle(edu.id, `${edu.institution}${edu.area ? ` — ${edu.area}` : ''}${edu.studyType ? ` (${edu.studyType})` : ''}`, edu.excluded, () => handleEducationToggle(edu)))}
        </div>
      )}

      {/* Volunteer */}
      {volunteerList.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Volunteer</div>
          {volunteerList.map((vol) => renderEntityToggle(vol.id, `${vol.organization}${vol.position ? ` — ${vol.position}` : ''}`, vol.excluded, () => handleVolunteerToggle(vol)))}
        </div>
      )}

      {/* Awards */}
      {awardsList.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Awards</div>
          {awardsList.map((award) => renderEntityToggle(award.id, `${award.title}${award.awarder ? ` — ${award.awarder}` : ''}`, award.excluded, () => handleAwardToggle(award)))}
        </div>
      )}

      {/* Publications */}
      {publicationsList.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Publications</div>
          {publicationsList.map((pub) => renderEntityToggle(pub.id, `${pub.name}${pub.publisher ? ` — ${pub.publisher}` : ''}`, pub.excluded, () => handlePublicationToggle(pub)))}
        </div>
      )}

      {/* Languages */}
      {languagesList.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Languages</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 var(--space-4)' }}>
            {languagesList.map((lang) => (
              <label key={lang.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer', marginBottom: 6 }}>
                <input type="checkbox" checked={!lang.excluded} onChange={() => handleLanguageToggle(lang)} style={cbSmallStyle} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: lang.excluded ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>
                  {lang.language}{lang.fluency ? ` (${lang.fluency})` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {interestsList.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>Interests</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 var(--space-4)' }}>
            {interestsList.map((interest) => (
              <label key={interest.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', cursor: 'pointer', marginBottom: 6 }}>
                <input type="checkbox" checked={!interest.excluded} onChange={() => handleInterestToggle(interest)} style={cbSmallStyle} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: interest.excluded ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>{interest.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* References */}
      {referencesList.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={sectionTitleStyle}>References</div>
          {referencesList.map((ref) => renderEntityToggle(ref.id, ref.name, ref.excluded, () => handleReferenceToggle(ref)))}
        </div>
      )}
    </div>
  )
}

export default VariantBuilder
