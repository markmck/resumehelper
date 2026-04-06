/**
 * Vitest global setup — runs before each test file.
 * Mocks src/main/db so handlers can be imported without triggering
 * real SQLite DB initialization (which requires a real filesystem path).
 */
import { vi } from 'vitest'
import { createTestDb } from './helpers/db'

vi.mock('../../src/main/db', () => ({
  db: createTestDb(),
  sqlite: null,
}))
