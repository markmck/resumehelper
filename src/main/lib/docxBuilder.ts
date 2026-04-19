import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
  HeadingLevel,
} from 'docx'
import {
  BuilderJob,
  BuilderSkill,
  BuilderProject,
  BuilderEducation,
  BuilderVolunteer,
  BuilderAward,
  BuilderPublication,
  BuilderLanguage,
  BuilderInterest,
  BuilderReference,
} from '../../preload/index.d'

export const DOCX_FONT_MAP: Record<string, string> = {
  classic: 'Georgia',
  modern: 'Calibri',
  jake: 'Calibri',
  minimal: 'Calibri',
  executive: 'Garamond',
}

// Per-template default margins in inches — mirrors TEMPLATE_DEFAULTS in renderer/types.ts
// Main process cannot import renderer files, so we define these inline here.
export const DOCX_MARGIN_DEFAULTS: Record<string, { top: number; bottom: number; sides: number }> = {
  classic:   { top: 1.00, bottom: 1.00, sides: 1.00 },
  modern:    { top: 0.75, bottom: 0.75, sides: 0.75 },
  jake:      { top: 0.60, bottom: 0.60, sides: 0.50 },
  minimal:   { top: 1.00, bottom: 1.00, sides: 1.00 },
  executive: { top: 0.80, bottom: 0.80, sides: 0.80 },
}

export interface BuilderData {
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]
  education: BuilderEducation[]
  volunteer: BuilderVolunteer[]
  awards: BuilderAward[]
  publications: BuilderPublication[]
  languages: BuilderLanguage[]
  interests: BuilderInterest[]
  references: BuilderReference[]
}

