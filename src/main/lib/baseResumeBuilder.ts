/**
 * Pure base-resume JSON builder.
 *
 * Pure function — no IPC, BrowserWindow, dialog, or fs touches. Per Phase 30 D-01.
 *
 * Validates output against the strict shared `ResumeJsonSchema` and throws a
 * typed `ExportValidationError` on failure (Phase 31 D-02).
 */
import { asc, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { type ZodIssue } from 'zod'
import type * as schema from '../db/schema'
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
} from '../db/schema'
import { ResumeJsonSchema, type ResumeJson } from '../../shared/resumeJson'

type Db = BetterSQLite3Database<typeof schema>

// ---------------------------------------------------------------------------
// Typed error carrying Zod issues (D-02)
// ---------------------------------------------------------------------------

export class ExportValidationError extends Error {
  readonly issues: readonly ZodIssue[]
  constructor(issues: readonly ZodIssue[]) {
    super('Resume data failed schema validation')
    this.name = 'ExportValidationError'
    this.issues = issues
  }
}

// ---------------------------------------------------------------------------
// Omission helpers (D-04, D-05) — private to module.
// ---------------------------------------------------------------------------

const isEmpty = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).length === 0)

const opt = <K extends string, V>(
  key: K,
  value: V,
): Record<K, V> | Record<string, never> =>
  isEmpty(value) ? {} : ({ [key]: value } as Record<K, V>)

/**
 * Trim string values; return `undefined` for null/undefined or empty/whitespace
 * strings. Non-string values pass through unchanged (typed as `unknown`) so
 * Zod can reject them downstream — preserves the validate-or-throw contract
 * even if a non-string sneaks into the DB via raw SQL.
 */
function trimStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  if (typeof v !== 'string') {
    // Force the non-string through into the output object so ResumeJsonSchema
    // rejects it via safeParse. We cast to `string` only at the type-system
    // level — the runtime value is unchanged and Zod will see the truth.
    return v as unknown as string
  }
  const t = v.trim()
  return t === '' ? undefined : t
}

/**
 * Parse a JSON-text column into an array. Strips empty/whitespace string
 * entries but passes through non-string values unchanged so Zod can reject
 * them downstream — preserves the validate-or-throw contract.
 */
const parseJsonArray = (raw: unknown): unknown[] => {
  if (typeof raw !== 'string' || raw.trim() === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v) => !(typeof v === 'string' && v.trim() === ''))
  } catch {
    return []
  }
}

const nonEmpty = <T extends object>(o: T): T | undefined =>
  Object.keys(o).length === 0 ? undefined : o

// ---------------------------------------------------------------------------
// Per-entry helpers (D-06)
// ---------------------------------------------------------------------------

type JobRow = typeof jobs.$inferSelect
type JobBulletRow = typeof jobBullets.$inferSelect
type SkillRow = typeof skills.$inferSelect
type SkillCategoryRow = typeof skillCategories.$inferSelect
type ProjectRow = typeof projects.$inferSelect
type ProjectBulletRow = typeof projectBullets.$inferSelect
type EducationRow = typeof education.$inferSelect
type VolunteerRow = typeof volunteer.$inferSelect
type AwardRow = typeof awards.$inferSelect
type PublicationRow = typeof publications.$inferSelect
type LanguageRow = typeof languages.$inferSelect
type InterestRow = typeof interests.$inferSelect
type ReferenceRow = typeof referenceEntries.$inferSelect

function toWorkEntry(job: JobRow, bullets: JobBulletRow[]): NonNullable<ResumeJson['work']>[number] {
  const highlights = bullets
    .map((b) => trimStr(b.text))
    .filter((s): s is string => !!s)
  return {
    ...opt('name', trimStr(job.company)),
    ...opt('position', trimStr(job.role)),
    ...opt('startDate', trimStr(job.startDate)),
    ...opt('endDate', trimStr(job.endDate)),
    ...opt('highlights', highlights),
  }
}

function toEducationEntry(edu: EducationRow): NonNullable<ResumeJson['education']>[number] {
  const courses = parseJsonArray(edu.courses) as string[]
  return {
    ...opt('institution', trimStr(edu.institution)),
    ...opt('area', trimStr(edu.area)),
    ...opt('studyType', trimStr(edu.studyType)),
    ...opt('startDate', trimStr(edu.startDate)),
    ...opt('endDate', trimStr(edu.endDate)),
    ...opt('score', trimStr(edu.score)),
    ...opt('courses', courses),
  }
}

