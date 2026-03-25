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
} from '../../../../preload/index.d'
import { ResumeTemplateProps } from './types'

export interface FilteredResumeData {
  includedJobs: BuilderJob[]
  includedSkills: BuilderSkill[]
  includedProjects: BuilderProject[]
  includedEducation: BuilderEducation[]
  includedVolunteer: BuilderVolunteer[]
  includedAwards: BuilderAward[]
  includedPublications: BuilderPublication[]
  includedLanguages: BuilderLanguage[]
  includedInterests: BuilderInterest[]
  includedReferences: BuilderReference[]
  skillGroups: Record<string, BuilderSkill[]>
}

export function filterResumeData(props: ResumeTemplateProps): FilteredResumeData {
  const {
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
  } = props

  const includedJobs = jobs
    .filter((j) => !j.excluded)
    .map((job) => ({ ...job, bullets: job.bullets.filter((b) => !b.excluded) }))

  const includedSkills = skills.filter((s) => !s.excluded)
  const includedProjects = (projects ?? [])
    .filter((p) => !p.excluded)
    .map((project) => ({ ...project, bullets: project.bullets.filter((b) => !b.excluded) }))

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

  return {
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
  }
}
