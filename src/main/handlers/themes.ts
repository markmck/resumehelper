import { ipcMain } from 'electron'
import { db } from '../db'
import { profile } from '../db/schema'
import { eq } from 'drizzle-orm'
import { THEMES, buildResumeJson, renderThemeHtml } from '../lib/themeRegistry'
import { getBuilderDataForVariant } from './export'

export function registerThemeHandlers(): void {
  ipcMain.handle('themes:list', () => THEMES)

  ipcMain.handle('themes:renderHtml', async (_, variantId: number, themeKey: string) => {
    try {
      const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
      const builderData = await getBuilderDataForVariant(variantId)
      const resumeJson = buildResumeJson(profileRow, builderData)
      const html = await renderThemeHtml(themeKey, resumeJson)
      return html
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: message }
    }
  })
}