/**
 * Group skills by category (mirrors `import.ts` inverse mapping):
 *   resume.json `skills[].name` = category name
 *   resume.json `skills[].keywords` = individual skill names within that category
 * Uncategorized skills (categoryId === null) collapse into a single entry with no `name`.
 */
function toSkillEntries(
  allSkills: SkillRow[],
  allCategories: SkillCategoryRow[],
): NonNullable<ResumeJson['skills']> {
  const categoriesById = new Map<number, SkillCategoryRow>()
  for (const c of allCategories) categoriesById.set(c.id, c)

  // Preserve insertion order: iterate skills, group by categoryId.
  const groups = new Map<number | null, string[]>()
  for (const s of allSkills) {
    const name = trimStr(s.name)
    if (!name) continue
    const key = s.categoryId ?? null
    const list = groups.get(key) ?? []
    list.push(name)
    groups.set(key, list)
  }

  // Sort group keys by their category sortOrder, with uncategorized last.
  const orderedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === null) return 1
    if (b === null) return -1
    const ca = categoriesById.get(a)
    const cb = categoriesById.get(b)
    return (ca?.sortOrder ?? 0) - (cb?.sortOrder ?? 0)
  })

  const entries: NonNullable<ResumeJson['skills']> = []
  for (const key of orderedKeys) {
    const keywords = groups.get(key) ?? []
    const cat = key === null ? undefined : categoriesById.get(key)
    const entry: NonNullable<ResumeJson['skills']>[number] = {
      ...opt('name', trimStr(cat?.name)),
      ...opt('keywords', keywords),
    }
    if (Object.keys(entry).length > 0) entries.push(entry)
  }
  return entries
}

function toProjectEntry(
  proj: ProjectRow,
  bullets: ProjectBulletRow[],
): NonNullable<ResumeJson['projects']>[number] {
  const highlights = bullets
    .map((b) => trimStr(b.text))
    .filter((s): s is string => !!s)
  return {
    ...opt('name', trimStr(proj.name)),
    ...opt('highlights', highlights),
  }
}

function toVolunteerEntry(v: VolunteerRow): NonNullable<ResumeJson['volunteer']>[number] {
  const highlights = parseJsonArray(v.highlights) as string[]
  return {
    ...opt('organization', trimStr(v.organization)),
    ...opt('position', trimStr(v.position)),
    ...opt('startDate', trimStr(v.startDate)),
    ...opt('endDate', trimStr(v.endDate)),
    ...opt('summary', trimStr(v.summary)),
    ...opt('highlights', highlights),
  }
}

function toAwardEntry(a: AwardRow): NonNullable<ResumeJson['awards']>[number] {
  return {
    ...opt('title', trimStr(a.title)),
    ...opt('date', trimStr(a.date)),
    ...opt('awarder', trimStr(a.awarder)),
    ...opt('summary', trimStr(a.summary)),
  }
}

function toPublicationEntry(p: PublicationRow): NonNullable<ResumeJson['publications']>[number] {
  return {
    ...opt('name', trimStr(p.name)),
    ...opt('publisher', trimStr(p.publisher)),
    ...opt('releaseDate', trimStr(p.releaseDate)),
    ...opt('url', trimStr(p.url)),
    ...opt('summary', trimStr(p.summary)),
  }
}

function toLanguageEntry(l: LanguageRow): NonNullable<ResumeJson['languages']>[number] {
  return {
    ...opt('language', trimStr(l.language)),
    ...opt('fluency', trimStr(l.fluency)),
  }
}

function toInterestEntry(i: InterestRow): NonNullable<ResumeJson['interests']>[number] {
  const keywords = parseJsonArray(i.keywords) as string[]
  return {
    ...opt('name', trimStr(i.name)),
    ...opt('keywords', keywords),
  }
}

function toReferenceEntry(r: ReferenceRow): NonNullable<ResumeJson['references']>[number] {
  return {
    ...opt('name', trimStr(r.name)),
    ...opt('reference', trimStr(r.reference)),
  }
}

// ---------------------------------------------------------------------------
// Top-level builder
// ---------------------------------------------------------------------------

