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
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const templateVariantItems = sqliteTable('template_variant_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variantId: integer('variant_id')
    .notNull()
    .references(() => templateVariants.id, { onDelete: 'cascade' }),
  bulletId: integer('bullet_id')
    .notNull()
    .references(() => jobBullets.id, { onDelete: 'cascade' }),
  included: integer('included', { mode: 'boolean' }).notNull().default(true),
})

export const submissions = sqliteTable('submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  variantId: integer('variant_id').references(() => templateVariants.id),
  resumeSnapshot: text('resume_snapshot').notNull().default('{}'),
})
