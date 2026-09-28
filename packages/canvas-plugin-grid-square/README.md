# @diegesis/canvas-plugin-grid-square

> Square grid plugin for @diegesis/canvas — renders and configures square-grid scenes.

Registers the square grid layer and its context-menu configuration (toggle, cell size, line width, opacity, color, alignment offsets). Grid state and snapping math live in the core `GridService`; this plugin only renders the layer while `canvas.grid.type === 'square'`.

## Installation

```bash
npm install @diegesis/canvas-plugin-grid-square
```

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { gridSquarePlugin } from '@diegesis/canvas-plugin-grid-square';
import { gridNonePlugin } from '@diegesis/canvas-plugin-grid';

const canvas = new Canvas(container);
await canvas.use(gridSquarePlugin);
await canvas.use(gridNonePlugin); // optional "No grid" toggle
await canvas.initialize();

canvas.grid.setType('square');
canvas.grid.setSize(50); // cell edge in world units (pixels)

// Core snapping uses the active grid type:
const center = canvas.grid.snapToGrid(123, 87);        // nearest cell center
const corner = canvas.grid.snapToIntersection(123, 87); // nearest line crossing
```

Right-clicking the canvas opens the grid context menu: a "Square" toggle plus sliders for cell size, line width, opacity, color and X/Y alignment — visible while the square grid is active.

## API

### `gridSquarePlugin: CanvasPlugin`

The ready-to-use plugin (`id: 'grid-square'`). Built with `createGridTypePlugin({ type: 'square', ... })` from `@diegesis/canvas-plugin-grid`.

## Geometry notes

Compared with the other grid variants:

- **Cell shape** — axis-aligned rectangles of `size x size` world units (`getCellShape` returns `{ type: 'rect', data: [x, y, size, size] }`).
- **Snapping** — `snapToGrid` returns the **cell center**; `snapToIntersection` returns line crossings. The hex and isometric variants only snap to cell centers.
- **Cell math** — `cellIndexOf`/`cellCenterOf` use plain `floor`/`round` over `size`, honoring `offsetX`/`offsetY`.

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — canvas core (grid state, snapping, `GridRenderer`).
- [@diegesis/canvas-plugin-grid](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid) — shared grid machinery used by this plugin.
- [@diegesis/canvas-plugin-grid-hex](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-hex) — hex grid variants.
- [@diegesis/canvas-plugin-grid-isometric](https://www.npmjs.com/package/@diegesis/canvas-plugin-grid-isometric) — isometric grid variant.
- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — bundles all grid variants.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
