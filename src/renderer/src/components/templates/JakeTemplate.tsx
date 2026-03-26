import { ResumeTemplateProps, TEMPLATE_DEFAULTS } from './types'
import { filterResumeData } from './filterResumeData'

export default function JakeTemplate({
  profile,
  accentColor = '#333333',
  skillsDisplay = 'grouped',
  showSummary = false,
  marginTop,
  marginBottom,
  marginSides,
  ...props
}: ResumeTemplateProps): React.JSX.Element {
  const defaults = TEMPLATE_DEFAULTS['jake']
  const pt = (marginTop ?? defaults.top) * 96
  const pb = (marginBottom ?? defaults.bottom) * 96
  const ps = (marginSides ?? defaults.sides) * 96
  const {
    includedJobs,
    includedSkills,
    includedProjects,
    includedEducation,
    includedVolunteer,
    includedAwards,
    includedPublications,
    includedLanguages,
    includedInterests,
    includedReferences,
    skillGroups,
  } = filterResumeData({ profile, accentColor, skillsDisplay, showSummary, ...props })

  const hasProfile =
    profile &&
    (profile.name || profile.email || profile.phone || profile.location || profile.linkedin)

  const hasAnyContent =
    includedJobs.length > 0 ||
    includedSkills.length > 0 ||
    includedProjects.length > 0 ||
    includedEducation.length > 0 ||
    includedVolunteer.length > 0 ||
    includedAwards.length > 0 ||
    includedPublications.length > 0 ||
    includedLanguages.length > 0 ||
    includedInterests.length > 0 ||
    includedReferences.length > 0

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#1a1a1a',
    borderBottom: '1px solid #333333',
    marginTop: '10px',
    marginBottom: '6px',
    paddingBottom: '2px',
  }

  const contactParts: string[] = []
  if (profile?.email) contactParts.push(profile.email)
  if (profile?.phone) contactParts.push(profile.phone)
  if (profile?.location) contactParts.push(profile.location)
  if (profile?.linkedin) contactParts.push(profile.linkedin)

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        fontFamily: "'Lato', 'Helvetica', Arial, sans-serif",
        fontSize: '10px',
        lineHeight: '1.15',
        maxWidth: '8.5in',
        margin: '0 auto',
        padding: `${pt}px ${ps}px ${pb}px ${ps}px`,
      }}
    >
      {/* Header */}
      {hasProfile ? (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#1a1a1a',
              marginBottom: '4px',
            }}
          >
            {profile.name || 'Your Name'}
          </div>
          {contactParts.length > 0 && (
            <div style={{ fontSize: '9px', color: '#333333' }}>
              {contactParts.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: '#999999' }}> {'\u25C6'} </span>}
                  <span>{part}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            fontSize: '13px',
            color: '#888888',
            fontStyle: 'italic',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          [Profile not set — go to Profile tab]
        </div>
      )}

      {/* Summary */}
      {showSummary && profile?.summary && (
        <section>
          <h2 style={sectionHeadingStyle}>Summary</h2>
          <div style={{ fontSize: '10px', lineHeight: '1.15', color: '#1a1a1a', marginBottom: '6px' }}>
            {profile.summary}
          </div>
        </section>
      )}

      {/* Work Experience */}
      {includedJobs.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Work Experience</h2>
          <div>
            {includedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  pageBreakInside: 'avoid',
                  marginBottom: '6px',
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
                  <span>
                    <strong>{job.company}</strong>
                    {' \u2014 '}
                    <em>{job.role}</em>
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#666666',
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                    }}
                  >
                    {job.startDate} — {job.endDate ?? 'Present'}
                  </span>
                </div>
                {job.bullets.length > 0 && (
                  <ul
                    style={{
                      listStyleType: 'disc',
                      paddingLeft: '1.2em',
                      margin: 0,
                    }}
                  >
                    {job.bullets.map((b) => (
                      <li
                        key={b.id}
                        style={{
                          fontSize: '10px',
                          color: '#1a1a1a',
                          lineHeight: '1.15',
                          marginBottom: '1px',
                        }}
                      >
                        {b.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {(skillsDisplay === 'inline' ? includedSkills.length > 0 : Object.keys(skillGroups).length > 0) && (
        <section>
          <h2 style={sectionHeadingStyle}>Skills</h2>
          <div>
            {skillsDisplay === 'inline' ? (
              <div style={{ fontSize: '10px', color: '#1a1a1a', marginBottom: '2px' }}>
                {includedSkills.map((s) => s.name).join(', ')}
              </div>
            ) : (
              Object.entries(skillGroups).map(([group, groupSkills]) => (
                <div
                  key={group}
                  style={{ fontSize: '10px', marginBottom: '2px', color: '#1a1a1a' }}
                >
                  <span style={{ fontWeight: 'bold' }}>{group}: </span>
                  <span>{groupSkills.map((s) => s.name).join(', ')}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Projects */}
      {includedProjects.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Projects</h2>
          <div>
            {includedProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  pageBreakInside: 'avoid',
                  marginBottom: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: '#1a1a1a',
                    marginBottom: '2px',
                  }}
                >
                  {project.name}
                </div>
                {project.bullets.length > 0 && (
                  <ul
                    style={{
                      listStyleType: 'disc',
                      paddingLeft: '1.2em',
                      margin: 0,
                    }}
                  >
                    {project.bullets.map((b) => (
                      <li
                        key={b.id}
                        style={{
                          fontSize: '10px',
                          color: '#1a1a1a',
                          lineHeight: '1.15',
                          marginBottom: '1px',
                        }}
                      >
                        {b.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
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
                style={{ pageBreakInside: 'avoid', marginBottom: '6px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '2px',
                  }}
                >
                  <span>
                    <strong>
                      {edu.studyType && edu.area
                        ? `${edu.studyType} in ${edu.area}`
                        : edu.studyType || edu.area || edu.institution}
                      {edu.studyType || edu.area ? ` — ${edu.institution}` : ''}
                    </strong>
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#666666',
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                    }}
                  >
                    {edu.startDate}{edu.startDate ? ' — ' : ''}{edu.endDate || 'Present'}
                  </span>
                </div>
                {edu.score && (
                  <div style={{ fontSize: '10px', color: '#666666', marginBottom: '1px' }}>
                    Score: {edu.score}
                  </div>
                )}
                {edu.courses.length > 0 && (
                  <div style={{ fontSize: '10px', color: '#666666' }}>
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
                style={{ pageBreakInside: 'avoid', marginBottom: '6px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '2px',
                  }}
                >
                  <span>
                    <strong>{vol.organization}</strong>
                    {' \u2014 '}
                    <em>{vol.position}</em>
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#666666',
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                    }}
                  >
                    {vol.startDate}{vol.startDate ? ' — ' : ''}{vol.endDate || 'Present'}
                  </span>
                </div>
                {vol.summary && (
                  <div style={{ fontSize: '10px', color: '#1a1a1a', marginBottom: '1px' }}>
                    {vol.summary}
                  </div>
                )}
                {vol.highlights.length > 0 && (
                  <ul style={{ listStyleType: 'disc', paddingLeft: '1.2em', margin: 0 }}>
                    {vol.highlights.map((h, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '10px', color: '#1a1a1a', lineHeight: '1.15', marginBottom: '1px' }}
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
                style={{ pageBreakInside: 'avoid', marginBottom: '6px' }}
              >
                <div style={{ fontSize: '10px', color: '#1a1a1a', marginBottom: '1px' }}>
                  <span style={{ fontWeight: 'bold' }}>{award.title}</span>
                  {award.awarder && (
                    <span style={{ color: '#666666' }}> — {award.awarder}</span>
                  )}
                  {award.date && (
                    <span style={{ color: '#666666' }}> ({award.date})</span>
                  )}
                </div>
                {award.summary && (
                  <div style={{ fontSize: '10px', color: '#555555' }}>{award.summary}</div>
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
                style={{ pageBreakInside: 'avoid', marginBottom: '6px' }}
              >
                <div style={{ fontSize: '10px', color: '#1a1a1a', marginBottom: '1px' }}>
                  <span style={{ fontWeight: 'bold' }}>{pub.name}</span>
                  {pub.publisher && (
                    <span style={{ color: '#666666' }}> — {pub.publisher}</span>
                  )}
                  {pub.releaseDate && (
                    <span style={{ color: '#666666' }}> ({pub.releaseDate})</span>
                  )}
                </div>
                {pub.url && (
                  <div style={{ fontSize: '10px', color: '#555555', marginBottom: '1px' }}>
                    {pub.url}
                  </div>
                )}
                {pub.summary && (
                  <div style={{ fontSize: '10px', color: '#555555' }}>{pub.summary}</div>
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
          <div style={{ fontSize: '10px', color: '#1a1a1a' }}>
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
                style={{ fontSize: '10px', color: '#1a1a1a', marginBottom: '2px' }}
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
                style={{ pageBreakInside: 'avoid', marginBottom: '6px' }}
              >
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '1px' }}>
                  {ref.name}
                </div>
                {ref.reference && (
                  <div style={{ fontSize: '10px', color: '#555555' }}>{ref.reference}</div>
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
