# @diegesis/canvas-plugin-walls

## 0.1.1

### Patch Changes

- a1b9da1: Placeable locking: documents gain a Valibot-validated `locked` flag (via the new core `LockableSchemaEntries`, spread into every plugin document schema). Locked placeables are skipped by pick/pickRect (opt out with `includeLocked`), drag, resize, rotate and delete; `canvas.setLocked()`/`canvas.toggleLock()` are undoable, batch document updates and drop locked objects from the selection. The context menu gains Lock/Unlock actions (mixed-selection aware, right-click re-picks locked objects) with a `Ctrl+L` hotkey, and Duplicate/Delete are disabled when the whole selection is locked.
- c08847e: Fix wall history handling and scene menu targeting: `commitWallPoints` now records the current segments (instead of the pre-gesture snapshot) so undo restores the right state, history batching is guarded when no history manager is installed, and the walls scene context menu also opens on wall selections.
- Updated dependencies [dc84a50]
- Updated dependencies [b404e1e]
- Updated dependencies [a1b9da1]
- Updated dependencies [adb65b3]
- Updated dependencies [11a8164]
- Updated dependencies [d329e33]
- Updated dependencies [adb65b3]
- Updated dependencies [599ab54]
  - @diegesis/canvas@0.2.0
