import { ElectronAPI } from '@electron-toolkit/preload'

export interface Job {
  id: number
  company: string
  role: string
  startDate: string
  endDate: string | null
  createdAt: Date
}

export interface Bullet {
  id: number
  jobId: number
  text: string
  sortOrder: number
}

export interface JobWithBullets extends Job {
  bullets: Bullet[]
}

export interface Skill {
  id: number
  name: string
  tags: string[]
}

export interface TemplateOptions {
  accentColor?: string
  skillsDisplay?: 'grouped' | 'inline'
  marginTop?: number
  marginBottom?: number
  marginSides?: number
}

export interface TemplateVariant {
  id: number
  name: string
  layoutTemplate: string
  templateOptions?: TemplateOptions | null
  createdAt: Date
}

export interface BuilderBullet {
  id: number
  text: string
  sortOrder: number
  excluded: boolean
}

export interface BuilderJob {
  id: number
  company: string
  role: string
  startDate: string
  endDate: string | null
  excluded: boolean
  bullets: BuilderBullet[]
}

export interface BuilderSkill {
  id: number
  name: string
  tags: string[]
  excluded: boolean
}

export interface BuilderProject {
  id: number
  name: string
  excluded: boolean
  bullets: BuilderBullet[]
}

export interface BuilderEducation {
  id: number
  institution: string
  area: string
  studyType: string
  startDate: string
  endDate: string | null
  score: string
  courses: string[]
  excluded: boolean
}

export interface BuilderVolunteer {
  id: number
  organization: string
  position: string
  startDate: string
  endDate: string | null
  summary: string
  highlights: string[]
  excluded: boolean
}

export interface BuilderAward {
  id: number
  title: string
  date: string | null
  awarder: string
  summary: string
  excluded: boolean
}

export interface BuilderPublication {
  id: number
  name: string
  publisher: string
  releaseDate: string | null
  url: string
  summary: string
  excluded: boolean
}

export interface BuilderLanguage {
  id: number
  language: string
  fluency: string
  excluded: boolean
}

export interface BuilderInterest {
  id: number
  name: string
  keywords: string[]
  excluded: boolean
}

export interface BuilderReference {
  id: number
  name: string
  reference: string
  excluded: boolean
}

export interface BuilderData {
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]
  education?: BuilderEducation[]
  volunteer?: BuilderVolunteer[]
  awards?: BuilderAward[]
  publications?: BuilderPublication[]
  languages?: BuilderLanguage[]
  interests?: BuilderInterest[]
  references?: BuilderReference[]
  summaryExcluded?: boolean
}

export interface SubmissionSnapshot {
  layoutTemplate: string
  templateOptions?: { accentColor?: string; skillsDisplay?: string; marginTop?: number; marginBottom?: number; marginSides?: number; showSummary?: boolean }
  profile?: { name: string; email: string; phone: string; location: string; linkedin: string; summary?: string }
  jobs: BuilderJob[]
  skills: BuilderSkill[]
  projects: BuilderProject[]
  education?: BuilderEducation[]
  volunteer?: BuilderVolunteer[]
  awards?: BuilderAward[]
  publications?: BuilderPublication[]
  languages?: BuilderLanguage[]
  interests?: BuilderInterest[]
  references?: BuilderReference[]
}

export interface Project {
  id: number
  name: string
  sortOrder: number
}

export interface ProjectBullet {
  id: number
  projectId: number
  text: string
  sortOrder: number
}

export interface ProjectWithBullets extends Project {
  bullets: ProjectBullet[]
}

export interface Profile {
  id: number
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  summary: string
}

export interface Education {
  id: number
  institution: string
  area: string
  studyType: string
  startDate: string
  endDate: string | null
  score: string | null
  courses: string[]
}

export interface Volunteer {
  id: number
  organization: string
  position: string
  startDate: string
  endDate: string | null
  summary: string
  highlights: string[]
}

export interface Award {
  id: number
  title: string
  date: string | null
  awarder: string
  summary: string
}

export interface Publication {
  id: number
  name: string
  publisher: string
  releaseDate: string | null
  url: string
  summary: string
}

export interface Language {
  id: number
  language: string
  fluency: string
}

export interface Interest {
  id: number
  name: string
  keywords: string[]
}

export interface Reference {
  id: number
  name: string
  reference: string
}

export interface Submission {
  id: number
  company: string
  role: string
  submittedAt: Date | null
  variantId: number | null
  resumeSnapshot: string       // JSON string — parse to SubmissionSnapshot
  url: string | null
  notes: string | null
  variantName: string | null   // from LEFT JOIN, null if variant deleted
  status: string               // 'applied' | 'screening' | 'interview' | 'offer' | 'result' | 'withdrawn'
  scoreAtSubmit: number | null
  analysisId: number | null
}

