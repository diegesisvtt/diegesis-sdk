# @diegesis/canvas-plugin-grid-isometric

> Isometric grid plugin for @diegesis/canvas — renders and configures isometric-grid scenes.

Registers the isometric grid layer and its context-menu configuration (toggle, cell size, line width, opacity, color, alignment offsets). Grid state and snapping math live in the core `GridService`; this plugin only renders the layer while `canvas.grid.type === 'isometric'`.

## Installation

```bash
npm install @diegesis/canvas-plugin-grid-isometric
```

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { gridIsometricPlugin } from '@diegesis/canvas-plugin-grid-isometric';
import { gridNonePlugin } from '@diegesis/canvas-plugin-grid';

const canvas = new Canvas(container);
await canvas.use(gridIsometricPlugin);
await canvas.use(gridNonePlugin); // optional "No grid" toggle
await canvas.initialize();

canvas.grid.setType('isometric');
canvas.grid.setSize(50); // diamond width in world units (height is size / 2)

// Core snapping uses the active grid type:
const center = canvas.grid.snapToGrid(123, 87); // nearest diamond center
```

Right-clicking the canvas opens the grid context menu: an "Isometric" toggle plus sliders for cell size, line width, opacity, color and X/Y alignment — visible while the isometric grid is active.

## API

### `gridIsometricPlugin: CanvasPlugin`

The ready-to-use plugin (`id: 'grid-isometric'`). Built with `createGridTypePlugin({ type: 'isometric', ... })` from `@diegesis/canvas-plugin-grid`.

## Geometry notes

Compared with the other grid variants:

- **Cell shape** — diamonds (rhombi) with a fixed 2:1 aspect ratio: width is `size`, height is `size / 2`. `getCellShape` returns `{ type: 'poly', data: [...] }` with the four diamond vertices.
- **Rendering** — two families of diagonal lines at the diamond slope (`isoWidth / isoHeight = 2`), giving the classic isometric lattice.
- **Snapping** — `snapToGrid` converts the point to isometric coordinates (`x / width +/- y / height`), rounds both axes and converts back, returning the nearest diamond center. Unlike the square grid, `snapToIntersection` falls back to cell centers.
- **Cell math** — `cellIndexOf`/`cellCenterOf` map `(col, row)` to `((col - row) * size) / 2`, `((col + row) * (size / 2)) / 2`, honoring `offsetX`/`offsetY`.

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — canvas core (grid state, snapping, `GridRenderer`).
- [@diegesis/canvas-plugin-grid](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid) — shared grid machinery used by this plugin.
- [@diegesis/canvas-plugin-grid-square](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-square) — square grid variant.
- [@diegesis/canvas-plugin-grid-hex](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-hex) — hex grid variants.
- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — bundles all grid variants.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
