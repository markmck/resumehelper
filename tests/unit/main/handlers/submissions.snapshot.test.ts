import { describe, test, expect } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import {
  seedJob,
  seedBullet,
  seedVariant,
  seedSkill,
  seedSkillCategory,
  seedProject,
  seedProjectBullet,
  updateProfile,
} from '../../../helpers/factories'
import { buildSnapshotForVariant } from '../../../../src/main/handlers/submissions'
import { templateVariantItems, education } from '../../../../src/main/db/schema'

describe('buildSnapshotForVariant', () => {
  test('snapshot contains all required shape fields', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
    })

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    seedBullet(db, job.id, { text: 'Built features' })

    const cat = seedSkillCategory(db)
    seedSkill(db, { categoryId: cat.id })

    const project = seedProject(db)
    seedProjectBullet(db, project.id)

    db.insert(education).values({
      institution: 'MIT',
      area: 'CS',
      studyType: 'BS',
      startDate: '2020',
      endDate: '2024',
    }).run()

    const variant = seedVariant(db, {
      layoutTemplate: 'modern',
      templateOptions: JSON.stringify({ accentColor: '#2563EB', marginTop: 0.75 }),
    })

    const snapshot = await buildSnapshotForVariant(db, variant.id)

    expect(snapshot.layoutTemplate).toBe('modern')
    expect(snapshot.templateOptions).toBeDefined()
    expect(snapshot.templateOptions!.accentColor).toBe('#2563EB')

    expect(snapshot.profile).toBeDefined()
    expect(snapshot.profile!.name).toBe('Jane Doe')
    expect(snapshot.profile!.email).toBe('jane@test.com')
    expect(snapshot.profile!.phone).toBe('555-1234')
    expect(snapshot.profile!.location).toBe('NYC')
    expect(snapshot.profile!.linkedin).toBe('janedoe')

    expect(Array.isArray(snapshot.jobs)).toBe(true)
    expect(snapshot.jobs.length).toBeGreaterThanOrEqual(1)
    expect(snapshot.jobs[0].company).toBe('TestCo')
    expect(Array.isArray(snapshot.jobs[0].bullets)).toBe(true)
    expect(snapshot.jobs[0].bullets.length).toBeGreaterThanOrEqual(1)

    expect(Array.isArray(snapshot.skills)).toBe(true)
    expect(snapshot.skills.length).toBeGreaterThanOrEqual(1)

    expect(Array.isArray(snapshot.projects)).toBe(true)
    expect(snapshot.projects.length).toBeGreaterThanOrEqual(1)

    expect(Array.isArray(snapshot.education)).toBe(true)
    expect(snapshot.education.length).toBeGreaterThanOrEqual(1)

    expect(Array.isArray(snapshot.volunteer)).toBe(true)
    expect(Array.isArray(snapshot.awards)).toBe(true)
    expect(Array.isArray(snapshot.publications)).toBe(true)
    expect(Array.isArray(snapshot.languages)).toBe(true)
    expect(Array.isArray(snapshot.interests)).toBe(true)
    expect(Array.isArray(snapshot.references)).toBe(true)
  })

  test('exclusion filtering marks excluded job with excluded:true and included job with excluded:false', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
    })

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    seedBullet(db, job.id, { text: 'Built features' })

    const job2 = seedJob(db, { company: 'KeepCo', role: 'Lead', startDate: '2023-01' })
    seedBullet(db, job2.id, { text: 'Kept bullet' })

    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    // Insert exclusion row for job (TestCo) — excluded: true
    db.insert(templateVariantItems).values({
      variantId: variant.id,
      itemType: 'job',
      jobId: job.id,
      excluded: true,
    }).run()

    const snapshot = await buildSnapshotForVariant(db, variant.id)

    // The snapshot preserves all items with their excluded flags.
    // Actual filtering happens at render time via filterResumeData.
    const testCoJob = snapshot.jobs.find((j) => j.company === 'TestCo')
    const keepCoJob = snapshot.jobs.find((j) => j.company === 'KeepCo')

    expect(testCoJob).toBeDefined()
    expect(testCoJob!.excluded).toBe(true)

    expect(keepCoJob).toBeDefined()
    expect(keepCoJob!.excluded).toBe(false)
  })
})
