# Phase 16: Cleanup - Research

**Researched:** 2026-03-26
**Domain:** Dead-code removal, IPC handler cleanup, snapshot PDF migration to print.html pipeline
**Confidence:** HIGH — all findings are from direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Old snapshots (layoutTemplate: 'professional', 'traditional', or old theme keys) fall back to Classic template via print.html pipeline
- New snapshots (v2.1+) store the template key used ('classic', 'modern', etc.) and re-export uses that template
- Snapshot PDF export uses the same print.html BrowserWindow pipeline as normal PDF export — snapshot data passed via postMessage
- If migration gets complicated, deleting old snapshot export capability entirely is acceptable (POC, nothing lost)
- SnapshotViewer switches from inline ProfessionalLayout to print.html iframe (same pattern as VariantPreview)
- Snapshot data passed via postMessage to the iframe
- Consistent rendering path: VariantPreview and SnapshotViewer both use print.html
- Delete ProfessionalLayout.tsx entirely (532 lines) — zero consumers after SnapshotViewer migration
- ClassicTemplate is the structural replacement (same layout, evolved with accent/margin/skills/summary controls + serif font)
- Uninstall 3 npm packages: jsonresume-theme-even, @jsonresume/jsonresume-theme-class, jsonresume-theme-elegant
- Delete `renderThemeHtml()` and `sanitizeDates()` from themeRegistry.ts
- **Keep `buildResumeJson()`** — still used by AI analysis handler (ai.ts)
- Delete entire themes.ts handler file (registerThemeHandlers, themes:list, themes:renderHtml, themes:renderSnapshotHtml IPC handlers)
- Remove `window.api.themes.*` from preload bridge (index.ts + index.d.ts)
- Remove old theme dropdown from VariantEditor.tsx (template selection now lives in preview header per Phase 15 CTRL-01)
- Remove all renderer references to window.api.themes (VariantEditor.tsx, SnapshotViewer.tsx)

### Claude's Discretion
- How to pass snapshot data to print.html (postMessage structure, whether PrintApp needs a "snapshot mode")
- Whether to keep THEMES array / ThemeEntry type in themeRegistry.ts or move to a more appropriate location
- Exact fallback logic for unrecognized layoutTemplate values in old snapshots
- Whether snapshot submission should store templateOptions (accent, margins) alongside template key

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLEAN-01 | Old resume.json themes (Even, Class, Elegant) removed — npm packages uninstalled, theme registry deleted | Direct code inspection confirms: 3 npm packages in package.json, `renderThemeHtml()` and `sanitizeDates()` in themeRegistry.ts, entire themes.ts handler, themes bridge in preload — all confirmed present and removable |
| CLEAN-02 | Old ProfessionalLayout component replaced by Classic template | ProfessionalLayout.tsx confirmed at 532 lines; only consumer is SnapshotViewer.tsx; ClassicTemplate.tsx is the drop-in replacement via resolveTemplate |
| CLEAN-03 | Submission snapshot PDF export works with new template system (graceful fallback for old snapshots) | snapshotPdf handler in export.ts confirmed using renderThemeHtml — must switch to print.html BrowserWindow path; PrintApp.tsx's postMessage architecture can accept snapshot data directly |
</phase_requirements>

---

## Summary

Phase 16 is a pure cleanup phase — no new features, only dead code removal and one migration. All the infrastructure needed already exists. The print.html + postMessage pattern (introduced in Phase 13) is the correct replacement for every old theme rendering path. The existing `VariantPreview.tsx` pattern is the exact template for SnapshotViewer migration.

The main risk is the snapshotPdf IPC handler in export.ts. It currently calls `renderThemeHtml()` with the snapshot data. The new path must spin up a BrowserWindow, load print.html, and send snapshot data via postMessage — which requires PrintApp.tsx to handle a "no variantId" mode where data arrives entirely through postMessage rather than IPC fetch. PrintApp already has this bifurcation: it uses `window.api` when available (BrowserWindow mode with preload) and postMessage when not (iframe mode). The snapshot PDF path must pass data a different way since the existing BrowserWindow mode fetches by variantId — snapshots have no live variantId to query.

