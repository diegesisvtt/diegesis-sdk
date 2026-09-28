# @diegesis/canvas-plugin-lights

> Ambient light plugin for @diegesis/canvas — light documents, AmbientLight placeable, light tool and light:sources contributions.

## Installation

```bash
npm install @diegesis/canvas-plugin-lights
```

Requires `@diegesis/canvas` and `pixi.js` (^8) as peers.

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { lightsPlugin } from '@diegesis/canvas-plugin-lights';

const canvas = new Canvas(container, { plugins: [lightsPlugin] });
await canvas.initialize();
await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  lights: [{ x: 1275, y: 315, dim: 9, bright: 3, color: 0xffb35c }],
});
```

This registers the `light` document type (scene key `lights`), the Lights layer
(order 550), the Light tool (hotkey `L`) and the light context menu. On every
composition pass the plugin taps the `light:sources` hook, converting each
light's grid-cell radii to pixels, so
[@diegesis/canvas-plugin-lighting](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lighting) renders the
darkness overlay without knowing where lights come from.

## API

### `lightsPlugin`

Plugin singleton (`id: 'lights'`), created with `definePlugin`. No additional
public API beyond installation — lights are managed through the core document
registry and the Light tool.

### Light document

Schema: `LightDataSchema` (valibot). Types: `LightData` (output), `LightDataInput` (input).

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` (uuid) | generated | UUID v7 when omitted. |
| `x`, `y` | `number` | required | Center position in canvas pixels. |
| `dim` | `number >= 0.5` | required | Dim (penumbra) radius in grid cells. |
| `bright` | `number >= 0` | `0` | Bright (full illumination) radius in grid cells. |
| `color` | `number \| string?` | `0xffb35c` | Light tint; accepts hex number or CSS color string. |

Plus the shared lockable entries from `@diegesis/canvas` (`LockableSchemaEntries`).

CRUD goes through the core registry: `canvas.documents.create('light', data)`,
`.update('light', id, changes)`, `.delete('light', id)`.

### `AmbientLight` placeable

`class AmbientLight extends PlaceableObject<LightData>` — `objectType: 'light'`.

- `get dimRadius(): number` — dim radius in pixels (`dim * grid.size`).
- `get brightRadius(): number` — bright radius in pixels.
- `get color(): number` — resolved hex color.
- `bounds` — a 40×40 px interaction box around the origin (the rendered glow is non-interactive).

### Light tool

`LightTool` — id `light`, hotkey `L`. Click to place an ambient light. Options
via `canvas.tools.options.light`:

```ts
interface LightToolOptions {
  dim: number;              // grid cells, default 8
  bright: number;           // grid cells, default 2
  color: number | string;   // default 0xffb35c
}
```

### Hook contribution

The plugin taps `light:sources` (`syncWaterfall`) pushing
`{ x, y, dim, bright, color }` for every light — radii converted from cells to
pixels. Tokens can contribute their own light through the same hook (see
[@diegesis/canvas-plugin-tokens](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-tokens), `lightBright` /
`lightDim`).

## Related packages

- [@diegesis/canvas](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas) — core canvas and plugin contract.
- [@diegesis/canvas-plugin-lighting](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lighting) — consumes `light:sources` to render the darkness overlay.
- [@diegesis/canvas-plugin-walls](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-walls) — wall segments occlude light via `sight:segments`.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
