import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { buildVariantResumeJson } from '../../../../src/main/lib/variantResumeBuilder'
import { ExportValidationError } from '../../../../src/main/lib/baseResumeBuilder'
import { createTestDb } from '../../../helpers/db'
import {
  profile,
  jobs,
  jobBullets,
  skills,
  skillCategories,
  projects,
  projectBullets,
  education,
  volunteer,
  awards,
  publications,
  languages,
  interests,
  referenceEntries,
  templateVariants,
  templateVariantItems,
  jobPostings,
  analysisResults,
  entityOverrides,
  analysisSkillAdditions,
} from '../../../../src/main/db/schema'

type Db = ReturnType<typeof createTestDb>

type SeedFixture = {
  variantId: number
  jobId: number
  bulletId: number
  skillId: number
  projectId: number
  projectBulletId: number
  educationId: number
  volunteerId: number
  awardId: number
  publicationId: number
  languageId: number
  interestId: number
  referenceId: number
  categoryId: number
}

function seedFullData(db: Db): SeedFixture {
  db.update(profile)
    .set({
      name: 'Test User',
      email: 'test@example.com',
      phone: '555-1234',
      location: 'Seattle',
      summary: 'Senior engineer.',
      linkedin: 'https://linkedin.com/in/testuser',
    })
    .where(eq(profile.id, 1))
    .run()

  const job = db
    .insert(jobs)
    .values({ company: 'Acme', role: 'Engineer', startDate: '2020-01', endDate: '2023-12', sortOrder: 0 })
    .returning()
    .all()[0]
  const bullet = db
    .insert(jobBullets)
    .values({ jobId: job.id, text: 'Shipped a thing.', sortOrder: 0 })
    .returning()
    .all()[0]

  const edu = db
    .insert(education)
    .values({ institution: 'University', area: 'CS', studyType: 'BS', startDate: '2014', endDate: '2018', courses: '[]' })
    .returning()
    .all()[0]

  const cat = db.insert(skillCategories).values({ name: 'Languages', sortOrder: 0 }).returning().all()[0]
  const skill = db
    .insert(skills)
    .values({ name: 'TypeScript', tags: '[]', categoryId: cat.id })
    .returning()
    .all()[0]

  const project = db
    .insert(projects)
    .values({ name: 'Project X', sortOrder: 0 })
    .returning()
    .all()[0]
  const projectBullet = db
    .insert(projectBullets)
    .values({ projectId: project.id, text: 'Built thing.', sortOrder: 0 })
    .returning()
    .all()[0]

  const vol = db
    .insert(volunteer)
    .values({
      organization: 'Charity',
      position: 'Volunteer',
      startDate: '2019',
      summary: 'Helped out.',
      highlights: JSON.stringify(['Organized event']),
    })
    .returning()
    .all()[0]

  const award = db
    .insert(awards)
    .values({ title: 'Top Engineer', date: '2022', awarder: 'Acme', summary: 'For excellence' })
    .returning()
    .all()[0]
  const pub = db
    .insert(publications)
    .values({ name: 'Paper', publisher: 'IEEE', releaseDate: '2021', url: 'https://example.com/paper', summary: 'A paper.' })
    .returning()
    .all()[0]
  const lang = db
    .insert(languages)
    .values({ language: 'English', fluency: 'Native' })
    .returning()
    .all()[0]
  const interest = db
    .insert(interests)
    .values({ name: 'Open Source', keywords: JSON.stringify(['oss', 'community']) })
    .returning()
    .all()[0]
  const ref = db
    .insert(referenceEntries)
    .values({ name: 'Dr. Smith', reference: 'Excellent worker.' })
    .returning()
    .all()[0]

  const variant = db
    .insert(templateVariants)
    .values({ name: 'Test Variant', layoutTemplate: 'classic' })
    .returning()
    .all()[0]

  return {
    variantId: variant.id,
    jobId: job.id,
    bulletId: bullet.id,
    skillId: skill.id,
    projectId: project.id,
    projectBulletId: projectBullet.id,
    educationId: edu.id,
    volunteerId: vol.id,
    awardId: award.id,
    publicationId: pub.id,
    languageId: lang.id,
    interestId: interest.id,
    referenceId: ref.id,
    categoryId: cat.id,
  }
}

