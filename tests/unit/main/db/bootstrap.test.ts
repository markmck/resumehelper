import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Hoist the app mock so we can control getPath per test
const mockGetPath = vi.fn()
vi.mock('electron', () => ({
  app: { getPath: mockGetPath },
}))

import { resolveDbPath } from '../../../../src/main/db/bootstrap'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-bootstrap-test-'))
  mockGetPath.mockReturnValue(tmpDir)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

const bootstrapFile = () => path.join(tmpDir, 'db-location.json')
const defaultPath = () => path.join(tmpDir, 'app.db')

describe('resolveDbPath', () => {
  describe('source: bootstrap (happy path)', () => {
    it('returns bootstrap path when JSON is valid and file exists on disk', () => {
      // Create the target db file so existsSync passes
      const targetDb = path.join(tmpDir, 'custom', 'app.db')
      fs.mkdirSync(path.dirname(targetDb), { recursive: true })
      fs.writeFileSync(targetDb, '')
      fs.writeFileSync(
        bootstrapFile(),
        JSON.stringify({ version: 1, dbPath: targetDb }),
      )

      const result = resolveDbPath()
      expect(result.source).toBe('bootstrap')
      expect(result.path).toBe(targetDb)
    })
  })

  describe('source: default (no bootstrap JSON)', () => {
    it('returns default path when db-location.json is absent (ENOENT)', () => {
      const result = resolveDbPath()
      expect(result.source).toBe('default')
      expect(result.path).toBe(defaultPath())
    })
  })

  describe('source: fallback-corrupt (bad JSON)', () => {
    it('falls back when JSON is malformed', () => {
      fs.writeFileSync(bootstrapFile(), 'not valid json')
      const result = resolveDbPath()
      expect(result.source).toBe('fallback-corrupt')
      expect(result.path).toBe(defaultPath())
    })

    it('falls back when version is not 1', () => {
      fs.writeFileSync(
        bootstrapFile(),
        JSON.stringify({ version: 2, dbPath: '/some/path/app.db' }),
      )
      const result = resolveDbPath()
      expect(result.source).toBe('fallback-corrupt')
    })

    it('falls back when dbPath is not a string', () => {
      fs.writeFileSync(
        bootstrapFile(),
        JSON.stringify({ version: 1, dbPath: 42 }),
      )
      const result = resolveDbPath()
      expect(result.source).toBe('fallback-corrupt')
    })

    it('falls back when dbPath is not an absolute path', () => {
      fs.writeFileSync(
        bootstrapFile(),
        JSON.stringify({ version: 1, dbPath: 'relative/app.db' }),
      )
      const result = resolveDbPath()
      expect(result.source).toBe('fallback-corrupt')
    })
  })

  describe('source: fallback-missing (path not on disk)', () => {
    it('falls back when dbPath does not exist on disk', () => {
      fs.writeFileSync(
        bootstrapFile(),
        JSON.stringify({ version: 1, dbPath: path.join(tmpDir, 'nonexistent', 'app.db') }),
      )
      const result = resolveDbPath()
      expect(result.source).toBe('fallback-missing')
      expect(result.path).toBe(defaultPath())
    })
  })

  describe('never throws', () => {
    it('does not throw on unreadable bootstrap (DB-07, D-06)', () => {
      // Test fallback behavior — valid JSON but missing file already covered above.
      // Simulate a read error by writing garbage:
      fs.writeFileSync(bootstrapFile(), Buffer.from([0xff, 0xfe, 0x00]))
      expect(() => resolveDbPath()).not.toThrow()
    })
  })
})
