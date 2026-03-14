---
phase: 02-template-variants
plan: "02"
subsystem: ui
tags: [react, typescript, tailwind, electron, ipc, sqlite]

# Dependency graph
requires:
  - phase: 02-template-variants
    provides: window.api.templates.* IPC handlers, BuilderData/TemplateVariant types
  - phase: 01-foundation
    provides: InlineEdit component, dark zinc Tailwind aesthetic, group/group-hover pattern
provides:
  - Tab routing with useState in App.tsx (Templates tab enabled)
  - TemplatesTab two-column layout with sidebar + editor area
  - VariantList sidebar with create/delete/duplicate (group-hover contextual controls)
  - VariantEditor with inline rename, layout template selector, builder/preview sub-tabs
  - VariantBuilder checkbox tree (jobs, bullets, skills) with optimistic IPC updates
  - VariantPreview read-only resume layouts (traditional, modern, compact)
affects: [03-submissions, 04-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic update pattern for checkbox toggles — update local state immediately, then call IPC async
    - Sub-tab pattern within editor — activeSubTab state drives conditional render of Builder vs Preview
    - Two-column app shell — fixed-width sidebar (w-64) + flex-1 editor area
    - Layout selector on Preview sub-tab only — contextually relevant placement
    - better-sqlite3 transactions must be fully synchronous — no async/await inside .transaction()

key-files:
  created:
    - src/renderer/src/components/TemplatesTab.tsx
    - src/renderer/src/components/VariantList.tsx
    - src/renderer/src/components/VariantEditor.tsx
    - src/renderer/src/components/VariantBuilder.tsx
    - src/renderer/src/components/VariantPreview.tsx
  modified:
    - src/renderer/src/App.tsx
    - src/main/db/index.ts
    - src/main/handlers/templates.ts
    - src/renderer/src/components/BulletItem.tsx
    - src/renderer/src/components/BulletList.tsx
    - src/renderer/src/components/ExperienceTab.tsx
    - src/renderer/src/components/InlineEdit.tsx
    - src/renderer/src/components/JobItem.tsx
    - src/renderer/src/components/JobList.tsx
    - src/renderer/src/components/SkillItem.tsx
    - src/renderer/src/components/SkillList.tsx

key-decisions:
  - "Optimistic updates for checkbox toggles: setBuilderData immediately, then await IPC — avoids visible lag on each toggle"
  - "Three distinct layout preview sub-components (Traditional, Modern, Compact) as inline functions in VariantPreview.tsx"
  - "Layout template selector moved to Preview sub-tab only — reduces noise on Builder and is contextually relevant"
  - "better-sqlite3 duplicate transaction must be fully synchronous — async/await inside transaction silently breaks row insertion"
  - "Migration wrapped in try-catch — app restarts cleanly when tables already exist from previous migration run"

patterns-established:
  - "Optimistic toggle: update local state first, fire IPC second — no loading state needed for instant feel"
  - "Preview layout routing: single layoutTemplate prop switches between Traditional/Modern/Compact sub-components"
  - "Inline styles for critical spacing when Tailwind utility classes fail to apply consistently in electron-vite renderer"

requirements-completed: [TMPL-01, TMPL-02, TMPL-03, TMPL-04]

# Metrics
duration: ~95min
completed: 2026-03-14
---

# Phase 2 Plan 02: Template Variants UI Summary

**Six React components delivering the full Templates tab: sidebar variant list, inline-rename editor, checkbox builder with job/bullet/skill toggles, and resume preview with traditional/modern/compact layouts — verified end-to-end by human**

## Performance

- **Duration:** ~95 min
- **Started:** 2026-03-14T14:00:00Z (estimated)
- **Completed:** 2026-03-14T19:17:23Z
- **Tasks:** 2 (1 auto + 1 human-verify approved)
- **Files modified:** 17

## Accomplishments

- App.tsx upgraded from hardcoded tab to useState routing with Templates tab fully enabled
- TemplatesTab orchestrates all variant CRUD handlers and feeds sidebar + editor
- VariantBuilder provides full checkbox tree with optimistic updates and job-cascade visual (bullets gray when job excluded)
- VariantPreview renders three distinct resume layouts (traditional/modern/compact) filtered to included items only
- Human-verify checkpoint passed: all TMPL requirements confirmed working end-to-end
- Post-verify fixes resolved duplicate handler bug, migration resilience, and UX polish

## Task Commits

Each task was committed atomically:

1. **Task 1: Tab routing + all 5 UI components** - `98ca1f7` (feat)
2. **Task 2: Verify Template Variants end-to-end** - checkpoint approved (no code commit)

**Post-task fix commits:**
- `a113cd4` — fix(02-02): migration resilience for existing tables
- `9294b53` — style: polish padding and alignment across Experience tab
- `79dff58` — fix(02-02): duplicate handler, layout selector placement, bullet alignment
- `ed78f9a` — style+feat: Experience tab spacing + Enter creates new bullet
- `b891c5e` — style: margin between add buttons and content
- `44f5b64` — style: space-y-4 containers for consistent spacing
- `7c6a216` — style: inline styles for guaranteed spacing

**Plan metadata:** `07fc30d` (docs: complete template variants UI plan)

## Files Created/Modified

- `src/renderer/src/App.tsx` — Added useState tab routing, Templates tab enabled, TemplatesTab import
- `src/renderer/src/components/TemplatesTab.tsx` — Two-column layout, variant CRUD handlers, empty state
- `src/renderer/src/components/VariantList.tsx` — Sidebar list with group/group-hover duplicate+delete
- `src/renderer/src/components/VariantEditor.tsx` — Inline rename, layout selector (Preview only), builder/preview sub-tabs
- `src/renderer/src/components/VariantBuilder.tsx` — Checkbox tree for jobs/bullets/skills with optimistic updates
- `src/renderer/src/components/VariantPreview.tsx` — Read-only resume views for 3 layout templates
- `src/main/db/index.ts` — Migration try-catch for resilience on repeated app starts
- `src/main/handlers/templates.ts` — Duplicate handler rewritten to use synchronous better-sqlite3 API
- `src/renderer/src/components/BulletItem.tsx` — Vertical centering fix, Enter key to save+create bullet
- `src/renderer/src/components/BulletList.tsx` — Spacing polish
- `src/renderer/src/components/ExperienceTab.tsx` — max-w-2xl layout, section spacing, inline styles
- `src/renderer/src/components/InlineEdit.tsx` — Enter key handling improvement
- `src/renderer/src/components/JobItem.tsx` — Padding and spacing polish
- `src/renderer/src/components/JobList.tsx` — space-y-4, inline styles for guaranteed gaps
- `src/renderer/src/components/SkillItem.tsx` — Layout polish
- `src/renderer/src/components/SkillList.tsx` — space-y-4, inline styles for guaranteed gaps

## Decisions Made

- **Optimistic updates for checkbox toggles:** Local state update is instant, IPC async in background — avoids visible lag on each toggle
- **Layout sub-components inlined in VariantPreview.tsx:** All three layouts are tightly coupled to same data shape; separate files would add navigation overhead without benefit
- **Layout template selector moved to Preview sub-tab:** Placing the selector above the sub-tab bar was visually noisy on Builder. Preview is the only sub-tab where layout matters
- **Synchronous better-sqlite3 transactions:** better-sqlite3's `.transaction()` wrapper requires all statements inside to be `.run()`/`.all()` sync calls — async/await silently prevents rows from being inserted
- **try-catch on migration:** Development iteration replaces migration scripts; try-catch lets the app restart cleanly without crashing on pre-existing tables

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration crashes on existing tables**
- **Found during:** Post-task verification (app restart after initial run)
- **Issue:** `migrate()` used bare `CREATE TABLE` without `IF NOT EXISTS`, crashing on second app start
- **Fix:** Wrapped migration block in try-catch; logs warning and continues if tables already exist
- **Files modified:** `src/main/db/index.ts`
- **Verification:** App restarts cleanly without DB errors
- **Committed in:** `a113cd4`

**2. [Rule 1 - Bug] Duplicate variant handler silently failed**
- **Found during:** Human verify (duplicate action produced empty variant)
- **Issue:** `templates:duplicate` handler used async/await inside a better-sqlite3 `.transaction()` — the transaction completes without executing the inner async callbacks, so no variant_items rows were copied
- **Fix:** Rewrote handler using synchronous `.all()` and `.run()` calls exclusively
- **Files modified:** `src/main/handlers/templates.ts`
- **Verification:** Duplicate creates independent copy with all exclusion rows carried over correctly
- **Committed in:** `79dff58`

**3. [Rule 2 - UX] Layout selector moved from builder header to Preview sub-tab**
- **Found during:** Human verify (layout selector always visible, irrelevant on Builder)
- **Issue:** Selector placed prominently above sub-tab bar was always visible and only meaningful during preview
- **Fix:** Moved layout selector to render only when activeSubTab === 'preview' inside VariantEditor
- **Files modified:** `src/renderer/src/components/VariantEditor.tsx`
- **Committed in:** `79dff58`

**4. [Rule 1 - Bug] Bullet list vertical alignment off**
- **Found during:** Human verify
- **Issue:** BulletItem checkbox and text were misaligned due to missing `items-center` and manual `mt` offset overrides
- **Fix:** Added `items-center` to flex row, removed manual margin top offsets
- **Files modified:** `src/renderer/src/components/BulletItem.tsx`
- **Committed in:** `79dff58`

**5. [Rule 2 - Polish] Experience tab spacing and Enter-to-create-bullet**
- **Found during:** Human verify (section spacing cramped, no keyboard shortcut for adding bullets)
- **Issue:** Section headers, cards, and add buttons were too tightly packed; users had to reach for the mouse to add each bullet
- **Fix:** Added `max-w-2xl mx-auto` centering, increased section gaps, added Enter key handler in BulletItem to save and create next bullet. Tailwind utility classes were not applying consistently so inline styles were used for critical margins
- **Files modified:** `ExperienceTab.tsx`, `BulletItem.tsx`, `BulletList.tsx`, `JobItem.tsx`, `JobList.tsx`, `SkillList.tsx`, `InlineEdit.tsx`
- **Committed in:** `ed78f9a`, `b891c5e`, `44f5b64`, `7c6a216`

---

**Total deviations:** 5 (2 bug fixes, 1 UX relocation, 1 alignment fix, 1 spacing polish pass)
**Impact on plan:** All fixes necessary for correctness and usability. The duplicate bug was a critical functional failure caught at human-verify. No scope creep — all changes directly improve the delivered feature.

## Issues Encountered

- Tailwind utility spacing classes (`mb-4`, `gap-4`) were not applying consistently in the electron-vite renderer context. Resolved by switching to inline styles for critical margin/gap values in ExperienceTab, JobList, and SkillList. Root cause not fully diagnosed — likely a Tailwind 4 JIT purge or specificity interaction with electron-vite dev server.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four TMPL requirements satisfied and human-verified: create (TMPL-01), toggle items (TMPL-02), duplicate (TMPL-03), delete (TMPL-04)
- Phase 3 (Submissions) can reference `window.api.templates.list()` and `window.api.templates.getBuilderData()` for snapshot generation at submission time
- The `resume_snapshot` JSON column should capture BuilderData at submission insert to preserve historical records independently of live variant edits

---
*Phase: 02-template-variants*
*Completed: 2026-03-14*
