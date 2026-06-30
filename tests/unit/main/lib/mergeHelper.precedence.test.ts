/**
 * Phase 36 Wave-0 RED tests — OVR-02 merge precedence + D-01 analysis-scoped inclusion.
 *
 * These tests are the executable specification for Plans 02–04. They are EXPECTED to be
 * RED until the override-merge behavior lands in buildMergedBuilderData (Plan 02).
 * The imported symbols (buildMergedBuilderData, createTestDb, factories, entityOverrides,
 * analysisResults, jobPostings) all already exist — only the merge BEHAVIOR is missing,
 * so failures must be assertion failures, NOT "buildMergedBuilderData is not a function".
 *
 * NULL idiom: analysis-tier rows set analysisId to a real FK; variant-tier rows set
 * analysisId literally to null. We NEVER use eq(col, null) in fixtures (T-36-01).
 */
import { describe, it, expect } from 'vitest'
import { createTestDb } from '../../../helpers/db'
import {
  seedJob,
  seedBullet,
  seedVariant,
  seedProject,
  seedJobPosting,
  seedAnalysis,
} from '../../../helpers/factories'
import { buildMergedBuilderData } from '../../../../src/main/lib/mergeHelper'
import { entityOverrides, templateVariantItems } from '../../../../src/main/db/schema'

describe('buildMergedBuilderData — override precedence (OVR-02) + inclusion (D-01)', () => {
  it('case 1: variant-tier bullet override applies with NO analysisId (preview path)', async () => {
    const db = createTestDb()

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    const bullet = seedBullet(db, job.id, { text: 'Base bullet text' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: null, // variant-tier
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Variant override text',
      source: 'user',
    }).run()

    const merged = await buildMergedBuilderData(db, variant.id)
    const mergedJob = merged.jobs.find((j) => j.id === job.id)

    expect(mergedJob).toBeDefined()
    expect(mergedJob!.bullets[0].text).toBe('Variant override text')
  })

  it('case 2: analysis-tier override WINS over variant-tier for the same bullet (OVR-02)', async () => {
    const db = createTestDb()

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    const bullet = seedBullet(db, job.id, { text: 'Base bullet text' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    const posting = seedJobPosting(db, { company: 'TestCo', role: 'Dev' })
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Variant-tier row (lower precedence)
    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: null,
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Variant override text',
      source: 'user',
    }).run()

    // Analysis-tier row (higher precedence — must win)
    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: analysis.id,
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Analysis override text',
      source: 'ai_suggestion',
    }).run()

    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)
    const mergedJob = merged.jobs.find((j) => j.id === job.id)

    expect(mergedJob).toBeDefined()
    expect(mergedJob!.bullets[0].text).toBe('Analysis override text')
    expect(mergedJob!.bullets[0].text).not.toBe('Variant override text')
  })

  it('case 2b: an accepted analysis summary forces showSummary=true even when the variant hides the summary', async () => {
    const db = createTestDb()
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    // Non-executive variants hide the summary by default (excluded sentinel row).
    db.insert(templateVariantItems).values({
      variantId: variant.id,
      itemType: 'summary',
      excluded: true,
    }).run()
    const posting = seedJobPosting(db, { company: 'TestCo', role: 'Dev' })
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Before accepting a summary, the section stays hidden for the analysis render.
    const before = await buildMergedBuilderData(db, variant.id, analysis.id)
    expect(before.showSummary).toBe(false)

    // Accept an AI-suggested summary at the analysis tier.
    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: analysis.id,
      entityType: 'summary',
      field: 'text',
      overrideText: 'Tailored summary for this job',
      source: 'ai_suggestion',
    }).run()

    // Now the optimized resume must show the summary (this is the submission-snapshot bug fix).
    const after = await buildMergedBuilderData(db, variant.id, analysis.id)
    expect(after.showSummary).toBe(true)
    expect(after.summaryOverride).toBe('Tailored summary for this job')

    // The variant-only preview (no analysisId) still respects the hidden default.
    const variantOnly = await buildMergedBuilderData(db, variant.id)
    expect(variantOnly.showSummary).toBe(false)
  })

  it('case 3: project title override (project_name/name) applies in merged output', async () => {
    const db = createTestDb()

    const project = seedProject(db, { name: 'Base Project Name' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: null,
      entityType: 'project_name',
      field: 'name',
      projectId: project.id,
      overrideText: 'Overridden Project Name',
      source: 'user',
    }).run()

    const merged = await buildMergedBuilderData(db, variant.id)
    const mergedProject = merged.projects.find((p) => p.id === project.id)

    expect(mergedProject).toBeDefined()
    expect(mergedProject!.name).toBe('Overridden Project Name')
  })

  it('case 4: summary override (summary/text, all FK columns null) surfaces as summaryOverride', async () => {
    const db = createTestDb()

    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: null,
      entityType: 'summary',
      field: 'text',
      // all FK columns null
      overrideText: 'Override summary',
      source: 'user',
    }).run()

    const merged = await buildMergedBuilderData(db, variant.id)

    expect((merged as { summaryOverride?: string }).summaryOverride).toBe('Override summary')
  })

  it('case 5: D-01 inclusion is analysis-scoped — re-includes only with analysisId', async () => {
    const db = createTestDb()

    const job = seedJob(db, { company: 'TestCo', role: 'Dev', startDate: '2024-01' })
    const bullet = seedBullet(db, job.id, { text: 'Base bullet text' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    const posting = seedJobPosting(db, { company: 'TestCo', role: 'Dev' })
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Variant excludes the bullet
    db.insert(templateVariantItems).values({
      variantId: variant.id,
      itemType: 'bullet',
      bulletId: bullet.id,
      excluded: true,
    }).run()

    // Analysis-tier inclusion row re-includes it for THIS analysis only
    db.insert(entityOverrides).values({
      variantId: variant.id,
      analysisId: analysis.id,
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Base bullet text',
      source: 'inclusion',
    }).run()

    // With analysisId: re-included → excluded === false
    const mergedWithAnalysis = await buildMergedBuilderData(db, variant.id, analysis.id)
    const jobWithAnalysis = mergedWithAnalysis.jobs.find((j) => j.id === job.id)
    expect(jobWithAnalysis).toBeDefined()
    const includedBullet = jobWithAnalysis!.bullets.find((b) => b.id === bullet.id)
    expect(includedBullet).toBeDefined()
    expect(includedBullet!.excluded).toBe(false)

    // Without analysisId (base variant view): re-inclusion does NOT apply → excluded === true
    const mergedBaseView = await buildMergedBuilderData(db, variant.id)
    const jobBaseView = mergedBaseView.jobs.find((j) => j.id === job.id)
    expect(jobBaseView).toBeDefined()
    const excludedBullet = jobBaseView!.bullets.find((b) => b.id === bullet.id)
    expect(excludedBullet).toBeDefined()
    expect(excludedBullet!.excluded).toBe(true)
  })

  it('case 6: rejects a (variantId, analysisId) pair that belong to different variants (WR-01 fail-closed)', async () => {
    const db = createTestDb()

    const variantA = seedVariant(db)
    const variantB = seedVariant(db)
    const posting = seedJobPosting(db)
    // Analysis owned by variant B.
    const analysisB = seedAnalysis(db, posting.id, { variantId: variantB.id })

    // Requesting variant A's merge with variant B's analysis must fail closed, not
    // silently leak B's analysis-tier overrides into A's render.
    await expect(
      buildMergedBuilderData(db, variantA.id, analysisB.id),
    ).rejects.toThrow(/cross-variant/i)
  })
})
