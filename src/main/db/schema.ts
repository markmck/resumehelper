import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
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
})

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  location: text('location').notNull().default(''),
  linkedin: text('linkedin').notNull().default(''),
})
