import { ipcMain } from 'electron'
import { db } from '../db'
import { skillCategories } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listSkillCategories(db: Db) {
  return db.select().from(skillCategories).orderBy(asc(skillCategories.sortOrder))
}

export async function createSkillCategory(db: Db, data: { name: string }) {
  const maxOrder = await db.select({ sortOrder: skillCategories.sortOrder }).from(skillCategories).orderBy(asc(skillCategories.sortOrder))
  const nextOrder = maxOrder.length > 0 ? Math.max(...maxOrder.map(r => r.sortOrder)) + 1 : 0
  const rows = await db.insert(skillCategories).values({ name: data.name, sortOrder: nextOrder }).returning()
  return rows[0]
}

export async function updateSkillCategory(db: Db, id: number, data: { name?: string; sortOrder?: number }) {
  const updateData: Partial<{ name: string; sortOrder: number }> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
  const rows = await db.update(skillCategories).set(updateData).where(eq(skillCategories.id, id)).returning()
  return rows[0]
}

export async function deleteSkillCategory(db: Db, id: number) {
  await db.delete(skillCategories).where(eq(skillCategories.id, id))
  // FK ON DELETE SET NULL handles moving skills to uncategorized
}

export function registerSkillCategoryHandlers(): void {
  ipcMain.handle('skills:categories:list', () => listSkillCategories(db))

  ipcMain.handle('skills:categories:create', (_, data: { name: string }) => createSkillCategory(db, data))

  ipcMain.handle('skills:categories:update', (_, id: number, data: { name?: string; sortOrder?: number }) =>
    updateSkillCategory(db, id, data),
  )

  ipcMain.handle('skills:categories:delete', (_, id: number) => deleteSkillCategory(db, id))
}
