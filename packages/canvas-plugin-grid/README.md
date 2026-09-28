# @diegesis/canvas-plugin-grid

> Grid plugin for @diegesis/canvas — renders the scene grid (square, hex, isometric) and contributes grid configuration via context menu.

This is the **base package** for grid rendering in `@diegesis/canvas`. It provides the shared machinery — the `GridLayer` renderer, the `createGridTypePlugin` factory and the canvas context-menu contribution — that the per-geometry packages (`grid-square`, `grid-hex`, `grid-isometric`) consume. You normally install a variant package and get this one transitively; install it directly only if you are building a custom grid type or want just the "No grid" toggle.

## Installation

```bash
npm install @diegesis/canvas-plugin-grid
```

## Quick start

Grid state lives in the core `GridService` (`canvas.grid`). A grid plugin only renders the layer for its type and registers the context-menu toggle; the actual cell math (`snapToGrid`, `snapToIntersection`, cell shapes) is provided by the core and reacts to `canvas.grid.type`.

```ts
import { Canvas } from '@diegesis/canvas';
import { gridSquarePlugin } from '@diegesis/canvas-plugin-grid-square';
import { gridNonePlugin } from '@diegesis/canvas-plugin-grid';

const canvas = new Canvas(container);
await canvas.use(gridSquarePlugin); // from a variant package
await canvas.use(gridNonePlugin);   // optional "No grid" toggle
await canvas.initialize();

// Switching type hides/shows the matching grid layers automatically:
canvas.grid.setType('square');
canvas.grid.setSize(50);
canvas.grid.set({ color: '#ffffff', alpha: 0.3, offsetX: 0, offsetY: 0 });
```

Install several grid-type plugins and `canvas.grid.setType()` alternates between them — each layer is only visible while `canvas.grid.type` matches its type.

## API

### `createGridTypePlugin(def: GridTypePluginDef): CanvasPlugin`

Factory used by every grid variant. Creates a plugin that registers a `GridLayer` (visible only when `canvas.grid.type === def.type`) and the context-menu configuration for that type. When `def.type` is `'none'`, no layer is created — only the "No grid" toggle is contributed.

```ts
interface GridTypePluginDef {
  type: GridType;   // 'square' | 'hex-vertical' | 'hex-horizontal' | 'isometric' | 'none'
  id?: string;      // plugin id; defaults to `grid-${type}`
  name?: string;    // display name; defaults to `Grid · ${type}`
  layerLabel?: string;
}
```

### `gridNonePlugin: CanvasPlugin`

Prebuilt plugin with `type: 'none'` — disables grid rendering without uninstalling the other grid plugins.

### `class GridLayer extends CanvasLayer`

The render layer. Style changes arrive in bursts (context-menu sliders fire per input event), so redraws are coalesced to at most one per frame via `requestAnimationFrame`.

```ts
interface GridLayerOptions extends CanvasLayerOptions {
  grid: GridConfig;
}
```

| Member | Description |
| --- | --- |
| `setGrid(grid: GridConfig)` | Merge grid config and schedule a redraw. |
| `setSize(width: number, height: number)` | Set the world size and schedule a redraw. |
| `setType(type: GridType)` | Change the rendered type. |
| `worldSize` | Getter: `{ width, height }`. |
| `draw()` / `tearDown()` | Layer lifecycle (async). |
| `redraw()` | Schedule a coalesced redraw. |

### Context menu helpers

| Export | Description |
| --- | --- |
| `gridMenuItems(canvas, pluginId, type): ContextMenuItem[]` | Toggle for the type plus style controls (cell size, line width, opacity, color, align X/Y). Style controls only appear while the type is active. |
| `registerGridTypeContextMenu(ctx, pluginId, type)` | Registers the menu contribution on the canvas (`menuWhen.canvas()`). Called automatically by `createGridTypePlugin`. |
| `GRID_TYPE_LABELS` | `Record` of human labels: `square`, `hex-vertical`, `hex-horizontal`, `isometric`. |

### Core APIs a grid plugin relies on

Grid state and math stay in `@diegesis/canvas`:

- `canvas.grid` (`GridService`): `set(changes)`, `setType(type)`, `setSize(size)`, `snapshot()`, `snapToGrid(x, y)`, `snapToIntersection(x, y)`.
- `grid:change` event on the bus — emitted on every mutation; grid layers listen to it to update visibility and style.
- `GridRenderer` (core): static `draw`, `snapToGrid`, `snapToIntersection`, `cellIndexOf`, `cellCenterOf`, `getCellShape` for each `GridType`.

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — canvas core (grid state, snapping, rendering primitives).
- [@diegesis/canvas-plugin-grid-square](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-square) — square grid plugin built on this package.
- [@diegesis/canvas-plugin-grid-hex](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-hex) — pointy-top and flat-top hex grid plugins.
- [@diegesis/canvas-plugin-grid-isometric](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-isometric) — isometric grid plugin.
- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — bundles all grid variants plus `gridNonePlugin`.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
