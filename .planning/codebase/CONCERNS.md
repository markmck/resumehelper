# Codebase Concerns

**Analysis Date:** 2026-03-13

## Tech Debt

**Sandbox disabled in Electron:**
- Issue: `sandbox: false` configured in BrowserWindow preferences
- Files: `src/main/index.ts` (line 16)
- Impact: Renderer process has full access to Node.js APIs and system resources. This is a critical security vulnerability that bypasses Electron's security model. Any XSS vulnerability in the renderer could give attackers full system access.
- Fix approach: Enable sandbox (`sandbox: true`) and use preload scripts with context isolation to safely expose only required APIs. Migrate any renderer code that needs system access to use IPC messaging to the main process.

**Database connection lacks error handling:**
- Issue: Database initialization has no try-catch or error recovery
- Files: `src/main/db/index.ts` (lines 7-9)
- Impact: If SQLite fails to initialize (file permissions, corrupted database, path issues), the entire application crashes without logging or recovery option.
- Fix approach: Wrap database initialization in try-catch, implement database validation/migration check, add logging for initialization failures, implement fallback to temporary in-memory database or graceful shutdown.

## Security Considerations

**No Content Security Policy enforcement in development:**
- Risk: CSP is defined in HTML but not actively enforced during development. Inline scripts and data URIs are allowed.
- Files: `src/renderer/index.html` (lines 7-10)
- Current mitigation: CSP header present but permissive (`'unsafe-inline'` for styles)
- Recommendations: Consider removing `'unsafe-inline'` for styles (use external stylesheets), implement nonce-based script CSP in production, add security headers validation in build process.

**Preload script uses @ts-ignore:**
- Risk: Bypasses TypeScript type checking for unsafe global assignments
- Files: `src/preload/index.ts` (lines 18-21)
- Current mitigation: Context isolation check attempted
- Recommendations: Define proper TypeScript types for `window.electron` and `window.api` instead of using `@ts-ignore`, ensure type safety is maintained.

**Uncaught errors in context bridge:**
- Risk: Error in contextBridge setup logs to console but doesn't prevent execution
- Files: `src/preload/index.ts` (lines 11-16)
- Current mitigation: console.error called but execution continues
- Recommendations: Add proper error handling - log to main process, implement fallback behavior, or fail explicitly if context isolation setup fails.

**No input validation for IPC:**
- Risk: IPC endpoints defined but no validation of messages
- Files: `src/main/index.ts` (line 53)
- Current mitigation: None - basic test endpoint only
- Recommendations: When adding real IPC handlers, implement message schema validation using Zod or similar, sanitize all inputs from renderer process.

## Fragile Areas

**Minimal error handling in main process:**
- Files: `src/main/index.ts`
- Why fragile: No error handlers for window creation, file loading, or IPC failures. Any file system error or missing resource crashes the app.
- Safe modification: Add try-catch around `createWindow()`, add error handlers for `mainWindow.loadFile()` and `mainWindow.loadURL()`, implement recovery logic.
- Test coverage: No tests present for error scenarios.

**Database schema with implicit defaults:**
- Files: `src/main/db/schema.ts`
- Why fragile: `createdAt` uses `$defaultFn` but no handling for historical records before this change. Schema migrations not configured.
- Safe modification: Use Drizzle migrations for schema changes, add explicit migration files before schema modifications.
- Test coverage: No schema validation tests.

**Custom API placeholder unexposed:**
- Files: `src/preload/index.ts` (line 5)
- Why fragile: Empty `api` object exported but no actual implementation. Any future IPC implementation must be added here - risk of bypassing security context.
- Safe modification: Create typed API wrapper that explicitly validates all communication, use IPC patterns consistently.

**React StrictMode in production:**
- Files: `src/renderer/src/main.tsx` (line 8)
- Why fragile: React StrictMode enables additional development warnings and double-renders components. May mask race conditions in production.
- Safe modification: Conditionally wrap StrictMode based on environment, test production build thoroughly.

## Performance Bottlenecks

**No database indexing strategy:**
- Problem: Schema has no indexes defined despite email being unique
- Files: `src/main/db/schema.ts`
- Cause: Drizzle schema doesn't specify indexes beyond primary key and unique constraint
- Improvement path: Add explicit indexes for frequently queried fields, monitor query performance as app scales, implement query logging.

