import {
  BuilderJob,
  BuilderProject,
  BuilderSkill,
  BuilderEducation,
  BuilderVolunteer,
  BuilderAward,
  BuilderPublication,
  BuilderLanguage,
  BuilderInterest,
  BuilderReference,
} from '../../../preload/index.d'

interface ProfessionalLayoutProps {
  profile?: { name: string; email: string; phone: string; location: string; linkedin: string; summary?: string }
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects?: BuilderProject[]
  education?: BuilderEducation[]
  volunteer?: BuilderVolunteer[]
  awards?: BuilderAward[]
  publications?: BuilderPublication[]
  languages?: BuilderLanguage[]
  interests?: BuilderInterest[]
  references?: BuilderReference[]
}

function ProfessionalLayout({
  profile,
  jobs,
  skills,
  projects,
  education,
  volunteer,
  awards,
  publications,
  languages,
  interests,
  references,
}: ProfessionalLayoutProps): React.JSX.Element {
  const includedJobs = jobs.filter((j) => !j.excluded)
  const includedSkills = skills.filter((s) => !s.excluded)
  const includedProjects = (projects ?? []).filter((p) => !p.excluded)
  const includedEducation = (education ?? []).filter((e) => !e.excluded)
  const includedVolunteer = (volunteer ?? []).filter((v) => !v.excluded)
  const includedAwards = (awards ?? []).filter((a) => !a.excluded)
  const includedPublications = (publications ?? []).filter((p) => !p.excluded)
  const includedLanguages = (languages ?? []).filter((l) => !l.excluded)
  const includedInterests = (interests ?? []).filter((i) => !i.excluded)
  const includedReferences = (references ?? []).filter((r) => !r.excluded)

  // Group skills by first tag
  const skillGroups = includedSkills.reduce<Record<string, BuilderSkill[]>>((acc, skill) => {
    const groupKey = skill.tags.length > 0 ? skill.tags[0] : 'Other'
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(skill)
    return acc
  }, {})

  const hasProfile =
    profile &&
    (profile.name || profile.email || profile.phone || profile.location || profile.linkedin)

  const contactParts: string[] = []
  if (profile?.email) contactParts.push(profile.email)
  if (profile?.phone) contactParts.push(profile.phone)
  if (profile?.location) contactParts.push(profile.location)
  if (profile?.linkedin) contactParts.push(profile.linkedin)

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#333333',
    borderBottom: '1px solid #cccccc',
    paddingBottom: '3px',
    marginBottom: '10px',
    marginTop: '18px',
  }

  const hasAnyContent =
    includedJobs.length > 0 ||
    Object.keys(skillGroups).length > 0 ||
    includedProjects.length > 0 ||
    includedEducation.length > 0 ||
    includedVolunteer.length > 0 ||
    includedAwards.length > 0 ||
    includedPublications.length > 0 ||
    includedLanguages.length > 0 ||
    includedInterests.length > 0 ||
    includedReferences.length > 0

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        fontFamily: "'Calibri', 'Segoe UI', Arial, sans-serif",
        maxWidth: '8.5in',
        margin: '0 auto',
        padding: '0.5in',
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          borderBottom: '1px solid #cccccc',
          paddingBottom: '12px',
          marginBottom: '4px',
        }}
      >
        {hasProfile ? (
          <>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#1a1a1a',
                marginBottom: '6px',
              }}
            >
              {profile.name || 'Your Name'}
            </div>
            {contactParts.length > 0 && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#555555',
                }}
              >
                {contactParts.join(' | ')}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              fontSize: '13px',
              color: '#888888',
              fontStyle: 'italic',
            }}
          >
            [Profile not set — go to Profile tab]
          </div>
        )}
      </div>

      {/* Summary */}
      {profile?.summary && (
        <section>
          <h2 style={sectionHeadingStyle}>Summary</h2>
          <div style={{ fontSize: '11px', color: '#1a1a1a', lineHeight: '1.6' }}>
            {profile.summary}
          </div>
        </section>
      )}

      {/* Work Experience */}
      {includedJobs.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Work Experience</h2>
          <div>
            {includedJobs.map((job) => {
              const bullets = job.bullets.filter((b) => !b.excluded)
              return (
                <div
                  key={job.id}
                  style={{
                    pageBreakInside: 'avoid',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: '2px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a' }}>
                      {job.role}
                    </span>
                    <span style={{ fontSize: '11px', color: '#666666' }}>
                      {job.startDate} — {job.endDate ?? 'Present'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#666666',
                      marginBottom: '4px',
                    }}
                  >
                    {job.company}
                  </div>
                  {bullets.length > 0 && (
                    <ul
                      style={{
                        listStyleType: 'disc',
                        paddingLeft: '1.2em',
                        margin: 0,
                      }}
                    >
                      {bullets.map((b) => (
                        <li
                          key={b.id}
                          style={{
                            fontSize: '11px',
                            color: '#1a1a1a',
                            lineHeight: '1.5',
                            marginBottom: '2px',
                          }}
                        >
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
          <h2 style={sectionHeadingStyle}>Skills</h2>
          <div>
            {Object.entries(skillGroups).map(([group, groupSkills]) => (
              <div
                key={group}
                style={{
                  fontSize: '11px',
                  marginBottom: '4px',
                  color: '#1a1a1a',
                }}
              >
                <span style={{ fontWeight: 'bold' }}>{group}: </span>
                <span>{groupSkills.map((s) => s.name).join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {includedProjects.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Projects</h2>
          <div>
            {includedProjects.map((project) => {
              const bullets = project.bullets.filter((b) => !b.excluded)
              return (
                <div
                  key={project.id}
                  style={{
                    pageBreakInside: 'avoid',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#1a1a1a',
                      marginBottom: '4px',
                    }}
                  >
                    {project.name}
                  </div>
                  {bullets.length > 0 && (
                    <ul
                      style={{
                        listStyleType: 'disc',
                        paddingLeft: '1.2em',
                        margin: 0,
                      }}
                    >
                      {bullets.map((b) => (
                        <li
                          key={b.id}
                          style={{
                            fontSize: '11px',
                            color: '#1a1a1a',
                            lineHeight: '1.5',
                            marginBottom: '2px',
                          }}
                        >
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

      {/* Education */}
      {includedEducation.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Education</h2>
          <div>
            {includedEducation.map((edu) => (
              <div
                key={edu.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '14px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '2px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {edu.studyType && edu.area
                      ? `${edu.studyType} in ${edu.area}`
                      : edu.studyType || edu.area || edu.institution}
                    {edu.studyType || edu.area ? ` — ${edu.institution}` : ''}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666666' }}>
                    {edu.startDate}{edu.startDate ? ' — ' : ''}{edu.endDate || 'Present'}
                  </span>
                </div>
                {edu.score && (
                  <div style={{ fontSize: '11px', color: '#666666', marginBottom: '2px' }}>
                    Score: {edu.score}
                  </div>
                )}
                {edu.courses.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#666666' }}>
                    Courses: {edu.courses.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Volunteer Experience */}
      {includedVolunteer.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Volunteer Experience</h2>
          <div>
            {includedVolunteer.map((vol) => (
              <div
                key={vol.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '14px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '2px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {vol.position}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666666' }}>
                    {vol.startDate}{vol.startDate ? ' — ' : ''}{vol.endDate || 'Present'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#666666', marginBottom: '4px' }}>
                  {vol.organization}
                </div>
                {vol.summary && (
                  <div style={{ fontSize: '11px', color: '#1a1a1a', marginBottom: '4px' }}>
                    {vol.summary}
                  </div>
                )}
                {vol.highlights.length > 0 && (
                  <ul style={{ listStyleType: 'disc', paddingLeft: '1.2em', margin: 0 }}>
                    {vol.highlights.map((h, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '11px', color: '#1a1a1a', lineHeight: '1.5', marginBottom: '2px' }}
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {includedAwards.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Awards</h2>
          <div>
            {includedAwards.map((award) => (
              <div
                key={award.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '12px', color: '#1a1a1a', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>{award.title}</span>
                  {award.awarder && (
                    <span style={{ color: '#666666' }}> — {award.awarder}</span>
                  )}
                  {award.date && (
                    <span style={{ color: '#666666' }}> ({award.date})</span>
                  )}
                </div>
                {award.summary && (
                  <div style={{ fontSize: '11px', color: '#555555' }}>{award.summary}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Publications */}
      {includedPublications.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Publications</h2>
          <div>
            {includedPublications.map((pub) => (
              <div
                key={pub.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '12px', color: '#1a1a1a', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>{pub.name}</span>
                  {pub.publisher && (
                    <span style={{ color: '#666666' }}> — {pub.publisher}</span>
                  )}
                  {pub.releaseDate && (
                    <span style={{ color: '#666666' }}> ({pub.releaseDate})</span>
                  )}
                </div>
                {pub.url && (
                  <div style={{ fontSize: '11px', color: '#555555', marginBottom: '2px' }}>
                    {pub.url}
                  </div>
                )}
                {pub.summary && (
                  <div style={{ fontSize: '11px', color: '#555555' }}>{pub.summary}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Languages */}
      {includedLanguages.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Languages</h2>
          <div style={{ fontSize: '11px', color: '#1a1a1a' }}>
            {includedLanguages
              .map((l) => `${l.language}${l.fluency ? ` (${l.fluency})` : ''}`)
              .join(', ')}
          </div>
        </section>
      )}

      {/* Interests */}
      {includedInterests.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Interests</h2>
          <div>
            {includedInterests.map((interest) => (
              <div
                key={interest.id}
                style={{ fontSize: '11px', color: '#1a1a1a', marginBottom: '4px' }}
              >
                <span style={{ fontWeight: 'bold' }}>{interest.name}</span>
                {interest.keywords.length > 0 && (
                  <span>: {interest.keywords.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* References */}
      {includedReferences.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>References</h2>
          <div>
            {includedReferences.map((ref) => (
              <div
                key={ref.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '2px' }}>
                  {ref.name}
                </div>
                {ref.reference && (
                  <div style={{ fontSize: '11px', color: '#555555' }}>{ref.reference}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasAnyContent && (
        <p
          style={{
            fontSize: '12px',
            color: '#888888',
            textAlign: 'center',
            padding: '48px 0',
          }}
        >
          No items included. Toggle items in the Builder tab.
        </p>
      )}
    </div>
  )
}

export default ProfessionalLayout
