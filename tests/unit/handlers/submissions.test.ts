import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../helpers/db'
import {
  seedJob,
  seedJobWithBullets,
  seedVariant,
  seedJobPosting,
  seedAnalysis,
  seedBulletOverride,
  seedSubmission,
  seedSkill,
  updateProfile,
} from '../../helpers/factories'
import {
  buildSnapshotForVariant,
  listSubmissions,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  updateStatus,
  getEvents,
  addEvent,
  getSubmissionMetrics,
} from '../../../src/main/handlers/submissions'
import * as schema from '../../../src/main/db/schema'
import { eq } from 'drizzle-orm'

describe('buildSnapshotForVariant', () => {
  it('returns snapshot with layoutTemplate matching seeded variant', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, { layoutTemplate: 'modern' })
    const snapshot = await buildSnapshotForVariant(db, variant.id)
    expect(snapshot.layoutTemplate).toBe('modern')
  })

  it('snapshot.profile contains empty strings from sentinel row on fresh DB', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const snapshot = await buildSnapshotForVariant(db, variant.id)
    expect(snapshot.profile).toBeDefined()
    expect(snapshot.profile?.name).toBe('')
    expect(snapshot.profile?.email).toBe('')
    expect(snapshot.profile?.phone).toBe('')
  })

  it('snapshot.profile reflects updated profile data', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    updateProfile(db, { name: 'Alice', email: 'alice@test.com', phone: '555', location: 'NYC', linkedin: 'li', summary: 'Senior dev' })
    const snapshot = await buildSnapshotForVariant(db, variant.id)
    expect(snapshot.profile?.name).toBe('Alice')
    expect(snapshot.profile?.email).toBe('alice@test.com')
    expect(snapshot.profile?.location).toBe('NYC')
    expect(snapshot.profile?.summary).toBe('Senior dev')
  })

  it('includes seeded jobs with bullets in snapshot', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const { job, bullets } = seedJobWithBullets(db, ['Bullet 1', 'Bullet 2'])
    const snapshot = await buildSnapshotForVariant(db, variant.id)
    expect(snapshot.jobs).toHaveLength(1)
    expect(snapshot.jobs[0].id).toBe(job.id)
    expect(snapshot.jobs[0].bullets).toHaveLength(2)
    void bullets
  })

  it('applies variant exclusions to snapshot bullets', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const { bullets } = seedJobWithBullets(db, ['Bullet A', 'Bullet B'])
    // Manually insert exclusion row
    db.insert(schema.templateVariantItems).values({
      variantId: variant.id,
      itemType: 'bullet',
      bulletId: bullets[0].id,
      excluded: true,
    }).run()
    const snapshot = await buildSnapshotForVariant(db, variant.id)
    expect(snapshot.jobs[0].bullets[0].excluded).toBe(true)
    expect(snapshot.jobs[0].bullets[1].excluded).toBe(false)
  })

  it('merges analysis bullet overrides into snapshot when analysisId provided', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const { bullets } = seedJobWithBullets(db, ['Original text'])
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)
    seedBulletOverride(db, analysis.id, bullets[0].id, { overrideText: 'Enhanced text' })
    const snapshot = await buildSnapshotForVariant(db, variant.id, analysis.id)
    expect(snapshot.jobs[0].bullets[0].text).toBe('Enhanced text')
  })

  it('merges accepted skill additions into snapshot skills when analysisId provided', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id)
    // Insert an accepted skill addition
    db.insert(schema.analysisSkillAdditions).values({
      analysisId: analysis.id,
      skillName: 'Kubernetes',
      reason: 'Required by job',
      category: 'DevOps',
      status: 'accepted',
    }).run()
    const snapshot = await buildSnapshotForVariant(db, variant.id, analysis.id)
    const addedSkill = snapshot.skills.find((s) => s.name === 'Kubernetes')
    expect(addedSkill).toBeDefined()
    expect(addedSkill?.id).toBe(-1)
    expect(addedSkill?.excluded).toBe(false)
  })

  it('showSummary defaults to true when no summary exclusion row exists', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const snapshot = await buildSnapshotForVariant(db, variant.id)
    expect(snapshot.templateOptions?.showSummary).toBe(true)
  })

  it('showSummary is false when summary exclusion row exists', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    db.insert(schema.templateVariantItems).values({ variantId: variant.id, itemType: 'summary', excluded: true }).run()
    const snapshot = await buildSnapshotForVariant(db, variant.id)
    expect(snapshot.templateOptions?.showSummary).toBe(false)
  })
})

