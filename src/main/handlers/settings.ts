import { ipcMain, safeStorage } from 'electron'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { aiSettings } from '../db/schema'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../db/schema'
type Db = BetterSQLite3Database<typeof schema>

// Returns provider, model, and hasKey boolean — NEVER the raw API key
export function getAiSettings(db: Db) {
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
}

// Encrypts API key via safeStorage before writing to DB
export function setAiSettings(db: Db, data: { provider: string; model: string; apiKey: string }) {
  if (!safeStorage.isEncryptionAvailable()) {
    return { error: 'Encryption not available on this system' }
  }

  try {
    if (data.apiKey.length > 0) {
      // Key provided — encrypt and save everything
      const encryptedKey = safeStorage.encryptString(data.apiKey).toString('base64')
      db.insert(aiSettings)
        .values({ id: 1, provider: data.provider, model: data.model, apiKey: encryptedKey })
        .onConflictDoUpdate({
          target: aiSettings.id,
          set: { provider: data.provider, model: data.model, apiKey: encryptedKey },
        })
        .run()
    } else {
      // No key — update provider/model only, keep existing key
      db.update(aiSettings)
        .set({ provider: data.provider, model: data.model })
        .where(eq(aiSettings.id, 1))
        .run()
    }

    return { success: true }
  } catch (err) {
    console.error('settings:setAi error', err)
    return { error: String(err) }
  }
}

// Fetches available models from the provider API using the stored key
export async function listModels(db: Db) {
  try {
    const row = db.select().from(aiSettings).where(eq(aiSettings.id, 1)).get()
    if (!row || row.apiKey.length === 0) {
      return { models: [], error: 'No API key configured' }
    }

    const decryptedKey = safeStorage.decryptString(Buffer.from(row.apiKey, 'base64'))

    if (row.provider === 'anthropic') {
      const resp = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': decryptedKey,
          'anthropic-version': '2023-06-01',
        },
      })
      if (!resp.ok) return { models: [], error: `API error: ${resp.status}` }
      const data = (await resp.json()) as { data: Array<{ id: string; display_name?: string }> }
      const models = data.data
        .map((m) => m.id)
        .filter((id) => id.startsWith('claude-'))
        .sort()
        .reverse()
      return { models }
    } else {
      const resp = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${decryptedKey}` },
      })
      if (!resp.ok) return { models: [], error: `API error: ${resp.status}` }
      const data = (await resp.json()) as { data: Array<{ id: string }> }
      const models = data.data
        .map((m) => m.id)
        .filter((id) => id.startsWith('gpt-') || id.startsWith('o'))
        .filter((id) => !id.includes('instruct') && !id.includes('realtime') && !id.includes('audio') && !id.includes('search'))
        .sort()
        .reverse()
      return { models }
    }
  } catch (err) {
    console.error('settings:listModels error', err)
    return { models: [], error: err instanceof Error ? err.message : String(err) }
  }
}

// Decrypts key and makes a real LLM test call with specific error classification
export async function testAi(db: Db) {
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
          ? 'claude-sonnet-4-5-20250514'
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
      maxOutputTokens: 5,
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
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getAi', () => getAiSettings(db))

  ipcMain.handle('settings:setAi', (_event, data: { provider: string; model: string; apiKey: string }) =>
    setAiSettings(db, data),
  )

  ipcMain.handle('settings:listModels', () => listModels(db))

  ipcMain.handle('settings:testAi', () => testAi(db))
}
