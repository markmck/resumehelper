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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
