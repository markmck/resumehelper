import { ipcMain } from 'electron'

export function registerAiHandlers(): void {
  // Stub — will be implemented in Phase 9/10
  ipcMain.handle('ai:analyze', async () => {
    return { error: 'AI provider not configured', code: 'NOT_CONFIGURED' }
  })

  // Stub — will be implemented in Phase 9/10
  ipcMain.handle('ai:acceptSuggestion', async () => {
    return { error: 'AI provider not configured', code: 'NOT_CONFIGURED' }
  })

  // Stub — will be implemented in Phase 9/10
  ipcMain.handle('ai:dismissSuggestion', async () => {
    return { error: 'AI provider not configured', code: 'NOT_CONFIGURED' }
  })
}
