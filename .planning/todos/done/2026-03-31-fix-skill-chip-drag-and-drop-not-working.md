---
created: 2026-03-31T23:41:00.000Z
title: Fix skill chip drag and drop not working
area: ui
files:
  - src/renderer/src/components/SkillChipGrid.tsx
---

## Problem

Skill chip drag-and-drop is completely broken in the SkillChipGrid component (Phase 20). Neither individual skill chips nor category blocks are dragging. The @dnd-kit setup (useDraggable/useDroppable/DndContext) is in place but the drag interaction doesn't initiate — chips don't pick up on mouse down + move.

Likely causes:
1. Missing `{...attributes}` or `{...listeners}` spread on the chip element from `useDraggable`
2. DndContext sensors not configured (needs PointerSensor or MouseSensor with activation constraints)
3. Electron/Windows pointer-event compatibility issue with @dnd-kit (known issue — the research recommended @dnd-kit specifically for Electron compatibility, but sensor config may be needed)
4. CSS `cursor: grab` is set but the actual drag listeners may not be attached to the right DOM element

## Solution

Debug the SkillChipGrid DnD wiring:
1. Check that `useDraggable` returns `listeners` and `attributes` and both are spread on the chip element
2. Verify DndContext has sensors configured: `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))`
3. Check that `DragOverlay` renders the floating chip clone during drag
4. Test in dev tools — check if pointer events are being captured by the chip element
