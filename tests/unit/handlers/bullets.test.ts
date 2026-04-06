import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../helpers/db'
import { seedJob, seedBullet } from '../../helpers/factories'
import { createBullet, updateBullet, deleteBullet, reorderBullets } from '../../../src/main/handlers/bullets'
import { jobBullets } from '../../../src/main/db/schema'
import { eq } from 'drizzle-orm'

describe('bullets handler', () => {
  it('createBullet inserts row linked to jobId and returns it', async () => {
    const db = createTestDb()
    const job = seedJob(db)
    const bullet = await createBullet(db, { jobId: job.id, text: 'My bullet', sortOrder: 0 })
    expect(bullet).toMatchObject({ jobId: job.id, text: 'My bullet', sortOrder: 0 })
    expect(bullet.id).toBeTypeOf('number')
  })

  it('updateBullet changes text and sets updatedAt', async () => {
    const db = createTestDb()
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id, { text: 'original text' })
    const updated = await updateBullet(db, bullet.id, { text: 'updated text' })
    expect(updated.text).toBe('updated text')
    expect(updated.updatedAt).not.toBeNull()
  })

  it('deleteBullet removes the bullet row', async () => {
    const db = createTestDb()
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id)
    await deleteBullet(db, bullet.id)
    const remaining = db.select().from(jobBullets).where(eq(jobBullets.id, bullet.id)).all()
    expect(remaining).toHaveLength(0)
  })

  it('reorderBullets updates sortOrder for each id', async () => {
    const db = createTestDb()
    const job = seedJob(db)
    const b1 = seedBullet(db, job.id, { text: 'first', sortOrder: 0 })
    const b2 = seedBullet(db, job.id, { text: 'second', sortOrder: 1 })
    await reorderBullets(db, job.id, [b2.id, b1.id])
    const rows = db.select().from(jobBullets).all()
    const b1Updated = rows.find(r => r.id === b1.id)!
    const b2Updated = rows.find(r => r.id === b2.id)!
    expect(b2Updated.sortOrder).toBe(0)
    expect(b1Updated.sortOrder).toBe(1)
  })
})