The simplest correct approach is to extend the postMessage protocol so PrintApp can receive snapshot data even in BrowserWindow mode. The `export:snapshotPdf` handler creates a BrowserWindow without a preload (sandbox: true currently) or with preload but with snapshot data injected differently. The cleanest pattern: load print.html with no variantId query param (or `variantId=snapshot`), then after `print:ready` is received, send the snapshot data via webContents.executeJavaScript or via a dedicated IPC — but since the preload does inject into BrowserWindows, the snapshot data can be sent via a one-shot IPC that PrintApp listens to if variantId is absent.

**Primary recommendation:** Extend PrintApp to handle snapshot data via a dedicated `snapshot-data` postMessage type (or reuse `print-data` with a sentinel), and have the BrowserWindow in snapshotPdf use `webContents.executeJavaScript` to post the message to itself after the `print:ready` signal.

---

## Standard Stack

### Core (all already in project — no new dependencies)
| Asset | Location | Role |
|-------|----------|------|
| `print.html` + `PrintApp.tsx` | `src/renderer/src/PrintApp.tsx` | The unified template renderer — already handles both iframe and BrowserWindow modes via `window.api` detection |
| `resolveTemplate.ts` | `src/renderer/src/components/templates/` | Maps template keys → React components; `resolveTemplate('classic')` is the fallback for unknown keys |
| `VariantPreview.tsx` | `src/renderer/src/components/` | Reference implementation for iframe + postMessage pattern |
| `export.ts` snapshotPdf handler | `src/main/handlers/export.ts` lines 840–908 | The handler to rewrite |
| `themeRegistry.ts` | `src/main/lib/` | Contains `buildResumeJson` (keep), `renderThemeHtml` (delete), `sanitizeDates` (delete), `THEMES` array (decision: keep or relocate) |

### Packages to Remove
| Package | Version in package.json | Why Removable |
|---------|------------------------|---------------|
| `jsonresume-theme-even` | `^0.26.1` | Only used in `renderThemeHtml()` case 'even' |
| `@jsonresume/jsonresume-theme-class` | `^0.6.0` | Only used in `renderThemeHtml()` case 'class' |
| `jsonresume-theme-elegant` | `^1.16.1` | Only used in `renderThemeHtml()` case 'elegant' |

**Uninstall command:**
```bash
npm uninstall jsonresume-theme-even @jsonresume/jsonresume-theme-class jsonresume-theme-elegant
```

---

## Architecture Patterns

### Pattern 1: print.html BrowserWindow PDF export (existing — copy for snapshot)
The existing `export:pdf` handler (lines 256–295 in export.ts) is the model for the new snapshot path:
1. Create `BrowserWindow` with preload, `show: false`, 816x1056
2. `loadURL` or `loadFile` for print.html
3. Wait for `ipcMain.once('print:ready', ...)`
4. `printToPDF(...)` → write file → destroy window

The snapshot variant needs to send data after the `print:ready` signal instead of having PrintApp fetch it by variantId.

### Pattern 2: PrintApp bifurcation (existing — extend for snapshot)
PrintApp.tsx already has two modes based on `window.api` availability:
- **BrowserWindow mode** (lines 145–175): `window.api` is defined → fetches data by variantId via IPC
- **iframe mode** (lines 177–198): listens for `print-data` postMessage

For snapshot PDF export, the BrowserWindow has a preload (so `window.api` is defined), but there's no live variantId. The solution is to add a third mode triggered by `variantId === 0` or a special query param (e.g., `template=classic&snapshot=1`), where PrintApp skips the IPC fetch and instead waits for a postMessage carrying the full snapshot payload.

The handler then uses `win.webContents.executeJavaScript(...)` to post the message to PrintApp after receiving `print:ready`:
```typescript
// In export:snapshotPdf handler, after print:ready:
await win.webContents.executeJavaScript(`
  window.postMessage(${JSON.stringify({
    type: 'print-data',
    template: resolvedTemplate,
    payload: snapshotPayload
  })}, '*')
`)
```

This reuses the existing postMessage handler in PrintApp with zero new protocol surface.

### Pattern 3: SnapshotViewer iframe (mirrors VariantPreview)
SnapshotViewer needs to:
1. Replace `<ProfessionalLayout .../>` with an `<iframe src={printUrl} />`
2. Build `printUrl` using `window.__printBase` (same as VariantPreview line 108)
3. Send snapshot data via postMessage using the `print-data` message type
4. No need for height reporting loop — SnapshotViewer uses `maxHeight: 90vh` scroll container, so iframe can be fixed height (e.g., `height: '1200px'`) or dynamic