export interface SubmissionEvent {
  id: number
  submissionId: number
  status: string
  note: string | null
  createdAt: Date
}

export interface SubmissionMetrics {
  total: number
  thisMonth: number
  active: number
  responseRate: number
  respondedCount: number
  avgScore: number | null
  respondedAvgScore: number | null
}

export interface BulletOverride {
  bulletId: number
  overrideText: string
  source: 'ai_suggestion' | 'manual_edit'
  suggestionId: string | null
}

export interface SkillAddition {
  id: number
  analysisId: number
  skillName: string
  reason: string
  category: string
  status: 'pending' | 'accepted' | 'dismissed'
}

export interface Api {
  jobs: {
    list: () => Promise<JobWithBullets[]>
    create: (data: {
      company: string
      role: string
      startDate: string
      endDate?: string
    }) => Promise<Job>
    update: (
      id: number,
      data: { company?: string; role?: string; startDate?: string; endDate?: string | null },
    ) => Promise<Job>
    delete: (id: number) => Promise<void>
    reorder: (orderedIds: number[]) => Promise<void>
  }
  bullets: {
    create: (data: { jobId: number; text: string; sortOrder: number }) => Promise<Bullet>
    update: (id: number, data: { text?: string }) => Promise<Bullet>
    delete: (id: number) => Promise<void>
    reorder: (jobId: number, orderedIds: number[]) => Promise<void>
  }
  skills: {
    list: () => Promise<Skill[]>
    create: (data: { name: string; tags: string[] }) => Promise<Skill>
    update: (id: number, data: { name?: string; tags?: string[] }) => Promise<Skill>
    delete: (id: number) => Promise<void>
  }
  templates: {
    list: () => Promise<TemplateVariant[]>
    create: (data: { name: string; layoutTemplate?: string }) => Promise<TemplateVariant>
    rename: (id: number, name: string) => Promise<TemplateVariant>
    duplicate: (id: number) => Promise<TemplateVariant>
    delete: (id: number) => Promise<void>
    setLayoutTemplate: (id: number, layoutTemplate: string) => Promise<TemplateVariant>
    getBuilderData: (variantId: number, analysisId?: number) => Promise<BuilderData>
    setItemExcluded: (
      variantId: number,
      itemType: string,
      itemId: number,
      excluded: boolean,
    ) => Promise<void>
    getOptions: (variantId: number) => Promise<TemplateOptions | null>
    setOptions: (variantId: number, options: TemplateOptions) => Promise<void>
  }
  submissions: {
    list: () => Promise<Submission[]>
    create: (data: {
      company: string
      role: string
      submittedAt: Date
      variantId: number | null
      url?: string
      notes?: string
      status?: string
      scoreAtSubmit?: number | null
      analysisId?: number | null
    }) => Promise<Submission>
    update: (
      id: number,
      data: {
        company?: string
        role?: string
        submittedAt?: Date
        url?: string | null
        notes?: string | null
      },
    ) => Promise<Submission>
    delete: (id: number) => Promise<void>
    updateStatus: (id: number, status: string, note?: string) => Promise<void>
    getEvents: (submissionId: number) => Promise<SubmissionEvent[]>
    addEvent: (data: { submissionId: number; status: string; note?: string }) => Promise<SubmissionEvent>
    metrics: () => Promise<SubmissionMetrics>
    getAnalysisById: (analysisId: number) => Promise<{
      id: number
      company: string
      role: string
      score: number
      variantId: number
      variantName: string
      createdAt: string
    } | null>
    findByAnalysis: (analysisId: number) => Promise<{
      id: number
      submittedAt: Date | null
    } | null>
  }
  profile: {
    get: () => Promise<Profile>
    set: (data: {
      name: string
      email: string
      phone: string
      location: string
      linkedin: string
    }) => Promise<Profile>
  }
  exportFile: {
    pdf: (variantId: number, defaultFilename: string, analysisId?: number) => Promise<{ canceled: boolean; filePath?: string }>
    docx: (variantId: number, defaultFilename: string, analysisId?: number) => Promise<{ canceled: boolean; filePath?: string }>
    snapshotPdf: (snapshotData: SubmissionSnapshot, defaultFilename: string) => Promise<{ canceled: boolean; filePath?: string }>
  }
  projects: {
    list: () => Promise<ProjectWithBullets[]>
    create: (data: { name: string }) => Promise<Project>
    update: (id: number, data: { name?: string }) => Promise<Project>
    delete: (id: number) => Promise<void>
  }
  projectBullets: {
    create: (data: { projectId: number; text: string; sortOrder: number }) => Promise<ProjectBullet>
    update: (id: number, data: { text?: string }) => Promise<ProjectBullet>
    delete: (id: number) => Promise<void>
    reorder: (projectId: number, orderedIds: number[]) => Promise<void>
  }
  education: {
    list: () => Promise<Education[]>
    create: (data: {
      institution: string
      area?: string
      studyType?: string
      startDate?: string
      endDate?: string
      score?: string
      courses?: string[]
    }) => Promise<Education>
    update: (
      id: number,
      data: {
        institution?: string
        area?: string
        studyType?: string
        startDate?: string
        endDate?: string | null
        score?: string
        courses?: string[]
      },
    ) => Promise<Education>
    delete: (id: number) => Promise<void>
  }
  volunteer: {
    list: () => Promise<Volunteer[]>
    create: (data: {
      organization: string
      position?: string
      startDate?: string
      endDate?: string
      summary?: string
      highlights?: string[]
    }) => Promise<Volunteer>
    update: (
      id: number,
      data: {
        organization?: string
        position?: string
        startDate?: string
        endDate?: string | null
        summary?: string
        highlights?: string[]
      },
    ) => Promise<Volunteer>
    delete: (id: number) => Promise<void>
  }
  awards: {
    list: () => Promise<Award[]>
    create: (data: {
      title: string
      date?: string
      awarder?: string
      summary?: string
    }) => Promise<Award>
    update: (
      id: number,
      data: {
        title?: string
        date?: string | null
        awarder?: string
        summary?: string
      },
    ) => Promise<Award>
    delete: (id: number) => Promise<void>
  }
  publications: {
    list: () => Promise<Publication[]>
    create: (data: {
      name: string
      publisher?: string
      releaseDate?: string
      url?: string
      summary?: string
    }) => Promise<Publication>
    update: (
      id: number,
      data: {
        name?: string
        publisher?: string
        releaseDate?: string | null
        url?: string
        summary?: string
      },
    ) => Promise<Publication>
    delete: (id: number) => Promise<void>
  }
  languages: {
    list: () => Promise<Language[]>
    create: (data: { language: string; fluency?: string }) => Promise<Language>
    update: (id: number, data: { language?: string; fluency?: string }) => Promise<Language>
    delete: (id: number) => Promise<void>
  }
  interests: {
    list: () => Promise<Interest[]>
    create: (data: { name: string; keywords?: string[] }) => Promise<Interest>
    update: (id: number, data: { name?: string; keywords?: string[] }) => Promise<Interest>
    delete: (id: number) => Promise<void>
  }
  references: {
    list: () => Promise<Reference[]>
    create: (data: { name: string; reference?: string }) => Promise<Reference>
    update: (id: number, data: { name?: string; reference?: string }) => Promise<Reference>
    delete: (id: number) => Promise<void>
  }
  import_: {
    parse: () => Promise<{
      canceled: boolean
      error?: string
      counts?: Record<string, number>
      data?: unknown
    }>
    confirmReplace: (data: unknown) => Promise<{ success: boolean }>
  }
  settings: {
    getAi: () => Promise<{ provider: string; model: string; hasKey: boolean }>
    setAi: (data: { provider: string; model: string; apiKey: string }) => Promise<{ success: boolean } | { error: string }>
    testAi: () => Promise<{ success: boolean; error?: string }>
    listModels: () => Promise<{ models: string[] }>
  }
  ai: {
    analyze: (jobPostingId: number, variantId: number) => Promise<{ analysisId: number; parsedJob: unknown } | { error: string; code: string }>
    onProgress: (cb: (phase: string, pct: number, data?: unknown) => void) => void
    offProgress: () => void
    acceptSuggestion: (analysisId: number, bulletId: number, text: string) => Promise<{ success: boolean } | { error: string }>
    dismissSuggestion: (analysisId: number, bulletId: number) => Promise<{ success: boolean } | { error: string }>
    getOverrides: (analysisId: number) => Promise<BulletOverride[]>
    acceptSkillAddition: (analysisId: number, skillName: string) => Promise<{ success: boolean } | { error: string }>
    dismissSkillAddition: (analysisId: number, skillName: string) => Promise<{ success: boolean } | { error: string }>
    ensureSkillAdditions: (analysisId: number, skills: Array<{ skill: string; severity: string; reason?: string; category?: string }>) => Promise<{ success: boolean } | { error: string }>
  }
  jobPostings: {
    list: () => Promise<unknown[]>
    create: (data: { company: string; role: string; rawText: string }) => Promise<unknown>
    delete: (id: number) => Promise<void>
    getAnalysis: (id: number) => Promise<Record<string, unknown> | null>
    updateAnalysisStatus: (analysisId: number, status: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
    __printBase?: string
  }
}
