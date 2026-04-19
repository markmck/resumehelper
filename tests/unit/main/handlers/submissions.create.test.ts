import { describe, test, expect } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import { seedJob, seedBullet, seedVariant, updateProfile } from '../../../helpers/factories'
import { createSubmission } from '../../../../src/main/handlers/submissions'
import { submissions } from '../../../../src/main/db/schema'
import { eq } from 'drizzle-orm'

describe('createSubmission', () => {
  test('stores a valid JSON snapshot that round-trips correctly through SQLite', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Round Trip',
      email: 'rt@test.com',
      phone: '555-9999',
      location: 'LA',
      linkedin: 'rtuser',
    })

    const job = seedJob(db, { company: 'RoundCo', role: 'Tester' })
    seedBullet(db, job.id, { text: 'Round trip bullet' })

    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    await createSubmission(db, { company: 'RoundCo', role: 'Tester', variantId: variant.id })

    const rows = db.select().from(submissions).where(eq(submissions.company, 'RoundCo')).all()
    expect(rows.length).toBeGreaterThanOrEqual(1)

    const row = rows[0]
    expect(row.resumeSnapshot).toBeTruthy()

    // JSON round-trip — if this throws, snapshot is malformed
    const snapshot = JSON.parse(row.resumeSnapshot)

    // Snapshot shape assertions
    expect(typeof snapshot.layoutTemplate).toBe('string')
    expect(snapshot.layoutTemplate).toBe('classic')

    expect(snapshot.profile).toBeDefined()
    expect(snapshot.profile.name).toBe('Round Trip')

    expect(Array.isArray(snapshot.jobs)).toBe(true)
    expect(snapshot.jobs.length).toBeGreaterThanOrEqual(1)
    expect(snapshot.jobs[0].company).toBe('RoundCo')

    expect(Array.isArray(snapshot.jobs[0].bullets)).toBe(true)
    expect(snapshot.jobs[0].bullets.length).toBeGreaterThanOrEqual(1)
    expect(snapshot.jobs[0].bullets[0].text).toBe('Round trip bullet')

    expect(Array.isArray(snapshot.skills)).toBe(true)
    expect(Array.isArray(snapshot.projects)).toBe(true)
    expect(Array.isArray(snapshot.education)).toBe(true)
  })
})
