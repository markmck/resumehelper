# Phase 16: Cleanup - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove old resume.json themes (Even, Class, Elegant), delete ProfessionalLayout, and migrate snapshot PDF/viewer to the new template system. Full dead code sweep of all orphaned theme infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Snapshot PDF Migration
- Old snapshots (layoutTemplate: 'professional', 'traditional', or old theme keys) fall back to Classic template via print.html pipeline
- New snapshots (v2.1+) store the template key used ('classic', 'modern', etc.) and re-export uses that template
- Snapshot PDF export uses the same print.html BrowserWindow pipeline as normal PDF export — snapshot data passed via postMessage
- If migration gets complicated, deleting old snapshot export capability entirely is acceptable (POC, nothing lost)

### SnapshotViewer Rendering
- SnapshotViewer switches from inline ProfessionalLayout to print.html iframe (same pattern as VariantPreview)
- Snapshot data passed via postMessage to the iframe
- Consistent rendering path: VariantPreview and SnapshotViewer both use print.html

### ProfessionalLayout Removal
- Delete ProfessionalLayout.tsx entirely (532 lines) — zero consumers after SnapshotViewer migration
- ClassicTemplate is the structural replacement (same layout, evolved with accent/margin/skills/summary controls + serif font)

### Dead Code Sweep — Full
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

</decisions>

<specifics>
## Specific Ideas

- User is fine with Classic as the universal fallback for any old/unrecognized snapshot template
- This is still a POC — if snapshot PDF migration gets hairy, deleting the old export capability entirely is acceptable rather than over-engineering backward compatibility
- The old themes dropdown in VariantEditor is redundant now that template selection lives in the preview header

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VariantPreview.tsx`: Already uses print.html iframe + postMessage pattern — SnapshotViewer can follow the same approach
- `PrintApp.tsx`: Receives data via postMessage, renders template via resolveTemplate — needs snapshot data support
- `filterResumeData()`: Pre-filters excluded bullets, used by all templates
- `resolveTemplate.ts`: Registry mapping template keys to React components
- `TEMPLATE_DEFAULTS` in types.ts: Per-template default accent/margins/skillsDisplay

### Established Patterns
- print.html iframe + postMessage for template rendering (Phase 13)
- V2_TEMPLATES Set in export.ts routes template keys through print.html path (Phase 15)
- templateOptions stored as JSON text column, parsed with null fallback (Phase 15)

### Integration Points
- `export.ts` snapshotPdf handler: Currently uses renderThemeHtml — must switch to print.html pipeline
- `SnapshotViewer.tsx`: Currently imports ProfessionalLayout — must switch to iframe
- `VariantEditor.tsx`: themes dropdown and window.api.themes.list() call to remove
- `preload/index.ts` + `index.d.ts`: themes bridge methods to remove
- `ai.ts`: Uses buildResumeJson — must not break during themeRegistry cleanup

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-cleanup*
*Context gathered: 2026-03-26*
