# Pitfalls Research

**Domain:** Resume management desktop app (Electron + SQLite + AI matching + PDF/DOCX export)
**Researched:** 2026-03-13
**Confidence:** MEDIUM-HIGH (architecture pitfalls HIGH; AI boundary and export pitfalls MEDIUM based on community reports and official docs)

---

## Critical Pitfalls

### Pitfall 1: Mutable Resume State After Submission — Audit Trail Destruction

**What goes wrong:**
A submission record points to a template variant ID. The user later edits that variant (updates bullets, toggles items) without thinking about it. Now the submission record "Company A — Applied 2026-03-01" links to a resume that no longer matches what was actually sent. The core value proposition — knowing exactly what version was submitted — silently breaks.

**Why it happens:**
Templates are designed for editing; that's their purpose. There's no natural moment at which the system signals "this template is now locked to a submission." Developers defer the snapshot design because it seems like extra complexity in the early phases.

**How to avoid:**
At submission time, serialize the full resolved resume content (all included experience items, their text, ordering, and template metadata) into an immutable snapshot stored separately from the living template. The submission record references the snapshot, not the template variant. The variant remains editable. Treat the snapshot as append-only — never update a submitted snapshot, only create new ones on re-submit.

**Warning signs:**
- Submissions table has a foreign key to `template_variants` only, with no content snapshot column or snapshot table
- No `submitted_at` timestamp freeze on any content
- "Edit template" does not warn when the template has active submissions linked to it

**Phase to address:**
Database schema phase (foundational data model). This cannot be retrofitted cheaply — it requires a snapshot table or serialized JSON column from the start.

---

### Pitfall 2: Template Variants Become Divergent Forks — The N×M Maintenance Problem

**What goes wrong:**
The user starts with "Frontend Focus" and "Fullstack" templates. Over time they update their experience database — a new project, a revised bullet point. But each template variant has its own independently-edited item list. Updates to the source experience record don't propagate into templates that include that item. The user ends up maintaining several hand-edited documents instead of one database with views.

**Why it happens:**
It's tempting to store template variants as complete document snapshots (a list of all included items with their text at the time of creation). This gives layout flexibility but breaks the database's role as a single source of truth.

**How to avoid:**
Template variants store *references* to experience items (IDs + include/exclude flags), not item text copies. Experience item text lives only in the experience table. When rendering a template, JOIN the variant's included item IDs against the experience table for current text. This way, editing an experience item updates everywhere it appears automatically. Only submission snapshots copy text at a point in time.

**Warning signs:**
- Template variant table has `description` or `bullets` text columns copied from experience items
- No foreign key from template items to experience items table
- "Update this experience everywhere" is not a concept the schema supports

**Phase to address:**
Database schema phase, before any UI for template editing is built.

---

### Pitfall 3: AI Suggestion Boundary Erosion — Gradual Scope Creep Into Generation

**What goes wrong:**
The AI starts by suggesting which experience items to include. Then a "make this bullet more relevant" button is added "just for convenience." Then suggested rewordings appear inline. Three iterations later, AI is rewriting resume text — exactly the behaviour the user explicitly rejected as the core anti-requirement. Trust collapses.

**Why it happens:**
Each individual step seems like a small, helpful addition. The boundary between "suggest" and "write" is blurry in practice. LLMs default to generating text when prompted, and any feature that lets the model touch text at all creates pressure to expand that footprint.

**How to avoid:**
Hard-code the AI contract in a single service layer: input is (job description text + list of experience item IDs with their text), output is a ranked list of experience item IDs with relevance scores and a short rationale string. The model is never given write-access to experience text. No endpoint accepts "rewrite this bullet." Document the constraint as an architectural decision so future contributors don't add "convenience" features that violate it.

**Warning signs:**
- AI prompt template includes instructions like "you may suggest improvements to wording"
- Any UI component shows AI-suggested text in an editable field that feeds back into the database
- The AI service function signature returns text other than item IDs and rationale

**Phase to address:**
AI integration phase. Define and document the function signature contract before any LLM wiring begins.

---

### Pitfall 4: SQLite Native Module Packaging Failure — App Won't Start After Build

