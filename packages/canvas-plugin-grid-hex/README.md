# @diegesis/canvas-plugin-grid-hex

> Hex grid plugins for @diegesis/canvas — vertical (pointy-top) and horizontal (flat-top) hex-grid scenes.

Registers the hex grid layers and their context-menu configuration (toggle, cell size, line width, opacity, color, alignment offsets). Grid state and snapping math live in the core `GridService`; each plugin only renders its layer while `canvas.grid.type` matches its orientation.

## Installation

```bash
npm install @diegesis/canvas-plugin-grid-hex
```

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { gridHexVerticalPlugin, gridHexHorizontalPlugin } from '@diegesis/canvas-plugin-grid-hex';
import { gridNonePlugin } from '@diegesis/canvas-plugin-grid';

const canvas = new Canvas(container);
await canvas.use(gridHexVerticalPlugin);   // pointy-top
await canvas.use(gridHexHorizontalPlugin); // flat-top
await canvas.use(gridNonePlugin);          // optional "No grid" toggle
await canvas.initialize();

canvas.grid.setType('hex-vertical');
canvas.grid.setSize(50); // hex height (vertical) / width (horizontal) in world units

// Core snapping uses the active grid type:
const center = canvas.grid.snapToGrid(123, 87); // nearest hex center
```

Install both plugins and `canvas.grid.setType('hex-vertical' | 'hex-horizontal')` alternates between orientations. Right-clicking the canvas opens the grid context menu: one toggle per installed orientation plus style controls (cell size, line width, opacity, color, alignment) — visible while a hex grid is active.

## API

### `gridHexVerticalPlugin: CanvasPlugin`

Pointy-top hex grid (`id: 'grid-hex-vertical'`, `type: 'hex-vertical'`).

### `gridHexHorizontalPlugin: CanvasPlugin`

Flat-top hex grid (`id: 'grid-hex-horizontal'`, `type: 'hex-horizontal'`).

Both are built with `createGridTypePlugin(...)` from `@diegesis/canvas-plugin-grid`.

## Geometry notes

Compared with the other grid variants:

- **Vertical (pointy-top)** — hex height is `size`; width is `(sqrt(3) / 2) * size`. Rows are `0.75 * size` apart; odd rows are shifted by half a hex width.
- **Horizontal (flat-top)** — hex width is `size`; height is `(sqrt(3) / 2) * size`. Columns are `0.75 * size` apart; odd columns are shifted by half a hex height.
- **Cell shape** — `getCellShape` returns `{ type: 'poly', data: [x1, y1, ...] }` with the six vertices of the hex containing the point.
- **Snapping** — `snapToGrid` returns the nearest hex center (offset rows/columns accounted for). Unlike the square grid, `snapToIntersection` falls back to cell centers — there is no intersection snapping for hexes.

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — canvas core (grid state, snapping, `GridRenderer`).
- [@diegesis/canvas-plugin-grid](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid) — shared grid machinery used by these plugins.
- [@diegesis/canvas-plugin-grid-square](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-square) — square grid variant.
- [@diegesis/canvas-plugin-grid-isometric](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-isometric) — isometric grid variant.
- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — bundles all grid variants.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