The snapshot data shape from `SubmissionSnapshot` maps directly to the `PrintData` payload shape in PrintApp:
```typescript
// SubmissionSnapshot fields:
// layoutTemplate, jobs, skills, projects, education, volunteer,
// awards, publications, languages, interests, references

// PrintData (PrintApp.tsx) fields:
// profile, jobs, skills, projects, education, volunteer,
// awards, publications, languages, interests, references
```
Note: `SubmissionSnapshot` does NOT store `profile` — the SnapshotViewer must fetch the current profile separately (via `window.api.profile.get()`) before sending the postMessage. VariantPreview already shows this pattern (lines 51–57).

### Recommended Change Surface

```
Files to DELETE:
  src/main/handlers/themes.ts                  (entire file)
  src/renderer/src/components/ProfessionalLayout.tsx  (entire file)

Files to MODIFY:
  src/main/lib/themeRegistry.ts                (remove renderThemeHtml, sanitizeDates; keep buildResumeJson, THEMES, THEME_KEYS, ThemeEntry)
  src/main/handlers/index.ts                   (remove registerThemeHandlers import + call)
  src/main/handlers/export.ts                  (remove renderThemeHtml import; rewrite snapshotPdf handler; clean up dead theme branch in export:pdf)
  src/preload/index.ts                         (remove themes: {...} block)
  src/preload/index.d.ts                       (remove themes: {...} block from api type)
  src/renderer/src/components/VariantEditor.tsx (remove themes state, window.api.themes.list() call, themes dropdown JSX)
  src/renderer/src/components/SnapshotViewer.tsx (remove ProfessionalLayout import; replace with iframe + postMessage)
  src/renderer/src/PrintApp.tsx                (add snapshot mode: detect no-variantId, wait for postMessage instead of IPC fetch)
  package.json / package-lock.json             (after npm uninstall)
```

### Anti-Patterns to Avoid
- **Don't leave the `renderThemeHtml` import in export.ts** after removing the function — TypeScript will error at build time
- **Don't remove `buildResumeJson` from themeRegistry.ts** — ai.ts imports it directly (`import { buildResumeJson } from '../lib/themeRegistry'`)
- **Don't use `sandbox: true` in the snapshot BrowserWindow** — the current snapshotPdf handler uses `sandbox: true` (no preload), but the new path needs preload injected so `window.electron.ipcRenderer` is available for the `print:ready` signal
- **Don't forget the `export:pdf` dead theme branch** — lines 296–344 in export.ts handle the old theme path for regular variant export; this is now unreachable (all 5 keys are in V2_TEMPLATES) and should be removed

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snapshot template rendering | Custom HTML renderer | PrintApp.tsx + print.html | Already renders all 5 templates; postMessage is the established data channel |
| Unknown template fallback | Custom fallback switch | `resolveTemplate(key)` in resolveTemplate.ts | Already returns ClassicTemplate for any unknown key (line 18) |
| Profile data in snapshot view | Embed profile in snapshot data | `window.api.profile.get()` | Profile is already fetched this way in VariantPreview; no need to change snapshot schema |

---

## Common Pitfalls

### Pitfall 1: `buildResumeJson` survives — don't delete it
**What goes wrong:** Searching for "themeRegistry" usages and deleting everything from the file
**Why it happens:** All the function names are co-located in themeRegistry.ts
**How to avoid:** ai.ts line 8 imports `buildResumeJson` — grep confirms this. The function must stay. Only `renderThemeHtml` and `sanitizeDates` are deleted.
**Warning signs:** TypeScript compile error in ai.ts after cleanup

### Pitfall 2: Snapshot BrowserWindow needs preload for print:ready signal
**What goes wrong:** Keep `sandbox: true` (no preload) on the snapshot BrowserWindow, causing `window.electron.ipcRenderer.send('print:ready')` to fail silently — the safety timeout (3 seconds) fires instead, but PDF renders before React paints
**Why it happens:** Current snapshot handler (line 878) uses `webPreferences: { sandbox: true }` which is correct for raw HTML rendering but wrong for PrintApp
**How to avoid:** The new snapshot BrowserWindow must use `preload: join(__dirname, '../preload/index.js'), sandbox: false` — same as the regular PDF export BrowserWindow (lines 262–265)

