import type {
  BuilderData,
  Profile,
} from '../../preload/index.d'

export interface ThemeEntry {
  key: string
  displayName: string
}

export const THEMES: ThemeEntry[] = [
  { key: 'professional', displayName: 'Professional (built-in)' },
  { key: 'even', displayName: 'Even' },
  { key: 'class', displayName: 'Class' },
  { key: 'elegant', displayName: 'Elegant' },
]

export const THEME_KEYS = THEMES.map((t) => t.key)

export function buildResumeJson(profileRow: Profile | undefined, builderData: BuilderData): object {
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

  const profiles = []
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
      startDate: job.startDate,
      endDate: job.endDate ?? undefined,
      highlights: job.bullets.filter((b) => !b.excluded).map((b) => b.text),
    })),
    skills: Object.entries(skillGroups).map(([name, keywords]) => ({ name, keywords })),
    projects: includedProjects.map((p) => ({
      name: p.name,
      highlights: p.bullets.filter((b) => !b.excluded).map((b) => b.text),
    })),
    education: includedEducation.map((e) => ({
      institution: e.institution,
      area: e.area,
      studyType: e.studyType,
      startDate: e.startDate,
      endDate: e.endDate ?? undefined,
      score: e.score || undefined,
      courses: e.courses,
    })),
    volunteer: includedVolunteer.map((v) => ({
      organization: v.organization,
      position: v.position,
      startDate: v.startDate,
      endDate: v.endDate ?? undefined,
      summary: v.summary || undefined,
      highlights: v.highlights,
    })),
    awards: includedAwards.map((a) => ({
      title: a.title,
      date: a.date ?? undefined,
      awarder: a.awarder,
      summary: a.summary || undefined,
    })),
    publications: includedPublications.map((p) => ({
      name: p.name,
      publisher: p.publisher,
      releaseDate: p.releaseDate ?? undefined,
      url: p.url || undefined,
      summary: p.summary || undefined,
    })),
    languages: includedLanguages.map((l) => ({ language: l.language, fluency: l.fluency })),
    interests: includedInterests.map((i) => ({ name: i.name, keywords: i.keywords })),
    references: includedReferences.map((r) => ({ name: r.name, reference: r.reference })),
  }
}

export async function renderThemeHtml(themeKey: string, resumeJson: object): Promise<string> {
  switch (themeKey) {
    case 'even': {
      const theme = await import('jsonresume-theme-even')
      return theme.render(resumeJson)
    }
    case 'class': {
      const theme = await import('@jsonresume/jsonresume-theme-class')
      return theme.render(resumeJson)
    }
    case 'elegant': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const theme = require('jsonresume-theme-elegant') as { render: (r: object) => string }
      return Promise.resolve(theme.render(resumeJson))
    }
    default:
      throw new Error(`Unknown theme: ${themeKey}`)
  }
}
