# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `App.tsx`, `Versions.tsx`)
- TypeScript/JavaScript modules: camelCase (e.g., `index.ts`, `schema.ts`)
- Config files: kebab-case with dot notation (e.g., `tsconfig.node.json`, `eslint.config.mjs`)
- Database schemas: camelCase exports (e.g., `users`)

**Functions:**
- Named functions: camelCase (e.g., `createWindow`, `Versions`)
- React components: PascalCase as functions (e.g., `function App()`, `function Versions()`)
- Handler/callback functions: descriptive camelCase (e.g., `ipcHandle`)

**Variables:**
- Constants and local variables: camelCase (e.g., `mainWindow`, `versions`)
- Component props/state: camelCase (e.g., `ipcHandle`)

**Types:**
- React component return type: `React.JSX.Element`
- Type aliases: PascalCase (e.g., `ElectronAPI`)
- Database columns: snake_case in SQL, camelCase in schema definition (e.g., `created_at` in schema becomes `createdAt`)

## Code Style

**Formatting:**
- Tool: Prettier 3.7.4
- Single quotes: enabled
- Semicolons: disabled
- Print width: 100 characters
- Trailing comma: none
- Config location: `.prettierrc.yaml`

**Linting:**
- Tool: ESLint 9.39.1 with flat config
- Config location: `eslint.config.mjs`
- Extends: `@electron-toolkit/eslint-config-ts` (TypeScript rules)
- Additional plugins: `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- React version detection: automatic
- Prettier integration: enabled via `@electron-toolkit/eslint-config-prettier`

**Key rules enforced:**
- React hooks dependencies checked via `eslint-plugin-react-hooks`
- React refresh rules via `eslint-plugin-react-refresh`
- JSX runtime optimization: `jsx-runtime` configuration enabled (no need for React imports in JSX files)

## Import Organization

**Order:**
1. Framework/library imports (e.g., `import { app } from 'electron'`, `import React`)
2. Project utilities and types (e.g., `import * as schema from './schema'`)
3. Local components (e.g., `import Versions from './components/Versions'`)
4. Assets (e.g., `import electronLogo from './assets/electron.svg'`)
5. Styles (e.g., `import './assets/main.css'`)

**Examples:**
```typescript
// src/main/index.ts
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// src/main/db/index.ts
import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import { app } from "electron"
import path from "path"
import * as schema from "./schema"

// src/renderer/src/App.tsx
import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

// src/renderer/src/main.tsx
import './assets/main.css'
import "tailwindcss"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
```

**Path Aliases:**
- `@renderer/*` → `src/renderer/src/*` (configured in `tsconfig.web.json`)

## Error Handling

**Patterns:**
- Try-catch blocks used around context bridge setup in `src/preload/index.ts`
- Console logging for errors (e.g., `console.error(error)`)
- Type ignores used sparingly with `// @ts-ignore` comments when accessing global window properties before Electron context bridge initialization
- No explicit error handling for IPC messages (logged to console via `console.log`)

**Example from `src/preload/index.ts`:**
```typescript
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
```

## Logging

**Framework:** Native `console` object

**Patterns:**
- `console.log()` for informational messages (e.g., IPC ping response in `src/main/index.ts`)
- `console.error()` for error conditions
- No structured logging library in place

**Example:**
```typescript
ipcMain.on('ping', () => console.log('pong'))
```

## Comments

**When to Comment:**
- Inline comments explain non-obvious logic (e.g., platform-specific behavior in `src/main/index.ts`)
- Comments explain intent rather than what the code does
- HTML comments used in JSX (e.g., line 29 in `src/main/index.ts`: `// HMR for renderer base on electron-vite cli.`)

**JSDoc/TSDoc:**
- Minimal usage observed
- Types are preferred over comments for documentation
- Function signatures are self-documenting via TypeScript types

**Examples:**
```typescript
// Default open or close DevTools by F12 in development
// and ignore CommandOrControl + R in production.

// HMR for renderer base on electron-vite cli.
// Load the remote URL for development or the local html file for production.

// On macOS it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
```

## Function Design

**Size:** Keep functions focused on single responsibilities. Most functions in the codebase are under 50 lines.

**Parameters:**
- Use destructuring where possible
- Limit to 2-3 parameters; use objects for more complex configurations
- Example: `createWindow()` uses no parameters, configuration is hardcoded
- IPC handlers receive data from Electron (e.g., `ipcMain.on('ping', () => ...)`)

**Return Values:**
- React components must return `React.JSX.Element`
- Functions generally have explicit return types (e.g., `: void`)
- Arrow functions used for event handlers and callbacks

## Module Design

**Exports:**
- Named exports used for utilities and schemas (e.g., `export const db`, `export const users`)
- Default exports used for React components (e.g., `export default App`)
- Database schemas exported with `export const` for each table

**Barrel Files:**
- Not used in this codebase; imports are specific to file paths
- Example: `import * as schema from './schema'` imports all exports from schema module

**Example patterns:**
```typescript
// src/main/db/schema.ts
export const users = sqliteTable("users", { ... })

// src/main/db/index.ts
export const db = drizzle(sqlite, { schema })

// src/renderer/src/App.tsx
export default App
```

## TypeScript Configuration

**Compilation:**
- Separate tsconfigs for different environments:
  - `tsconfig.node.json`: Node-based processes (main, preload)
  - `tsconfig.web.json`: Web renderer processes
  - Base `tsconfig.json`: References both composite projects
- JSX mode: `react-jsx` (automatic JSX transformation)
- Strict mode: enabled via `@electron-toolkit/tsconfig` base config

**Type checking:**
- Run `npm run typecheck` before builds
- Separate checks for Node and web targets

---

*Convention analysis: 2026-03-13*
