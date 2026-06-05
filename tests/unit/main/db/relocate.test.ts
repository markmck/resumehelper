import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createTmpDb } from '../../../helpers/tmpDb'
import { relocateDb } from '../../../../src/main/db/relocate'

let srcTmp: ReturnType<typeof createTmpDb>
let targetBaseDir: string
let userDataDir: string
const closeCurrentDb = vi.fn()

beforeEach(() => {
  srcTmp = createTmpDb()
  targetBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-target-'))
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-userdata-'))
  closeCurrentDb.mockReset()
  // Default: closeCurrentDb closes the source sqlite handle (WAL checkpoint)
  closeCurrentDb.mockImplementation(() => {
    srcTmp.sqlite.pragma('wal_checkpoint(TRUNCATE)')
    srcTmp.sqlite.close()
  })
})

afterEach(() => {
  try { srcTmp.sqlite.close() } catch { /* already closed */ }
  srcTmp.cleanup()
  fs.rmSync(targetBaseDir, { recursive: true, force: true })
  fs.rmSync(userDataDir, { recursive: true, force: true })
})

const bootstrapPath = () => path.join(userDataDir, 'db-location.json')
const targetPath = () => path.join(targetBaseDir, 'app.db')

describe('relocateDb', () => {
  describe('happy path (DB-03)', () => {
    it('returns ok:true with newPath and backupPath on successful relocation', () => {
      const result = relocateDb({
        sourcePath: srcTmp.path,
        targetDir: targetBaseDir,
        userDataDir,
        closeCurrentDb,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.newPath).toBe(targetPath())
      expect(result.backupPath).toBe(srcTmp.path + '.bak')
    })

    it('creates the target db file', () => {
      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      expect(fs.existsSync(targetPath())).toBe(true)
    })

    it('writes bootstrap JSON with version:1 and dbPath pointing to target', () => {
      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      const raw = fs.readFileSync(bootstrapPath(), 'utf-8')
      const parsed = JSON.parse(raw)
      expect(parsed.version).toBe(1)
      expect(parsed.dbPath).toBe(targetPath())
    })

    it('renames source to .bak', () => {
      const bak = srcTmp.path + '.bak'
      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      expect(fs.existsSync(bak)).toBe(true)
      expect(fs.existsSync(srcTmp.path)).toBe(false)
    })

    it('calls closeCurrentDb (WAL checkpoint + close) before copying (DB-03 / D-11)', () => {
      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      expect(closeCurrentDb).toHaveBeenCalledTimes(1)
    })

    it('target db opens as valid SQLite after copy (WAL flushed)', () => {
      // Insert a row BEFORE closing so WAL has content
      srcTmp.sqlite.exec(
        `INSERT INTO jobs (company, role, start_date) VALUES ('ACME', 'Dev', '2024-01-01')`
      )
      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      const verifyDb = new Database(targetPath(), { readonly: true, fileMustExist: true })
      const rows = verifyDb.prepare('SELECT * FROM jobs').all()
      verifyDb.close()
      expect(rows).toHaveLength(1)
    })
  })

  describe('numbered backup suffix (D-14)', () => {
    it('uses .bak.1 when .bak already exists', () => {
      // Pre-create .bak
      fs.writeFileSync(srcTmp.path + '.bak', 'old')
      const result = relocateDb({
        sourcePath: srcTmp.path,
        targetDir: targetBaseDir,
        userDataDir,
        closeCurrentDb,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.backupPath).toBe(srcTmp.path + '.bak.1')
      expect(fs.existsSync(srcTmp.path + '.bak.1')).toBe(true)
    })

    it('uses .bak.2 when .bak and .bak.1 already exist', () => {
      fs.writeFileSync(srcTmp.path + '.bak', 'old1')
      fs.writeFileSync(srcTmp.path + '.bak.1', 'old2')
      const result = relocateDb({
        sourcePath: srcTmp.path,
        targetDir: targetBaseDir,
        userDataDir,
        closeCurrentDb,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.backupPath).toBe(srcTmp.path + '.bak.2')
    })
  })

  describe('collision rollback (DB-04 / D-09)', () => {
    it('returns ok:false stage:collision when target app.db already exists', () => {
      // Pre-create target
      fs.writeFileSync(targetPath(), 'existing')
      const result = relocateDb({
        sourcePath: srcTmp.path,
        targetDir: targetBaseDir,
        userDataDir,
        closeCurrentDb,
      })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.stage).toBe('collision')
    })

    it('does NOT write bootstrap JSON on collision', () => {
      fs.writeFileSync(targetPath(), 'existing')
      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      expect(fs.existsSync(bootstrapPath())).toBe(false)
    })

    it('does not call closeCurrentDb on collision (source stays open)', () => {
      fs.writeFileSync(targetPath(), 'existing')
      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      expect(closeCurrentDb).not.toHaveBeenCalled()
    })
  })

  describe('verify failure (corrupt copy) — T-34-01 / DB-04', () => {
    it('returns ok:false stage:verify when copied file is corrupted', () => {
      // closeCurrentDb won't close the src handle in this mock to allow post-check
      closeCurrentDb.mockImplementation(() => {
        srcTmp.sqlite.pragma('wal_checkpoint(TRUNCATE)')
        srcTmp.sqlite.close()
      })

      // Intercept copyFileSync to corrupt the target after copy
      const originalCopy = fs.copyFileSync.bind(fs)
      vi.spyOn(fs, 'copyFileSync').mockImplementationOnce((src, dst) => {
        originalCopy(src as string, dst as string)
        // Corrupt the target bytes (overwrite header)
        const buf = fs.readFileSync(dst as string)
        buf.fill(0x00, 0, 16)
        fs.writeFileSync(dst as string, buf)
      })

      const result = relocateDb({
        sourcePath: srcTmp.path,
        targetDir: targetBaseDir,
        userDataDir,
        closeCurrentDb,
      })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.stage).toBe('verify')
    })

    it('deletes the corrupted target on verify failure', () => {
      closeCurrentDb.mockImplementation(() => {
        srcTmp.sqlite.pragma('wal_checkpoint(TRUNCATE)')
        srcTmp.sqlite.close()
      })

      const originalCopy = fs.copyFileSync.bind(fs)
      vi.spyOn(fs, 'copyFileSync').mockImplementationOnce((src, dst) => {
        originalCopy(src as string, dst as string)
        const buf = fs.readFileSync(dst as string)
        buf.fill(0x00, 0, 16)
        fs.writeFileSync(dst as string, buf)
      })

      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      expect(fs.existsSync(targetPath())).toBe(false)
    })

    it('does NOT write bootstrap JSON on verify failure', () => {
      closeCurrentDb.mockImplementation(() => {
        srcTmp.sqlite.pragma('wal_checkpoint(TRUNCATE)')
        srcTmp.sqlite.close()
      })

      const originalCopy = fs.copyFileSync.bind(fs)
      vi.spyOn(fs, 'copyFileSync').mockImplementationOnce((src, dst) => {
        originalCopy(src as string, dst as string)
        const buf = fs.readFileSync(dst as string)
        buf.fill(0x00, 0, 16)
        fs.writeFileSync(dst as string, buf)
      })

      relocateDb({ sourcePath: srcTmp.path, targetDir: targetBaseDir, userDataDir, closeCurrentDb })
      expect(fs.existsSync(bootstrapPath())).toBe(false)
    })
  })

  describe('stage union excludes probe', () => {
    it('only returns valid stage values (no probe stage)', () => {
      // Test collision stage
      fs.writeFileSync(targetPath(), 'x')
      const r = relocateDb({
        sourcePath: srcTmp.path,
        targetDir: targetBaseDir,
        userDataDir,
        closeCurrentDb,
      })
      if (!r.ok) {
        const validStages = ['collision', 'copy', 'verify', 'bootstrap', 'rename'] as const
        expect(validStages).toContain(r.stage)
        expect(r.stage).not.toBe('probe')
      }
    })
  })
})