function seedAnalysis(db: Db, variantId: number): number {
  const posting = db
    .insert(jobPostings)
    .values({ company: 'Acme', role: 'Engineer', rawText: '' })
    .returning()
    .all()[0]
  const analysis = db
    .insert(analysisResults)
    .values({ jobPostingId: posting.id, variantId, matchScore: 80 })
    .returning()
    .all()[0]
  return analysis.id
}

describe('buildVariantResumeJson', () => {
  it('(a) full-data variant with no exclusions produces parseable output with basics.summary', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)

    const result = await buildVariantResumeJson(db, fx.variantId)

    expect(result.basics?.name).toBe('Test User')
    expect(result.basics?.email).toBe('test@example.com')
    expect(result.basics?.phone).toBe('555-1234')
    expect(result.basics?.summary).toBe('Senior engineer.')
    expect(result.basics?.location?.city).toBe('Seattle')
    expect(result.basics?.profiles?.[0]?.url).toBe('https://linkedin.com/in/testuser')

    expect(result.work).toHaveLength(1)
    expect(result.work?.[0].name).toBe('Acme')
    expect(result.work?.[0].position).toBe('Engineer')
    expect(result.work?.[0].highlights).toEqual(['Shipped a thing.'])

    expect(result.education).toHaveLength(1)
    expect(result.education?.[0].institution).toBe('University')

    expect(result.skills).toHaveLength(1)
    expect(result.skills?.[0].name).toBe('Languages')
    expect(result.skills?.[0].keywords).toEqual(['TypeScript'])

    expect(result.projects).toHaveLength(1)
    expect(result.projects?.[0].name).toBe('Project X')
    expect(result.projects?.[0].highlights).toEqual(['Built thing.'])

    expect(result.volunteer).toHaveLength(1)
    expect(result.awards).toHaveLength(1)
    expect(result.publications).toHaveLength(1)
    expect(result.languages).toHaveLength(1)
    expect(result.interests).toHaveLength(1)
    expect(result.references).toHaveLength(1)

    // JSON-09: no top-level `meta` field anywhere.
    expect((result as Record<string, unknown>).meta).toBeUndefined()
  })

  it('(b) excluded jobs/bullets/skills/projects/education/volunteer/awards/publications/languages/interests/references are omitted', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)

    // Add a second job that will remain visible (so we can prove exclusion is selective).
    const otherJob = db
      .insert(jobs)
      .values({ company: 'BetaCorp', role: 'Architect', startDate: '2018-01', endDate: '2019-12', sortOrder: 1 })
      .returning()
      .all()[0]
    db.insert(jobBullets).values({ jobId: otherJob.id, text: 'Kept bullet.', sortOrder: 0 }).run()

    // Add a second bullet on the original job that will remain.
    db.insert(jobBullets).values({ jobId: fx.jobId, text: 'Kept on Acme.', sortOrder: 1 }).run()

    // Add a second skill in same category that will remain.
    db.insert(skills).values({ name: 'JavaScript', tags: '[]', categoryId: fx.categoryId }).run()

    // Exclusion rows on the original entities.
    db.insert(templateVariantItems).values([
      { variantId: fx.variantId, itemType: 'job', jobId: fx.jobId, excluded: true },
      { variantId: fx.variantId, itemType: 'bullet', bulletId: fx.bulletId, excluded: true },
      { variantId: fx.variantId, itemType: 'skill', skillId: fx.skillId, excluded: true },
      { variantId: fx.variantId, itemType: 'project', projectId: fx.projectId, excluded: true },
      { variantId: fx.variantId, itemType: 'education', educationId: fx.educationId, excluded: true },
      { variantId: fx.variantId, itemType: 'volunteer', volunteerId: fx.volunteerId, excluded: true },
      { variantId: fx.variantId, itemType: 'award', awardId: fx.awardId, excluded: true },
      { variantId: fx.variantId, itemType: 'publication', publicationId: fx.publicationId, excluded: true },
      { variantId: fx.variantId, itemType: 'language', languageId: fx.languageId, excluded: true },
      { variantId: fx.variantId, itemType: 'interest', interestId: fx.interestId, excluded: true },
      { variantId: fx.variantId, itemType: 'reference', referenceId: fx.referenceId, excluded: true },
    ]).run()

    const result = await buildVariantResumeJson(db, fx.variantId)

    // Acme excluded; BetaCorp remains
    const workNames = (result.work ?? []).map((w) => w.name)
    expect(workNames).not.toContain('Acme')
    expect(workNames).toContain('BetaCorp')

    // Excluded skill TypeScript gone; JavaScript remains
    const allSkillKeywords = (result.skills ?? []).flatMap((s) => s.keywords ?? [])
    expect(allSkillKeywords).not.toContain('TypeScript')
    expect(allSkillKeywords).toContain('JavaScript')

    // Excluded one-off entities should be fully absent from each list
    expect(result.projects ?? []).toHaveLength(0)
    expect(result.education ?? []).toHaveLength(0)
    expect(result.volunteer ?? []).toHaveLength(0)
    expect(result.awards ?? []).toHaveLength(0)
    expect(result.publications ?? []).toHaveLength(0)
    expect(result.languages ?? []).toHaveLength(0)
    expect(result.interests ?? []).toHaveLength(0)
    expect(result.references ?? []).toHaveLength(0)
  })

  it('(c) showSummary=false (templateVariantItems summary sentinel excluded=true) omits basics.summary', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)

    db.insert(templateVariantItems).values({
      variantId: fx.variantId,
      itemType: 'summary',
      excluded: true,
    }).run()

    const result = await buildVariantResumeJson(db, fx.variantId)
    expect(result.basics?.summary).toBeUndefined()
    // sanity — other basics fields still present
    expect(result.basics?.name).toBe('Test User')
  })

  it('(c2) variant-tier summary override is emitted in basics.summary (OVR-02 resume.json surface)', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)

    // Locked token table: summary → entity_type 'summary', field 'text', FK cols null,
    // variant-tier (analysis_id null literal — never eq(col, null)).
    db.insert(entityOverrides).values({
      variantId: fx.variantId,
      analysisId: null,
      entityType: 'summary',
      field: 'text',
      overrideText: 'Variant-authored summary.',
      source: 'user',
    }).run()

    const result = await buildVariantResumeJson(db, fx.variantId)
    expect(result.basics?.summary).toBe('Variant-authored summary.')
  })

  it('(d) accepted analysis skill additions appear grouped by categoryName alongside base skills', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)
    const analysisId = seedAnalysis(db, fx.variantId)

    db.insert(analysisSkillAdditions).values({
      analysisId,
      skillName: 'Python',
      category: 'Languages',
      status: 'accepted',
    }).run()

    const result = await buildVariantResumeJson(db, fx.variantId, analysisId)

    const langs = (result.skills ?? []).find((s) => s.name === 'Languages')
    expect(langs).toBeDefined()
    expect(langs?.keywords).toContain('TypeScript')
    expect(langs?.keywords).toContain('Python')
  })

  it('(e) analysisBulletOverrides text replaces the original bullet text in highlights', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)
    const analysisId = seedAnalysis(db, fx.variantId)

    db.insert(entityOverrides).values({
      analysisId,
      variantId: fx.variantId,
      entityType: 'job_bullet',
      field: 'text',
      bulletId: fx.bulletId,
      overrideText: 'Overridden text',
      source: 'ai_suggestion',
    }).run()

    const result = await buildVariantResumeJson(db, fx.variantId, analysisId)
    const highlights = result.work?.[0].highlights ?? []
    expect(highlights).toContain('Overridden text')
    expect(highlights).not.toContain('Shipped a thing.')
  })

  it('(f) throws ExportValidationError when produced object fails ResumeJsonSchema', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)
    // Poison interests.keywords with a non-string element — survives JSON parse and
    // is rejected by z.array(z.string()) in the strict schema.
    db.insert(interests).values({ name: 'Hobbies', keywords: JSON.stringify(['ok', 999]) }).run()

    await expect(buildVariantResumeJson(db, fx.variantId)).rejects.toBeInstanceOf(ExportValidationError)
  })

  it('(g) snapshot of representative full-data fixture for PDF/DOCX/JSON shape symmetry', async () => {
    const db = createTestDb()
    const fx = seedFullData(db)
    const result = await buildVariantResumeJson(db, fx.variantId)
    expect(result).toMatchSnapshot()
  })
})
