/**
 * Pure variant-merged resume.json builder.
 *
 * Calls `buildMergedBuilderData(db, variantId, analysisId?)` for the three-layer
 * merge (Phase 30), then maps the merged Builder* shapes into resume.json shape
 * using promoted helpers from baseResumeBuilder.ts (Phase 32 D-02).
 *
 * Variant-specific behavior vs. base export:
 *   - Filters `excluded` items BEFORE mapping (D-06)
 *   - Filters bullet.excluded inside each job/project BEFORE building highlights (D-06)
 *   - Emits basics.summary from profile.summary when merged.showSummary === true (D-10)
 *   - Groups skills by `categoryName` (string) so accepted skill additions fold in (D-08)
 *
 * Validates output against ResumeJsonSchema and throws ExportValidationError on
 * failure. Pure function — no IPC, BrowserWindow, dialog, or fs touches.
 *
 * @throws ExportValidationError if produced object fails ResumeJsonSchema.parse
 */
import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
import { profile } from '../db/schema'
import { ResumeJsonSchema, type ResumeJson } from '../../shared/resumeJson'
import { buildMergedBuilderData } from './mergeHelper'
import {
  ExportValidationError,
  opt,
  nonEmpty,
  trimStr,
  toAwardEntry,
  toPublicationEntry,
  toLanguageEntry,
  toReferenceEntry,
} from './baseResumeBuilder'

type Db = BetterSQLite3Database<typeof schema>

