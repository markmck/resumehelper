import { ipcMain } from 'electron'
import { db } from '../db'
import { skillCategories } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerSkillCategoryHandlers(): void {
  ipcMain.handle('skills:categories:list', async () => {
    return db.select().from(skillCategories).orderBy(asc(skillCategories.sortOrder))
  })

  ipcMain.handle('skills:categories:create', async (_, data: { name: string }) => {
    const maxOrder = await db.select({ sortOrder: skillCategories.sortOrder }).from(skillCategories).orderBy(asc(skillCategories.sortOrder))
    const nextOrder = maxOrder.length > 0 ? Math.max(...maxOrder.map(r => r.sortOrder)) + 1 : 0
    const rows = await db.insert(skillCategories).values({ name: data.name, sortOrder: nextOrder }).returning()
    return rows[0]
  })

  ipcMain.handle('skills:categories:update', async (_, id: number, data: { name?: string; sortOrder?: number }) => {
    const updateData: Partial<{ name: string; sortOrder: number }> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    const rows = await db.update(skillCategories).set(updateData).where(eq(skillCategories.id, id)).returning()
    return rows[0]
  })

  ipcMain.handle('skills:categories:delete', async (_, id: number) => {
    await db.delete(skillCategories).where(eq(skillCategories.id, id))
    // FK ON DELETE SET NULL handles moving skills to uncategorized
  })
}
