# @diegesis/canvas-plugin-templates

> Area of effect templates plugin for @diegesis/canvas — circle/cone/ray template documents, placeable, tool and geometry helpers.

Adds a `template` document type to [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas): measured-area templates (circle, cone, ray) for spell effects and area markers, with full transform support (resize scales distance, rotate drives `direction`), a placement tool (`template`, hotkey `B`) and a context menu.

## Installation

```bash
npm install @diegesis/canvas-plugin-templates
```

## Quick start

```ts
import { Canvas, defineCanvasElements } from '@diegesis/canvas';
import { templatesPlugin } from '@diegesis/canvas-plugin-templates';

defineCanvasElements();
const canvas = new Canvas(container, { plugins: [templatesPlugin] });
await canvas.initialize();

await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  documents: {
    template: [
      { shape: 'circle', x: 400, y: 300, distance: 4, color: '#4fc3f7' },
      { shape: 'cone', x: 200, y: 200, direction: Math.PI / 4, distance: 6 },
      { shape: 'ray', x: 600, y: 400, direction: 0, distance: 8, width: 1 },
    ],
  },
});
```

`distance` and `width` are measured in grid units. Templates are regular documents: selection, marquee, eraser, history/undo and `template:create|update|delete` bus events all work out of the box.

## API

### `templatesPlugin`

Plugin instance (`id: 'templates'`). Registers:

- Document type `template` (schema `TemplateDataSchema`, placeable `AoETemplate`, layer order 400, scene key `templates`).
- Tool `template` (`TemplateTool`, hotkey `b`) — click to set the origin, drag to size/aim, wheel to rotate or resize, click again to place; Shift disables snap.
- Context menu contribution for templates.

### Tool options

```ts
interface TemplateToolOptions {
  shape: TemplateShape;    // 'circle' | 'cone' | 'ray'; default 'circle'
  distance: number;        // default 4 (grid units)
  width: number;           // default 1 (rays only)
  color: number | string;  // default 0x4fc3f7
  fillAlpha: number;       // default 0.25
  snap: boolean;           // default true
}
```

### `TemplateData`

Valibot-validated document shape (`TemplateDataSchema`):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` (UUID v7) | optional; assigned on create |
| `shape` | `'circle' \| 'cone' \| 'ray'` | `TemplateShapeSchema` |
| `x`, `y` | `number` | origin (apex for cone/ray) |
| `direction` | `number` | radians; default `0` |
| `distance` | `number >= 0.5` | length/radius in grid units |
| `width` | `number >= 0.5` | rays only; default `1` |
| `color` | `number \| string` | optional |
| `fillAlpha` | `number` 0–1 | default `0.25` |

### Geometry helpers

```ts
const CONE_ANGLE: number; // Math.PI / 3 (60 degrees)

function conePoints(apex: Point, direction: number, length: number, angle = CONE_ANGLE, arcSteps = 24): Point[];
function rayPoints(origin: Point, direction: number, length: number, width: number): Point[];
function bboxOf(points: Point[]): { x: number; y: number; width: number; height: number };
```

### Classes and types

- `AoETemplate` — `PlaceableObject<TemplateData>` rendering the template with PixiJS.
- `TemplateTool` — placement tool (`static id = 'template'`).
- Types: `TemplateData`, `TemplateDataInput`, `TemplateShape`, `TemplateToolOptions`.

## Related packages

- [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) — plugin-first canvas core (required).
- [`@diegesis/canvas-preset-standard`](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — includes this plugin out of the box.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
