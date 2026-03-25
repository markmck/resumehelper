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
  showSummary?: boolean
  marginTop?: number    // inches (e.g. 1.0)
  marginBottom?: number // inches
  marginSides?: number  // inches
}

export const TEMPLATE_DEFAULTS: Record<string, {
  top: number; bottom: number; sides: number;
  accent: string; skillsDisplay: 'grouped' | 'inline'
}> = {
  classic:   { top: 1.00, bottom: 1.00, sides: 1.00, accent: '#000000', skillsDisplay: 'grouped' },
  modern:    { top: 0.75, bottom: 0.75, sides: 0.75, accent: '#2563EB', skillsDisplay: 'inline' },
  jake:      { top: 0.60, bottom: 0.60, sides: 0.50, accent: '#333333', skillsDisplay: 'grouped' },
  minimal:   { top: 1.00, bottom: 1.00, sides: 1.00, accent: '#000000', skillsDisplay: 'inline' },
  executive: { top: 0.80, bottom: 0.80, sides: 0.80, accent: '#1e3a5f', skillsDisplay: 'grouped' },
}
