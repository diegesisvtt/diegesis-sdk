# @diegesis/canvas-plugin-templates

## 0.2.0

### Minor Changes

- adb65b3: The selection box now rotates with the object. With a single object selected, the box, resize corner handles and the rotate handle are drawn on the object's oriented frame instead of its axis-aligned bounding box, so a rotated cone, ray, rectangle or tile keeps a tight selection that hugs the shape. Placeables expose the frame through the new `PlaceableObject.getSelectionFrame()` (`cx`, `cy`, `width`, `height`, `angle`), which `AoETemplate` overrides so cone/ray frames follow `direction` and the circle stays neutral.

  The default frame (and `getAABB()`) previously assumed rotation happens around the center of the local bounds. That only holds for center-anchored placeables like tokens — corner-anchored ones (drawing rectangles/ellipses, tiles, whose Pixi container rotates around its origin) got a misplaced selection box after rotating, worst for square shapes. Both now derive the exact geometry by rotating the local rectangle: the frame rotates the local center offset around the origin, and `getAABB()` encloses the four rotated corners (which also fixes picking, marquee and spatial indexing for rotated corner-anchored placeables; centered placeables produce identical results to before). Multi-selections keep the combined axis-aligned box.

- d329e33: Transformable templates and Foundry-style placement. Templates (circle/cone/ray) can now be resized and rotated after placement through the Select tool handles: the templates plugin registers a `TransformAdapter` with proportional-anchor scaling (rays scale `width` together, clamped to the schema minimum) and the core `TransformAdapter` gains `rotationField` so types that rotate via a custom document field (templates use `direction`) participate in the rotate gesture, history and undo. During placement the template tool is now a two-step flow — click to set the origin, drag to size and aim with a live distance label and Foundry-style affected-cell highlighting, then click again to place. The wheel rotates cones/rays (15° steps when snapping) or resizes circles, with a core wheel-capture convention that suppresses viewport zoom while a tool leaf overrides `onWheel`. Snapping is on by default (origin snaps to grid intersections, distance to half cells) with a `snap` tool option to disable it and Shift as a temporary invert. Placed templates also render their affected grid cells, and the playground gains a Snap toggle plus an updated tool hint.
- adb65b3: Templates now rotate around their origin: the cone pivots on its tip and the ray on its emitting point, so rotating a spell template sweeps it in place instead of orbiting the center of its bounding box (which also made the selection box jump around during the gesture). Types declare the pivot through the new `TransformAdapter.rotationPivot(obj)` — when a single object is selected, `SelectRotating` uses it as the rotation center via `HandlesLayer.getRotationCenter()`; multi-selections and types without a declared pivot keep rotating around the selection AABB center.

### Patch Changes

- Updated dependencies [dc84a50]
- Updated dependencies [b404e1e]
- Updated dependencies [a1b9da1]
- Updated dependencies [adb65b3]
- Updated dependencies [11a8164]
- Updated dependencies [d329e33]
- Updated dependencies [adb65b3]
- Updated dependencies [599ab54]
  - @diegesis/canvas@0.2.0
