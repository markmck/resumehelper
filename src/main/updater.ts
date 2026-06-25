import { app, dialog, BrowserWindow } from 'electron'
import updaterPkg from 'electron-updater'

const { autoUpdater } = updaterPkg

/**
 * Wires up auto-update against the GitHub Releases feed configured in
 * electron-builder.yml. Strategy: check on startup, download in the
 * background, then prompt the user to restart once the update is ready.
 *
 * No-ops in dev / unpackaged builds, where there is no update feed.
 */
export function initAutoUpdater(getWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return

  // We drive the prompt ourselves, so let it download automatically but
  // never install without asking.
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('error', (err) => {
    // Update failures should never crash or block the app — just log them.
    console.error('[updater] error:', err)
  })

  autoUpdater.on('update-downloaded', async (info) => {
    const win = getWindow()
    const opts = {
      type: 'info' as const,
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `ResumeHelper ${info.version} has been downloaded.`,
      detail: 'Restart the app to finish installing the update.'
    }
    const { response } = win
      ? await dialog.showMessageBox(win, opts)
      : await dialog.showMessageBox(opts)

    if (response === 0) {
      // Ensure the app fully quits and relaunches into the new version.
      setImmediate(() => autoUpdater.quitAndInstall())
    }
  })

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] checkForUpdates failed:', err)
  })
}
