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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
