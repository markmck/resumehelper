import { ipcMain } from 'electron'

export function registerJobPostingHandlers(): void {
  // Stub — will be implemented in Phase 9
  ipcMain.handle('jobPostings:list', async () => {
    return { error: 'Not yet implemented', code: 'NOT_CONFIGURED' }
  })

  // Stub — will be implemented in Phase 9
  ipcMain.handle('jobPostings:create', async () => {
    return { error: 'Not yet implemented', code: 'NOT_CONFIGURED' }
  })

  // Stub — will be implemented in Phase 9
  ipcMain.handle('jobPostings:delete', async () => {
    return { error: 'Not yet implemented', code: 'NOT_CONFIGURED' }
  })

  // Stub — will be implemented in Phase 9
  ipcMain.handle('jobPostings:getAnalysis', async () => {
    return { error: 'Not yet implemented', code: 'NOT_CONFIGURED' }
  })
}
