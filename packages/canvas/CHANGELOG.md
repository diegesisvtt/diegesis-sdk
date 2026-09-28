# @diegesis/canvas

## 0.2.0

### Minor Changes

- dc84a50: Integrate `@diegesis/hotkeys` as the single keyboard layer: `CanvasOptions.hotkeys` accepts a shared manager (one is created and managed otherwise), `ToolManager` registers rebindable actions (`canvas/tool:*` from core and plugin contributions, `canvas/undo`, `canvas/redo`, `canvas/ping`, `canvas/pan`) and `RootState` no longer interprets keys — tool switching, undo/redo, ping and space/middle temp pan now flow through the hotkey engine with conflict detection and layout-independent matching. Plugin `ctx.registerTool({ hotkey })` is unchanged.
- b404e1e: Grids are plugins now: one plugin per grid type.

  - Core (`@diegesis/canvas`): `GridLayer` removed from the core. `canvas.grid`
    is now a `GridService` (state + snapping/cell math only) that emits a
    Valibot-validated `grid:change` event on every mutation (`set`, `setType`,
    `setSize`, `reset`); `canvas.draw()` applies `scene.grid` through it.
    `GridService` is exported and `GridLayer`/`GridLayerOptions` are no longer
    part of the public API. `GridRenderer.drawHex`/`drawIsometric` now honor
    `offsetX`/`offsetY` (previously only square did, which desynchronized
    rendering from snapping), and `ContextMenuToggle` supports an
    `indeterminate` state (dash) for mixed multi-selections.
  - `@diegesis/canvas-plugin-grid`: base package with the reusable `GridLayer`,
    a `createGridTypePlugin({ type, ... })` factory (also `type: 'none'` for
    the toggle-only `gridNonePlugin`) and the grid context-menu builders
    (`gridMenuItems`, `GRID_TYPE_LABELS`). Each plugin registers a layer that
    is only visible while `canvas.grid.type` matches its own type, so
    `grid.setType()` switches between installed types and installing a
    single type keeps the bundle lean.
  - Context menu: type toggles behave as a radio group (close on click, state
    always read from the `GridService` on open) including a "No grid" toggle;
    the active type contributes a separator plus live style controls — cell
    size, line width, opacity, color and Align X/Y offsets (all grid types,
    now that hex/isometric rendering honors offsets).
  - `GridLayer` coalesces redraws with `requestAnimationFrame` — live slider
    dragging repaints the grid at most once per frame instead of once per
    input event.
  - New per-type packages: `@diegesis/canvas-plugin-grid-square`
    (`gridSquarePlugin`), `@diegesis/canvas-plugin-grid-hex`
    (`gridHexVerticalPlugin`, `gridHexHorizontalPlugin`) and
    `@diegesis/canvas-plugin-grid-isometric` (`gridIsometricPlugin`).
  - Standard preset now installs all four grid plugins plus `gridNonePlugin`
    (19 plugins total) and re-exports them plus the factory.

- a1b9da1: Placeable locking: documents gain a Valibot-validated `locked` flag (via the new core `LockableSchemaEntries`, spread into every plugin document schema). Locked placeables are skipped by pick/pickRect (opt out with `includeLocked`), drag, resize, rotate and delete; `canvas.setLocked()`/`canvas.toggleLock()` are undoable, batch document updates and drop locked objects from the selection. The context menu gains Lock/Unlock actions (mixed-selection aware, right-click re-picks locked objects) with a `Ctrl+L` hotkey, and Duplicate/Delete are disabled when the whole selection is locked.
- adb65b3: The selection box now rotates with the object. With a single object selected, the box, resize corner handles and the rotate handle are drawn on the object's oriented frame instead of its axis-aligned bounding box, so a rotated cone, ray, rectangle or tile keeps a tight selection that hugs the shape. Placeables expose the frame through the new `PlaceableObject.getSelectionFrame()` (`cx`, `cy`, `width`, `height`, `angle`), which `AoETemplate` overrides so cone/ray frames follow `direction` and the circle stays neutral.

  The default frame (and `getAABB()`) previously assumed rotation happens around the center of the local bounds. That only holds for center-anchored placeables like tokens — corner-anchored ones (drawing rectangles/ellipses, tiles, whose Pixi container rotates around its origin) got a misplaced selection box after rotating, worst for square shapes. Both now derive the exact geometry by rotating the local rectangle: the frame rotates the local center offset around the origin, and `getAABB()` encloses the four rotated corners (which also fixes picking, marquee and spatial indexing for rotated corner-anchored placeables; centered placeables produce identical results to before). Multi-selections keep the combined axis-aligned box.

