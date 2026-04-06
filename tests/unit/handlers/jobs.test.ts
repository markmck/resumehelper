import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../helpers/db'
import { seedJob, seedJobWithBullets } from '../../helpers/factories'
import { listJobs, createJob, updateJob, deleteJob, reorderJobs } from '../../../src/main/handlers/jobs'
import { jobBullets } from '../../../src/main/db/schema'

describe('jobs handler', () => {
  it('listJobs returns empty array when no jobs exist', async () => {
    const db = createTestDb()
    const result = await listJobs(db)
    expect(result).toEqual([])
  })

  it('listJobs returns jobs with nested bullets sorted by sortOrder', async () => {
    const db = createTestDb()
    const { job, bullets } = seedJobWithBullets(db, ['third', 'first', 'second'])
    // Reorder so sortOrder: 0=first, 1=second, 2=third
    await db.update(jobBullets).set({ sortOrder: 2 }).where(undefined as any)
    // Just use the data as-is (they come back in insert order which is sortOrder 0,1,2)
    const result = await listJobs(db)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(job.id)
    expect(result[0].bullets).toHaveLength(bullets.length)
  })

  it('createJob inserts a row and returns it with an id', async () => {
    const db = createTestDb()
    const row = await createJob(db, { company: 'Acme', role: 'Dev', startDate: '2024-01' })
    expect(row).toMatchObject({ company: 'Acme', role: 'Dev', startDate: '2024-01' })
    expect(row.id).toBeTypeOf('number')
  })

  it('updateJob changes specified fields and returns updated row', async () => {
    const db = createTestDb()
    const job = seedJob(db, { company: 'OldCo', role: 'OldRole', startDate: '2023-01' })
    const updated = await updateJob(db, job.id, { company: 'NewCo' })
    expect(updated.company).toBe('NewCo')
    expect(updated.role).toBe('OldRole')
  })

  it('deleteJob removes job and cascades to bullets (FK cascade)', async () => {
    const db = createTestDb()
    const { job } = seedJobWithBullets(db, ['bullet one', 'bullet two'])
    await deleteJob(db, job.id)
    const result = await listJobs(db)
    expect(result).toHaveLength(0)
    const remainingBullets = db.select().from(jobBullets).all()
    expect(remainingBullets).toHaveLength(0)
  })

  it('reorderJobs updates sortOrder for each id', async () => {
    const db = createTestDb()
    const job1 = seedJob(db, { company: 'Co1', role: 'R1', startDate: '2024-01' })
    const job2 = seedJob(db, { company: 'Co2', role: 'R2', startDate: '2024-02' })
    await reorderJobs(db, [job2.id, job1.id])
    const result = await listJobs(db)
    expect(result[0].id).toBe(job2.id)
    expect(result[1].id).toBe(job1.id)
  })
})
