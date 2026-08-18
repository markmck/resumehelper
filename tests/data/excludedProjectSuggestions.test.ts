import { describe, it, expect } from 'vitest'
import { createTestDb } from '../helpers/db'
import {
  ensureExcludedProjectSuggestions,
  acceptExcludedProjectSuggestion,
  dismissExcludedProjectSuggestion,
  getExcludedProjectSuggestions,
} from '../../src/main/handlers/ai'
import * as schema from '../../src/main/db/schema'

// Seed prerequisite rows including a templateVariantItems row with excluded:true for a project
function seedPrerequisites(db: ReturnType<typeof createTestDb>) {
  const posting = db
    .insert(schema.jobPostings)
    .values({ company: 'Test Co', role: 'Engineer', rawText: 'desc' })
    .returning()
    .all()[0]

  const variant = db
    .insert(schema.templateVariants)
    .values({ name: 'Test Variant', layoutTemplate: 'classic' })
    .returning()
    .all()[0]

  const analysis = db
    .insert(schema.analysisResults)
    .values({ jobPostingId: posting.id, variantId: variant.id, matchScore: 80 })
    .returning()
    .all()[0]

  const project = db
    .insert(schema.projects)
    .values({ name: 'Test Project', sortOrder: 0 })
    .returning()
    .all()[0]

  // Insert a templateVariantItems row with excluded:true — required for accept-time validation
  db.insert(schema.templateVariantItems)
    .values({ variantId: variant.id, itemType: 'project', projectId: project.id, excluded: true })
    .run()

  return { posting, variant, analysis, project }
}

describe('ensureExcludedProjectSuggestions', () => {
  it('Test 1: valid excluded projectId inserts 1 pending row; matchedKeywords stored as JSON string', () => {
    const db = createTestDb()
    const { analysis, project } = seedPrerequisites(db)

    const result = ensureExcludedProjectSuggestions(
      db,
      analysis.id,
      [{ projectId: project.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([project.id]),
    )
    expect(result).toEqual({ success: true })

    const rows = db.select().from(schema.analysisExcludedProjectSuggestions).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    expect(rows[0].matchedKeywords).toBe('["kw1"]')
    expect(rows[0].projectId).toBe(project.id)
    expect(rows[0].analysisId).toBe(analysis.id)
  })

  it('Test 2: projectId 99999 (not in projects) inserts 0 rows', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    ensureExcludedProjectSuggestions(
      db,
      analysis.id,
      [{ projectId: 99999, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([99999]),
    )

    const rows = db.select().from(schema.analysisExcludedProjectSuggestions).all()
    expect(rows).toHaveLength(0)
  })

  it('Test 3: real projectId but empty excludedProjectIds set inserts 0 rows', () => {
    const db = createTestDb()
    const { analysis, project } = seedPrerequisites(db)

    ensureExcludedProjectSuggestions(
      db,
      analysis.id,
      [{ projectId: project.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set<number>(),
    )

    const rows = db.select().from(schema.analysisExcludedProjectSuggestions).all()
    expect(rows).toHaveLength(0)
  })
})

describe('acceptExcludedProjectSuggestion', () => {
  it('Test 4: writes exactly 1 entityOverrides row with source=inclusion, field=inclusion, projectId, overrideText=""; suggestion status flips to accepted', () => {
    const db = createTestDb()
    const { analysis, variant, project } = seedPrerequisites(db)

    // Seed the suggestion first
    ensureExcludedProjectSuggestions(
      db,
      analysis.id,
      [{ projectId: project.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([project.id]),
    )

    const result = acceptExcludedProjectSuggestion(db, analysis.id, project.id)
    expect(result).toEqual({ success: true })

    // entityOverrides should have exactly one row
    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(1)
    const row = eoRows[0]
    expect(row.source).toBe('inclusion')
    expect(row.field).toBe('inclusion')
    expect(row.entityType).toBe('project')
    expect(row.projectId).toBe(project.id)
    expect(row.overrideText).toBe('')
    expect(row.analysisId).toBe(analysis.id)
    expect(row.variantId).toBe(variant.id)

    // Suggestion status flipped to accepted
    const suggRows = db.select().from(schema.analysisExcludedProjectSuggestions).all()
    expect(suggRows).toHaveLength(1)
    expect(suggRows[0].status).toBe('accepted')
  })

  it('Test 5: projectId 99999 returns {error}, writes 0 entityOverrides rows', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    const result = acceptExcludedProjectSuggestion(db, analysis.id, 99999)
    expect(result).toHaveProperty('error')
    expect(typeof (result as { error: string }).error).toBe('string')

    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(0)
  })

  it('Test 6: project NOT excluded in variant returns {error}, writes 0 entityOverrides rows', () => {
    const db = createTestDb()
    const { analysis } = seedPrerequisites(db)

    // Create a different project WITHOUT excluded=true in templateVariantItems
    const includedProject = db
      .insert(schema.projects)
      .values({ name: 'Included Project', sortOrder: 1 })
      .returning()
      .all()[0]

    const result = acceptExcludedProjectSuggestion(db, analysis.id, includedProject.id)
    expect(result).toHaveProperty('error')
    expect(typeof (result as { error: string }).error).toBe('string')

    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(0)
  })
})

describe('dismissExcludedProjectSuggestion', () => {
  it('Test 7: flips status to dismissed and writes 0 entityOverrides rows', () => {
    const db = createTestDb()
    const { analysis, project } = seedPrerequisites(db)

    ensureExcludedProjectSuggestions(
      db,
      analysis.id,
      [{ projectId: project.id, reason: 'reason', matched_keywords: ['kw1'] }],
      new Set([project.id]),
    )

    const result = dismissExcludedProjectSuggestion(db, analysis.id, project.id)
    expect(result).toEqual({ success: true })

    const suggRows = db.select().from(schema.analysisExcludedProjectSuggestions).all()
    expect(suggRows).toHaveLength(1)
    expect(suggRows[0].status).toBe('dismissed')

    const eoRows = db.select().from(schema.entityOverrides).all()
    expect(eoRows).toHaveLength(0)
  })
})

describe('getExcludedProjectSuggestions', () => {
  it('Test 8: returns rows with projectId, projectName (joined), reason, matchedKeywords (parsed string[]), status', () => {
    const db = createTestDb()
    const { analysis, project } = seedPrerequisites(db)

    ensureExcludedProjectSuggestions(
      db,
      analysis.id,
      [{ projectId: project.id, reason: 'test reason', matched_keywords: ['kw1', 'kw2'] }],
      new Set([project.id]),
    )

    // Accept one so we have a non-pending status to verify
    acceptExcludedProjectSuggestion(db, analysis.id, project.id)

    const rows = getExcludedProjectSuggestions(db, analysis.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].projectId).toBe(project.id)
    expect(rows[0].projectName).toBe('Test Project')
    expect(rows[0].reason).toBe('test reason')
    expect(Array.isArray(rows[0].matchedKeywords)).toBe(true)
    expect(rows[0].matchedKeywords).toEqual(['kw1', 'kw2'])
    expect(rows[0].status).toBe('accepted')
  })
})
