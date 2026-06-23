import { describe, it, expect } from 'vitest'
import { createTestDb } from '../helpers/db'
import { acceptAnalysisSummary } from '../../src/main/handlers/ai'
import { buildMergedBuilderData } from '../../src/main/lib/mergeHelper'
import * as schema from '../../src/main/db/schema'

// Seed the minimal prerequisite rows needed for acceptAnalysisSummary
function seedPrerequisites(db: ReturnType<typeof createTestDb>) {
  // A job posting (FK for analysis_results)
  const posting = db
    .insert(schema.jobPostings)
    .values({ company: 'Test Co', role: 'Engineer', rawText: 'desc' })
    .returning()
    .all()[0]

  // A template variant (FK for analysis_results.variant_id)
  const variant = db
    .insert(schema.templateVariants)
    .values({ name: 'Test Variant', layoutTemplate: 'classic' })
    .returning()
    .all()[0]

  // An analysis result bound to the variant
  const analysis = db
    .insert(schema.analysisResults)
    .values({ jobPostingId: posting.id, variantId: variant.id, matchScore: 80 })
    .returning()
    .all()[0]

  return { posting, variant, analysis }
}

describe('acceptAnalysisSummary', () => {
  it('case 1: writes exactly one entity_overrides row with entityType=summary, field=text, analysisId set, correct overrideText', () => {
    const db = createTestDb()
    const { analysis, variant } = seedPrerequisites(db)

    const result = acceptAnalysisSummary(db, analysis.id, 'A tailored professional summary.')
    expect(result).toEqual({ success: true })

    const rows = db.select().from(schema.entityOverrides).all()
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.entityType).toBe('summary')
    expect(row.field).toBe('text')
    expect(row.analysisId).toBe(analysis.id)
    expect(row.variantId).toBe(variant.id)
    expect(row.overrideText).toBe('A tailored professional summary.')
    expect(row.source).toBe('ai_suggestion')
    // summary overrides have no bullet/project/job references
    expect(row.bulletId).toBeNull()
  })

  it('case 2: buildMergedBuilderData resolves summaryOverride to the accepted text', async () => {
    const db = createTestDb()
    const { analysis, variant } = seedPrerequisites(db)

    acceptAnalysisSummary(db, analysis.id, 'Job-tailored summary text.')

    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)
    expect(merged.summaryOverride).toBe('Job-tailored summary text.')
  })

  it('case 3: calling acceptAnalysisSummary twice replaces first — upsert (exactly one row, latest text)', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    acceptAnalysisSummary(db, analysis.id, 'First summary text.')
    acceptAnalysisSummary(db, analysis.id, 'Second summary text.')

    const rows = db.select().from(schema.entityOverrides).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].overrideText).toBe('Second summary text.')
  })

  it('case 4: error path — invalid db returns { error: string }', () => {
    // Pass null as db to trigger a runtime error caught by the try/catch
    const result = acceptAnalysisSummary(null as never, -1, 'x')
    expect(result).toHaveProperty('error')
    expect(typeof (result as { error: string }).error).toBe('string')
  })
})