describe('submission CRUD', () => {
  it('listSubmissions returns empty array on fresh DB', async () => {
    const db = createTestDb()
    const result = await listSubmissions(db)
    expect(result).toEqual([])
  })

  it('createSubmission with variantId=null returns row with empty snapshot', async () => {
    const db = createTestDb()
    const result = await createSubmission(db, {
      company: 'ACME',
      role: 'Engineer',
      variantId: null,
    })
    expect(result.id).toBeTypeOf('number')
    expect(result.company).toBe('ACME')
    const snapshot = JSON.parse(result.resumeSnapshot)
    expect(snapshot.layoutTemplate).toBe('traditional')
  })

  it('createSubmission with variantId triggers buildSnapshotForVariant and stores snapshot with job', async () => {
    const db = createTestDb()
    const variant = seedVariant(db)
    const { job } = seedJobWithBullets(db, ['Bullet 1'])
    const result = await createSubmission(db, {
      company: 'Tech Co',
      role: 'Dev',
      variantId: variant.id,
    })
    const snapshot = JSON.parse(result.resumeSnapshot)
    expect(snapshot.jobs).toHaveLength(1)
    expect(snapshot.jobs[0].id).toBe(job.id)
  })

  it('createSubmission creates initial submissionEvent', async () => {
    const db = createTestDb()
    const result = await createSubmission(db, {
      company: 'ACME',
      role: 'Eng',
      variantId: null,
    })
    const events = db.select().from(schema.submissionEvents).where(eq(schema.submissionEvents.submissionId, result.id)).all()
    expect(events).toHaveLength(1)
    expect(events[0].status).toBe('applied')
  })

  it('updateSubmission changes company name', async () => {
    const db = createTestDb()
    const row = seedSubmission(db, { company: 'Old Co' })
    await updateSubmission(db, row.id, { company: 'New Co' })
    const list = await listSubmissions(db)
    expect(list[0].company).toBe('New Co')
  })

  it('deleteSubmission removes the row', async () => {
    const db = createTestDb()
    const row = seedSubmission(db)
    await deleteSubmission(db, row.id)
    const list = await listSubmissions(db)
    expect(list).toHaveLength(0)
  })
})

describe('pipeline events', () => {
  it('updateStatus changes status field and creates event', async () => {
    const db = createTestDb()
    const row = seedSubmission(db, { status: 'applied' })
    await updateStatus(db, row.id, 'screening', 'Phone screen scheduled')
    const list = await listSubmissions(db)
    expect(list[0].status).toBe('screening')
    const events = db.select().from(schema.submissionEvents).all()
    const screeningEvent = events.find((e) => e.status === 'screening')
    expect(screeningEvent).toBeDefined()
    expect(screeningEvent?.note).toBe('Phone screen scheduled')
  })

  it('getEvents returns events in desc order by id', async () => {
    const db = createTestDb()
    const row = seedSubmission(db)
    const firstEvent = await addEvent(db, { submissionId: row.id, status: 'screening' })
    const secondEvent = await addEvent(db, { submissionId: row.id, status: 'interview' })
    const events = await getEvents(db, row.id)
    // Events are ordered desc — second event (higher id) should appear first
    expect(events[0].id).toBe(secondEvent.id)
    expect(events[1].id).toBe(firstEvent.id)
  })

  it('addEvent inserts new event row', async () => {
    const db = createTestDb()
    const row = seedSubmission(db)
    const event = await addEvent(db, { submissionId: row.id, status: 'offer', note: 'Got the offer!' })
    expect(event.id).toBeTypeOf('number')
    expect(event.status).toBe('offer')
    expect(event.note).toBe('Got the offer!')
  })
})

describe('metrics', () => {
  it('returns zeros on empty DB', async () => {
    const db = createTestDb()
    const result = await getSubmissionMetrics(db)
    expect(result).toEqual({
      total: 0,
      thisMonth: 0,
      active: 0,
      responseRate: 0,
      respondedCount: 0,
      avgScore: null,
      respondedAvgScore: null,
    })
  })

  it('computes total, responseRate, active, avgScore correctly with seeded data', async () => {
    const db = createTestDb()
    const now = new Date()
    // Submission 1: applied this month, no score
    seedSubmission(db, { status: 'applied', submittedAt: now })
    // Submission 2: screening this month (active), no score
    seedSubmission(db, { status: 'screening', submittedAt: now })
    // Submission 3: interview this month (active + responded), scoreAtSubmit=85
    seedSubmission(db, { status: 'interview', submittedAt: now, scoreAtSubmit: 85 })

    const result = await getSubmissionMetrics(db)
    expect(result.total).toBe(3)
    expect(result.thisMonth).toBe(3)
    expect(result.active).toBe(2) // screening + interview
    expect(result.respondedCount).toBe(2) // screening + interview (not 'applied')
    expect(result.responseRate).toBe(67) // 2/3 rounded
    expect(result.avgScore).toBe(85) // only submission 3 has score
    expect(result.respondedAvgScore).toBe(85) // interview submission has score
  })
})
