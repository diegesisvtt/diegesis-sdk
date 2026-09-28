# @diegesis/canvas-plugin-lighting

> Lighting plugin for @diegesis/canvas — darkness overlay cut by light sources with wall occlusion.

## Installation

```bash
npm install @diegesis/canvas-plugin-lighting
```

Requires `@diegesis/canvas` and `pixi.js` (^8) as peers.

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { lightingPlugin, type LightingFxLayer } from '@diegesis/canvas-plugin-lighting';

const canvas = new Canvas(container, { plugins: [lightingPlugin] });
await canvas.initialize();
await canvas.draw({ width: 1600, height: 1000, grid: { type: 'square', size: 50 } });

const lighting = canvas.layers.getLayer<LightingFxLayer>('lighting');
lighting?.setEnabled(true);
lighting?.setDarkness(0.8);
```

## How it works

Foundry-style lighting composed deterministically in an offscreen Canvas2D:

1. The scene is filled with a night color at the configured `darkness` alpha.
2. Each light source (collected via the `light:sources` hook) casts a
   visibility polygon, raycast against the occluding segments from the
   `sight:segments` hook. Dim light cuts the darkness partially; bright light
   cuts it fully.
3. Each lit polygon adds a soft color tint (`lighter` blend).

The plugin **does not know** where lights or walls come from — light documents
([@diegesis/canvas-plugin-lights](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lights)) and tokens
([@diegesis/canvas-plugin-tokens](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-tokens)) contribute sources,
walls ([@diegesis/canvas-plugin-walls](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-walls)) contribute
occluders. Any plugin can tap the same hooks. The overlay recomposes
automatically on `scene:setup`/`scene:refresh` and on any
`document:create|update|delete|moved` or `selection:change` event, and is
registered as the `lighting` layer (order 750), initially hidden until enabled.

## API

### `lightingPlugin`

Plugin singleton (`id: 'lighting'`), created with `definePlugin`.

### `LightingFxLayer`

The overlay layer. Access it through the layer manager:

```ts
const lighting = canvas.layers.getLayer<LightingFxLayer>('lighting');
```

| Member | Signature | Description |
| --- | --- | --- |
| `enabled` | `boolean` (get) | Whether the overlay is on. |
| `darkness` | `number` (get) | Scene darkness, 0–1. |
| `setEnabled` | `(enabled: boolean) => void` | Toggle the overlay; emits `lighting:change`. |
| `setDarkness` | `(darkness: number) => void` | Set darkness (clamped to 0–1); emits `lighting:change`. The layer is only visible when enabled **and** darkness > 0. |
| `setup` | `(width: number, height: number) => void` | (Re)allocate the offscreen buffers for a scene size. Called by the plugin on `scene:setup`. |
| `compose` | `() => void` | Recompute the overlay now (e.g. for live updates during a drag). |
| `tearDown` | `() => Promise<void>` | Release textures. |

### Visibility math

Pure raycasting helpers, reusable for custom overlays:

```ts
interface VisionSegment { x1: number; y1: number; x2: number; y2: number }

raySegmentT(origin: Point, dir: Point, seg: VisionSegment): number | null
computeVisibilityPolygon(origin: Point, radius: number, segments: VisionSegment[], uniformRays = 180): Point[]
```

`computeVisibilityPolygon` combines uniform rays (smooth circular edge) with
rays aimed at each segment vertex ±ε (exact shadows behind walls) and returns
the polygon sorted by angle, ready for `Graphics.poly`.

### Events

| Event | Payload |
| --- | --- |
| `lighting:change` | `{ enabled: boolean; darkness: number }` |

## Related packages

- [@diegesis/canvas](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas) — core canvas and plugin contract.
- [@diegesis/canvas-plugin-lights](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lights) — ambient light documents feeding `light:sources`.
- [@diegesis/canvas-plugin-tokens](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-tokens) — token-emitted light (`lightBright`/`lightDim`).
- [@diegesis/canvas-plugin-walls](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-walls) — sight-blocking segments occluding light.
- [@diegesis/canvas-plugin-fog](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-fog) — same visibility polygon math applied to fog of war.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
