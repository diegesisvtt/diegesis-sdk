# @diegesis/canvas-preset-standard

> Standard preset for @diegesis/canvas — bundles the core plugins (grid, maps, tiles, drawings, walls, templates, tokens, rings, lights, measure, lighting, fog) in one import.

## Installation

```bash
npm install @diegesis/canvas-preset-standard
```

Peer dependency: `pixi.js` ^8 (plus `pixi-viewport` and `pixi-filters`, required by `@diegesis/canvas`).

## Quick start

```ts
import { defineCanvasElements } from '@diegesis/canvas';
import { createStandardCanvas } from '@diegesis/canvas-preset-standard';

defineCanvasElements();

const canvas = createStandardCanvas(document.getElementById('app')!);
await canvas.initialize();
await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  documents: {
    token: [{ x: 200, y: 200, label: 'Hero', visionRadius: 6 }],
    wall: [{ segments: [{ x1: 0, y1: 300, x2: 600, y2: 300, door: true }] }],
    light: [{ x: 400, y: 150, dim: 9, bright: 3, color: '#ffb35c' }],
  },
});
```

Plugins with custom elements ship their own registration helpers, re-exported here for convenience: `defineFogElements()` (fog panel) and `defineImageEditorElements()` (image editor window).

## API

### `createStandardCanvas(container, options?)`

```ts
function createStandardCanvas(
  container: HTMLElement,
  options?: Omit<CanvasOptions, 'plugins'>,
): Canvas;
```

Creates a `Canvas` with `standardPlugins` pre-installed (in the recommended order). All other `CanvasOptions` pass through.

### `standardPlugins`

```ts
const standardPlugins: CanvasPlugin[];
```

The preset's plugin list, in recommended installation order. Pass it to `new Canvas(container, { plugins: standardPlugins })` yourself, or pick individual entries for a custom composition.

### Re-exports

Every bundled plugin is re-exported, so selective composition works from this package alone:

```ts
import { Canvas } from '@diegesis/canvas';
import { tokensPlugin, wallsPlugin } from '@diegesis/canvas-preset-standard';

const canvas = new Canvas(container, { plugins: [wallsPlugin, tokensPlugin] });
```

| Export | Source package | Provides |
| --- | --- | --- |
| `gridNonePlugin`, `createGridTypePlugin`, `GridLayer` | `@diegesis/canvas-plugin-grid` | Gridless base / grid plugin factory |
| `gridSquarePlugin` | `@diegesis/canvas-plugin-grid-square` | Square grid |
| `gridHexVerticalPlugin`, `gridHexHorizontalPlugin` | `@diegesis/canvas-plugin-grid-hex` | Hex grids |
| `gridIsometricPlugin` | `@diegesis/canvas-plugin-grid-isometric` | Isometric grid |
| `mapsPlugin`, `MapsPlugin`, `MapPlaceable` | `@diegesis/canvas-plugin-maps` | Background maps |
| `tilesPlugin` | `@diegesis/canvas-plugin-tiles` | Tiles |
| `drawingsPlugin` | `@diegesis/canvas-plugin-drawings` | Drawings (rect/ellipse/brush/text) |
| `wallsPlugin`, `WallsPlugin` | `@diegesis/canvas-plugin-walls` | Walls, doors, curves, movement/sight blockers |
| `templatesPlugin` | `@diegesis/canvas-plugin-templates` | Area templates (circle/cone/ray) |
| `tokensPlugin` | `@diegesis/canvas-plugin-tokens` | Tokens, vision and light sources |
| `ringsPlugin`, `RingsPlugin` | `@diegesis/canvas-plugin-rings` | Token rings |
| `lightsPlugin` | `@diegesis/canvas-plugin-lights` | Ambient lights |
| `measurePlugin` | `@diegesis/canvas-plugin-measure` | Measuring ruler |
| `rangesPlugin`, `RangesPlugin` | `@diegesis/canvas-plugin-ranges` | Range indicators |
| `lightingPlugin` | `@diegesis/canvas-plugin-lighting` | Lighting overlay |
| `fogPlugin`, `defineFogElements` | `@diegesis/canvas-plugin-fog` | Fog of war + UI panel |
| `windowsPlugin`, `WindowsPlugin` | `@diegesis/canvas-plugin-window` | Window manager (dockable/floating windows) |
| `imageEditorPlugin`, `ImageEditorPlugin`, `ImageEditor`, `defineImageEditorElements` | `@diegesis/canvas-plugin-image-editor` | In-canvas image editor |

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — the canvas core and plugin contract this preset builds on.
- The individual `@diegesis/canvas-plugin-*` packages, if you prefer à-la-carte installs.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
