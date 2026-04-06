import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import type * as schema from '../../src/main/db/schema'
import {
  jobs,
  jobBullets,
  templateVariants,
  jobPostings,
  analysisResults,
  analysisBulletOverrides,
  submissions,
  skills,
  skillCategories,
  projects,
  projectBullets,
  profile,
} from '../../src/main/db/schema'

type Db = BetterSQLite3Database<typeof schema>

export function seedJob(
  db: Db,
  overrides?: Partial<typeof jobs.$inferInsert>,
): typeof jobs.$inferSelect {
  return db
    .insert(jobs)
    .values({
      company: 'Test Co',
      role: 'Engineer',
      startDate: '2024-01',
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedBullet(
  db: Db,
  jobId: number,
  overrides?: Partial<typeof jobBullets.$inferInsert>,
): typeof jobBullets.$inferSelect {
  return db
    .insert(jobBullets)
    .values({
      jobId,
      text: 'Test bullet',
      sortOrder: 0,
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedJobWithBullets(
  db: Db,
  bulletTexts: string[],
  jobOverrides?: Partial<typeof jobs.$inferInsert>,
): { job: typeof jobs.$inferSelect; bullets: typeof jobBullets.$inferSelect[] } {
  const job = seedJob(db, jobOverrides)
  const bullets = bulletTexts.map((text, index) =>
    seedBullet(db, job.id, { text, sortOrder: index }),
  )
  return { job, bullets }
}

export function seedVariant(
  db: Db,
  overrides?: Partial<typeof templateVariants.$inferInsert>,
): typeof templateVariants.$inferSelect {
  return db
    .insert(templateVariants)
    .values({
      name: 'Test Variant',
      layoutTemplate: 'classic',
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedJobPosting(
  db: Db,
  overrides?: Partial<typeof jobPostings.$inferInsert>,
): typeof jobPostings.$inferSelect {
  return db
    .insert(jobPostings)
    .values({
      company: 'ACME Corp',
      role: 'Software Engineer',
      rawText: 'Job description text',
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedAnalysis(
  db: Db,
  jobPostingId: number,
  overrides?: Partial<typeof analysisResults.$inferInsert>,
): typeof analysisResults.$inferSelect {
  return db
    .insert(analysisResults)
    .values({
      jobPostingId,
      matchScore: 75,
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedBulletOverride(
  db: Db,
  analysisId: number,
  bulletId: number,
  overrides?: Partial<typeof analysisBulletOverrides.$inferInsert>,
): typeof analysisBulletOverrides.$inferSelect {
  return db
    .insert(analysisBulletOverrides)
    .values({
      analysisId,
      bulletId,
      overrideText: 'AI-enhanced text',
      source: 'ai_suggestion',
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedSubmission(
  db: Db,
  overrides?: Partial<typeof submissions.$inferInsert>,
): typeof submissions.$inferSelect {
  return db
    .insert(submissions)
    .values({
      company: 'Submit Co',
      role: 'Dev',
      status: 'applied',
      resumeSnapshot: '{}',
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedSkill(
  db: Db,
  overrides?: Partial<typeof skills.$inferInsert>,
): typeof skills.$inferSelect {
  return db
    .insert(skills)
    .values({
      name: 'TypeScript',
      tags: '[]',
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedSkillCategory(
  db: Db,
  overrides?: Partial<typeof skillCategories.$inferInsert>,
): typeof skillCategories.$inferSelect {
  return db
    .insert(skillCategories)
    .values({
      name: 'Languages',
      sortOrder: 0,
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedProject(
  db: Db,
  overrides?: Partial<typeof projects.$inferInsert>,
): typeof projects.$inferSelect {
  return db
    .insert(projects)
    .values({
      name: 'Test Project',
      sortOrder: 0,
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function seedProjectBullet(
  db: Db,
  projectId: number,
  overrides?: Partial<typeof projectBullets.$inferInsert>,
): typeof projectBullets.$inferSelect {
  return db
    .insert(projectBullets)
    .values({
      projectId,
      text: 'Project bullet',
      sortOrder: 0,
      ...overrides,
    })
    .returning()
    .all()[0]
}

export function updateProfile(
  db: Db,
  data: Partial<typeof profile.$inferInsert>,
): void {
  db.update(profile).set(data).where(eq(profile.id, 1)).run()
}
