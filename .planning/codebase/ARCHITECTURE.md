# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Electron Desktop Application with Three-Process Architecture (Main, Renderer, Preload)

**Key Characteristics:**
- **Multi-process separation**: Main process handles OS-level operations and database; Renderer runs UI; Preload provides secure IPC bridge
- **React-based UI**: Client-side rendering with React 19 and TypeScript
- **Local SQLite database**: Persistent data storage managed by Drizzle ORM in main process
- **Context isolation enabled**: Secure communication between main and renderer processes via controlled bridge
- **Build-time separation**: Three independent build targets (main, preload, renderer) with type safety

## Layers

**Main Process Layer:**
- Purpose: Handle OS operations, manage application lifecycle, maintain database, respond to IPC requests
- Location: `src/main/`
- Contains: Window creation logic, IPC handlers, database management
- Depends on: Electron, Drizzle ORM, better-sqlite3
- Used by: Preload layer (bidirectional) and implicitly by Renderer via IPC

**Preload Layer:**
- Purpose: Provide secure bridge between main process and renderer; expose controlled APIs to frontend
- Location: `src/preload/`
- Contains: Context bridge setup, Electron API exposure, custom API definitions
- Depends on: Electron context bridge API, @electron-toolkit/preload
- Used by: Renderer process exclusively

**Renderer (UI) Layer:**
- Purpose: Render user interface, handle user interactions, display data
- Location: `src/renderer/src/`
- Contains: React components, styling (CSS + Tailwind), component logic, assets
- Depends on: React, window.electron API (via preload)
- Used by: End users / Electron windowing system

**Database Layer:**
- Purpose: Manage application data schema and database connection
- Location: `src/main/db/`
- Contains: Schema definitions (Drizzle), database initialization, connection pool
- Depends on: Drizzle ORM, better-sqlite3, Electron app paths
- Used by: Main process handlers

## Data Flow

**Initialization Flow:**

1. Electron app starts → Main process (`src/main/index.ts`)
2. Main process initializes BrowserWindow with preload script
3. Main process loads database (`src/main/db/index.ts`) → connects to SQLite at `app.getPath('userData')/app.db`
4. Main process registers IPC handlers
5. Preload script bridges Electron APIs → exposes via contextBridge to window global
6. Renderer loads React app → mounts at `#root` in HTML
7. React renders initial UI → uses window.electron to access IPC

**Request Flow (IPC Example):**

1. User clicks button in React component (`src/renderer/src/App.tsx`)
2. Component calls `window.electron.ipcRenderer.send('ping')`
3. Main process receives via `ipcMain.on('ping', ...)` handler (`src/main/index.ts`)
4. Main process executes handler logic (may query database)
5. Response sent back via ipcRenderer.invoke/send if needed

**State Management:**

- **Main process state**: Managed in memory (window references, app state, IPC handlers)
- **Database state**: Persisted in SQLite via Drizzle ORM in `src/main/db/`
- **UI state**: React component state via useState hooks (example: `src/renderer/src/components/Versions.tsx`)
- **Cross-process communication**: One-way or request-response via IPC

## Key Abstractions

**BrowserWindow:**
- Purpose: Application window management
- Examples: `src/main/index.ts` → `createWindow()` function
- Pattern: Singleton pattern - one main window created on app ready, recreated on macOS dock activation

**Database Connection:**
- Purpose: Centralized database access with schema validation
- Examples: `src/main/db/index.ts` exports singleton `db` instance
- Pattern: Factory pattern - Drizzle wraps better-sqlite3, providing type-safe queries

**Schema Definitions:**
- Purpose: Define database structure with type safety
- Examples: `src/main/db/schema.ts` → `users` table definition
- Pattern: Schema-first with Drizzle - types automatically derived from schema

**Context Bridge:**
- Purpose: Safely expose Electron APIs to renderer without XSS risk
- Examples: `src/preload/index.ts` exposes `window.electron` and `window.api`
- Pattern: Allowlist pattern - only explicitly bridged APIs are accessible

**React Components:**
- Purpose: Encapsulate UI logic and rendering
- Examples: `src/renderer/src/App.tsx`, `src/renderer/src/components/Versions.tsx`
- Pattern: Functional components with hooks

## Entry Points

**Main Process Entry:**
- Location: `src/main/index.ts`
- Triggers: When Electron app starts (via `package.json` main field pointing to `out/main/index.js`)
- Responsibilities:
  - Create and manage BrowserWindow
  - Set up Electron app event handlers (ready, activate, window-all-closed)
  - Register IPC handlers
  - Load renderer URL or HTML file

**Renderer Entry:**
- Location: `src/renderer/src/main.tsx`
- Triggers: When HTML document is loaded by BrowserWindow
- Responsibilities:
  - Import styles and Tailwind
  - Create React root and mount App component
  - Initialize StrictMode for development checks

**Preload Entry:**
- Location: `src/preload/index.ts`
- Triggers: When BrowserWindow is created with preload script reference
- Responsibilities:
  - Expose Electron APIs to renderer context
  - Provide custom API namespace if needed
  - Handle context isolation setup

## Error Handling

**Strategy:** Console logging with graceful fallbacks

**Patterns:**
- Preload context bridge errors caught and logged: `src/preload/index.ts` wraps bridge setup in try-catch
- Window creation inherits Electron defaults (shows error in console if window fails)
- IPC handlers use console.log (example: `ipcMain.on('ping', () => console.log('pong'))`)
- React StrictMode (`src/renderer/src/main.tsx`) enables development warnings

## Cross-Cutting Concerns

**Logging:** Console-based logging only (no structured logging framework)
- Main process: Direct `console.log()` calls
- Renderer: React DevTools available in development

**Validation:** Drizzle schema enforces database constraints (not null, unique, etc.)
- Schema validation at schema definition time (`src/main/db/schema.ts`)
- No runtime form validation framework detected

**Authentication:** Not implemented - placeholder `api = {}` in preload indicates auth would go here

**Hot Module Replacement:** Electron-vite dev mode enables HMR via `ELECTRON_RENDERER_URL` env var

---

*Architecture analysis: 2026-03-13*
