import { BuilderJob, BuilderProject, BuilderSkill } from '../../../preload/index.d'

interface ProfessionalLayoutProps {
  profile?: { name: string; email: string; phone: string; location: string; linkedin: string }
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects?: BuilderProject[]
}

function ProfessionalLayout({ profile, jobs, skills, projects }: ProfessionalLayoutProps): React.JSX.Element {
  const includedJobs = jobs.filter((j) => !j.excluded)
  const includedSkills = skills.filter((s) => !s.excluded)
  const includedProjects = (projects ?? []).filter((p) => !p.excluded)

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

      {includedJobs.length === 0 && Object.keys(skillGroups).length === 0 && includedProjects.length === 0 && (
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
