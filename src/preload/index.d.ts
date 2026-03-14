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

export interface TemplateVariant {
  id: number
  name: string
  layoutTemplate: string
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

export interface BuilderData {
  jobs: BuilderJob[]
  skills: BuilderSkill[]
}

export interface SubmissionSnapshot {
  layoutTemplate: string
  jobs: BuilderJob[]
  skills: BuilderSkill[]
}

export interface Profile {
  id: number
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
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
    create: (data: { name: string }) => Promise<TemplateVariant>
    rename: (id: number, name: string) => Promise<TemplateVariant>
    duplicate: (id: number) => Promise<TemplateVariant>
    delete: (id: number) => Promise<void>
    setLayoutTemplate: (id: number, layoutTemplate: string) => Promise<TemplateVariant>
    getBuilderData: (variantId: number) => Promise<BuilderData>
    setItemExcluded: (
      variantId: number,
      itemType: string,
      itemId: number,
      excluded: boolean,
    ) => Promise<void>
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
    pdf: (variantId: number, defaultFilename: string) => Promise<{ canceled: boolean; filePath?: string }>
    docx: (variantId: number, defaultFilename: string) => Promise<{ canceled: boolean; filePath?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