### Pitfall 3: SnapshotViewer needs profile for postMessage payload
**What goes wrong:** Sending snapshot data to print.html iframe without profile info — name/email/phone/location all blank
**Why it happens:** `SubmissionSnapshot` type does not include a profile field; the old ProfessionalLayout didn't need it (it had no contact header from profile)
**How to avoid:** SnapshotViewer must call `window.api.profile.get()` and include the result in the postMessage payload's `profile` field — identical to how VariantPreview fetches profile (lines 51–57)

### Pitfall 4: VariantEditor `themes` state still initializes even after dropdown removal
**What goes wrong:** Remove the dropdown JSX but forget the `useEffect(() => { window.api.themes.list().then(setThemes) }, [])` call and the `themes` state declaration — runtime error when the IPC channel is gone
**Why it happens:** State declaration, effect, and JSX are in three separate places (lines 59, 84–86, 424–447 of VariantEditor.tsx)
**How to avoid:** Remove all three together: `const [themes, setThemes] = useState(...)`, the `useEffect` that calls `themes.list()`, and the conditional JSX block

### Pitfall 5: Dead theme branch in export:pdf
**What goes wrong:** Leave the old theme path (lines 296–344 in export.ts) in place with its `renderThemeHtml` call — TypeScript won't error if the import is still present, but the logic is dead and the import ties the old packages to the build
**Why it happens:** The branch is reachable by TypeScript's flow analysis even if no runtime path hits it
**How to avoid:** Remove the `else` branch entirely since V2_TEMPLATES now covers all valid keys. Simplify export:pdf to use only the print.html path.

### Pitfall 6: `handleThemeChange` function in VariantEditor
**What goes wrong:** The themes dropdown removal leaves `handleThemeChange` as dead code — and the `layoutTemplate` state is still needed for the preview header dropdown (CTRL-01 implemented in Phase 15). Only the `window.api.themes.list()` call and the `themes` state are obsolete.
**Why it happens:** `layoutTemplate` state and `handleThemeChange` function serve the preview header template selector (separate from the old themes dropdown). Confirm which JSX uses which before removing.
**Warning signs:** After removal, TypeScript unused variable warning on `themes` and `setThemes` if those are the only things removed

---

## Code Examples

