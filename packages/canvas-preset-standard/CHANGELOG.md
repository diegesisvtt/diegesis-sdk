# @diegesis/canvas-preset-standard

## 0.2.1

### Patch Changes

- cb568ac: Add a package README to every published package: npm-page documentation, verified quick starts and API references, LLM-friendly signatures.
- Updated dependencies [cb568ac]
  - @diegesis/canvas@0.2.1
  - @diegesis/canvas-plugin-drawings@0.1.2
  - @diegesis/canvas-plugin-fog@0.2.1
  - @diegesis/canvas-plugin-grid@0.2.1
  - @diegesis/canvas-plugin-grid-hex@0.2.1
  - @diegesis/canvas-plugin-grid-isometric@0.2.1
  - @diegesis/canvas-plugin-grid-square@0.2.1
  - @diegesis/canvas-plugin-image-editor@0.2.1
  - @diegesis/canvas-plugin-lighting@0.1.2
  - @diegesis/canvas-plugin-lights@0.1.2
  - @diegesis/canvas-plugin-maps@0.2.1
  - @diegesis/canvas-plugin-measure@0.2.1
  - @diegesis/canvas-plugin-ranges@0.2.1
  - @diegesis/canvas-plugin-rings@0.2.1
  - @diegesis/canvas-plugin-templates@0.2.1
  - @diegesis/canvas-plugin-tiles@0.1.2
  - @diegesis/canvas-plugin-tokens@0.2.1
  - @diegesis/canvas-plugin-walls@0.1.2
  - @diegesis/canvas-plugin-window@0.2.1

## 0.2.0

### Minor Changes

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

- bba9dc3: Add `@diegesis/canvas-plugin-maps`: streaming tiled map loading for
  `@diegesis/canvas`, following the Warp Core approach (Owlbear Rodeo 2.3).

  - `map` document type (Valibot-validated) with `image` (any URL/data URL) or
    `tiled` (`{z}/{x}/{y}` template + dimensions) sources; `scene.maps` and
    `scene.documents.map` hydration, resize/transform support and a context
    menu with opacity plus "Natural size" (undoable reset to the source
    dimensions), "Fill scene" (stretch to scene bounds) and "Fit view to map"
    actions with live hints.
  - Image sources build a client-side mipmap pyramid (LOD levels until the
    largest edge fits one tile) by slicing `ImageBitmap`s on demand, so GPU
    memory stays bounded by the visible tiles; tiled sources stream
    server-rendered tiles directly.
  - `TiledSprite` renders with viewport culling — only tiles intersecting the
    view are requested/drawn, coarse ancestors show as progressive fallback
    while fine tiles stream in, and off-screen tiles are pruned.
  - `MapSourceRegistry` implements the flyweight pattern: maps sharing a
    source descriptor reuse one decoded pipeline and one LRU `TileCache`
    (bitmaps released on eviction); refcounted teardown.
  - `map:progress` (fetch progress for image sources, per-tile progress for
    tiled sources), `map:loaded` (dimensions + LOD levels) and `map:error` bus
    events for loading UIs; failed maps render a placeholder instead of
    throwing.
  - The standard preset installs `mapsPlugin` (below tiles, above background).

- 9ceaa6e: Add `@diegesis/canvas-plugin-ranges`: sticky range rings tool (hotkey `R`) with unit-aware presets (Basic, D&D 5e, Metric), color themes including color-blind palettes, circle/square shapes, optional token-following, `ranges:placed`/`ranges:cleared` bus events and a public `RangesPlugin` API (`place`, `clear`, `addPreset`, `addTheme`, `setOptions`). Wired into the standard preset and the playground canvas page.
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

### Patch Changes

- Updated dependencies [dc84a50]
- Updated dependencies [b404e1e]
- Updated dependencies [a1b9da1]
- Updated dependencies [8f1bde7]
- Updated dependencies [adb65b3]
- Updated dependencies [bba9dc3]
- Updated dependencies [3f3d116]
- Updated dependencies [9ceaa6e]
- Updated dependencies [11a8164]
- Updated dependencies [d329e33]
- Updated dependencies [adb65b3]
- Updated dependencies [ee91bd5]
- Updated dependencies [c08847e]
- Updated dependencies [599ab54]
  - @diegesis/canvas@0.2.0
  - @diegesis/canvas-plugin-grid@0.2.0
  - @diegesis/canvas-plugin-grid-square@0.2.0
  - @diegesis/canvas-plugin-grid-hex@0.2.0
  - @diegesis/canvas-plugin-grid-isometric@0.2.0
  - @diegesis/canvas-plugin-drawings@0.1.1
  - @diegesis/canvas-plugin-walls@0.1.1
  - @diegesis/canvas-plugin-lights@0.1.1
  - @diegesis/canvas-plugin-tiles@0.1.1
  - @diegesis/canvas-plugin-tokens@0.2.0
  - @diegesis/canvas-plugin-rings@0.2.0
  - @diegesis/canvas-plugin-templates@0.2.0
  - @diegesis/canvas-plugin-maps@0.2.0
  - @diegesis/canvas-plugin-measure@0.2.0
  - @diegesis/canvas-plugin-ranges@0.2.0
  - @diegesis/canvas-plugin-window@0.2.0
  - @diegesis/canvas-plugin-image-editor@0.2.0
  - @diegesis/canvas-plugin-fog@0.2.0
  - @diegesis/canvas-plugin-lighting@0.1.1
