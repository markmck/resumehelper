# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- TypeScript 5.9.3 - Used for all application code (main process, preload, renderer)
- HTML/CSS - Renderer UI markup and styling

**Secondary:**
- JavaScript - Build configuration and tooling

## Runtime

**Environment:**
- Electron 39.2.6 - Desktop application framework

**Package Manager:**
- npm - Package management
- Lockfile: package-lock.json (present)

## Frameworks

**Core:**
- React 19.2.1 - UI framework for renderer process
- Electron 39.2.6 - Desktop application framework (handles main process, preload, and window management)

**Build/Dev:**
- Electron Vite 5.0.0 - Build tool specifically optimized for Electron + Vite development
- Vite 7.2.6 - Underlying build tool and dev server
- Vitejs/plugin-react 5.1.1 - React plugin for Vite

**Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- Tailwindcss/vite 4.2.1 - Vite integration for Tailwind CSS

**Package Building:**
- electron-builder 26.0.12 - Creates distributable packages for Windows, macOS, Linux

## Key Dependencies

**Critical:**
- better-sqlite3 12.8.0 - Synchronous SQLite driver for local data storage
- drizzle-orm 0.45.1 - TypeScript ORM for database operations
- electron-updater 6.3.9 - Automatic application updates

**Infrastructure:**
- @electron-toolkit/preload 3.0.2 - Preload script utilities for secure IPC
- @electron-toolkit/utils 4.0.0 - Electron common utilities (app configuration, optimizer, dev detection)
- @electron-toolkit/eslint-config-ts 3.1.0 - TypeScript linting configuration
- @electron-toolkit/eslint-config-prettier 3.0.0 - Prettier integration for ESLint
- @electron-toolkit/tsconfig 2.0.0 - TypeScript configuration presets

**Development:**
- TypeScript 5.9.3 - Type checking and transpilation
- ESLint 9.39.1 - Code linting
- Prettier 3.7.4 - Code formatting
- drizzle-kit 0.31.9 - ORM migration and schema generation tools

**Type Definitions:**
- @types/react 19.2.7 - React type definitions
- @types/react-dom 19.2.3 - React DOM type definitions
- @types/node 22.19.1 - Node.js type definitions
- @types/better-sqlite3 7.6.13 - better-sqlite3 type definitions

## Configuration

**Environment:**
- No environment variables required in development
- `.env` files are excluded from build (see electron-builder.yml)

**Build:**
- `electron.vite.config.ts` - Electron + Vite build configuration with React and Tailwind plugins
- `drizzle.config.ts` - ORM configuration pointing to `src/main/db/schema.ts` with SQLite dialect
- `tsconfig.json` - Base TypeScript configuration (composite project)
- `tsconfig.node.json` - Node/Electron main and preload TypeScript configuration
- `tsconfig.web.json` - Renderer (web) TypeScript configuration with React JSX and path aliases
- `eslint.config.mjs` - ESLint configuration with TypeScript, React, and React Hooks rules
- `.prettierrc.yaml` - Code formatting configuration (singleQuote, no semicolons, 100 char width)

**Output:**
- Main process: `out/main/index.js` (entry point specified in package.json)
- Build output: `out/` directory
- Development output: `build/` directory with resources

## Platform Requirements

**Development:**
- Node.js (modern LTS or later recommended, per @types/node 22.19.1)
- npm or compatible package manager
- VSCode + ESLint + Prettier extensions recommended

**Production:**
- **Windows:** Distributes as NSIS installer (.exe)
- **macOS:** Distributes as DMG file with entitlements for camera, microphone, and file system access
- **Linux:** Distributes as AppImage, Snap, and DEB packages

---

*Stack analysis: 2026-03-13*
