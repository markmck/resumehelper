import { ipcMain } from 'electron'
import { db } from '../db'
import { projects, projectBullets } from '../db/schema'
import { eq, asc } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

export async function listProjects(db: Db) {
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
}

export async function createProject(db: Db, data: { name: string }) {
  const rows = await db
    .insert(projects)
    .values({
      name: data.name,
      sortOrder: 0,
    })
    .returning()
  return rows[0]
}

export async function updateProject(db: Db, id: number, data: { name?: string }) {
  const rows = await db.update(projects).set(data).where(eq(projects.id, id)).returning()
  return rows[0]
}

export async function deleteProject(db: Db, id: number) {
  await db.delete(projects).where(eq(projects.id, id))
}

export async function createProjectBullet(db: Db, data: { projectId: number; text: string; sortOrder: number }) {
  const rows = await db
    .insert(projectBullets)
    .values({
      projectId: data.projectId,
      text: data.text,
      sortOrder: data.sortOrder,
    })
    .returning()
  return rows[0]
}

export async function updateProjectBullet(db: Db, id: number, data: { text?: string }) {
  const rows = await db
    .update(projectBullets)
    .set(data)
    .where(eq(projectBullets.id, id))
    .returning()
  return rows[0]
}

export async function deleteProjectBullet(db: Db, id: number) {
  await db.delete(projectBullets).where(eq(projectBullets.id, id))
}

export async function reorderProjectBullets(db: Db, _projectId: number, orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(projectBullets)
      .set({ sortOrder: i })
      .where(eq(projectBullets.id, orderedIds[i]))
  }
}

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:list', () => listProjects(db))

  ipcMain.handle('projects:create', (_, data: { name: string }) => createProject(db, data))

  ipcMain.handle('projects:update', (_, id: number, data: { name?: string }) => updateProject(db, id, data))

  ipcMain.handle('projects:delete', (_, id: number) => deleteProject(db, id))

  ipcMain.handle('projectBullets:create', (_, data: { projectId: number; text: string; sortOrder: number }) =>
    createProjectBullet(db, data),
  )

  ipcMain.handle('projectBullets:update', (_, id: number, data: { text?: string }) =>
    updateProjectBullet(db, id, data),
  )

  ipcMain.handle('projectBullets:delete', (_, id: number) => deleteProjectBullet(db, id))

  ipcMain.handle('projectBullets:reorder', (_, _projectId: number, orderedIds: number[]) =>
    reorderProjectBullets(db, _projectId, orderedIds),
  )
}
