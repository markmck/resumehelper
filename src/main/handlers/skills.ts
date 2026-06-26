import { ipcMain } from 'electron'
import { db } from '../db'
import { skills, skillCategories } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

const skillSelect = {
  id: skills.id,
  name: skills.name,
  tags: skills.tags,
  categoryId: skills.categoryId,
  categoryName: skillCategories.name,
  sortOrder: skills.sortOrder,
}

export async function listSkills(db: Db) {
  const rows = await db
    .select(skillSelect)
    .from(skills)
    .leftJoin(skillCategories, eq(skills.categoryId, skillCategories.id))
    .orderBy(asc(skills.sortOrder))

  return rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags as string) as string[],
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
  }))
}

export async function createSkill(db: Db, data: { name: string; tags: string[]; categoryId?: number | null }) {
  const maxRows = await db.select({ sortOrder: skills.sortOrder }).from(skills).orderBy(asc(skills.sortOrder))
  const nextOrder = maxRows.length > 0 ? Math.max(...maxRows.map(r => r.sortOrder)) + 1 : 0
  const rows = await db.insert(skills).values({
    name: data.name,
    tags: JSON.stringify(data.tags),
    categoryId: data.categoryId ?? null,
    sortOrder: nextOrder,
  }).returning()
  const result = await db
    .select(skillSelect)
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
    .select(skillSelect)
    .from(skills)
    .leftJoin(skillCategories, eq(skills.categoryId, skillCategories.id))
    .where(eq(skills.id, id))
  return { ...result[0], tags: JSON.parse(result[0].tags as string) as string[], categoryId: result[0].categoryId ?? null, categoryName: result[0].categoryName ?? null }
}

export async function deleteSkill(db: Db, id: number) {
  await db.delete(skills).where(eq(skills.id, id))
}

export async function reorderSkills(db: Db, orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(skills).set({ sortOrder: i }).where(eq(skills.id, orderedIds[i]))
  }
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

  ipcMain.handle('skills:reorder', (_, orderedIds: number[]) => reorderSkills(db, orderedIds))
}
