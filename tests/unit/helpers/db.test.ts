import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../helpers/db'
import * as schema from '../../../src/main/db/schema'

describe('createTestDb', () => {
  it('returns a Drizzle instance with schema applied', () => {
    const db = createTestDb()
    // Verify we can query a table that exists in the schema
    const result = db.query.jobs.findMany().sync()
    expect(result).toEqual([])
  })

  it('creates isolated databases per call', () => {
    const db1 = createTestDb()
    const db2 = createTestDb()
    // Insert into db1
    db1.insert(schema.jobs).values({
      company: 'Test Co',
      role: 'Engineer',
      startDate: '2024-01',
    }).run()
    // Verify db1 has the record and db2 is empty
    const db1Jobs = db1.query.jobs.findMany().sync()
    const db2Jobs = db2.query.jobs.findMany().sync()
    expect(db1Jobs).toHaveLength(1)
    expect(db2Jobs).toHaveLength(0)
  })
})
