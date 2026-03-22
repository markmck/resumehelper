import { ipcMain } from 'electron'
import { db } from '../db'
import { referenceEntries } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export function registerReferenceHandlers(): void {
  ipcMain.handle('references:list', async () => {
    return db.select().from(referenceEntries).orderBy(asc(referenceEntries.id))
  })

  ipcMain.handle(
    'references:create',
    async (
      _,
      data: {
        name: string
        reference?: string
      },
    ) => {
      const rows = await db
        .insert(referenceEntries)
        .values({
          name: data.name,
          reference: data.reference ?? '',
        })
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle(
    'references:update',
    async (
      _,
      id: number,
      data: {
        name?: string
        reference?: string
      },
    ) => {
      const rows = await db
        .update(referenceEntries)
        .set(data)
        .where(eq(referenceEntries.id, id))
        .returning()
      return rows[0]
    },
  )

  ipcMain.handle('references:delete', async (_, id: number) => {
    await db.delete(referenceEntries).where(eq(referenceEntries.id, id))
  })
}
