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
  seedJobPosting,
  seedAnalysis,
} from '../../../helpers/factories'
import { buildSnapshotForVariant, createSubmission } from '../../../../src/main/handlers/submissions'
import { templateVariantItems, education, entityOverrides, submissions } from '../../../../src/main/db/schema'
import { setAnalysisMargins, setVariantOptions } from '../../../../src/main/handlers/templates'
import { eq } from 'drizzle-orm'

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

// Phase 36 Wave-0 RED — OVR-03: snapshots freeze the variant-tier override, not base text.
// These cases are RED until Plan 02/04 thread summaryOverride + bullet overrides through
// buildMergedBuilderData / buildSnapshotForVariant. All fixtures set analysisId literally
// to null for variant-tier rows; never eq(col, null).
describe('buildSnapshotForVariant — OVR-03 override freezing', () => {
  test('OVR-03 (a): snapshot.profile.summary equals a variant-tier summary override (not profile.summary)', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
      summary: 'Base profile summary',
    })

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    seedBullet(db, job.id, { text: 'Built features' })

    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: null, // variant-tier
      entityType: 'summary',
      field: 'text',
      overrideText: 'Variant summary override',
      source: 'user',
    }).run()

    const snapshot = await buildSnapshotForVariant(db, variant.id)

    expect(snapshot.profile).toBeDefined()
    expect(snapshot.profile!.summary).toBe('Variant summary override')
  })

  test('OVR-03 (b): snapshot freezes a variant-tier job_bullet override text', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
    })

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    const bullet = seedBullet(db, job.id, { text: 'Base bullet text' })

    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: null, // variant-tier
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Override bullet text',
      source: 'user',
    }).run()

    const snapshot = await buildSnapshotForVariant(db, variant.id)

    const frozenJob = snapshot.jobs.find((j) => j.company === 'TestCo')
    expect(frozenJob).toBeDefined()
    const frozenBullet = frozenJob!.bullets.find((b) => b.id === bullet.id)
    expect(frozenBullet).toBeDefined()
    expect(frozenBullet!.text).toBe('Override bullet text')
  })

  test('OVR-03 (c): baseline — no override → snapshot.profile.summary equals profile.summary', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
      summary: 'Base profile summary',
    })

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    seedBullet(db, job.id, { text: 'Built features' })

    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    const snapshot = await buildSnapshotForVariant(db, variant.id)

    expect(snapshot.profile).toBeDefined()
    expect(snapshot.profile!.summary).toBe('Base profile summary')
  })
})

// ---------------------------------------------------------------------------
// SC#3 / LAYOUT-04 — effectiveMargins freeze + DB-persisted immutability
// buildSnapshotForVariant must freeze effectiveMargins.top/bottom/sides into
// templateOptions.marginTop/Bottom/Sides so snapshots carry the exact margins
// that were resolved at submission time, immutably.
// ---------------------------------------------------------------------------
describe('buildSnapshotForVariant — LAYOUT-04 effectiveMargins freeze', () => {
  test('FREEZE: buildSnapshotForVariant freezes analysis override triple into templateOptions.margin*', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
    })

    const variant = seedVariant(db, {
      layoutTemplate: 'classic',
      templateOptions: JSON.stringify({ marginTop: 0.75, marginBottom: 0.75, marginSides: 0.75 }),
    })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Set a distinct override triple
    await setAnalysisMargins(db, analysis.id, { marginTop: 0.5, marginBottom: 0.4, marginSides: 0.6 })

    const snapshot = await buildSnapshotForVariant(db, variant.id, analysis.id)

    // Snapshot must freeze the override triple, not the variant defaults
    expect(snapshot.templateOptions).toBeDefined()
    expect(snapshot.templateOptions!.marginTop).toBe(0.5)
    expect(snapshot.templateOptions!.marginBottom).toBe(0.4)
    expect(snapshot.templateOptions!.marginSides).toBe(0.6)
  })

  test('FREEZE (no override): buildSnapshotForVariant freezes variant templateOptions margins when no override exists', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
    })

    const variant = seedVariant(db, {
      layoutTemplate: 'classic',
      templateOptions: JSON.stringify({ marginTop: 0.8, marginBottom: 0.9, marginSides: 0.7 }),
    })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })
    // No setAnalysisMargins call — no override row

    const snapshot = await buildSnapshotForVariant(db, variant.id, analysis.id)

    // Snapshot must freeze the variant's margins (tier 2 fallback)
    expect(snapshot.templateOptions).toBeDefined()
    expect(snapshot.templateOptions!.marginTop).toBe(0.8)
    expect(snapshot.templateOptions!.marginBottom).toBe(0.9)
    expect(snapshot.templateOptions!.marginSides).toBe(0.7)
  })

  test('DB-PERSISTED IMMUTABILITY: persisted resumeSnapshot is immutable to later variant margin edits', async () => {
    const db = createTestDb()

    updateProfile(db, {
      name: 'Jane Doe',
      email: 'jane@test.com',
      phone: '555-1234',
      location: 'NYC',
      linkedin: 'janedoe',
    })

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    seedBullet(db, job.id, { text: 'Built something' })

    const variant = seedVariant(db, {
      layoutTemplate: 'classic',
      templateOptions: JSON.stringify({ marginTop: 0.75, marginBottom: 0.75, marginSides: 0.75 }),
    })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Step 1: Set an override triple and create a submission (persists snapshot to DB)
    await setAnalysisMargins(db, analysis.id, { marginTop: 0.5, marginBottom: 0.4, marginSides: 0.6 })
    const created = await createSubmission(db, {
      company: 'ImmutableCo',
      role: 'Engineer',
      variantId: variant.id,
      analysisId: analysis.id,
    })

    // Step 2: Mutate the variant's margins to clearly different values
    await setVariantOptions(db, variant.id, { marginTop: 1.5, marginBottom: 1.6, marginSides: 1.7 })

    // Step 3: Re-read the persisted row from the DB and JSON.parse it
    const [persistedRow] = await db
      .select({ resumeSnapshot: submissions.resumeSnapshot })
      .from(submissions)
      .where(eq(submissions.id, created.id))

    expect(persistedRow).toBeDefined()
    const parsedSnapshot = JSON.parse(persistedRow.resumeSnapshot)

    // Step 4: Assert frozen margins are STILL the override triple (not the mutated variant values)
    expect(parsedSnapshot.templateOptions.marginTop).toBe(0.5)
    expect(parsedSnapshot.templateOptions.marginBottom).toBe(0.4)
    expect(parsedSnapshot.templateOptions.marginSides).toBe(0.6)
    // Confirm we're NOT seeing the mutated variant margins
    expect(parsedSnapshot.templateOptions.marginTop).not.toBe(1.5)
    expect(parsedSnapshot.templateOptions.marginBottom).not.toBe(1.6)
    expect(parsedSnapshot.templateOptions.marginSides).not.toBe(1.7)
  })
})