### Rewriting export:snapshotPdf (new print.html path)
```typescript
// Source: mirrors export:pdf handler pattern (export.ts lines 256–295)
ipcMain.handle('export:snapshotPdf', async (_, snapshotData: SubmissionSnapshot, defaultFilename: string) => {
  const { canceled, filePath } = await dialog.showSaveDialog({ ... })
  if (canceled || !filePath) return { canceled: true }

  // Resolve template: v2.1 snapshots store the template key directly;
  // legacy 'professional', 'traditional', or unknown values fall back to 'classic'
  const V2_TEMPLATES = new Set(['classic', 'modern', 'jake', 'minimal', 'executive'])
  const rawTemplate = snapshotData.layoutTemplate ?? ''
  const resolvedTemplate = V2_TEMPLATES.has(rawTemplate) ? rawTemplate : 'classic'

  // Fetch current profile (not stored in snapshot)
  const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()

  // Build payload matching PrintData interface in PrintApp.tsx
  const snapshotPayload = {
    profile: profileRow,
    jobs: snapshotData.jobs ?? [],
    skills: snapshotData.skills ?? [],
    projects: snapshotData.projects ?? [],
    education: snapshotData.education ?? [],
    volunteer: snapshotData.volunteer ?? [],
    awards: snapshotData.awards ?? [],
    publications: snapshotData.publications ?? [],
    languages: snapshotData.languages ?? [],
    interests: snapshotData.interests ?? [],
    references: snapshotData.references ?? [],
  }

  const win = new BrowserWindow({
    show: false,
    width: 816,
    height: 1056,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    await win.loadURL(
      `${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=0&template=${resolvedTemplate}`
    )
  } else {
    await win.loadFile(join(__dirname, '../renderer/print.html'), {
      query: { variantId: '0', template: resolvedTemplate },
    })
  }

  // Wait for PrintApp to signal readiness, then push data via postMessage
  await new Promise<void>((resolve) => {
    ipcMain.once('print:ready', async () => {
      await win.webContents.executeJavaScript(
        `window.postMessage(${JSON.stringify({
          type: 'print-data',
          template: resolvedTemplate,
          showSummary: true,
          payload: snapshotPayload,
        })}, '*')`
      )
      resolve()
    })
    setTimeout(() => resolve(), 3000) // safety timeout
  })

  await new Promise((r) => setTimeout(r, 200)) // settle

  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'Letter',
    margins: { top: 1.0, bottom: 1.0, left: 0, right: 0 },
  })
  win.destroy()
  await fs.writeFile(filePath, pdfBuffer)
  return { canceled: false, filePath }
})
```

### PrintApp snapshot mode addition
```typescript
// In PrintApp.tsx useEffect — add variantId === 0 check to use postMessage path
// even when window.api is available (BrowserWindow snapshot mode)
const variantId = Number(params.get('variantId'))
const isSnapshotMode = variantId === 0  // sentinel: no live variantId

if (!isSnapshotMode && typeof window.api !== 'undefined' && window.api?.profile) {
  // Normal BrowserWindow mode: fetch by variantId
  Promise.all([...]).then(...)
} else {
  // iframe mode OR snapshot mode: receive data via postMessage
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'print-data') { ... }
  }
  window.addEventListener('message', handler)
  window.parent.postMessage({ type: 'print-ready' }, '*')  // iframe signal
  if (isSnapshotMode && typeof window.electron !== 'undefined') {
    // BrowserWindow snapshot: signal via ipcRenderer too
    window.electron.ipcRenderer.send('print:ready')
  }
  return () => window.removeEventListener('message', handler)
}
```

**Note:** The `print:ready` signal in the handler fires when `data` is set (line 221 in PrintApp.tsx), not at listener registration. For snapshot mode, the handler must signal `print:ready` upfront so the main process knows to send data, then PrintApp sets data via the incoming postMessage and signals ready a second time when data is set. The simplest solution: have the BrowserWindow send data THEN wait for the second `print:ready` after data is received and rendered. OR: just use a fixed settle delay after executeJavaScript since render time is bounded.

### SnapshotViewer rewrite (iframe pattern)
```typescript
// Source: mirrors VariantPreview.tsx pattern
function SnapshotViewer({ snapshot, onClose }) {
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    window.api.profile.get().then(setProfileData)
  }, [])

  // Resolve template key
  const V2_TEMPLATES = new Set(['classic', 'modern', 'jake', 'minimal', 'executive'])
  const rawTemplate = snapshot.layoutTemplate ?? ''
  const resolvedTemplate = V2_TEMPLATES.has(rawTemplate) ? rawTemplate : 'classic'

  const base = (window as Window & { __printBase?: string }).__printBase ?? window.location.origin
  const printUrl = `${base}/print.html?variantId=0&template=${resolvedTemplate}`

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'print-ready' && profileData) {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'print-data',
          template: resolvedTemplate,
          showSummary: true,
          payload: {
            profile: profileData,
            jobs: snapshot.jobs,
            skills: snapshot.skills as BuilderSkill[],
            projects: snapshot.projects ?? [],
            education: snapshot.education ?? [],
            volunteer: snapshot.volunteer ?? [],
            awards: snapshot.awards ?? [],
            publications: snapshot.publications ?? [],
            languages: snapshot.languages ?? [],
            interests: snapshot.interests ?? [],
            references: snapshot.references ?? [],
          },
        }, '*')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [snapshot, profileData, resolvedTemplate])

  return (
    <div ...modal wrapper...>
      <iframe
        ref={iframeRef}
        src={printUrl}
        style={{ width: '100%', height: '70vh', border: 'none', background: 'white' }}
        sandbox="allow-same-origin allow-scripts"
        title="Resume Snapshot"
      />
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| renderThemeHtml + temp HTML file for PDF | print.html BrowserWindow + printToPDF | Phase 13 | PDF matches preview exactly; no temp files needed |
| ProfessionalLayout inline React component | ClassicTemplate via resolveTemplate | Phase 13/14 | Unified rendering, accent/margin/skills controls available |
| themes:list IPC for template dropdown | TEMPLATE_LIST export from resolveTemplate.ts | Phase 13/15 | Template list lives in renderer, no IPC round-trip |

**Deprecated/outdated:**
- `themeRegistry.ts` `renderThemeHtml()`: Replaced by print.html pipeline for all 5 v2.1 templates
- `sanitizeDates()`: Only needed for jsonresume package ingestion; irrelevant after package removal
- `themes.ts` handler: All three IPC channels (`themes:list`, `themes:renderHtml`, `themes:renderSnapshotHtml`) have zero valid callers after this phase

---

## Open Questions

1. **THEMES array and ThemeEntry type in themeRegistry.ts**
   - What we know: `THEMES` and `THEME_KEYS` are currently exported but only consumed by `themes.ts` handler (which is being deleted). `TEMPLATE_LIST` in resolveTemplate.ts serves the same purpose for the renderer.
   - What's unclear: Whether any other file imports THEMES/THEME_KEYS
   - Recommendation: Grep for all importers before deciding. If only themes.ts consumed them, delete from themeRegistry.ts. If ai.ts or other handlers use THEME_KEYS for validation, keep or relocate.

2. **print:ready double-fire in snapshot mode**
   - What we know: PrintApp signals `print:ready` after `data` state is set (line 221 of PrintApp.tsx). In snapshot mode, `print:ready` must fire BEFORE data arrives (to trigger the executeJavaScript call), then again AFTER data renders (to trigger printToPDF).
   - Recommendation: The simplest solution is to decouple snapshot PDF from the `print:ready` IPC signal entirely — use a fixed timeout (e.g., 2000ms) after `executeJavaScript` instead of a second `print:ready` event. OR: restructure so the BrowserWindow sends data immediately after load without waiting for `print:ready`, then uses `ipcMain.once('print:ready', () => printToPDF(...))` after data is set.

3. **VariantEditor `handleThemeChange` function scope**
   - What we know: `handleThemeChange` is called from the themes dropdown (which is being removed). The `layoutTemplate` state itself is still needed for the preview header control.
   - Recommendation: Keep `handleThemeChange` only if it's also wired to the preview header dropdown. If the preview header calls a different handler, delete `handleThemeChange` too.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — Electron app with no test config found |
| Config file | None (no jest.config.*, vitest.config.*, pytest.ini found) |
| Quick run command | N/A — manual verification via app launch |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 | No import errors after package removal | smoke | `npm run build` | N/A — build verification |
| CLEAN-01 | `window.api.themes` undefined at runtime | manual | Launch app, open DevTools, type `window.api.themes` | ❌ manual only |
| CLEAN-02 | SnapshotViewer renders snapshot without ProfessionalLayout | manual | Open a submission with snapshot → click "View Snapshot" | ❌ manual only |
| CLEAN-03 | Snapshot PDF exports without error | manual | Open submission → export snapshot PDF → file saves | ❌ manual only |

### Sampling Rate
- **Per task commit:** `npm run build` (TypeScript compile check — catches broken imports immediately)
- **Per wave merge:** Full app launch + manual smoke test of snapshot view and export
- **Phase gate:** All 3 requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps
- None for test infrastructure — this project has no automated test suite; verification is build + manual smoke test

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified against actual file contents
  - `src/main/lib/themeRegistry.ts` — confirmed `renderThemeHtml`, `sanitizeDates`, `buildResumeJson`, `THEMES`
  - `src/main/handlers/themes.ts` — confirmed 3 IPC handlers to delete
  - `src/main/handlers/export.ts` — confirmed snapshotPdf uses renderThemeHtml (lines 840–908)
  - `src/main/handlers/index.ts` — confirmed registerThemeHandlers registration
  - `src/preload/index.ts` + `index.d.ts` — confirmed themes bridge at lines 228–234 and 512–516
  - `src/renderer/src/components/VariantEditor.tsx` — confirmed themes state + useEffect + dropdown JSX (lines 59, 84–86, 424–447)
  - `src/renderer/src/components/SnapshotViewer.tsx` — confirmed ProfessionalLayout import + both render paths
  - `src/renderer/src/PrintApp.tsx` — confirmed BrowserWindow/iframe bifurcation pattern
  - `src/renderer/src/components/VariantPreview.tsx` — confirmed postMessage protocol to copy
  - `src/renderer/src/components/templates/resolveTemplate.ts` — confirmed Classic fallback for unknown keys
  - `package.json` — confirmed 3 theme packages present

### Secondary (MEDIUM confidence)
- None needed — all research is direct code inspection

---

## Metadata

**Confidence breakdown:**
- File inventory: HIGH — all files inspected directly
- Change surface: HIGH — every file and line range identified from source
- Snapshot mode postMessage design: MEDIUM — the approach is sound but the print:ready double-fire edge case needs care during implementation (see Open Questions #2)
- TypeScript compile safety: HIGH — npm uninstall will break imports; build will catch all missed references

**Research date:** 2026-03-26
**Valid until:** N/A — all findings are from the live codebase at research time; no external dependencies
