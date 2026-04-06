/**
 * Mock for src/main/db/index.ts
 * Used in tests so handler imports don't trigger real DB initialization.
 * Tests inject a real in-memory DB via createTestDb() directly.
 */
import { createTestDb } from '../helpers/db'

export const db = createTestDb()
export const sqlite = (db as any).session?.client ?? null
