import { ipcMain } from 'electron'
import { db } from '../db'
import { skills } from '../db/schema'
import { eq } from 'drizzle-orm'

type SkillRow = typeof skills.$inferSelect
type SkillWithParsedTags = Omit<SkillRow, 'tags'> & { tags: string[] }

function parseTags(row: SkillRow): SkillWithParsedTags {
  return { ...row, tags: JSON.parse(row.tags) as string[] }
}

export function registerSkillHandlers(): void {
  ipcMain.handle('skills:list', async () => {
    const rows = await db.select().from(skills)
    return rows.map(parseTags)
  })

  ipcMain.handle('skills:create', async (_, data: { name: string; tags: string[] }) => {
    const rows = await db
      .insert(skills)
      .values({
        name: data.name,
        tags: JSON.stringify(data.tags),
      })
      .returning()
    return parseTags(rows[0])
  })

  ipcMain.handle(
    'skills:update',
    async (_, id: number, data: { name?: string; tags?: string[] }) => {
      const updateData: Partial<SkillRow> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags)
      const rows = await db.update(skills).set(updateData).where(eq(skills.id, id)).returning()
      return parseTags(rows[0])
    },
  )

  ipcMain.handle('skills:delete', async (_, id: number) => {
    await db.delete(skills).where(eq(skills.id, id))
  })
}
