import { ipcMain, safeStorage } from 'electron'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { aiSettings } from '../db/schema'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'

export function registerSettingsHandlers(): void {
  // Returns provider, model, and hasKey boolean — NEVER the raw API key
  ipcMain.handle('settings:getAi', async () => {
    try {
      const row = db.select().from(aiSettings).where(eq(aiSettings.id, 1)).get()
      if (!row) {
        return { provider: 'openai', model: '', hasKey: false }
      }
      return {
        provider: row.provider,
        model: row.model,
        hasKey: row.apiKey.length > 0,
      }
    } catch (err) {
      console.error('settings:getAi error', err)
      return { provider: 'openai', model: '', hasKey: false }
    }
  })

  // Encrypts API key via safeStorage before writing to DB
  ipcMain.handle(
    'settings:setAi',
    async (_event, data: { provider: string; model: string; apiKey: string }) => {
      if (!safeStorage.isEncryptionAvailable()) {
        return { error: 'Encryption not available on this system' }
      }

      try {
        let encryptedKey = ''
        if (data.apiKey.length > 0) {
          encryptedKey = safeStorage.encryptString(data.apiKey).toString('base64')
        }

        db.insert(aiSettings)
          .values({ id: 1, provider: data.provider, model: data.model, apiKey: encryptedKey })
          .onConflictDoUpdate({
            target: aiSettings.id,
            set: { provider: data.provider, model: data.model, apiKey: encryptedKey },
          })
          .run()

        return { success: true }
      } catch (err) {
        console.error('settings:setAi error', err)
        return { error: String(err) }
      }
    },
  )

  // Decrypts key and makes a real LLM test call with specific error classification
  ipcMain.handle('settings:testAi', async () => {
    try {
      const row = db.select().from(aiSettings).where(eq(aiSettings.id, 1)).get()
      if (!row || row.apiKey.length === 0) {
        return { error: 'No API key configured', code: 'NOT_CONFIGURED' }
      }

      const decryptedKey = safeStorage.decryptString(Buffer.from(row.apiKey, 'base64'))

      const provider = row.provider
      const modelId =
        row.model.length > 0
          ? row.model
          : provider === 'anthropic'
            ? 'claude-sonnet-4-20250514'
            : 'gpt-4o'

      let modelInstance
      if (provider === 'anthropic') {
        const anthropic = createAnthropic({ apiKey: decryptedKey })
        modelInstance = anthropic(modelId)
      } else {
        const openai = createOpenAI({ apiKey: decryptedKey })
        modelInstance = openai(modelId)
      }

      await generateText({
        model: modelInstance,
        prompt: 'Say hello',
        maxTokens: 5,
      })

      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const errObj = err as Record<string, unknown>

      // Classify errors specifically
      if (
        (typeof errObj.status === 'number' && errObj.status === 401) ||
        message.includes('401') ||
        message.toLowerCase().includes('invalid api key') ||
        message.toLowerCase().includes('authentication')
      ) {
        return { error: 'Invalid API key' }
      }
      if (
        (typeof errObj.status === 'number' && errObj.status === 429) ||
        message.includes('429') ||
        message.toLowerCase().includes('rate limit')
      ) {
        return { error: 'Rate limited' }
      }
      if (
        message.includes('ECONNREFUSED') ||
        message.includes('ETIMEDOUT') ||
        message.includes('ENOTFOUND') ||
        message.toLowerCase().includes('network')
      ) {
        return { error: 'Network error' }
      }
      return { error: message }
    }
  })
}
