import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@renderer': resolve(import.meta.dirname, 'src/renderer/src'),
      '@shared': resolve(import.meta.dirname, 'src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    alias: {
      electron: resolve(import.meta.dirname, 'tests/__mocks__/electron.ts'),
      '@electron-toolkit/utils': resolve(import.meta.dirname, 'tests/__mocks__/@electron-toolkit/utils.ts'),
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
