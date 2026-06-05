import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { findBackups, deleteMostRecentBackup } from '../../../../src/main/db/backups'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-backup-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

/** Helper: write a file and set its mtime to a fixed epoch value */
function seedFile(name: string, mtimeMs: number): string {
  const p = path.join(tmpDir, name)
  fs.writeFileSync(p, 'x')
  fs.utimesSync(p, new Date(mtimeMs), new Date(mtimeMs))
  return p
}

describe('findBackups', () => {
  it('finds app.db.bak', () => {
    const p = seedFile('app.db.bak', 1000)
    const results = findBackups(tmpDir)
    expect(results).toHaveLength(1)
    expect(results[0].path).toBe(p)
  })

  it('finds app.db.bak.1 and app.db.bak.2', () => {
    seedFile('app.db.bak.1', 1000)
    seedFile('app.db.bak.2', 2000)
    const results = findBackups(tmpDir)
    expect(results).toHaveLength(2)
  })

  it('sorts newest-mtime-first', () => {
    seedFile('app.db.bak', 1000)
    seedFile('app.db.bak.1', 3000)
    seedFile('app.db.bak.2', 2000)
    const results = findBackups(tmpDir)
    expect(results[0].mtime).toBe(3000)
    expect(results[1].mtime).toBe(2000)
    expect(results[2].mtime).toBe(1000)
  })

  it('does not include unrelated files', () => {
    seedFile('app.db', 1000)
    seedFile('app.db.bak.txt', 2000)
    seedFile('other.bak', 3000)
    const results = findBackups(tmpDir)
    expect(results).toHaveLength(0)
  })

  it('does not include directories named app.db.bak', () => {
    fs.mkdirSync(path.join(tmpDir, 'app.db.bak'))
    const results = findBackups(tmpDir)
    expect(results).toHaveLength(0)
  })

  it('returns empty array when no backups exist', () => {
    expect(findBackups(tmpDir)).toEqual([])
  })
})

describe('deleteMostRecentBackup', () => {
  it('returns { deleted: null } when no backups exist', () => {
    const result = deleteMostRecentBackup(tmpDir)
    expect(result).toEqual({ deleted: null })
  })

  it('deletes the newest backup (highest mtime) and returns its path', () => {
    const p1 = seedFile('app.db.bak', 1000)
    const p2 = seedFile('app.db.bak.1', 3000)
    seedFile('app.db.bak.2', 2000)

    const result = deleteMostRecentBackup(tmpDir)
    expect(result).toEqual({ deleted: p2 })
    expect(fs.existsSync(p2)).toBe(false)
    expect(fs.existsSync(p1)).toBe(true)
  })

  it('deletes the single backup when only one exists', () => {
    const p = seedFile('app.db.bak', 1000)
    const result = deleteMostRecentBackup(tmpDir)
    expect(result).toEqual({ deleted: p })
    expect(fs.existsSync(p)).toBe(false)
  })

  it('subsequent call returns { deleted: null } once all deleted', () => {
    seedFile('app.db.bak', 1000)
    deleteMostRecentBackup(tmpDir)
    const result = deleteMostRecentBackup(tmpDir)
    expect(result).toEqual({ deleted: null })
  })
})
