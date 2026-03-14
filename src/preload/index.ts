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
