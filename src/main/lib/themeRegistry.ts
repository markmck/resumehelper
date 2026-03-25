import type {
  BuilderData,
  Profile,
} from '../../preload/index.d'

export interface ThemeEntry {
  key: string
  displayName: string
}

export const THEMES: ThemeEntry[] = [
  { key: 'classic', displayName: 'Classic' },
  { key: 'modern', displayName: 'Modern' },
  { key: 'jake', displayName: 'Jake' },
  { key: 'minimal', displayName: 'Minimal' },
  { key: 'executive', displayName: 'Executive' },
]

export const THEME_KEYS = THEMES.map((t) => t.key)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildResumeJson(profileRow: Profile | undefined, builderData: BuilderData): Record<string, any> {
  const includedJobs = builderData.jobs.filter((j) => !j.excluded)
  const includedSkills = builderData.skills.filter((s) => !s.excluded)
  const includedProjects = builderData.projects.filter((p) => !p.excluded)
  const includedEducation = (builderData.education ?? []).filter((e) => !e.excluded)
  const includedVolunteer = (builderData.volunteer ?? []).filter((v) => !v.excluded)
  const includedAwards = (builderData.awards ?? []).filter((a) => !a.excluded)
  const includedPublications = (builderData.publications ?? []).filter((p) => !p.excluded)
  const includedLanguages = (builderData.languages ?? []).filter((l) => !l.excluded)
  const includedInterests = (builderData.interests ?? []).filter((i) => !i.excluded)
  const includedReferences = (builderData.references ?? []).filter((r) => !r.excluded)

  // Group skills by first tag
  const skillGroups: Record<string, string[]> = {}
  for (const skill of includedSkills) {
    const group = skill.tags.length > 0 ? skill.tags[0] : 'Other'
    if (!skillGroups[group]) skillGroups[group] = []
    skillGroups[group].push(skill.name)
  }

  const profiles: Array<{ network: string; username: string; url: string }> = []
  if (profileRow?.linkedin) {
    profiles.push({ network: 'LinkedIn', username: profileRow.linkedin, url: profileRow.linkedin })
  }

  return {
    basics: {
      name: profileRow?.name ?? '',
      email: profileRow?.email ?? '',
      phone: profileRow?.phone ?? '',
      location: profileRow?.location ? { city: profileRow.location } : undefined,
      profiles,
    },
    work: includedJobs.map((job) => ({
      name: job.company,
      position: job.role,
      startDate: job.startDate || undefined,
      endDate: job.endDate || undefined,
      highlights: job.bullets.filter((b) => !b.excluded).map((b) => b.text),
    })),
    skills: Object.entries(skillGroups).map(([name, keywords]) => ({ name, keywords })),
    projects: includedProjects.map((p) => ({
      name: p.name,
      highlights: p.bullets.filter((b) => !b.excluded).map((b) => b.text),
    })),
    education: includedEducation.map((e) => ({
      institution: e.institution,
      area: e.area || undefined,
      studyType: e.studyType || undefined,
      startDate: e.startDate || undefined,
      endDate: e.endDate || undefined,
      score: e.score || undefined,
      courses: e.courses.length > 0 ? e.courses : undefined,
    })),
    volunteer: includedVolunteer.map((v) => ({
      organization: v.organization,
      position: v.position || undefined,
      startDate: v.startDate || undefined,
      endDate: v.endDate || undefined,
      summary: v.summary || undefined,
      highlights: v.highlights.length > 0 ? v.highlights : undefined,
    })),
    awards: includedAwards.map((a) => ({
      title: a.title,
      date: a.date || undefined,
      awarder: a.awarder || undefined,
      summary: a.summary || undefined,
    })),
    publications: includedPublications.map((p) => ({
      name: p.name,
      publisher: p.publisher || undefined,
      releaseDate: p.releaseDate || undefined,
      url: p.url || undefined,
      summary: p.summary || undefined,
    })),
    languages: includedLanguages.map((l) => ({ language: l.language, fluency: l.fluency })),
    interests: includedInterests.map((i) => ({ name: i.name, keywords: i.keywords })),
    references: includedReferences.map((r) => ({ name: r.name, reference: r.reference })),
  }
}

// Sanitize date fields — remove any value that would cause new Date() to throw "Invalid time value"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeDates(resumeJson: Record<string, any>): Record<string, any> {
  const dateFields = ['startDate', 'endDate', 'date', 'releaseDate']
  const sections = ['work', 'education', 'volunteer', 'awards', 'publications', 'projects']
  for (const section of sections) {
    if (!Array.isArray(resumeJson[section])) continue
    for (const item of resumeJson[section]) {
      for (const field of dateFields) {
        if (field in item && item[field]) {
          const d = new Date(item[field])
          if (isNaN(d.getTime())) {
            item[field] = undefined
          }
        }
      }
    }
  }
  return resumeJson
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderThemeHtml(themeKey: string, resumeJson: Record<string, any>): Promise<string> {
  sanitizeDates(resumeJson)
  switch (themeKey) {
    case 'even': {
      const theme = await import('jsonresume-theme-even')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return theme.render(resumeJson as any)
    }
    case 'class': {
      const theme = await import('@jsonresume/jsonresume-theme-class')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return theme.render(resumeJson as any)
    }
    case 'elegant': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const theme = require('jsonresume-theme-elegant') as { render: (r: Record<string, unknown>) => string }
      return Promise.resolve(theme.render(resumeJson))
    }
    default:
      throw new Error(`Unknown theme: ${themeKey}`)
  }
}
