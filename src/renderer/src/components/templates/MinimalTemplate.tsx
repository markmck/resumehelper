import { ResumeTemplateProps, TEMPLATE_DEFAULTS } from './types'
import { filterResumeData } from './filterResumeData'

export default function MinimalTemplate({
  profile,
  accentColor = '#333333',
  skillsDisplay = 'inline',
  showSummary = false,
  marginTop,
  marginBottom,
  marginSides,
  ...props
}: ResumeTemplateProps): React.JSX.Element {
  const defaults = TEMPLATE_DEFAULTS['minimal']
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

  const contactParts: string[] = []
  if (profile?.email) contactParts.push(profile.email)
  if (profile?.phone) contactParts.push(profile.phone)
  if (profile?.location) contactParts.push(profile.location)
  if (profile?.linkedin) contactParts.push(profile.linkedin)

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: '#888888',
    marginTop: '20px',
    marginBottom: '8px',
    border: 'none',
    padding: 0,
  }

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

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        fontFamily: "Inter, -apple-system, 'Segoe UI', sans-serif",
        fontSize: '10.5px',
        lineHeight: 1.35,
        maxWidth: '8.5in',
        margin: '0 auto',
        padding: `${pt}px ${ps}px ${pb}px ${ps}px`,
      }}
    >
      {/* Header */}
      {hasProfile ? (
        <>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#1a1a1a',
              marginBottom: '4px',
            }}
          >
            {profile.name || 'Your Name'}
          </div>
          {contactParts.length > 0 && (
            <div
              style={{
                fontSize: '10px',
                color: '#555555',
              }}
            >
              {contactParts.join(' \u00B7 ')}
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

      {/* Summary */}
      {showSummary && profile?.summary && (
        <div
          style={{
            fontSize: '10.5px',
            color: '#1a1a1a',
            lineHeight: 1.35,
            marginTop: '12px',
          }}
        >
          {profile.summary}
        </div>
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
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a' }}>
                    {job.company}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888888' }}>
                    {job.startDate} — {job.endDate ?? 'Present'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    color: '#1a1a1a',
                    marginBottom: '4px',
                  }}
                >
                  {job.role}
                </div>
                {job.bullets.length > 0 && (
                  <div>
                    {job.bullets.map((b) => (
                      <div
                        key={b.id}
                        style={{ display: 'flex', gap: '6px', marginBottom: '1px' }}
                      >
                        <span style={{ flexShrink: 0 }}>{'\u2013'}</span>
                        <span style={{ fontSize: '10.5px', lineHeight: 1.35 }}>{b.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {includedSkills.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Skills</h2>
          {skillsDisplay === 'grouped' ? (
            <div>
              {Object.entries(skillGroups).map(([group, groupSkills]) => (
                <div
                  key={group}
                  style={{
                    fontSize: '10.5px',
                    marginBottom: '4px',
                    color: '#1a1a1a',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{group}: </span>
                  <span>{groupSkills.map((s) => s.name).join(', ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: '10.5px',
                color: '#1a1a1a',
                lineHeight: 1.35,
              }}
            >
              {includedSkills.map((s) => s.name).join(', ')}
            </div>
          )}
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
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#1a1a1a',
                    marginBottom: '4px',
                  }}
                >
                  {project.name}
                </div>
                {project.bullets.length > 0 && (
                  <div>
                    {project.bullets.map((b) => (
                      <div
                        key={b.id}
                        style={{ display: 'flex', gap: '6px', marginBottom: '1px' }}
                      >
                        <span style={{ flexShrink: 0 }}>{'\u2013'}</span>
                        <span style={{ fontSize: '10.5px', lineHeight: 1.35 }}>{b.text}</span>
                      </div>
                    ))}
                  </div>
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
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a' }}>
                    {edu.studyType && edu.area
                      ? `${edu.studyType} in ${edu.area}`
                      : edu.studyType || edu.area || edu.institution}
                    {edu.studyType || edu.area ? ` — ${edu.institution}` : ''}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888888' }}>
                    {edu.startDate}{edu.startDate ? ' — ' : ''}{edu.endDate || 'Present'}
                  </span>
                </div>
                {edu.score && (
                  <div style={{ fontSize: '10.5px', color: '#555555', marginBottom: '2px' }}>
                    Score: {edu.score}
                  </div>
                )}
                {edu.courses.length > 0 && (
                  <div style={{ fontSize: '10.5px', color: '#555555' }}>
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
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a' }}>
                    {vol.position}
                  </span>
                  <span style={{ fontSize: '10px', color: '#888888' }}>
                    {vol.startDate}{vol.startDate ? ' — ' : ''}{vol.endDate || 'Present'}
                  </span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#555555', marginBottom: '4px' }}>
                  {vol.organization}
                </div>
                {vol.summary && (
                  <div style={{ fontSize: '10.5px', color: '#1a1a1a', marginBottom: '4px' }}>
                    {vol.summary}
                  </div>
                )}
                {vol.highlights.length > 0 && (
                  <div>
                    {vol.highlights.map((h, i) => (
                      <div
                        key={i}
                        style={{ display: 'flex', gap: '6px', marginBottom: '1px' }}
                      >
                        <span style={{ flexShrink: 0 }}>{'\u2013'}</span>
                        <span style={{ fontSize: '10.5px', lineHeight: 1.35 }}>{h}</span>
                      </div>
                    ))}
                  </div>
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
                <div style={{ fontSize: '10.5px', color: '#1a1a1a', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>{award.title}</span>
                  {award.awarder && (
                    <span style={{ color: '#555555' }}> — {award.awarder}</span>
                  )}
                  {award.date && (
                    <span style={{ color: '#555555' }}> ({award.date})</span>
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
          <div>
            {includedPublications.map((pub) => (
              <div
                key={pub.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '10.5px', color: '#1a1a1a', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 'bold' }}>{pub.name}</span>
                  {pub.publisher && (
                    <span style={{ color: '#555555' }}> — {pub.publisher}</span>
                  )}
                  {pub.releaseDate && (
                    <span style={{ color: '#555555' }}> ({pub.releaseDate})</span>
                  )}
                </div>
                {pub.url && (
                  <div style={{ fontSize: '10.5px', color: '#555555', marginBottom: '2px' }}>
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
          <div>
            {includedReferences.map((ref) => (
              <div
                key={ref.id}
                style={{ pageBreakInside: 'avoid', marginBottom: '10px' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 500, color: '#1a1a1a', marginBottom: '2px' }}>
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