/**
 * Builds the base resume.json document from the experience DB.
 *
 * Lossy-faithful contract — these fields are NOT exported:
 *   - profiles[1..]  (only first social profile kept)
 *   - basics.location.{address,postalCode,region,countryCode}  (only city kept)
 *   - basics.url, basics.label, basics.image
 *   - skills[].level
 *   - projects[].{description,url,startDate,endDate}
 *
 * Re-importing previously exported data creates duplicates — import is append-only.
 *
 * @throws ExportValidationError if produced object fails ResumeJsonSchema.parse
 */
export function buildBaseResumeJson(db: Db): ResumeJson {
  // 1. Read all tables
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
  const jobRows = db.select().from(jobs).orderBy(asc(jobs.sortOrder)).all()
  const jobBulletRows = db.select().from(jobBullets).orderBy(asc(jobBullets.sortOrder)).all()
  const skillRows = db.select().from(skills).all()
  const skillCategoryRows = db.select().from(skillCategories).orderBy(asc(skillCategories.sortOrder)).all()
  const projectRows = db.select().from(projects).orderBy(asc(projects.sortOrder)).all()
  const projectBulletRows = db.select().from(projectBullets).orderBy(asc(projectBullets.sortOrder)).all()
  const educationRows = db.select().from(education).all()
  const volunteerRows = db.select().from(volunteer).all()
  const awardRows = db.select().from(awards).all()
  const publicationRows = db.select().from(publications).all()
  const languageRows = db.select().from(languages).all()
  const interestRows = db.select().from(interests).all()
  const referenceRows = db.select().from(referenceEntries).all()

  // 2. Build basics (D-04, D-16 — only city kept from location; only first profile)
  const locationInner = {
    ...opt('city', trimStr(profileRow?.location)),
  }
  const linkedinUrl = trimStr(profileRow?.linkedin)
  const profilesArr = linkedinUrl ? [{ url: linkedinUrl }] : []
  const basics = {
    ...opt('name', trimStr(profileRow?.name)),
    ...opt('email', trimStr(profileRow?.email)),
    ...opt('phone', trimStr(profileRow?.phone)),
    ...opt('location', nonEmpty(locationInner)),
    ...opt('profiles', profilesArr),
  }

  // 3. Build collections (filter empty entries — Pitfall 4)
  const work = jobRows
    .map((j) => toWorkEntry(j, jobBulletRows.filter((b) => b.jobId === j.id)))
    .filter((e) => Object.keys(e).length > 0)

  const educationOut = educationRows
    .map(toEducationEntry)
    .filter((e) => Object.keys(e).length > 0)

  const skillsOut = toSkillEntries(skillRows, skillCategoryRows)

  const projectsOut = projectRows
    .map((p) => toProjectEntry(p, projectBulletRows.filter((b) => b.projectId === p.id)))
    .filter((e) => Object.keys(e).length > 0)

  const volunteerOut = volunteerRows
    .map(toVolunteerEntry)
    .filter((e) => Object.keys(e).length > 0)

  const awardsOut = awardRows
    .map(toAwardEntry)
    .filter((e) => Object.keys(e).length > 0)

  const publicationsOut = publicationRows
    .map(toPublicationEntry)
    .filter((e) => Object.keys(e).length > 0)

  const languagesOut = languageRows
    .map(toLanguageEntry)
    .filter((e) => Object.keys(e).length > 0)

  const interestsOut = interestRows
    .map(toInterestEntry)
    .filter((e) => Object.keys(e).length > 0)

  const referencesOut = referenceRows
    .map(toReferenceEntry)
    .filter((e) => Object.keys(e).length > 0)

  // 4. Assemble top-level (opt() omits empty groups)
  const result: unknown = {
    ...opt('basics', nonEmpty(basics)),
    ...opt('work', work),
    ...opt('education', educationOut),
    ...opt('skills', skillsOut),
    ...opt('projects', projectsOut),
    ...opt('volunteer', volunteerOut),
    ...opt('awards', awardsOut),
    ...opt('publications', publicationsOut),
    ...opt('languages', languagesOut),
    ...opt('interests', interestsOut),
    ...opt('references', referencesOut),
  }

  // 5. Validate-or-throw (D-02)
  const parsed = ResumeJsonSchema.safeParse(result)
  if (!parsed.success) {
    throw new ExportValidationError(parsed.error.issues)
  }
  return parsed.data
}
