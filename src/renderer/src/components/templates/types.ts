import {
  Profile,
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

export interface ResumeTemplateProps {
  profile?: Profile
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
  accentColor?: string
  compact?: boolean
  skillsDisplay?: 'grouped' | 'inline'
}