export function buildResumeDocx(
  builderData: BuilderData,
  profileRow: { name?: string | null; email?: string | null; phone?: string | null; location?: string | null; linkedin?: string | null; summary?: string | null } | undefined,
  templateKey: string,
  templateOptions: { marginTop?: number; marginBottom?: number; marginSides?: number; skillsDisplay?: string; accentColor?: string }
): Document {
  const fontName = DOCX_FONT_MAP[templateKey] ?? 'Calibri'

  // Compute margins in twips (1 inch = 1440 twips), falling back to per-template defaults
  const marginDefaults = DOCX_MARGIN_DEFAULTS[templateKey] ?? { top: 1.0, bottom: 1.0, sides: 1.0 }
  const mt = Math.round((templateOptions.marginTop ?? marginDefaults.top) * 1440)
  const mb = Math.round((templateOptions.marginBottom ?? marginDefaults.bottom) * 1440)
  const ms = Math.round((templateOptions.marginSides ?? marginDefaults.sides) * 1440)

  // skillsDisplay from options (accentColor not used in DOCX — Word docs are black/white)
  const skillsDisplay = (templateOptions.skillsDisplay as 'grouped' | 'inline' | undefined) ?? 'grouped'

  const includedJobs = builderData.jobs.filter((j) => !j.excluded)
  const includedSkills = builderData.skills.filter((s) => !s.excluded)
  const includedProjects = builderData.projects.filter((p) => !p.excluded)
  const includedEducation = builderData.education.filter((e) => !e.excluded)
  const includedVolunteer = builderData.volunteer.filter((v) => !v.excluded)
  const includedAwards = builderData.awards.filter((a) => !a.excluded)
  const includedPublications = builderData.publications.filter((p) => !p.excluded)
  const includedLanguages = builderData.languages.filter((l) => !l.excluded)
  const includedInterests = builderData.interests.filter((i) => !i.excluded)
  const includedReferences = builderData.references.filter((r) => !r.excluded)

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: mt, bottom: mb, left: ms, right: ms } },
        },
        children: [
          // Name — centered, bold, 16pt (size: 32)
          new Paragraph({
            children: [
              new TextRun({
                text: profileRow?.name || 'Your Name',
                bold: true,
                size: 32,
                font: fontName,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          // Contact line — centered, 10pt (size: 20), gray
          new Paragraph({
            children: [
              new TextRun({
                text: [
                  profileRow?.email,
                  profileRow?.phone,
                  profileRow?.location,
                  profileRow?.linkedin,
                ]
                  .filter(Boolean)
                  .join('  |  '),
                size: 20,
                font: fontName,
                color: '555555',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          // Professional summary — rendered when profile has summary content
          ...(profileRow?.summary ? [
            new Paragraph({
              children: [
                new TextRun({ text: profileRow.summary, size: 21, font: fontName }),
              ],
              spacing: { before: 120, after: 200 },
            }),
          ] : []),
          // WORK EXPERIENCE section
          ...(includedJobs.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({
                      text: 'WORK EXPERIENCE',
                      bold: true,
                      size: 22,
                      font: fontName,
                      color: '333333',
                    }),
                  ],
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
                  },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedJobs.flatMap((job) => {
                  const bullets = job.bullets.filter((b) => !b.excluded)
                  return [
                    new Paragraph({
                      children: [
                        new TextRun({ text: job.role, bold: true, size: 22, font: fontName }),
                        new TextRun({
                          text: `\t${job.startDate} \u2014 ${job.endDate || 'Present'}`,
                          size: 20,
                          font: fontName,
                          color: '555555',
                        }),
                      ],
                      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: job.company,
                          size: 20,
                          font: fontName,
                          color: '555555',
                        }),
                      ],
                      spacing: { after: 60 },
                    }),
                    ...bullets.map(
                      (b) =>
                        new Paragraph({
                          children: [
                            new TextRun({ text: b.text, size: 22, font: fontName }),
                          ],
                          bullet: { level: 0 },
                          spacing: { after: 40 },
                        })
                    ),
                    new Paragraph({ spacing: { after: 120 } }),
                  ]
                }),
              ]
            : []),
          // SKILLS section
          ...(includedSkills.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({
                      text: 'SKILLS',
                      bold: true,
                      size: 22,
                      font: fontName,
                      color: '333333',
                    }),
                  ],
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
                  },
                  spacing: { before: 240, after: 120 },
                }),
                ...(skillsDisplay === 'inline'
                  ? [
                      // Inline: all skills as a single comma-separated paragraph
                      new Paragraph({
                        children: [
                          new TextRun({ text: includedSkills.map((s) => s.name).join(', '), size: 22, font: fontName }),
                        ],
                        spacing: { after: 60 },
                      }),
                    ]
                  : Object.entries(
                      includedSkills.reduce<Record<string, string[]>>((acc, skill) => {
                        const group = skill.categoryName ?? 'Other'
                        if (!acc[group]) acc[group] = []
                        acc[group].push(skill.name)
                        return acc
                      }, {})
                    ).map(
                      ([group, names]) =>
                        new Paragraph({
                          children: [
                            new TextRun({ text: `${group}: `, bold: true, size: 22, font: fontName }),
                            new TextRun({ text: names.join(', '), size: 22, font: fontName }),
                          ],
                          spacing: { after: 60 },
                        })
                    )
                ),
              ]
            : []),
          // PROJECTS section
          ...(includedProjects.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({
                      text: 'PROJECTS',
                      bold: true,
                      size: 22,
                      font: fontName,
                      color: '333333',
                    }),
                  ],
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
                  },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedProjects.flatMap((project) => {
                  const bullets = project.bullets.filter((b) => !b.excluded)
                  return [
                    new Paragraph({
                      children: [
                        new TextRun({ text: project.name, bold: true, size: 22, font: fontName }),
                      ],
                      spacing: { after: 60 },
                    }),
                    ...bullets.map(
                      (b) =>
                        new Paragraph({
                          children: [
                            new TextRun({ text: b.text, size: 22, font: fontName }),
                          ],
                          bullet: { level: 0 },
                          spacing: { after: 40 },
                        })
                    ),
                    new Paragraph({ spacing: { after: 120 } }),
                  ]
                }),
              ]
            : []),
          // EDUCATION section
          ...(includedEducation.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({ text: 'EDUCATION', bold: true, size: 22, font: fontName, color: '333333' }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedEducation.flatMap((edu) => [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${edu.studyType}${edu.studyType && edu.area ? ' in ' : ''}${edu.area}${edu.institution ? ` \u2014 ${edu.institution}` : ''}`,
                        bold: true,
                        size: 22,
                        font: fontName,
                      }),
                      new TextRun({
                        text: `\t${edu.startDate}${edu.startDate ? ' \u2014 ' : ''}${edu.endDate || 'Present'}`,
                        size: 20,
                        font: fontName,
                        color: '555555',
                      }),
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                  }),
                  ...(edu.score
                    ? [new Paragraph({
                        children: [new TextRun({ text: `Score: ${edu.score}`, size: 20, font: fontName, color: '555555' })],
                        spacing: { after: 40 },
                      })]
                    : []),
                  ...(edu.courses.length > 0
                    ? [new Paragraph({
                        children: [new TextRun({ text: `Courses: ${edu.courses.join(', ')}`, size: 20, font: fontName, color: '555555' })],
                        spacing: { after: 40 },
                      })]
                    : []),
                  new Paragraph({ spacing: { after: 120 } }),
                ]),
              ]
            : []),
          // VOLUNTEER EXPERIENCE section
          ...(includedVolunteer.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({ text: 'VOLUNTEER EXPERIENCE', bold: true, size: 22, font: fontName, color: '333333' }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedVolunteer.flatMap((vol) => [
                  new Paragraph({
                    children: [
                      new TextRun({ text: vol.position, bold: true, size: 22, font: fontName }),
                      new TextRun({
                        text: `\t${vol.startDate}${vol.startDate ? ' \u2014 ' : ''}${vol.endDate || 'Present'}`,
                        size: 20,
                        font: fontName,
                        color: '555555',
                      }),
                    ],
                    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: vol.organization, size: 20, font: fontName, color: '555555' })],
                    spacing: { after: 60 },
                  }),
                  ...(vol.summary
                    ? [new Paragraph({
                        children: [new TextRun({ text: vol.summary, size: 22, font: fontName })],
                        spacing: { after: 40 },
                      })]
                    : []),
                  ...vol.highlights.map(
                    (h) => new Paragraph({
                      children: [new TextRun({ text: h, size: 22, font: fontName })],
                      bullet: { level: 0 },
                      spacing: { after: 40 },
                    })
                  ),
                  new Paragraph({ spacing: { after: 120 } }),
                ]),
              ]
            : []),
          // AWARDS section
          ...(includedAwards.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({ text: 'AWARDS', bold: true, size: 22, font: fontName, color: '333333' }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedAwards.flatMap((award) => [
                  new Paragraph({
                    children: [
                      new TextRun({ text: award.title, bold: true, size: 22, font: fontName }),
                      new TextRun({
                        text: ` \u2014 ${award.awarder}${award.date ? ` (${award.date})` : ''}`,
                        size: 20,
                        font: fontName,
                        color: '555555',
                      }),
                    ],
                    spacing: { after: 40 },
                  }),
                  ...(award.summary
                    ? [new Paragraph({
                        children: [new TextRun({ text: award.summary, size: 20, font: fontName, color: '555555' })],
                        spacing: { after: 40 },
                      })]
                    : []),
                  new Paragraph({ spacing: { after: 120 } }),
                ]),
              ]
            : []),
          // PUBLICATIONS section
          ...(includedPublications.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({ text: 'PUBLICATIONS', bold: true, size: 22, font: fontName, color: '333333' }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedPublications.flatMap((pub) => [
                  new Paragraph({
                    children: [
                      new TextRun({ text: pub.name, bold: true, size: 22, font: fontName }),
                      new TextRun({
                        text: ` \u2014 ${pub.publisher}${pub.releaseDate ? ` (${pub.releaseDate})` : ''}`,
                        size: 20,
                        font: fontName,
                        color: '555555',
                      }),
                    ],
                    spacing: { after: 40 },
                  }),
                  ...(pub.url
                    ? [new Paragraph({
                        children: [new TextRun({ text: pub.url, size: 20, font: fontName, color: '555555' })],
                        spacing: { after: 40 },
                      })]
                    : []),
                  ...(pub.summary
                    ? [new Paragraph({
                        children: [new TextRun({ text: pub.summary, size: 20, font: fontName, color: '555555' })],
                        spacing: { after: 40 },
                      })]
                    : []),
                  new Paragraph({ spacing: { after: 120 } }),
                ]),
              ]
            : []),
          // LANGUAGES section
          ...(includedLanguages.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({ text: 'LANGUAGES', bold: true, size: 22, font: fontName, color: '333333' }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                  spacing: { before: 240, after: 120 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: includedLanguages.map((l) => `${l.language}${l.fluency ? ` (${l.fluency})` : ''}`).join(', '),
                      size: 22,
                      font: fontName,
                    }),
                  ],
                  spacing: { after: 120 },
                }),
              ]
            : []),
          // INTERESTS section
          ...(includedInterests.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({ text: 'INTERESTS', bold: true, size: 22, font: fontName, color: '333333' }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedInterests.map(
                  (interest) =>
                    new Paragraph({
                      children: [
                        new TextRun({ text: `${interest.name}`, bold: true, size: 22, font: fontName }),
                        ...(interest.keywords.length > 0
                          ? [new TextRun({ text: `: ${interest.keywords.join(', ')}`, size: 22, font: fontName })]
                          : []),
                      ],
                      spacing: { after: 60 },
                    })
                ),
              ]
            : []),
          // REFERENCES section
          ...(includedReferences.length > 0
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_1,
                  children: [
                    new TextRun({ text: 'REFERENCES', bold: true, size: 22, font: fontName, color: '333333' }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                  spacing: { before: 240, after: 120 },
                }),
                ...includedReferences.flatMap((ref) => [
                  new Paragraph({
                    children: [new TextRun({ text: ref.name, bold: true, size: 22, font: fontName })],
                    spacing: { after: 40 },
                  }),
                  ...(ref.reference
                    ? [new Paragraph({
                        children: [new TextRun({ text: ref.reference, size: 20, font: fontName, color: '555555' })],
                        spacing: { after: 40 },
                      })]
                    : []),
                  new Paragraph({ spacing: { after: 120 } }),
                ]),
              ]
            : []),
        ],
      },
    ],
  })
}
