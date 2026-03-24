import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  jobs: {
    list: () => ipcRenderer.invoke('jobs:list'),
    create: (data: { company: string; role: string; startDate: string; endDate?: string }) =>
      ipcRenderer.invoke('jobs:create', data),
    update: (
      id: number,
      data: { company?: string; role?: string; startDate?: string; endDate?: string | null },
    ) => ipcRenderer.invoke('jobs:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('jobs:delete', id),
  },
  bullets: {
    create: (data: { jobId: number; text: string; sortOrder: number }) =>
      ipcRenderer.invoke('bullets:create', data),
    update: (id: number, data: { text?: string }) => ipcRenderer.invoke('bullets:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('bullets:delete', id),
    reorder: (jobId: number, orderedIds: number[]) =>
      ipcRenderer.invoke('bullets:reorder', jobId, orderedIds),
  },
  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    create: (data: { name: string; tags: string[] }) => ipcRenderer.invoke('skills:create', data),
    update: (id: number, data: { name?: string; tags?: string[] }) =>
      ipcRenderer.invoke('skills:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('skills:delete', id),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    create: (data: { name: string }) => ipcRenderer.invoke('templates:create', data),
    rename: (id: number, name: string) => ipcRenderer.invoke('templates:rename', id, name),
    duplicate: (id: number) => ipcRenderer.invoke('templates:duplicate', id),
    delete: (id: number) => ipcRenderer.invoke('templates:delete', id),
    setLayoutTemplate: (id: number, layoutTemplate: string) =>
      ipcRenderer.invoke('templates:setLayoutTemplate', id, layoutTemplate),
    getBuilderData: (variantId: number) =>
      ipcRenderer.invoke('templates:getBuilderData', variantId),
    setItemExcluded: (
      variantId: number,
      itemType: string,
      itemId: number,
      excluded: boolean,
    ) => ipcRenderer.invoke('templates:setItemExcluded', variantId, itemType, itemId, excluded),
  },
  submissions: {
    list: () => ipcRenderer.invoke('submissions:list'),
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
    }) => ipcRenderer.invoke('submissions:create', data),
    update: (
      id: number,
      data: {
        company?: string
        role?: string
        submittedAt?: Date
        url?: string | null
        notes?: string | null
      },
    ) => ipcRenderer.invoke('submissions:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('submissions:delete', id),
    updateStatus: (id: number, status: string, note?: string) =>
      ipcRenderer.invoke('submissions:updateStatus', id, status, note),
    getEvents: (submissionId: number) =>
      ipcRenderer.invoke('submissions:getEvents', submissionId),
    addEvent: (data: { submissionId: number; status: string; note?: string }) =>
      ipcRenderer.invoke('submissions:addEvent', data),
    metrics: () => ipcRenderer.invoke('submissions:metrics'),
    getAnalysisById: (analysisId: number) =>
      ipcRenderer.invoke('submissions:getAnalysisById', analysisId),
  },
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    set: (data: {
      name: string
      email: string
      phone: string
      location: string
      linkedin: string
      summary: string
    }) => ipcRenderer.invoke('profile:set', data),
  },
  exportFile: {
    pdf: (variantId: number, defaultFilename: string) =>
      ipcRenderer.invoke('export:pdf', variantId, defaultFilename),
    docx: (variantId: number, defaultFilename: string) =>
      ipcRenderer.invoke('export:docx', variantId, defaultFilename),
    snapshotPdf: (snapshotData: unknown, defaultFilename: string) =>
      ipcRenderer.invoke('export:snapshotPdf', snapshotData, defaultFilename),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (data: { name: string }) => ipcRenderer.invoke('projects:create', data),
    update: (id: number, data: { name?: string }) => ipcRenderer.invoke('projects:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('projects:delete', id),
  },
  projectBullets: {
    create: (data: { projectId: number; text: string; sortOrder: number }) =>
      ipcRenderer.invoke('projectBullets:create', data),
    update: (id: number, data: { text?: string }) => ipcRenderer.invoke('projectBullets:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('projectBullets:delete', id),
    reorder: (projectId: number, orderedIds: number[]) =>
      ipcRenderer.invoke('projectBullets:reorder', projectId, orderedIds),
  },
  education: {
    list: () => ipcRenderer.invoke('education:list'),
    create: (data: {
      institution: string
      area?: string
      studyType?: string
      startDate?: string
      endDate?: string
      score?: string
      courses?: string[]
    }) => ipcRenderer.invoke('education:create', data),
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
    ) => ipcRenderer.invoke('education:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('education:delete', id),
  },
  volunteer: {
    list: () => ipcRenderer.invoke('volunteer:list'),
    create: (data: {
      organization: string
      position?: string
      startDate?: string
      endDate?: string
      summary?: string
      highlights?: string[]
    }) => ipcRenderer.invoke('volunteer:create', data),
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
    ) => ipcRenderer.invoke('volunteer:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('volunteer:delete', id),
  },
  awards: {
    list: () => ipcRenderer.invoke('awards:list'),
    create: (data: { title: string; date?: string; awarder?: string; summary?: string }) =>
      ipcRenderer.invoke('awards:create', data),
    update: (
      id: number,
      data: { title?: string; date?: string | null; awarder?: string; summary?: string },
    ) => ipcRenderer.invoke('awards:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('awards:delete', id),
  },
  publications: {
    list: () => ipcRenderer.invoke('publications:list'),
    create: (data: {
      name: string
      publisher?: string
      releaseDate?: string
      url?: string
      summary?: string
    }) => ipcRenderer.invoke('publications:create', data),
    update: (
      id: number,
      data: {
        name?: string
        publisher?: string
        releaseDate?: string | null
        url?: string
        summary?: string
      },
    ) => ipcRenderer.invoke('publications:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('publications:delete', id),
  },
  languages: {
    list: () => ipcRenderer.invoke('languages:list'),
    create: (data: { language: string; fluency?: string }) =>
      ipcRenderer.invoke('languages:create', data),
    update: (id: number, data: { language?: string; fluency?: string }) =>
      ipcRenderer.invoke('languages:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('languages:delete', id),
  },
  interests: {
    list: () => ipcRenderer.invoke('interests:list'),
    create: (data: { name: string; keywords?: string[] }) =>
      ipcRenderer.invoke('interests:create', data),
    update: (id: number, data: { name?: string; keywords?: string[] }) =>
      ipcRenderer.invoke('interests:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('interests:delete', id),
  },
  references: {
    list: () => ipcRenderer.invoke('references:list'),
    create: (data: { name: string; reference?: string }) =>
      ipcRenderer.invoke('references:create', data),
    update: (id: number, data: { name?: string; reference?: string }) =>
      ipcRenderer.invoke('references:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('references:delete', id),
  },
  import_: {
    parse: () => ipcRenderer.invoke('import:parseResumeJson'),
    confirmReplace: (data: unknown) => ipcRenderer.invoke('import:confirmReplace', data),
  },
  themes: {
    renderHtml: (variantId: number, themeKey: string) =>
      ipcRenderer.invoke('themes:renderHtml', variantId, themeKey),
    renderSnapshotHtml: (themeKey: string, snapshotData: unknown) =>
      ipcRenderer.invoke('themes:renderSnapshotHtml', themeKey, snapshotData),
    list: () => ipcRenderer.invoke('themes:list'),
  },
  settings: {
    getAi: () => ipcRenderer.invoke('settings:getAi'),
    setAi: (data: { provider: string; model: string; apiKey: string }) =>
      ipcRenderer.invoke('settings:setAi', data),
    testAi: () => ipcRenderer.invoke('settings:testAi'),
    listModels: () => ipcRenderer.invoke('settings:listModels'),
  },
  ai: {
    analyze: (jobPostingId: number, variantId: number) =>
      ipcRenderer.invoke('ai:analyze', jobPostingId, variantId),
    onProgress: (cb: (phase: string, pct: number, data?: unknown) => void) =>
      ipcRenderer.on('ai:progress', (_, phase, pct, data) => cb(phase, pct, data)),
    offProgress: () => ipcRenderer.removeAllListeners('ai:progress'),
    acceptSuggestion: (analysisId: number, bulletId: number, text: string) =>
      ipcRenderer.invoke('ai:acceptSuggestion', analysisId, bulletId, text),
    dismissSuggestion: (analysisId: number, bulletId: number) =>
      ipcRenderer.invoke('ai:dismissSuggestion', analysisId, bulletId),
  },
  jobPostings: {
    list: () => ipcRenderer.invoke('jobPostings:list'),
    create: (data: { company: string; role: string; rawText: string }) =>
      ipcRenderer.invoke('jobPostings:create', data),
    delete: (id: number) => ipcRenderer.invoke('jobPostings:delete', id),
    getAnalysis: (id: number) => ipcRenderer.invoke('jobPostings:getAnalysis', id),
    updateAnalysisStatus: (analysisId: number, status: string) =>
      ipcRenderer.invoke('jobPostings:updateAnalysisStatus', analysisId, status),
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
