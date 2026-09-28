# @diegesis/canvas-plugin-tiles

> Tile document plugin for @diegesis/canvas — Tile placeable and drag-to-place tile tool.

## Installation

```bash
npm install @diegesis/canvas-plugin-tiles
```

Requires `@diegesis/canvas` and `pixi.js` (^8) as peers.

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { tilesPlugin } from '@diegesis/canvas-plugin-tiles';

const canvas = new Canvas(container, { plugins: [tilesPlugin] });
await canvas.initialize();
await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  tiles: [{ x: 100, y: 100, width: 200, height: 200, texture: '/assets/rug.png' }],
});
```

This registers the `tile` document type (scene key `tiles`), the Tiles layer
(order 100 — below tokens and walls), the Tile tool (hotkey `I`) and the tile
context menu (rotate 90°, size presets, opacity slider).

## API

### `tilesPlugin`

Plugin singleton (`id: 'tiles'`), created with `definePlugin`. No additional
public API beyond installation — interaction happens through the core document
registry and the Tile tool.

### Tile document

Schema: `TileDataSchema` (valibot). Types: `TileData` (output), `TileDataInput` (input). Helper: `parseTile(data: unknown): TileData`.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` (uuid) | generated | UUID v7 when omitted. |
| `x`, `y` | `number` | required | Top-left corner in canvas pixels. |
| `width`, `height` | `number >= 1` | required | Size in canvas pixels. |
| `rotation` | `number` | `0` | Radians. |
| `texture` | `string?` | — | Image URL/data URL; falls back to a gray rectangle. |
| `alpha` | `number` (0–1) | `1` | Opacity. |
| `zIndex` | `number` | `0` | Stacking inside the Tiles layer. |

Plus the shared lockable entries from `@diegesis/canvas` (`LockableSchemaEntries`).

CRUD goes through the core registry: `canvas.documents.create('tile', data)`,
`.update('tile', id, changes)`, `.delete('tile', id)`.

### `Tile` placeable

`class Tile extends PlaceableObject<TileData>` — `objectType: 'tile'`.

- `get width() / get height(): number` — document size in pixels.
- `bounds` — `{ x: 0, y: 0, width, height }` (top-left anchored).
- Supports selection resize and rotate via the core transform integration.

### Tile tool

`TileTool` — id `tile`, hotkey `I`. Drag to size a tile freely (snaps to grid
intersections); a simple click drops a tile using the tool defaults. Options via
`canvas.tools.options.tile`:

```ts
interface TileToolOptions {
  width: number;   // grid cells, default 2
  height: number;  // grid cells, default 2
  texture?: string;
}
```

## Related packages

- [@diegesis/canvas](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas) — core canvas and plugin contract.
- [@diegesis/canvas-plugin-maps](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-maps) — for full-scene background maps with LOD streaming instead of individual image tiles.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