**What goes wrong:**
The app works perfectly in development. After `electron-builder` packages it, the SQLite native module fails to load on the target machine (or the developer's own machine when running the packaged binary). The app crashes at startup with a `MODULE_NOT_FOUND` or `NODE_MODULE_VERSION` error.

**Why it happens:**
`better-sqlite3` (and other native SQLite bindings) compile to a `.node` binary for a specific Node.js ABI version. Electron uses a different ABI than system Node. Without explicit rebuilding against Electron's headers, the compiled module is incompatible. ASAR packaging also bundles the `.node` file in a read-only archive where it can't be extracted and loaded at runtime unless explicitly excluded.

**How to avoid:**
- Rebuild `better-sqlite3` against Electron's Node ABI using `electron-rebuild` or the `postinstall` hook in `package.json`
- Configure `electron-builder` to unpack the native module from ASAR: `"asarUnpack": ["**/better-sqlite3/**"]`
- Store the database file at `app.getPath('userData')` — never inside the ASAR bundle (it's read-only)
- Test the *packaged binary* on a clean machine before calling any packaging step complete

**Warning signs:**
- Package script has no `electron-rebuild` step
- `electron-builder` config has no `asarUnpack` entry for the SQLite module
- Database path is constructed relative to `__dirname` (points inside ASAR) rather than `app.getPath('userData')`
- Developer has only ever run `npm start`, never tested the packaged output

**Phase to address:**
Project scaffolding / infrastructure phase, and then re-verified at any phase that introduces packaging changes.

---

### Pitfall 5: PDF Export Pixel-Perfect Assumption — Layout Breaks on Content Variation

**What goes wrong:**
PDF export looks perfect for the developer's own resume. When content varies (one extra job, longer bullets, a section title that wraps), the layout overflows pages, cuts content, or produces inconsistent spacing. Users ship PDFs with content clipped off the bottom of a page.

**Why it happens:**
HTML-to-PDF conversion (Puppeteer/Chromium headless) renders exactly what the browser produces, but resume layouts assume fixed content volume. Dynamic content that fills more or less vertical space than the designed template breaks the single-page or two-page constraint. Developers test only with their own data.

**How to avoid:**
- Design CSS templates with `overflow: visible` on sections and page-break hints (`page-break-inside: avoid` on experience blocks)
- Implement a post-render height check: after generating PDF, verify page count matches expectation and flag overflows to the user
- Test PDF output with: a single-entry resume, a 20-item resume, and one with unusually long bullet points
- Provide a live preview panel in the UI so users see the layout before exporting — this catches most overflow issues before they become PDFs

**Warning signs:**
- CSS template uses `height: 100vh` or fixed pixel heights on sections
- No UI preview before export
- PDF export test only uses the developer's own data

**Phase to address:**
PDF export phase. Build the preview first, export second.

---

### Pitfall 6: DOCX Export Treated as Afterthought — Formatting Destroyed on Open

**What goes wrong:**
DOCX export is added late using a "generate from HTML" approach (html-docx-js, mammoth in reverse, or similar). The resulting file opens in Word with all formatting stripped: no bullet styles, wrong fonts, garbled spacing. The file is technically valid DOCX but unusable as a professional document.

**Why it happens:**
HTML-to-DOCX conversion is a notoriously lossy process. DOCX's XML structure (OOXML) maps poorly to HTML/CSS concepts. Libraries that convert HTML to DOCX do best-effort mapping and frequently lose styles, lists, and spacing. Developers assume "it generates a .docx" means "it generates a good .docx."

**How to avoid:**
Use a template-based approach: maintain a `.docx` template file with styles defined natively in Word's XML, then inject data using `docxtemplater`. This preserves all formatting because the template already contains correct OOXML style definitions. The template file is edited in Word, not generated programmatically. `docxtemplater` fills placeholders — it does not construct DOCX structure from scratch.

**Warning signs:**
- DOCX generation library is `html-to-docx`, `html-docx-js`, or similar HTML-conversion approach
- No `.docx` template file in the repository
- "We'll figure out DOCX formatting later" is in any planning doc

**Phase to address:**
Export phase. Decide on the docxtemplater approach before writing any export code.

---

### Pitfall 7: Drizzle Schema Drift in Deployed App — Migrations Not Run at Startup

**What goes wrong:**
After shipping v1, the developer updates the schema for a new feature. The migration file exists. But the packaged Electron app does not run migrations on startup — the migration tool was only ever run manually during development. Users on v1 open the new app version and hit schema mismatch errors or silently corrupt data.

**Why it happens:**
Web apps run migrations as part of deployment. Electron apps have no deployment step — the user just opens the new version. Without an explicit startup migration runner, the schema diverges from what the ORM expects.

**How to avoid:**
Run Drizzle migrations programmatically at app startup (not just at dev time via CLI). In the main process, before any database query runs, call the migrate function against the user's local SQLite database. Ship migration files bundled inside the app package (unpack them from ASAR if needed). Test the upgrade path from every previous version, not just a fresh install.

**Warning signs:**
- Migrations only exist as CLI commands in `package.json` scripts
- No `migrate()` call in the Electron main process startup sequence
- The only tested install path is a fresh database (no existing users' upgrade path tested)

**Phase to address:**
Database schema phase and every subsequent phase that modifies the schema.

---

### Pitfall 8: IPC Channel Sprawl — Untestable and Unsecured Renderer-to-Main Bridge

**What goes wrong:**
As features are added, new IPC handlers accumulate in the main process without structure. `ipcMain.handle('do-thing-1', ...)`, `ipcMain.handle('do-thing-2', ...)` grows to 30+ handlers with no validation, no type contracts, and no tests. Business logic bleeds into IPC handlers. The preload script exposes `ipcRenderer` directly to the renderer (a security footgun).

**Why it happens:**
IPC feels like a simple pass-through at first. It's easy to add one more handler per feature. The security implications of exposing `ipcRenderer` directly are not obvious until something goes wrong.

**How to avoid:**
- Never expose `ipcRenderer` directly via `contextBridge` — expose only named, typed handler functions
- Define a typed IPC contract (TypeScript interface) shared between main and renderer
- Group IPC handlers by domain (database, export, AI) into separate handler modules
- Validate all inputs at the IPC boundary before they touch any database or filesystem operation

**Warning signs:**
- `contextBridge.exposeInMainWorld('electron', { ipcRenderer })` pattern (exposes the full IPC object)
- IPC handler files exceed 200 lines with mixed business logic
- No TypeScript types on IPC channel names or payloads

**Phase to address:**
Project scaffolding phase, established before any feature IPC handlers are written.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Pointing submissions at template variant (no snapshot) | Simpler schema | Audit trail destroyed on any edit; core value proposition broken | Never |
| Storing experience text inside template variant rows | Easier queries for rendering | Templates diverge from source of truth; updating experience requires N updates | Never |
| Exposing `ipcRenderer` directly via contextBridge | One-line preload setup | Security hole; no validation layer; untestable | Never |
| Running Drizzle migrations only via CLI | Simpler dev setup | Existing users get schema errors after update | Never (must be automated at startup) |
| HTML-to-DOCX conversion library | Faster to implement | Formatting destroyed; unusable output | Only for a throwaway prototype never seen by users |
| Hardcoding database path relative to `__dirname` | Works in dev | Crashes in packaged app (ASAR read-only) | Never |
| Generating PDF without preview UI | Faster export feature | Users blind-export broken layouts | Acceptable only if preview is next milestone |
| Testing only on dev machine (not packaged binary) | Faster iteration | Packaging bugs discovered only after ship | Never — test packaged binary every release |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `better-sqlite3` in Electron | Not rebuilding against Electron's ABI after install | Add `electron-rebuild` to `postinstall`; rebuild on every `npm install` |
| `better-sqlite3` + ASAR packaging | Native `.node` file bundled inside read-only ASAR | Set `asarUnpack: ["**/better-sqlite3/**"]` in electron-builder config |
| SQLite database file location | Path relative to `__dirname` (inside ASAR) | `path.join(app.getPath('userData'), 'app.db')` — always in userData |
| Drizzle migrations in packaged app | CLI-only migrations never run for end users | Call `migrate()` programmatically in main process startup before any query |
| Puppeteer/Chromium PDF in Electron | Launching a second Chromium instance (huge overhead) | Use Electron's built-in `webContents.printToPDF()` — Chromium already running |
| `docxtemplater` template file | Template file bundled in ASAR (read-only) | Unpack template `.docx` from ASAR or copy to userData on first launch |
| LLM API key storage | Storing key in renderer-accessible `localStorage` or hardcoded in source | Store in `safeStorage` (Electron's encrypted credential store) or OS keychain via `keytar` |
| Drizzle `push` vs `generate`+`migrate` | Using `drizzle-kit push` in production workflow | `push` is dev-only; use `generate` then `migrate()` at runtime for any deployed version |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all experience items into renderer on every screen | Sluggish navigation even with 50 items | Paginate or lazy-load; filter in SQL not in JS | 100+ experience items |
| Re-rendering full resume preview on every keystroke | UI freezes during item toggle | Debounce preview regeneration; use React `useMemo` on resolved item list | Real-time preview with 30+ items |
| Generating PDF synchronously in main process | UI freezes for 2-5 seconds during export | Run PDF generation in a hidden background `BrowserWindow` or worker; show progress indicator | Any PDF generation — user perceives freeze immediately |
| Sending full experience text to LLM for every AI suggestion call | Slow, expensive, token-heavy | Cache embedding vectors locally; only re-embed items that changed | 50+ experience items per suggestion call |
| SQLite WAL file not managed | Database grows unbounded, app startup slows | Enable WAL mode; run `PRAGMA wal_checkpoint` periodically or on app close | After 6+ months of continuous use |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `nodeIntegration: true` in renderer | Full Node.js access from renderer; XSS becomes remote code execution | Keep `nodeIntegration: false`, `contextIsolation: true`; use preload + contextBridge |
| Exposing `ipcRenderer` directly via contextBridge | Any renderer code can send arbitrary IPC messages to main process | Expose only specific typed handler functions, never the raw `ipcRenderer` object |
| LLM API key in source code or `localStorage` | Key exposed in packaged app (ASAR is inspectable) | Use `safeStorage.encryptString()` + SQLite or OS keychain via `keytar` |
| No input validation on IPC handlers | Malformed data reaches SQLite or filesystem | Validate and sanitize all IPC payloads before any DB or FS operation |
| Logging job descriptions to disk unencrypted | Job search data (company names, roles, salary expectations) exposed in log files | Avoid logging sensitive content; if logs needed, redact company/role fields |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No warning when editing a template that has submissions | User unknowingly changes the record of what was sent | Show "X submissions reference this template — edits won't affect those snapshots" banner |
| No live preview before PDF export | User discovers layout problems after opening the file | Show a scrollable PDF preview pane; export is a secondary action |
| AI suggestions appear as plain checkboxes with no rationale | User doesn't know why an item was suggested | Show a short relevance rationale string per suggested item (e.g., "matches 'React performance' in JD") |
| Pipeline status requires opening each submission to check | Impossible to scan application state at a glance | Pipeline kanban or list view with status badge visible without drilling in |
| No distinction between "template variant" and "submission snapshot" in UI | User confused about what "editing" affects | Label clearly: "Template (editable)" vs "Submitted version (read-only archive)" |
| Submission form lets user pick "no template / no version" | Submission record has no resume attached; tracking breaks | Make template selection required at submission time; no save without a version linked |

---

## "Looks Done But Isn't" Checklist

- [ ] **Submission tracking:** Submission record stores a snapshot of resume content at send time — not just a foreign key to the live template. Verify by editing the template after submission and confirming the submission still shows the original content.
- [ ] **Template variant rendering:** Variant renders experience items from the experience table (JOIN), not from text columns stored on the variant itself. Verify by editing an experience item and confirming both variants that include it reflect the change.
- [ ] **PDF export:** Test with a 1-item resume, a 20-item resume, and a resume with a 5-line bullet point. All produce correct page count without clipped content.
- [ ] **DOCX export:** Open generated file in Word (not LibreOffice or Google Docs). Verify fonts, bullet styles, and spacing match the intended design.
- [ ] **Packaged app:** Run the packaged binary on a machine without the dev environment. Confirm SQLite loads, the database is created in userData, and migrations run successfully on first launch.
- [ ] **AI boundary:** Confirm the AI service function has no code path that returns modified experience text. All outputs are item IDs + relevance scores + rationale strings only.
- [ ] **Upgrade path:** Install v1 of the app, create data, then install v2 with a schema change. Confirm migrations run and existing data is intact.
- [ ] **IPC security:** Confirm preload script uses `contextBridge` with named handler functions only — not `ipcRenderer` exposure. Run `grep -r "ipcRenderer" preload` and verify no direct exposure.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Submission points to mutable template (no snapshot) | HIGH | Add snapshot table; write migration to serialize current template state as retroactive snapshots; data is partially recoverable only if templates haven't been edited post-submission |
| Template variant stores text copies | HIGH | Schema migration to extract text back to experience table; rebuild variant as ID reference list; risk of data inconsistency if templates diverged |
| AI started returning modified text | MEDIUM | Remove offending feature; audit database for AI-generated content; difficult to identify retrospectively which text was user-written vs AI-generated |
| SQLite ASAR packaging failure | LOW | Add `asarUnpack` config; rebuild; re-package; no data loss |
| Drizzle migration not running at startup | MEDIUM | Add startup `migrate()` call; distribute patch; users with corrupt schema may need manual recovery script |
| DOCX formatting broken | MEDIUM | Rebuild using docxtemplater + .docx template approach; existing exports already sent cannot be recalled |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Mutable submission (no snapshot) | Database schema | Query: after submission, edit template, re-query submission snapshot — content must be unchanged |
| Template variant text copies | Database schema | Schema review: no text columns on variant table; foreign keys to experience items only |
| AI boundary erosion | AI integration | Code review: AI service function signature returns only IDs + scores; no text modification path exists |
| SQLite native module packaging | Project scaffolding + every packaging step | Run packaged binary on clean machine; confirm DB opens |
| PDF layout overflow | Export phase (PDF) | Test with min/max content resumes; verify page count |
| DOCX formatting destruction | Export phase (DOCX) | Open in Word; verify bullet styles, fonts, spacing |
| Drizzle migration not running at startup | Database schema + every schema-change phase | Fresh install + upgrade install paths both tested with packaged binary |
| IPC channel sprawl and security | Project scaffolding | Preload audit: no raw `ipcRenderer` exposure; all handlers typed |

---

## Sources

- [Challenges Building an Electron App (Daniel Corin, 2024)](https://www.danielcorin.com/posts/2024/challenges-building-an-electron-app/)
- [How to Build an Electron Desktop App — SQLite, Native Modules, Multithreading (freeCodeCamp)](https://www.freecodecamp.org/news/how-to-build-an-electron-desktop-app-in-javascript-multithreading-sqlite-native-modules-and-1679d5ec0ac)
- [electron-builder ASAR + SQLite issue #1474](https://github.com/electron-userland/electron-builder/issues/1474)
- [Electron Security — Official Docs](https://www.electronjs.org/docs/latest/tutorial/security)
- [Context Isolation — Electron Official](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [The Risks of Misusing Electron IPC (DEV Community)](https://dev.to/code-nit-whit/the-risks-of-misusing-electron-ipc-2jii)
- [Drizzle ORM Migrations — Official Docs](https://orm.drizzle.team/docs/migrations)
- [Drizzle SQLite Push vs Migrate (Medium)](https://andriisherman.medium.com/migrations-with-drizzle-just-got-better-push-to-sqlite-is-here-c6c045c5d0fb)
- [How to Generate PDFs in 2025 (DEV Community)](https://dev.to/michal_szymanowski/how-to-generate-pdfs-in-2025-26gi)
- [Puppeteer PDF Generation — Official Guide](https://pptr.dev/guides/pdf-generation)
- [DOCX generation with docxtemplater — Official Docs](https://docxtemplater.com/docs/get-started-node/)
- [PDF from DOCX templates using LibreOffice (LinkedIn)](https://www.linkedin.com/pulse/pdf-generation-service-efficient-from-docx-templates-using)
- [SAP Note: Resume updated but didn't replicate to Application snapshot](https://userapps.support.sap.com/sap/support/knowledge/en/2618812)
- [AI Hallucinations — State of 2025 (Maxim AI)](https://www.getmaxim.ai/articles/the-state-of-ai-hallucinations-in-2025-challenges-solutions-and-the-maxim-ai-advantage/)
- [Word Resume Templates: Why They Fail (CandyCV)](https://www.candycv.com/how-to/free-word-resume-templates-why-you-shouldnt-use-them-and-the-best-alternative-24)

---
*Pitfalls research for: Resume management desktop app (Electron + SQLite + AI matching + PDF/DOCX export)*
*Researched: 2026-03-13*
