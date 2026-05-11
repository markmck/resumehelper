import { describe, it, expect } from 'vitest'
import { buildBaseResumeJson, ExportValidationError } from '../../../../src/main/lib/baseResumeBuilder'
import { createTestDb } from '../../../helpers/db'
import { eq } from 'drizzle-orm'
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
} from '../../../../src/main/db/schema'

type Db = ReturnType<typeof createTestDb>

function seedFullData(db: Db): void {
  // Profile already has id=1 from ensureSchema INSERT OR IGNORE
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
    .values({
      company: 'Acme',
      role: 'Engineer',
      startDate: '2020-01',
      endDate: '2023-12',
      sortOrder: 0,
    })
    .returning()
    .all()[0]
  db.insert(jobBullets).values({ jobId: job.id, text: 'Shipped a thing.', sortOrder: 0 }).run()

  db.insert(education).values({
    institution: 'University',
    area: 'CS',
    studyType: 'BS',
    startDate: '2014',
    endDate: '2018',
    courses: '[]',
  }).run()

  const cat = db.insert(skillCategories).values({ name: 'Languages', sortOrder: 0 }).returning().all()[0]
  db.insert(skills).values({ name: 'TypeScript', tags: '[]', categoryId: cat.id }).run()

  const project = db
    .insert(projects)
    .values({ name: 'Project X', sortOrder: 0 })
    .returning()
    .all()[0]
  db.insert(projectBullets).values({ projectId: project.id, text: 'Built thing.', sortOrder: 0 }).run()

  db.insert(volunteer).values({
    organization: 'Charity',
    position: 'Volunteer',
    startDate: '2019',
    summary: 'Helped out.',
    highlights: JSON.stringify(['Organized event']),
  }).run()

  db.insert(awards).values({ title: 'Top Engineer', date: '2022', awarder: 'Acme', summary: 'For excellence' }).run()
  db.insert(publications).values({
    name: 'Paper',
    publisher: 'IEEE',
    releaseDate: '2021',
    url: 'https://example.com/paper',
    summary: 'A paper.',
  }).run()
  db.insert(languages).values({ language: 'English', fluency: 'Native' }).run()
  db.insert(interests).values({ name: 'Open Source', keywords: JSON.stringify(['oss', 'community']) }).run()
  db.insert(referenceEntries).values({ name: 'Dr. Smith', reference: 'Excellent worker.' }).run()
}

describe('buildBaseResumeJson', () => {
  it('produces a parseable ResumeJson from a full-data DB', () => {
    const db = createTestDb()
    seedFullData(db)
    const result = buildBaseResumeJson(db)

    expect(result.basics?.name).toBe('Test User')
    expect(result.basics?.email).toBe('test@example.com')
    expect(result.basics?.phone).toBe('555-1234')
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
  })

  it('omits empty/null/empty-string optional fields — no `: null` or `: ""` in JSON', () => {
    const db = createTestDb()
    db.update(profile)
      .set({
        name: 'Test User',
        email: '',
        phone: '',
        location: '',
        summary: '',
        linkedin: '',
      })
      .where(eq(profile.id, 1))
      .run()

    const result = buildBaseResumeJson(db)
    const json = JSON.stringify(result)
    expect(json).not.toContain(': null')
    expect(json).not.toContain(': ""')
    expect(result.basics?.email).toBeUndefined()
    expect(result.basics?.phone).toBeUndefined()
    expect(result.basics?.location).toBeUndefined()
    expect(result.basics?.profiles).toBeUndefined()
  })

  it('omits empty top-level groups when DB has only profile.name', () => {
    const db = createTestDb()
    db.update(profile).set({ name: 'Bare' }).where(eq(profile.id, 1)).run()

    const result = buildBaseResumeJson(db)
    expect(result.work).toBeUndefined()
    expect(result.education).toBeUndefined()
    expect(result.skills).toBeUndefined()
    expect(result.projects).toBeUndefined()
    expect(result.volunteer).toBeUndefined()
    expect(result.awards).toBeUndefined()
    expect(result.publications).toBeUndefined()
    expect(result.languages).toBeUndefined()
    expect(result.interests).toBeUndefined()
    expect(result.references).toBeUndefined()
    expect(result.basics).toEqual({ name: 'Bare' })
  })

  it('throws ExportValidationError when produced object fails ResumeJsonSchema', () => {
    const db = createTestDb()
    // Inject a non-string element into a JSON-text array column. SQLite's
    // TEXT-affinity coercion would convert a stored number-as-name back to
    // string, but the JSON payload in `interests.keywords` preserves types
    // through parse, so a numeric element survives to safeParse and is
    // rejected by `z.array(z.string())`.
    db.insert(interests).values({ name: 'Hobbies', keywords: JSON.stringify(['ok', 999]) }).run()

    expect(() => buildBaseResumeJson(db)).toThrow(ExportValidationError)

    try {
      buildBaseResumeJson(db)
      // unreachable
      expect.fail('expected ExportValidationError')
    } catch (err) {
      expect(err).toBeInstanceOf(ExportValidationError)
      if (err instanceof ExportValidationError) {
        expect(Array.isArray(err.issues)).toBe(true)
        expect(err.issues.length).toBeGreaterThan(0)
      }
    }
  })

  it('matches snapshot for representative full-data fixture', () => {
    const db = createTestDb()
    seedFullData(db)
    const result = buildBaseResumeJson(db)
    expect(result).toMatchSnapshot()
  })
})
