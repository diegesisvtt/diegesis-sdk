# @diegesis/canvas-plugin-tokens

## 0.2.0

### Minor Changes

- ee91bd5: The `Hidden` context-menu toggle is now mixed-state aware for
  multi-selections: it renders an indeterminate dash when tokens diverge, and
  activating it hides all tokens unless every selected token was already
  hidden (then it shows all) — previously it applied the first token's
  flipped state to the whole selection.

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
