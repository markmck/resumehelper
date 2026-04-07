// Minimal mock for @electron-toolkit/utils
// Used in tests to avoid loading the real module which requires a live Electron runtime.
export const is = {
  dev: true,
}

export const platform = {
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
}

export const electronApp = {
  setAppUserModelId: () => {},
  setAutoLaunch: () => false,
}
