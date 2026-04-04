import { vi } from 'vitest'

export const app = {
  getPath: vi.fn().mockReturnValue('/tmp/test'),
  isPackaged: false,
  quit: vi.fn(),
  on: vi.fn(),
  whenReady: vi.fn().mockResolvedValue(undefined),
}

export const shell = {
  openExternal: vi.fn(),
}

export const BrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  show: vi.fn(),
  webContents: { openDevTools: vi.fn(), send: vi.fn() },
}))
// Static method on constructor
;(BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([])

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn(),
}

export const dialog = {
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  showSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
}

export const safeStorage = {
  isEncryptionAvailable: vi.fn().mockReturnValue(false),
  encryptString: vi.fn().mockImplementation((s: string) => Buffer.from(s)),
  decryptString: vi.fn().mockImplementation((b: Buffer) => b.toString()),
}

export const net = {
  fetch: vi.fn(),
}

export const contextBridge = {
  exposeInMainWorld: vi.fn(),
}

export const ipcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  send: vi.fn(),
}
