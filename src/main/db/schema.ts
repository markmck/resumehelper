import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const jobBullets = sqliteTable('job_bullets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  tags: text('tags').notNull().default('[]'),
})

export const templateVariants = sqliteTable('template_variants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  layoutTemplate: text('layout_template').notNull().default('traditional'),
  templateOptions: text('template_options'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const projectBullets = sqliteTable('project_bullets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const education = sqliteTable('education', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  institution: text('institution').notNull(),
  area: text('area').notNull().default(''),
  studyType: text('study_type').notNull().default(''),
  startDate: text('start_date').notNull().default(''),
  endDate: text('end_date'),
  score: text('score').default(''),
  courses: text('courses').notNull().default('[]'),
})

export const volunteer = sqliteTable('volunteer', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  organization: text('organization').notNull(),
  position: text('position').notNull().default(''),
  startDate: text('start_date').notNull().default(''),
  endDate: text('end_date'),
  summary: text('summary').notNull().default(''),
  highlights: text('highlights').notNull().default('[]'),
})

export const awards = sqliteTable('awards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  date: text('date'),
  awarder: text('awarder').notNull().default(''),
  summary: text('summary').notNull().default(''),
})

export const publications = sqliteTable('publications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  publisher: text('publisher').notNull().default(''),
  releaseDate: text('release_date'),
  url: text('url').notNull().default(''),
  summary: text('summary').notNull().default(''),
})

export const languages = sqliteTable('languages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  language: text('language').notNull(),
  fluency: text('fluency').notNull().default(''),
})

export const interests = sqliteTable('interests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  keywords: text('keywords').notNull().default('[]'),
})

export const referenceEntries = sqliteTable('references', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  reference: text('reference').notNull().default(''),
})

export const templateVariantItems = sqliteTable('template_variant_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variantId: integer('variant_id')
    .notNull()
    .references(() => templateVariants.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(),
  bulletId: integer('bullet_id').references(() => jobBullets.id, { onDelete: 'cascade' }),
  skillId: integer('skill_id').references(() => skills.id, { onDelete: 'cascade' }),
  jobId: integer('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  projectBulletId: integer('project_bullet_id').references(() => projectBullets.id, { onDelete: 'cascade' }),
  educationId: integer('education_id').references(() => education.id, { onDelete: 'cascade' }),
  volunteerId: integer('volunteer_id').references(() => volunteer.id, { onDelete: 'cascade' }),
  awardId: integer('award_id').references(() => awards.id, { onDelete: 'cascade' }),
  publicationId: integer('publication_id').references(() => publications.id, { onDelete: 'cascade' }),
  languageId: integer('language_id').references(() => languages.id, { onDelete: 'cascade' }),
  interestId: integer('interest_id').references(() => interests.id, { onDelete: 'cascade' }),
  referenceId: integer('reference_id').references(() => referenceEntries.id, { onDelete: 'cascade' }),
  excluded: integer('excluded', { mode: 'boolean' }).notNull().default(false),
})

export const submissions = sqliteTable('submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  variantId: integer('variant_id').references(() => templateVariants.id),
  resumeSnapshot: text('resume_snapshot').notNull().default('{}'),
  url: text('url'),
  notes: text('notes'),
  status: text('status').default('applied'),
  jobPostingId: integer('job_posting_id'),
  scoreAtSubmit: integer('score_at_submit'),
  analysisId: integer('analysis_id'),
})

export const submissionEvents = sqliteTable('submission_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => submissions.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  location: text('location').notNull().default(''),
  linkedin: text('linkedin').notNull().default(''),
  summary: text('summary').notNull().default(''),
})

export const aiSettings = sqliteTable('ai_settings', {
  id: integer('id').primaryKey(),
  provider: text('provider').notNull().default('openai'),
  model: text('model').notNull().default(''),
  apiKey: text('api_key').notNull().default(''),
})

export const jobPostings = sqliteTable('job_postings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  rawText: text('raw_text').notNull().default(''),
  parsedSkills: text('parsed_skills').notNull().default('[]'),
  parsedKeywords: text('parsed_keywords').notNull().default('[]'),
  parsedRequirements: text('parsed_requirements').notNull().default('[]'),
  parsedPreferred: text('parsed_preferred').notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const analysisResults = sqliteTable('analysis_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobPostingId: integer('job_posting_id')
    .notNull()
    .references(() => jobPostings.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').references(() => templateVariants.id, { onDelete: 'set null' }),
  matchScore: integer('match_score').notNull().default(0),
  keywordHits: text('keyword_hits').notNull().default('[]'),
  keywordMisses: text('keyword_misses').notNull().default('[]'),
  semanticMatches: text('semantic_matches').notNull().default('[]'),
  gapSkills: text('gap_skills').notNull().default('[]'),
  suggestions: text('suggestions').notNull().default('[]'),
  atsFlags: text('ats_flags').notNull().default('[]'),
  rawLlmResponse: text('raw_llm_response').notNull().default(''),
  status: text('status').notNull().default('unreviewed'),
  scoreBreakdown: text('score_breakdown').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const analysisBulletOverrides = sqliteTable('analysis_bullet_overrides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  analysisId: integer('analysis_id')
    .notNull()
    .references(() => analysisResults.id, { onDelete: 'cascade' }),
  bulletId: integer('bullet_id')
    .notNull()
    .references(() => jobBullets.id, { onDelete: 'cascade' }),
  overrideText: text('override_text').notNull(),
  source: text('source').notNull().default('ai_suggestion'),
  suggestionId: text('suggestion_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const analysisSkillAdditions = sqliteTable('analysis_skill_additions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  analysisId: integer('analysis_id')
    .notNull()
    .references(() => analysisResults.id, { onDelete: 'cascade' }),
  skillName: text('skill_name').notNull(),
  reason: text('reason').notNull().default(''),
  category: text('category').notNull().default(''),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})
