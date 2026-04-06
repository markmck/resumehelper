import { ipcMain } from 'electron'
import { db } from '../db'
import { skills, skillCategories } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listSkills(db: Db) {
  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      tags: skills.tags,
      categoryId: skills.categoryId,
      categoryName: skillCategories.name,
    })
    .from(skills)
    .leftJoin(skillCategories, eq(skills.categoryId, skillCategories.id))

  return rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags as string) as string[],
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
  }))
}

export async function createSkill(db: Db, data: { name: string; tags: string[]; categoryId?: number | null }) {
  const rows = await db.insert(skills).values({
    name: data.name,
    tags: JSON.stringify(data.tags),
    categoryId: data.categoryId ?? null,
  }).returning()
  const result = await db
    .select({ id: skills.id, name: skills.name, tags: skills.tags, categoryId: skills.categoryId, categoryName: skillCategories.name })
    .from(skills)
    .leftJoin(skillCategories, eq(skills.categoryId, skillCategories.id))
    .where(eq(skills.id, rows[0].id))
  return { ...result[0], tags: JSON.parse(result[0].tags as string) as string[], categoryId: result[0].categoryId ?? null, categoryName: result[0].categoryName ?? null }
}

export async function updateSkill(db: Db, id: number, data: { name?: string; tags?: string[]; categoryId?: number | null }) {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags)
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
  await db.update(skills).set(updateData).where(eq(skills.id, id))
  const result = await db
    .select({ id: skills.id, name: skills.name, tags: skills.tags, categoryId: skills.categoryId, categoryName: skillCategories.name })
    .from(skills)
    .leftJoin(skillCategories, eq(skills.categoryId, skillCategories.id))
    .where(eq(skills.id, id))
  return { ...result[0], tags: JSON.parse(result[0].tags as string) as string[], categoryId: result[0].categoryId ?? null, categoryName: result[0].categoryName ?? null }
}

export async function deleteSkill(db: Db, id: number) {
  await db.delete(skills).where(eq(skills.id, id))
}

export function registerSkillHandlers(): void {
  ipcMain.handle('skills:list', () => listSkills(db))

  ipcMain.handle('skills:create', (_, data: { name: string; tags: string[]; categoryId?: number | null }) =>
    createSkill(db, data),
  )

  ipcMain.handle('skills:update', (_, id: number, data: { name?: string; tags?: string[]; categoryId?: number | null }) =>
    updateSkill(db, id, data),
  )

  ipcMain.handle('skills:delete', (_, id: number) => deleteSkill(db, id))
}