**Large monolithic main process:**
- Problem: All electron setup in single file
- Files: `src/main/index.ts` (74 lines)
- Cause: Window management, IPC setup, database initialization not separated
- Improvement path: Extract window creation, IPC handlers, and initialization into separate modules as app grows. Keep main file as thin bootstrap.

## Scaling Limits

**Single hardcoded window configuration:**
- Current capacity: One window only
- Limit: App cannot support multiple windows or advanced Electron features (menu bars, tray integration, multi-window workflows)
- Scaling path: Refactor window management to support multiple instances, abstract window configuration to allow different window types.

**Database path not configurable:**
- Current capacity: Fixed to `app.getPath("userData")`
- Limit: Cannot implement backup/restore, cannot support multiple profiles, cannot test with different databases
- Scaling path: Add database configuration to allow custom paths, implement connection pooling if moving to networked database.

## Missing Critical Features

**No error recovery or crash handling:**
- Problem: Application crashes are unhandled and unrecoverable
- Blocks: Cannot provide user feedback on failures, cannot implement automatic recovery, cannot collect crash data for debugging
- Recommendations: Implement process.on('uncaughtException') handler, add Sentry or similar for error tracking, implement user-facing error dialogs.

**No logging infrastructure:**
- Problem: Only console.log used, no structured logging, no log persistence
- Blocks: Cannot diagnose production issues, cannot track user workflows, cannot implement audit trails
- Recommendations: Add Winston or Pino logger, implement log rotation, add structured logging for IPC events and database operations.

**No testing framework configured:**
- Problem: No test runners (Jest, Vitest) or test files present
- Blocks: Cannot verify business logic, cannot catch regressions, cannot safely refactor
- Recommendations: Add Jest for unit tests, add Vitest for Electron main process, add E2E tests with Playwright or Spectron.

**No data migration strategy:**
- Problem: Database schema changes have no migration path
- Blocks: Cannot evolve schema safely in production, cannot version database format
- Recommendations: Configure Drizzle migrations, implement schema versioning, create migration scripts before deploying schema changes.

## Dependencies at Risk

**Electron updater not configured:**
- Risk: `electron-updater` dependency present but update endpoint points to `https://example.com`
- Impact: Auto-update will fail, users stuck on outdated versions with security vulnerabilities
- Migration plan: Configure proper update endpoint (GitHub releases, AWS S3, or custom server), implement update checking and installation logic, test update flow before shipping.

**Better-sqlite3 platform dependency:**
- Risk: Native module requires compilation - may fail on systems without build tools
- Impact: Installation fails on clean environments without compiler toolchain
- Migration plan: Ensure CI/CD includes native module building for all platforms, document system requirements, consider pre-built binaries.

**TypeScript strict mode not enforced:**
- Risk: TypeScript configs don't enforce strict mode - allows implicit any and other unsafe patterns
- Impact: Type safety gaps make refactoring dangerous, runtime errors slip through static checks
- Migration plan: Enable `"strict": true` in tsconfig, fix all new errors systematically, gradually improve existing code coverage.

## Test Coverage Gaps

**No unit tests for database layer:**
- What's not tested: Database initialization, schema correctness, connection handling
- Files: `src/main/db/index.ts`, `src/main/db/schema.ts`
- Risk: Schema changes could break queries without detection, database initialization failures unknown until production
- Priority: High

**No tests for IPC communication:**
- What's not tested: Message passing, error handling in IPC, preload script isolation
- Files: `src/main/index.ts` (line 53), `src/preload/index.ts`
- Risk: IPC bugs cause silent failures or crash main/renderer processes, security boundaries not validated
- Priority: High

**No tests for Electron window lifecycle:**
- What's not tested: Window creation, error handling during load, menu bar integration
- Files: `src/main/index.ts` (lines 6-36)
- Risk: Window failures crash application, startup issues not caught until runtime
- Priority: Medium

**No tests for React components:**
- What's not tested: Component rendering, state management, error boundaries
- Files: `src/renderer/src/App.tsx`, `src/renderer/src/components/Versions.tsx`
- Risk: UI regressions go unnoticed, component logic bugs in production
- Priority: Medium

**No integration tests:**
- What's not tested: End-to-end workflows from UI to database, IPC-to-renderer round trips
- Risk: System-level bugs only discovered during manual testing or by end users
- Priority: Medium

---

*Concerns audit: 2026-03-13*
