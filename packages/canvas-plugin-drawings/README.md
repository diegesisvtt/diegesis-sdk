# @diegesis/canvas-plugin-drawings

> Drawings document plugin for @diegesis/canvas — Drawing placeable, freehand brush tool and shape tool.

Adds a `drawing` document type to [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas): rectangles, ellipses, polygons, freehand brush strokes and text labels, with resize/rotate transform support, a context menu, and two tools (`draw`, hotkey `D`; `shape`, hotkey `S`).

## Installation

```bash
npm install @diegesis/canvas-plugin-drawings
```

## Quick start

```ts
import { Canvas, defineCanvasElements } from '@diegesis/canvas';
import { drawingsPlugin } from '@diegesis/canvas-plugin-drawings';

defineCanvasElements();
const canvas = new Canvas(container, { plugins: [drawingsPlugin] });
await canvas.initialize();

await canvas.draw({
  width: 1600,
  height: 1000,
  documents: {
    drawing: [
      { type: 'rect', x: 100, y: 100, width: 200, height: 120, strokeColor: '#f59e0b', strokeWidth: 2 },
      { type: 'text', x: 120, y: 140, text: 'Trap door', fontSize: 18 },
    ],
  },
});
```

Drawings are regular documents: they participate in selection, marquee, eraser, history/undo and emit `drawing:create|update|delete` on the canvas bus. Create them imperatively with `canvas.documents.create('drawing', data)`.

## API

### `drawingsPlugin`

Plugin instance (`id: 'drawings'`). Registers:

- Document type `drawing` (schema `DrawingDataSchema`, placeable `Drawing`, layer order 200, scene key `drawings`).
- Tool `draw` (`DrawTool`, hotkey `d`) — freehand brush strokes.
- Tool `shape` (`ShapeTool`, hotkey `s`) — drag to size a rect/ellipse.
- Context menu contribution for drawings.

### Tool options

Defaults are configurable per tool via `canvas.tools`:

```ts
interface DrawToolOptions {
  color: number | string;  // default 0xf59e0b
  width: number;           // default 4
}

interface ShapeToolOptions {
  kind: 'rect' | 'ellipse';
  color: number | string;  // default 0x8fb573
  fillAlpha: number;       // default 0.18
  strokeWidth: number;     // default 2
}
```

### `DrawingData`

Valibot-validated document shape (`DrawingDataSchema`, `parseDrawing(data)`):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` (UUID v7) | optional; assigned on create |
| `type` | `'rect' \| 'ellipse' \| 'polygon' \| 'brush' \| 'text'` | `DrawingTypeSchema` |
| `x`, `y` | `number` | origin |
| `width`, `height` | `number` | optional; rect/ellipse |
| `rotation` | `number` | default `0` |
| `points` | `number[]` | optional; polygon/brush vertices |
| `strokeColor`, `fillColor` | `number \| string` | optional |
| `strokeWidth` | `number >= 0` | optional |
| `fillAlpha` | `number` 0–1 | optional |
| `text` | `string` | optional; text drawings |
| `fontSize` | `number >= 1` | default `16` |
| `zIndex` | `number` | default `0` |

Also accepts the shared lockable entries from `@diegesis/canvas` (`locked`, `hidden`).

### Classes

- `Drawing` — `PlaceableObject<DrawingData>` rendering the document with PixiJS.
- `DrawTool` — freehand brush tool (`static id = 'draw'`).
- `ShapeTool` — rect/ellipse shape tool (`static id = 'shape'`).

### Types

`DrawingData`, `DrawingDataInput`, `DrawingType`, `DrawToolOptions`, `ShapeToolOptions`.

## Related packages

- [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) — plugin-first canvas core (required).
- [`@diegesis/canvas-preset-standard`](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — includes this plugin out of the box.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
