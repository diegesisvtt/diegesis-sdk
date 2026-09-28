# @diegesis/canvas-plugin-tiles

## 0.1.2

### Patch Changes

- cb568ac: Add a package README to every published package: npm-page documentation, verified quick starts and API references, LLM-friendly signatures.
- Updated dependencies [cb568ac]
  - @diegesis/canvas@0.2.1

## 0.1.1

### Patch Changes

- a1b9da1: Placeable locking: documents gain a Valibot-validated `locked` flag (via the new core `LockableSchemaEntries`, spread into every plugin document schema). Locked placeables are skipped by pick/pickRect (opt out with `includeLocked`), drag, resize, rotate and delete; `canvas.setLocked()`/`canvas.toggleLock()` are undoable, batch document updates and drop locked objects from the selection. The context menu gains Lock/Unlock actions (mixed-selection aware, right-click re-picks locked objects) with a `Ctrl+L` hotkey, and Duplicate/Delete are disabled when the whole selection is locked.
- Updated dependencies [dc84a50]
- Updated dependencies [b404e1e]
- Updated dependencies [a1b9da1]
- Updated dependencies [adb65b3]
- Updated dependencies [11a8164]
- Updated dependencies [d329e33]
- Updated dependencies [adb65b3]
- Updated dependencies [599ab54]
  - @diegesis/canvas@0.2.0
