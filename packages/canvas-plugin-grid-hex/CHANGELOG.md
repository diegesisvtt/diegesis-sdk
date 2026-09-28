# @diegesis/canvas-plugin-grid-hex

## 0.2.1

### Patch Changes

- cb568ac: Add a package README to every published package: npm-page documentation, verified quick starts and API references, LLM-friendly signatures.
- Updated dependencies [cb568ac]
  - @diegesis/canvas@0.2.1
  - @diegesis/canvas-plugin-grid@0.2.1

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
  - @diegesis/canvas-plugin-grid@0.2.0
