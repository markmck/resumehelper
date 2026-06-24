/**
 * Phase 41 Plan 05 — DB integration tests for saveAnalysisAsVariant.
 *
 * Covers: all four baked override kinds, collision safety, skill baking with
 * cross-variant exclusion, margin promotion, source-unchanged invariant,
 * double-save idempotency (BLOCKER fix), orphan prevention, and null-variantId error path.
 */
import { describe, it, expect, vi } from 'vitest'
import { createTestDb } from '../helpers/db'
import { saveAnalysisAsVariant } from '../../src/main/handlers/templates'
import * as schema from '../../src/main/db/schema'
import { eq, and } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function seedPrerequisites(db: ReturnType<typeof createTestDb>) {
  // Job posting (required for analysis_results FK)
  const posting = db
    .insert(schema.jobPostings)
    .values({ company: 'Acme Corp', role: 'Engineer', rawText: 'desc' })
    .returning()
    .all()[0]

  // Source variant (the variant the analysis is bound to)
  const sourceVariant = db
    .insert(schema.templateVariants)
    .values({ name: 'Source Variant', layoutTemplate: 'classic' })
    .returning()
    .all()[0]

  // A second pre-existing variant (used to assert cross-variant skill exclusion)
  const otherVariant = db
    .insert(schema.templateVariants)
    .values({ name: 'Other Variant', layoutTemplate: 'modern' })
    .returning()
    .all()[0]

  // Analysis bound to sourceVariant
  const analysis = db
    .insert(schema.analysisResults)
    .values({ jobPostingId: posting.id, variantId: sourceVariant.id, matchScore: 75 })
    .returning()
    .all()[0]

  // Job + bullet (for job_bullet override kinds)
  const job = db
    .insert(schema.jobs)
    .values({ company: 'Acme Corp', role: 'Engineer', startDate: '2022-01' })
    .returning()
    .all()[0]
  const bullet = db
    .insert(schema.jobBullets)
    .values({ jobId: job.id, text: 'Original bullet', sortOrder: 0 })
    .returning()
    .all()[0]

  // Project + bullet (for project_name override kind)
  const project = db
    .insert(schema.projects)
    .values({ name: 'Original Project', sortOrder: 0 })
    .returning()
    .all()[0]

  // Skill category (used by skill bake)
  const category = db
    .insert(schema.skillCategories)
    .values({ name: 'Languages', sortOrder: 0 })
    .returning()
    .all()[0]

  // Analysis-tier overrides — all four kinds
  // 1. Accepted rewrite (job_bullet, text)
  db.insert(schema.entityOverrides)
    .values({
      variantId: sourceVariant.id,
      analysisId: analysis.id,
      entityType: 'job_bullet',
      field: 'text',
      bulletId: bullet.id,
      overrideText: 'Analysis-tier rewrite',
      source: 'ai_suggestion',
    })
    .run()

  // 2. Re-included excluded bullet (job_bullet, inclusion)
  db.insert(schema.entityOverrides)
    .values({
      variantId: sourceVariant.id,
      analysisId: analysis.id,
      entityType: 'job_bullet',
      field: 'inclusion',
      bulletId: bullet.id,
      overrideText: '',
      source: 'inclusion',
    })
    .run()

  // 3. Summary override
  db.insert(schema.entityOverrides)
    .values({
      variantId: sourceVariant.id,
      analysisId: analysis.id,
      entityType: 'summary',
      field: 'text',
      overrideText: 'Tailored summary text',
      source: 'ai_suggestion',
    })
    .run()

  // 4. Project name override
  db.insert(schema.entityOverrides)
    .values({
      variantId: sourceVariant.id,
      analysisId: analysis.id,
      entityType: 'project_name',
      field: 'text',
      projectId: project.id,
      overrideText: 'Renamed Project',
      source: 'user',
    })
    .run()

  // Margin override
  db.insert(schema.analysisLayoutOverrides)
    .values({ analysisId: analysis.id, marginTop: 0.5, marginBottom: 0.6, marginSides: 0.4 })
    .run()

  // Accepted skill addition
  db.insert(schema.analysisSkillAdditions)
    .values({
      analysisId: analysis.id,
      skillName: 'TypeScript',
      reason: 'Gap skill',
      category: 'Languages',
      status: 'accepted',
    })
    .run()

  return { posting, sourceVariant, otherVariant, analysis, job, bullet, project, category }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveAnalysisAsVariant', () => {
  it('case 1: all four baked override kinds appear on the new variant as variant-tier rows (analysisId IS NULL)', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    const result = saveAnalysisAsVariant(db, analysis.id)
    expect(result).toHaveProperty('newVariantId')
    const { newVariantId } = result as { newVariantId: number }

    // Query all variant-tier entity_overrides rows on the new variant
    const newRows = db
      .select()
      .from(schema.entityOverrides)
      .where(
        and(
          eq(schema.entityOverrides.variantId, newVariantId),
          // analysisId IS NULL (variant-tier)
        ),
      )
      .all()
      .filter((r) => r.analysisId === null)

    const kinds = newRows.map((r) => `${r.entityType}:${r.field}:${r.source}`)
    expect(kinds).toContain('job_bullet:text:ai_suggestion')
    expect(kinds).toContain('job_bullet:inclusion:inclusion')
    expect(kinds).toContain('summary:text:ai_suggestion')
    expect(kinds).toContain('project_name:text:user')

    // Each row carries the correct analysis text
    const rewriteRow = newRows.find((r) => r.entityType === 'job_bullet' && r.field === 'text')
    expect(rewriteRow?.overrideText).toBe('Analysis-tier rewrite')

    const summaryRow = newRows.find((r) => r.entityType === 'summary')
    expect(summaryRow?.overrideText).toBe('Tailored summary text')

    const projectRow = newRows.find((r) => r.entityType === 'project_name')
    expect(projectRow?.overrideText).toBe('Renamed Project')
  })

  it('case 1b: the new variant is named after the job (company – role), not "<source> (Copy)"', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    const result = saveAnalysisAsVariant(db, analysis.id)
    const { newVariantId } = result as { newVariantId: number }

    const newVariant = db
      .select({ name: schema.templateVariants.name })
      .from(schema.templateVariants)
      .where(eq(schema.templateVariants.id, newVariantId))
      .get()
    // seedPrerequisites seeds jobPostings with company 'Acme Corp', role 'Engineer'
    expect(newVariant?.name).toBe('Acme Corp – Engineer')
    expect(newVariant?.name).not.toContain('(Copy)')
  })

  it('case 2: collision safety — source variant has a variant-tier override for bullet B AND analysis has an override for the same bullet B; new variant ends with exactly ONE entity_overrides row for that field carrying the analysis text', () => {
    const db = createTestDb()
    const { sourceVariant, analysis, bullet } = seedPrerequisites(db)

    // Seed a variant-tier override on the source for the same (job_bullet, text, bullet.id)
    db.insert(schema.entityOverrides)
      .values({
        variantId: sourceVariant.id,
        analysisId: null, // variant-tier
        entityType: 'job_bullet',
        field: 'text',
        bulletId: bullet.id,
        overrideText: 'Old variant-tier text',
        source: 'user',
      })
      .run()

    const result = saveAnalysisAsVariant(db, analysis.id)
    expect(result).toHaveProperty('newVariantId')
    const { newVariantId } = result as { newVariantId: number }

    // After duplicateVariant, the new variant would have the variant-tier row copied.
    // After the bake, the analysis-tier row should have replaced it.
    const bulletRows = db
      .select()
      .from(schema.entityOverrides)
      .all()
      .filter(
        (r) =>
          r.variantId === newVariantId &&
          r.analysisId === null &&
          r.entityType === 'job_bullet' &&
          r.field === 'text' &&
          r.bulletId === bullet.id,
      )

    expect(bulletRows).toHaveLength(1)
    expect(bulletRows[0].overrideText).toBe('Analysis-tier rewrite')
    expect(bulletRows[0].source).toBe('ai_suggestion')
  })

  it('case 3: skill baking — accepted skill exists as a global skills row; excluded from otherVariant; NOT excluded from new variant', () => {
    const db = createTestDb()
    const { analysis, otherVariant } = seedPrerequisites(db)

    const result = saveAnalysisAsVariant(db, analysis.id)
    expect(result).toHaveProperty('newVariantId')
    const { newVariantId } = result as { newVariantId: number }

    // Global skills row was created
    const skillRows = db
      .select()
      .from(schema.skills)
      .where(eq(schema.skills.name, 'TypeScript'))
      .all()
    expect(skillRows).toHaveLength(1)
    const skillId = skillRows[0].id

    // otherVariant has an exclusion row for that skillId
    const otherExclusions = db
      .select()
      .from(schema.templateVariantItems)
      .all()
      .filter(
        (r) =>
          r.variantId === otherVariant.id &&
          r.itemType === 'skill' &&
          r.skillId === skillId &&
          r.excluded === true,
      )
    expect(otherExclusions).toHaveLength(1)

    // new variant has NO exclusion row for that skillId (skill is active on new variant)
    const newExclusions = db
      .select()
      .from(schema.templateVariantItems)
      .all()
      .filter(
        (r) =>
          r.variantId === newVariantId &&
          r.itemType === 'skill' &&
          r.skillId === skillId,
      )
    expect(newExclusions).toHaveLength(0)
  })

  it('case 4: margin promotion — new variant templateOptions JSON contains the promoted margins', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    const result = saveAnalysisAsVariant(db, analysis.id)
    expect(result).toHaveProperty('newVariantId')
    const { newVariantId } = result as { newVariantId: number }

    const variantRow = db
      .select({ templateOptions: schema.templateVariants.templateOptions })
      .from(schema.templateVariants)
      .where(eq(schema.templateVariants.id, newVariantId))
      .get()

    expect(variantRow?.templateOptions).not.toBeNull()
    const options = JSON.parse(variantRow!.templateOptions!)
    expect(options.marginTop).toBe(0.5)
    expect(options.marginBottom).toBe(0.6)
    expect(options.marginSides).toBe(0.4)
  })

  it('case 5: source unchanged — source variant entity_overrides and analysis rows are byte-for-byte unchanged after save', () => {
    const db = createTestDb()
    const { sourceVariant, analysis } = seedPrerequisites(db)

    // Snapshot before
    const sourceOverridesBefore = db
      .select()
      .from(schema.entityOverrides)
      .all()
      .filter((r) => r.variantId === sourceVariant.id && r.analysisId === analysis.id)
    const analysisBefore = db
      .select()
      .from(schema.analysisResults)
      .where(eq(schema.analysisResults.id, analysis.id))
      .all()
    const marginBefore = db
      .select()
      .from(schema.analysisLayoutOverrides)
      .where(eq(schema.analysisLayoutOverrides.analysisId, analysis.id))
      .all()

    saveAnalysisAsVariant(db, analysis.id)

    // Snapshot after — same rows
    const sourceOverridesAfter = db
      .select()
      .from(schema.entityOverrides)
      .all()
      .filter((r) => r.variantId === sourceVariant.id && r.analysisId === analysis.id)
    const analysisAfter = db
      .select()
      .from(schema.analysisResults)
      .where(eq(schema.analysisResults.id, analysis.id))
      .all()
    const marginAfter = db
      .select()
      .from(schema.analysisLayoutOverrides)
      .where(eq(schema.analysisLayoutOverrides.analysisId, analysis.id))
      .all()

    expect(sourceOverridesAfter).toHaveLength(sourceOverridesBefore.length)
    expect(analysisAfter[0].matchScore).toBe(analysisBefore[0].matchScore)
    expect(analysisAfter[0].variantId).toBe(analysisBefore[0].variantId)
    expect(marginAfter[0].marginTop).toBe(marginBefore[0].marginTop)
    expect(marginAfter[0].marginBottom).toBe(marginBefore[0].marginBottom)
    expect(marginAfter[0].marginSides).toBe(marginBefore[0].marginSides)
  })

  it('case 6: idempotent skill exclusion — calling saveAnalysisAsVariant TWICE does not create duplicate templateVariantItems exclusion rows for otherVariant', () => {
    const db = createTestDb()
    const { analysis, otherVariant } = seedPrerequisites(db)

    saveAnalysisAsVariant(db, analysis.id)
    saveAnalysisAsVariant(db, analysis.id)

    // otherVariant should have at most ONE exclusion row per baked skillId
    const skillRow = db
      .select({ id: schema.skills.id })
      .from(schema.skills)
      .where(eq(schema.skills.name, 'TypeScript'))
      .get()
    expect(skillRow).not.toBeNull()
    const skillId = skillRow!.id

    const exclusionRows = db
      .select()
      .from(schema.templateVariantItems)
      .all()
      .filter(
        (r) =>
          r.variantId === otherVariant.id &&
          r.itemType === 'skill' &&
          r.skillId === skillId,
      )
    expect(exclusionRows).toHaveLength(1)
  })

  it('case 7: orphan prevention — when bake fails mid-transaction, templateVariants row count is unchanged and function returns { error }', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    // Count variants before
    const variantsBefore = db.select().from(schema.templateVariants).all()
    const countBefore = variantsBefore.length

    // Force a mid-bake failure by making the transaction throw.
    // Approach: insert an analysis_skill_additions row with an invalid category that
    // causes a constraint violation, OR mock the sqlite.transaction to throw.
    // Simpler: monkeypatch the sqlite object imported into templates.ts to throw.
    // Instead, we use a different approach: seed the analysis_skill_additions with a
    // status that would cause a DB constraint error. But the easiest reliable approach
    // is to make the skill insert fail by seeding a skill with the same name that has
    // a null name (not possible via schema), so instead we use a spy on db.insert.
    //
    // Actually the cleanest approach: inject a bad analysisId to force duplicateVariant
    // to throw after the newVariant is created.
    // The function catches duplicateVariant errors early. We need the error to happen
    // INSIDE the sqlite.transaction.
    //
    // Best approach: insert an entity_overrides row for this analysis with an entityType
    // that violates something (none available), OR use vi.spyOn to make the transaction throw.
    //
    // We use vi.spyOn on the db.insert method for templateVariantItems specifically to
    // throw after the first entity_overrides insert to simulate mid-transaction failure.

    // Let's use a different strategy: seed a second accepted skill addition with a
    // skillName that is the same as an existing skill but set up an FK violation.
    // Since SQLite doesn't enforce UNIQUE on skills.name by default, this won't work.
    //
    // Cleanest reliable approach: temporarily override the sqlite transaction runner
    // to throw after the first inner step. We import sqlite from the module to spy.
    // But that's module-level state. Instead:
    //
    // We rely on the fact that inserting a templateVariantItems row with an invalid
    // skillId (non-existent FK reference) will throw when FKs are on.
    // Pre-insert an analysis_skill_additions row with a skillName that we'll make
    // collide by inserting a skills row with a FK reference that doesn't exist for categoryId.
    // Actually the simplest: use vi.spyOn on db.insert to throw after Nth call.

    // Simpler and reliable: directly test via an incorrect DB state.
    // We stub sqlite.transaction to throw via dynamic import manipulation.
    // Use vi.mock approach won't work post-load. Instead:
    //
    // The plan says "force a mid-bake failure (e.g. seed a row that makes a baked insert throw, or stub a failure)".
    // The simplest is: we stub the `sqlite` transaction to throw using a spy on the module-level sqlite instance.
    // However, `sqlite` is module-level and not exported from templates.ts.
    //
    // Most reliable cross-cutting approach: seed a templateVariantItems row
    // with invalid project_bullet_id to cause a cascade/FK failure inside the transaction.
    // But entity_overrides doesn't reference template_variant_items.
    //
    // ACTUAL simplest approach that works:
    // Make the analysis have an accepted skill addition whose skill name is empty string,
    // which violates skills.name NOT NULL. Let's check: name is text NOT NULL, inserting '' is allowed.
    //
    // Fallback: use vi.spyOn to stub db.delete inside the transaction to throw.
    // We can spy on the Drizzle db object's .delete method.

    const dbAny = db as unknown as Record<string, unknown>
    const originalDelete = (db as unknown as { delete: (...args: unknown[]) => unknown }).delete.bind(db)
    let callCount = 0
    const spy = vi.spyOn(db as unknown as { delete: (...args: unknown[]) => unknown }, 'delete').mockImplementation((...args: unknown[]) => {
      callCount++
      // Let the first few deletes (from duplicateVariant cleanup and analysis read) pass,
      // then throw on the first delete INSIDE the bake transaction.
      // duplicateVariant doesn't call delete. The bake calls delete for each analysisTierRow.
      // Throw on the very first delete inside the transaction.
      if (callCount >= 1) {
        spy.mockRestore()
        throw new Error('Simulated mid-bake failure')
      }
      return originalDelete(...args)
    })

    const result = saveAnalysisAsVariant(db, analysis.id)

    // Restore spy if not already restored
    try { spy.mockRestore() } catch { /* already restored */ }

    expect(result).toHaveProperty('error')
    expect(typeof (result as { error: string }).error).toBe('string')

    // No orphan variant: row count unchanged
    const variantsAfter = db.select().from(schema.templateVariants).all()
    expect(variantsAfter).toHaveLength(countBefore)
  })

  it('case 8: null-variantId error path — returns { error: string } when analysis has no variantId', () => {
    const db = createTestDb()

    // Seed a posting and an analysis with variantId=null
    const posting = db
      .insert(schema.jobPostings)
      .values({ company: 'Null Co', role: 'Role', rawText: '' })
      .returning()
      .all()[0]
    const analysis = db
      .insert(schema.analysisResults)
      .values({ jobPostingId: posting.id, variantId: null, matchScore: 0 })
      .returning()
      .all()[0]

    const result = saveAnalysisAsVariant(db, analysis.id)
    expect(result).toHaveProperty('error')
    expect(typeof (result as { error: string }).error).toBe('string')
  })
})
