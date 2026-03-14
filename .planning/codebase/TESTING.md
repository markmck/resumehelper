# Testing Patterns

**Analysis Date:** 2026-03-13

## Test Framework

**Runner:**
- Not configured - testing infrastructure not yet implemented

**Assertion Library:**
- Not configured

**Test Support:**
- No npm scripts for running tests
- No test files detected in source tree (excluding node_modules)

**Recommended Setup:**
While not currently in place, based on stack analysis, Vitest would be a natural choice given Vite is used as build tool. Jest with ts-jest could work as well for a more traditional Node/React setup.

## Test File Organization

**Current State:** No test files exist in the codebase

**Proposed Location:**
- Unit tests: `src/**/__tests__/` or `src/**/*.test.ts(x)` (co-located with source)
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/` or via Playwright/Cypress configuration

**Proposed Naming:**
- `.test.ts` for Node/backend tests
- `.test.tsx` for React component tests
- `.spec.ts` / `.spec.tsx` as alternative convention

## Test Structure

**No established patterns exist.** The following represents TypeScript/React best practices that should be adopted:

**Proposed unit test structure:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  it('should do something', () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected)
  })

  it('should handle edge case', () => {
    // Test specific behavior
  })
})
```

**Proposed React component test structure:**
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App Component', () => {
  it('renders the app title', () => {
    render(<App />)
    // Assertions
  })
})
```

## Mocking

**Current State:** No mocking framework in place

**Proposed Framework:** Vitest built-in mocking with `vi` or `jest.mock()`

**Proposed Mocking Patterns:**

For Electron IPC calls:
```typescript
import { vi } from 'vitest'

// Mock IPC renderer
const mockIPCRenderer = {
  send: vi.fn()
}

window.electron = {
  ipcRenderer: mockIPCRenderer
}
```

For database operations (Drizzle ORM):
```typescript
import { vi } from 'vitest'
import { db } from '../main/db'

vi.mock('../main/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))
```

**What to Mock:**
- Electron IPC communication (main/renderer boundaries)
- External APIs and network requests
- Database operations in unit tests
- Timers and dates when testing time-dependent logic
- File system operations

**What NOT to Mock:**
- React components being tested (render the real component)
- React hooks (test via component behavior)
- Local utility functions in the same module
- TypeScript types

## Fixtures and Factories

**Current State:** Not implemented

**Proposed Test Data Location:**
- `tests/fixtures/` for static test data
- `tests/factories/` for factory functions that generate test data

**Proposed Factory Pattern:**
```typescript
// tests/factories/user.factory.ts
export function createUser(overrides?: Partial<User>): User {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    ...overrides
  }
}

// Usage in tests
it('should update user email', () => {
  const user = createUser({ email: 'new@example.com' })
  // Test with user
})
```

**Proposed Fixture Structure:**
```typescript
// tests/fixtures/users.json
[
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com"
  }
]
```

## Coverage

**Requirements:** Not enforced

**Recommended Target:** Minimum 70% coverage for business logic

**Proposed View Coverage Command:**
```bash
npm run test:coverage    # View coverage report
npm run test:coverage -- --reporter=html  # Generate HTML report
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, and React components in isolation
- Approach: Mock external dependencies (IPC, database, file system)
- Location: `src/**/__tests__/` or co-located as `*.test.ts(x)`
- Example: Testing the `createWindow()` function with mocked Electron APIs

**Integration Tests:**
- Scope: Multiple modules working together (e.g., Drizzle ORM with actual SQLite)
- Approach: Use real implementations where practical, mock external boundaries (IPC, file system)
- Location: `tests/integration/`
- Example: Testing database schema operations with Drizzle ORM

**E2E Tests:**
- Scope: Full Electron app workflows (main process, renderer, IPC communication)
- Framework: Not currently used; would require Playwright or similar
- Example: User opens app, renders components, sends IPC message, verifies state

## Common Patterns

**Async Testing:**
```typescript
// Using async/await
it('should fetch data', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})

// Using done callback
it('should handle async operation', (done) => {
  asyncOperation().then(() => {
    expect(true).toBe(true)
    done()
  })
})

// Using vi.waitFor (Vitest)
it('should wait for state update', async () => {
  render(<Component />)
  await vi.waitFor(() => {
    expect(screen.getByText('loaded')).toBeDefined()
  })
})
```

**Error Testing:**
```typescript
it('should throw on invalid input', () => {
  expect(() => {
    processData(null)
  }).toThrow('Invalid data')
})

it('should reject on network error', async () => {
  await expect(fetchData()).rejects.toThrow('Network error')
})
```

**React Component Testing:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'

it('should handle button click', () => {
  render(<App />)

  const button = screen.getByRole('button', { name: 'Send IPC' })
  fireEvent.click(button)

  expect(mockIPC.send).toHaveBeenCalledWith('ping')
})
```

## Test Commands

**Recommended npm scripts to add to `package.json`:**
```bash
npm run test              # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:ui          # Run tests with UI dashboard (Vitest)
```

---

*Testing analysis: 2026-03-13*

**CRITICAL NOTE:** This codebase currently has no test infrastructure. Testing must be implemented before moving to production. Key areas requiring coverage:
- Electron main process setup and IPC handlers (`src/main/index.ts`)
- Database operations (`src/main/db/`)
- React components (`src/renderer/src/`)
