import { ipcMain } from 'electron'
import { db } from '../db'
import { profile } from '../db/schema'
import { eq } from 'drizzle-orm'

const DEFAULT_PROFILE = {
  id: 1,
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  summary: '',
}

export function registerProfileHandlers(): void {
  ipcMain.handle('profile:get', async () => {
    const rows = db.select().from(profile).where(eq(profile.id, 1)).all()
    return rows[0] ?? DEFAULT_PROFILE
  })

  ipcMain.handle(
    'profile:set',
    async (
      _,
      data: { name: string; email: string; phone: string; location: string; linkedin: string; summary: string },
    ) => {
      db.insert(profile)
        .values({ id: 1, ...data })
        .onConflictDoUpdate({ target: profile.id, set: data })
        .run()
      const rows = db.select().from(profile).where(eq(profile.id, 1)).all()
      return rows[0] ?? { id: 1, ...data }
    },
  )
}
