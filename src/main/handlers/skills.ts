import { ipcMain } from 'electron'
import { db } from '../db'
import { skills, skillCategories } from '../db/schema'
import { eq } from 'drizzle-orm'

export function registerSkillHandlers(): void {
  ipcMain.handle('skills:list', async () => {
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
  })

  ipcMain.handle('skills:create', async (_, data: { name: string; tags: string[]; categoryId?: number | null }) => {
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
  })

  ipcMain.handle(
    'skills:update',
    async (_, id: number, data: { name?: string; tags?: string[]; categoryId?: number | null }) => {
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
    },
  )

  ipcMain.handle('skills:delete', async (_, id: number) => {
    await db.delete(skills).where(eq(skills.id, id))
  })
}
