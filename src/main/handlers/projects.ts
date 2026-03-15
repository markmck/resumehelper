import { ipcMain } from 'electron'
import { db } from '../db'
import { projects, projectBullets } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:list', async () => {
    const allProjects = await db.select().from(projects).orderBy(asc(projects.id))
    const result = await Promise.all(
      allProjects.map(async (project) => {
        const bullets = await db
          .select()
          .from(projectBullets)
          .where(eq(projectBullets.projectId, project.id))
          .orderBy(asc(projectBullets.sortOrder))
        return { ...project, bullets }
      }),
    )
    return result
  })

  ipcMain.handle('projects:create', async (_, data: { name: string }) => {
    const rows = await db
      .insert(projects)
      .values({
        name: data.name,
        sortOrder: 0,
      })
      .returning()
    return rows[0]
  })

  ipcMain.handle('projects:update', async (_, id: number, data: { name?: string }) => {
    const rows = await db.update(projects).set(data).where(eq(projects.id, id)).returning()
    return rows[0]
  })

  ipcMain.handle('projects:delete', async (_, id: number) => {
    await db.delete(projects).where(eq(projects.id, id))
  })

  ipcMain.handle(
    'projectBullets:create',
    async (_, data: { projectId: number; text: string; sortOrder: number }) => {
      const rows = await db
        .insert(projectBullets)
        .values({
          projectId: data.projectId,
          text: data.text,
          sortOrder: data.sortOrder,
        })
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle(
    'projectBullets:update',
    async (_, id: number, data: { text?: string }) => {
      const rows = await db
        .update(projectBullets)
        .set(data)
        .where(eq(projectBullets.id, id))
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle('projectBullets:delete', async (_, id: number) => {
    await db.delete(projectBullets).where(eq(projectBullets.id, id))
  })

  ipcMain.handle(
    'projectBullets:reorder',
    async (_, _projectId: number, orderedIds: number[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db
          .update(projectBullets)
          .set({ sortOrder: i })
          .where(eq(projectBullets.id, orderedIds[i]))
      }
    },
  )
}