- 11a8164: Add `@diegesis/canvas-plugin-window`: a window manager for `@diegesis/canvas`.

  - Floating windows with close, drag (mouse + touch via Pointer Events),
    minimize (taskbar), maximize and resize (8 handles, min/max/aspect
    constraints).
  - Modal windows with backdrop and `Esc` dismissal (`persistent` opts out).
  - Docking to left/right/bottom edges with stack layout, per-window size via
    inner edge, drag-to-dock with live preview; docked minimize collapses to
    the titlebar. Docking can be restricted globally
    (`dockableEdges` manager option) and per window
    (`dockableEdges` on the window/definition, `false` never docks).
  - Dragging a docked titlebar detaches the window under the pointer and
    continues as a floating drag (re-dock by dragging to an allowed edge).
  - Edge snapping against the overlay and sibling windows (guides included);
    `Alt` disables snapping mid-gesture.
  - Resize feedback: gestures clamped by constraints or the overlay bounds
    flag the frame (`resize-blocked` styling) and emit
    `window:resize-blocked` (once per gesture); every committed resize emits
    `window:resize`; `resizeTo()` reports whether the size was applied
    exactly.
  - Popout (opt-in): with `popout: true` on the manager and `popoutable` on
    the window, the titlebar gains a popout button that moves the content to
    a separate browser window; closing it (or the taskbar entry) pops the
    content back in (`popout()`/`popin()`, `window:popout`/`window:popin`).
  - Declarative registration via `ctx.registerWindow({ id, title, factory })`
    with lazy content, plus imperative `manager.create()`.
  - `WindowManager.serialize()/restore()` persistence (registered windows
    round-trip by `definitionId`, optional `serializeContent/restoreContent`),
    `window:*` bus events (Valibot-validated) and `windowsBus()` typed port.
  - Headless mode: without a real DOM the manager tracks logical state and
    events, so tests/SSR keep working.

  Core (`@diegesis/canvas`): `WindowContribution` types and
  `PluginContext.registerWindow()` (auto-unregistered on plugin uninstall);
  `Canvas.host` getter; `PluginManager.get` generic widened. The image editor
  now requires the `windows` plugin and opens its built-in panel inside a
  managed window (double-click, context menu and `plugin.open()` all
  focus/reuse the same window); its window is maximizable by default and can
  be tuned via `new ImageEditorPlugin({ maximizable })`. The fog plugin
  registers its built-in panel as a dockable `fog` window when `windows` is
  installed (soft dependency — works standalone). The standard preset
  registers `windowsPlugin` before `fogPlugin` and `imageEditorPlugin`.

- d329e33: Transformable templates and Foundry-style placement. Templates (circle/cone/ray) can now be resized and rotated after placement through the Select tool handles: the templates plugin registers a `TransformAdapter` with proportional-anchor scaling (rays scale `width` together, clamped to the schema minimum) and the core `TransformAdapter` gains `rotationField` so types that rotate via a custom document field (templates use `direction`) participate in the rotate gesture, history and undo. During placement the template tool is now a two-step flow — click to set the origin, drag to size and aim with a live distance label and Foundry-style affected-cell highlighting, then click again to place. The wheel rotates cones/rays (15° steps when snapping) or resizes circles, with a core wheel-capture convention that suppresses viewport zoom while a tool leaf overrides `onWheel`. Snapping is on by default (origin snaps to grid intersections, distance to half cells) with a `snap` tool option to disable it and Shift as a temporary invert. Placed templates also render their affected grid cells, and the playground gains a Snap toggle plus an updated tool hint.
- adb65b3: Templates now rotate around their origin: the cone pivots on its tip and the ray on its emitting point, so rotating a spell template sweeps it in place instead of orbiting the center of its bounding box (which also made the selection box jump around during the gesture). Types declare the pivot through the new `TransformAdapter.rotationPivot(obj)` — when a single object is selected, `SelectRotating` uses it as the rotation center via `HandlesLayer.getRotationCenter()`; multi-selections and types without a declared pivot keep rotating around the selection AABB center.
- 599ab54: Make the drag ruler path-aware: dragging a token with `rulerOnDrag` now traces the actual route instead of a straight line from the origin. The path follows grid cells (square, hex and isometric), highlights every traversed cell, commits a waypoint at each real turn and measures the accumulated distance segment by segment (an L-shaped drag of 3 + 4 cells measures 7 instead of the 5-unit hypotenuse). Turns are detected with a 0.72-cell deviation tolerance (Douglas-Peucker), so straight drags at any angle — including near-diagonal cell staircases — measure the same as the previous straight-line ruler and only genuine bends add waypoints. Dragging backwards truncates the path and drops the turns you retrace past, so boundary jitter does not inflate the measurement. New `GridRenderer.cellIndexOf`/`cellCenterOf` map between points and cell indices for every grid type, the new `GridPath` class encapsulates the tracing logic (exported from `@diegesis/canvas`), and `PreviewLayer.ghostCell` renders traversed cells. The isometric `getCellShape` now aligns with snapped cell centers (it was offset by half a cell), and documents without grid snapping keep the previous straight-line ruler.

### Patch Changes

- Updated dependencies [fd01b0c]
- Updated dependencies [b8d12ae]
- Updated dependencies [aa3ddd4]
  - @diegesis/hotkeys@0.2.0
  - @diegesis/events@0.2.0
