# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**Third-party Services:**
- None currently integrated (application is self-contained)

## Data Storage

**Databases:**
- SQLite (local)
  - Storage: User data directory via `app.getPath("userData")`
  - File location: `{userData}/app.db`
  - Client: better-sqlite3 12.8.0 (synchronous driver)
  - ORM: drizzle-orm 0.45.1

**Database Schema:**
Located in `src/main/db/schema.ts`:
- `users` table with fields:
  - `id` - Integer primary key with auto-increment
  - `email` - Text, unique constraint, not null
  - `name` - Text, nullable
  - `created_at` - Timestamp, defaults to current date

**File Storage:**
- Local filesystem only (Electron app-native storage)

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Custom (not yet implemented)
- Current implementation: Basic user table structure in place, no auth middleware active
- Location: `src/main/db/schema.ts` contains users table

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console logging only (development: DevTools via F12, production: application logs via Electron)

## CI/CD & Deployment

**Hosting:**
- Self-contained Electron desktop application
- Distribution: Packaged as standalone executable

**Update Mechanism:**
- electron-updater 6.3.9 configured in package.json
- Generic provider with URL pointing to `https://example.com/auto-updates` (configured in electron-builder.yml)
- Not yet functional (URL is placeholder)

**Build Targets:**
- Windows: NSIS installer (.exe)
- macOS: DMG with code signing support (notarize: false currently)
- Linux: AppImage, Snap, DEB packages

## Environment Configuration

**Required env vars:**
- `ELECTRON_RENDERER_URL` - Set during development by electron-vite CLI for HMR (Hot Module Replacement)

**Secrets location:**
- No secrets management currently configured
- `.env` files excluded from builds per electron-builder.yml

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## IPC (Inter-Process Communication)

**Exposed APIs:**
- `window.electron.ipcRenderer` - Available in renderer via preload script
- `window.api` - Placeholder for custom renderer APIs (currently empty object)

**Current IPC Handlers:**
- `'ping'` - Test handler in `src/main/index.ts` that logs 'pong'

## Platform Permissions

**macOS Entitlements Requested:**
- Camera access (`NSCameraUsageDescription`)
- Microphone access (`NSMicrophoneUsageDescription`)
- Documents folder access (`NSDocumentsFolderUsageDescription`)
- Downloads folder access (`NSDownloadsFolderUsageDescription`)

---

*Integration audit: 2026-03-13*