export async function buildVariantResumeJson(
  db: Db,
  variantId: number,
  analysisId?: number,
): Promise<ResumeJson> {
  // 1. Get merged three-layer data
  const merged = await buildMergedBuilderData(db, variantId, analysisId)

  // 2. Read profile directly (mergeHelper does not return profile)
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()

  // 3. basics — mirror buildBaseResumeJson, PLUS conditional summary (D-10)
  const locationInner = {
    ...opt('city', trimStr(profileRow?.location)),
  }
  const linkedinUrl = trimStr(profileRow?.linkedin)
  const profilesArr = linkedinUrl ? [{ url: linkedinUrl }] : []
  // OVR-02 single-merge-path: honor a variant-tier summary override (frozen into
  // merged.summaryOverride by buildMergedBuilderData) before falling back to base.
  const summaryStr = merged.showSummary
    ? trimStr(merged.summaryOverride ?? profileRow?.summary)
    : undefined
  const basics = {
    ...opt('name', trimStr(profileRow?.name)),
    ...opt('email', trimStr(profileRow?.email)),
    ...opt('phone', trimStr(profileRow?.phone)),
    ...opt('summary', summaryStr),
    ...opt('location', nonEmpty(locationInner)),
    ...opt('profiles', profilesArr),
  }

  // 4. work — filter excluded jobs, filter excluded bullets within each job (D-06)
  const work = merged.jobs
    .filter((j) => !j.excluded)
    .map((j) => {
      const highlights = j.bullets
        .filter((b) => !b.excluded)
        .map((b) => trimStr(b.text))
        .filter((s): s is string => !!s)
      return {
        ...opt('name', trimStr(j.company)),
        ...opt('position', trimStr(j.role)),
        ...opt('startDate', trimStr(j.startDate)),
        ...opt('endDate', trimStr(j.endDate)),
        ...opt('highlights', highlights),
      }
    })
    .filter((e) => Object.keys(e).length > 0)

  // 5. education — filter excluded, then map. BuilderEducation has courses already
  //    parsed to string[], so we inline the mapping rather than reuse toEducationEntry
  //    (which expects a JSON-text column).
  const educationOut = merged.education
    .filter((e) => !e.excluded)
    .map((e) => ({
      ...opt('institution', trimStr(e.institution)),
      ...opt('area', trimStr(e.area)),
      ...opt('studyType', trimStr(e.studyType)),
      ...opt('startDate', trimStr(e.startDate)),
      ...opt('endDate', trimStr(e.endDate)),
      ...opt('score', trimStr(e.score)),
      ...opt('courses', e.courses ?? []),
    }))
    .filter((e) => Object.keys(e).length > 0)

  // 6. skills — group by categoryName per D-08 (string-keyed, not id-keyed).
  //    Walk filtered skills in insertion order; group key = categoryName (string|null).
  //    Accepted skill additions arrive with a null category-id and categoryName populated —
  //    they fold into the same name-keyed group as base skills sharing that name (D-08).
  const skillGroups = new Map<string | null, string[]>()
  const skillGroupOrder: Array<string | null> = []
  for (const s of merged.skills) {
    if (s.excluded) continue
    const name = trimStr(s.name)
    if (!name) continue
    const key = s.categoryName ?? null
    if (!skillGroups.has(key)) {
      skillGroups.set(key, [])
      skillGroupOrder.push(key)
    }
    skillGroups.get(key)!.push(name)
  }
  const skillsOut: NonNullable<ResumeJson['skills']> = []
  for (const key of skillGroupOrder) {
    const keywords = skillGroups.get(key) ?? []
    const entry: NonNullable<ResumeJson['skills']>[number] = {
      ...opt('name', key ?? undefined),
      ...opt('keywords', keywords),
    }
    if (Object.keys(entry).length > 0) skillsOut.push(entry)
  }

  // 7. projects — filter excluded projects, filter excluded bullets within each (D-06)
  const projectsOut = merged.projects
    .filter((p) => !p.excluded)
    .map((p) => {
      const highlights = p.bullets
        .filter((b) => !b.excluded)
        .map((b) => trimStr(b.text))
        .filter((s): s is string => !!s)
      return {
        ...opt('name', trimStr(p.name)),
        ...opt('highlights', highlights),
      }
    })
    .filter((e) => Object.keys(e).length > 0)

  // 8. volunteer — BuilderVolunteer has highlights: string[] already (mergeHelper parses)
  const volunteerOut = merged.volunteer
    .filter((v) => !v.excluded)
    .map((v) => ({
      ...opt('organization', trimStr(v.organization)),
      ...opt('position', trimStr(v.position)),
      ...opt('startDate', trimStr(v.startDate)),
      ...opt('endDate', trimStr(v.endDate)),
      ...opt('summary', trimStr(v.summary)),
      ...opt('highlights', v.highlights ?? []),
    }))
    .filter((e) => Object.keys(e).length > 0)

  // 9. Awards / publications / languages / references — Builder* shapes are
  //    structurally compatible with the Row types these helpers expect for the
  //    fields they read (no JSON-text columns involved).
  const awardsOut = merged.awards
    .filter((a) => !a.excluded)
    .map((a) => toAwardEntry(a as Parameters<typeof toAwardEntry>[0]))
    .filter((e) => Object.keys(e).length > 0)

  const publicationsOut = merged.publications
    .filter((p) => !p.excluded)
    .map((p) => toPublicationEntry(p as Parameters<typeof toPublicationEntry>[0]))
    .filter((e) => Object.keys(e).length > 0)

  const languagesOut = merged.languages
    .filter((l) => !l.excluded)
    .map((l) => toLanguageEntry(l as Parameters<typeof toLanguageEntry>[0]))
    .filter((e) => Object.keys(e).length > 0)

  // interests — BuilderInterest has keywords: string[]; inline (toInterestEntry expects JSON-text)
  const interestsOut = merged.interests
    .filter((i) => !i.excluded)
    .map((i) => ({
      ...opt('name', trimStr(i.name)),
      ...opt('keywords', i.keywords ?? []),
    }))
    .filter((e) => Object.keys(e).length > 0)

  const referencesOut = merged.references
    .filter((r) => !r.excluded)
    .map((r) => toReferenceEntry(r as Parameters<typeof toReferenceEntry>[0]))
    .filter((e) => Object.keys(e).length > 0)

  // 10. Assemble top-level — opt() omits empty groups. NO `meta` field (JSON-09).
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

  // 11. Validate-or-throw (D-05)
  const parsed = ResumeJsonSchema.safeParse(result)
  if (!parsed.success) {
    throw new ExportValidationError(parsed.error.issues)
  }
  return parsed.data
}
