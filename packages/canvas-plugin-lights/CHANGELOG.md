# @diegesis/canvas-plugin-lights

## 0.1.1

### Patch Changes

- a1b9da1: Placeable locking: documents gain a Valibot-validated `locked` flag (via the new core `LockableSchemaEntries`, spread into every plugin document schema). Locked placeables are skipped by pick/pickRect (opt out with `includeLocked`), drag, resize, rotate and delete; `canvas.setLocked()`/`canvas.toggleLock()` are undoable, batch document updates and drop locked objects from the selection. The context menu gains Lock/Unlock actions (mixed-selection aware, right-click re-picks locked objects) with a `Ctrl+L` hotkey, and Duplicate/Delete are disabled when the whole selection is locked.
- adb65b3: The selection box now rotates with the object. With a single object selected, the box, resize corner handles and the rotate handle are drawn on the object's oriented frame instead of its axis-aligned bounding box, so a rotated cone, ray, rectangle or tile keeps a tight selection that hugs the shape. Placeables expose the frame through the new `PlaceableObject.getSelectionFrame()` (`cx`, `cy`, `width`, `height`, `angle`), which `AoETemplate` overrides so cone/ray frames follow `direction` and the circle stays neutral.

  The default frame (and `getAABB()`) previously assumed rotation happens around the center of the local bounds. That only holds for center-anchored placeables like tokens — corner-anchored ones (drawing rectangles/ellipses, tiles, whose Pixi container rotates around its origin) got a misplaced selection box after rotating, worst for square shapes. Both now derive the exact geometry by rotating the local rectangle: the frame rotates the local center offset around the origin, and `getAABB()` encloses the four rotated corners (which also fixes picking, marquee and spatial indexing for rotated corner-anchored placeables; centered placeables produce identical results to before). Multi-selections keep the combined axis-aligned box.

- Updated dependencies [dc84a50]
- Updated dependencies [b404e1e]
- Updated dependencies [a1b9da1]
- Updated dependencies [adb65b3]
- Updated dependencies [11a8164]
- Updated dependencies [d329e33]
- Updated dependencies [adb65b3]
- Updated dependencies [599ab54]
  - @diegesis/canvas@0.2.0
