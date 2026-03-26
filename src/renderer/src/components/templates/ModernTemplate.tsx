import { ResumeTemplateProps, TEMPLATE_DEFAULTS } from './types'
import { filterResumeData } from './filterResumeData'

export default function ModernTemplate({
  profile,
  accentColor = '#2563EB',
  skillsDisplay = 'inline',
  showSummary = false,
  marginTop,
  marginBottom,
  marginSides,
  ...props
}: ResumeTemplateProps): React.JSX.Element {
  const defaults = TEMPLATE_DEFAULTS['modern']
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
    letterSpacing: '0.08em',
    color: '#1a1a1a',
    marginBottom: '0',
    marginTop: '18px',
    paddingBottom: '0',
    border: 'none',
  }

  const contactParts: Array<{ text: string; isLink: boolean }> = []
  if (profile?.email) contactParts.push({ text: profile.email, isLink: true })
  if (profile?.phone) contactParts.push({ text: profile.phone, isLink: false })
  if (profile?.location) contactParts.push({ text: profile.location, isLink: false })
  if (profile?.linkedin) contactParts.push({ text: profile.linkedin, isLink: true })

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        fontFamily: "Calibri, 'Helvetica Neue', Arial, sans-serif",
        fontSize: '10.5px',
        lineHeight: '1.25',
        maxWidth: '8.5in',
        margin: '0 auto',
        padding: `${pt}px ${ps}px ${pb}px ${ps}px`,
      }}
    >
      {/* Header */}
      {hasProfile ? (
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '6px',
            }}
          >
            {profile.name || 'Your Name'}
          </div>
          {contactParts.length > 0 && (
            <div style={{ fontSize: '10px', color: '#333333' }}>
              {contactParts.map((part, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: '#999999' }}> | </span>}
                  <span style={part.isLink ? { color: accentColor } : {}}>
                    {part.text}
                  </span>
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
            marginBottom: '14px',
          }}
        >
          [Profile not set — go to Profile tab]
        </div>
      )}

      {/* Summary */}
      {showSummary && profile?.summary && (
        <div>
          <h2 style={sectionHeadingStyle}>Summary</h2>
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '8px',
            }}
          />
          <div style={{ fontSize: '10.5px', lineHeight: '1.25', color: '#1a1a1a' }}>
            {profile.summary}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {includedJobs.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Work Experience</h2>
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div>
            {includedJobs.map((job) => (
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
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {job.company}
                  </span>
                  <span style={{ fontSize: '10px', color: '#666666', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {job.startDate} — {job.endDate ?? 'Present'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: accentColor,
                    marginBottom: '4px',
                  }}
                >
                  {job.role}
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
                          fontSize: '10.5px',
                          color: '#1a1a1a',
                          lineHeight: '1.25',
                          marginBottom: '2px',
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div>
            {skillsDisplay === 'inline' ? (
              Object.entries(skillGroups).map(([group, groupSkills]) => (
                <div
                  key={group}
                  style={{ fontSize: '10.5px', marginBottom: '4px', color: '#1a1a1a' }}
                >
                  <span style={{ fontWeight: '600', color: accentColor }}>{group}: </span>
                  <span>{groupSkills.map((s) => s.name).join(', ')}</span>
                </div>
              ))
            ) : (
              Object.entries(skillGroups).map(([group, groupSkills]) => (
                <div
                  key={group}
                  style={{ fontSize: '10.5px', marginBottom: '4px', color: '#1a1a1a' }}
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div>
            {includedProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  pageBreakInside: 'avoid',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#1a1a1a',
                    marginBottom: '4px',
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
                          fontSize: '10.5px',
                          color: '#1a1a1a',
                          lineHeight: '1.25',
                          marginBottom: '2px',
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
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
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {edu.studyType && edu.area
                      ? `${edu.studyType} in ${edu.area}`
                      : edu.studyType || edu.area || edu.institution}
                    {edu.studyType || edu.area ? ` — ${edu.institution}` : ''}
                  </span>
                  <span style={{ fontSize: '10px', color: '#666666', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {edu.startDate}{edu.startDate ? ' — ' : ''}{edu.endDate || 'Present'}
                  </span>
                </div>
                {edu.score && (
                  <div style={{ fontSize: '10.5px', color: '#666666', marginBottom: '2px' }}>
                    Score: {edu.score}
                  </div>
                )}
                {edu.courses.length > 0 && (
                  <div style={{ fontSize: '10.5px', color: '#666666' }}>
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
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
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {vol.position}
                  </span>
                  <span style={{ fontSize: '10px', color: '#666666', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {vol.startDate}{vol.startDate ? ' — ' : ''}{vol.endDate || 'Present'}
                  </span>
                </div>
                <div style={{ fontSize: '10.5px', color: accentColor, marginBottom: '4px' }}>
                  {vol.organization}
                </div>
                {vol.summary && (
                  <div style={{ fontSize: '10.5px', color: '#1a1a1a', marginBottom: '4px' }}>
                    {vol.summary}
                  </div>
                )}
                {vol.highlights.length > 0 && (
                  <ul style={{ listStyleType: 'disc', paddingLeft: '1.2em', margin: 0 }}>
                    {vol.highlights.map((h, i) => (
                      <li
                        key={i}
                        style={{ fontSize: '10.5px', color: '#1a1a1a', lineHeight: '1.25', marginBottom: '2px' }}
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div>
            {includedAwards.map((award) => (
              <div
                key={award.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '11px', color: '#1a1a1a', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>{award.title}</span>
                  {award.awarder && (
                    <span style={{ color: '#666666' }}> — {award.awarder}</span>
                  )}
                  {award.date && (
                    <span style={{ color: '#666666' }}> ({award.date})</span>
                  )}
                </div>
                {award.summary && (
                  <div style={{ fontSize: '10.5px', color: '#555555' }}>{award.summary}</div>
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div>
            {includedPublications.map((pub) => (
              <div
                key={pub.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '11px', color: '#1a1a1a', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>{pub.name}</span>
                  {pub.publisher && (
                    <span style={{ color: '#666666' }}> — {pub.publisher}</span>
                  )}
                  {pub.releaseDate && (
                    <span style={{ color: '#666666' }}> ({pub.releaseDate})</span>
                  )}
                </div>
                {pub.url && (
                  <div style={{ fontSize: '10.5px', color: accentColor, marginBottom: '2px' }}>
                    {pub.url}
                  </div>
                )}
                {pub.summary && (
                  <div style={{ fontSize: '10.5px', color: '#555555' }}>{pub.summary}</div>
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div style={{ fontSize: '10.5px', color: '#1a1a1a' }}>
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div>
            {includedInterests.map((interest) => (
              <div
                key={interest.id}
                style={{ fontSize: '10.5px', color: '#1a1a1a', marginBottom: '4px' }}
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
          <div
            style={{
              width: '40px',
              height: '2px',
              backgroundColor: accentColor,
              marginTop: '3px',
              marginBottom: '10px',
            }}
          />
          <div>
            {includedReferences.map((ref) => (
              <div
                key={ref.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '2px' }}>
                  {ref.name}
                </div>
                {ref.reference && (
                  <div style={{ fontSize: '10.5px', color: '#555555' }}>{ref.reference}</div>
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
