import { describe, it, expect } from 'vitest'
import { getSetting, setSetting } from '../../../../src/main/lib/settings'
import { createTestDb } from '../../../helpers/db'

describe('settings k/v helpers', () => {
  it('round-trips a string value', () => {
    const db = createTestDb()
    setSetting(db, 'lastExportDir', '/home/user/Documents')
    expect(getSetting(db, 'lastExportDir')).toBe('/home/user/Documents')
  })

  it('returns undefined for missing key', () => {
    const db = createTestDb()
    expect(getSetting(db, 'nonexistent')).toBeUndefined()
  })

  it('overwrites existing key via UPSERT', () => {
    const db = createTestDb()
    setSetting(db, 'lastExportDir', '/old')
    setSetting(db, 'lastExportDir', '/new')
    expect(getSetting(db, 'lastExportDir')).toBe('/new')
  })
})
