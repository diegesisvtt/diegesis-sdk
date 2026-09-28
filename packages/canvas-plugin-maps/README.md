# @diegesis/canvas-plugin-maps

> Maps plugin for @diegesis/canvas — streaming tiled map loading with LOD mipmaps, viewport culling, LRU tile cache and flyweight source sharing.

## Installation

```bash
npm install @diegesis/canvas-plugin-maps
```

Requires `@diegesis/canvas` and `pixi.js` (^8) as peers.

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { mapsPlugin } from '@diegesis/canvas-plugin-maps';

const canvas = new Canvas(container, { plugins: [mapsPlugin] });
await canvas.initialize();
await canvas.draw({
  width: 2400,
  height: 1500,
  grid: { type: 'square', size: 50 },
  maps: [
    // plain image — the client builds a mipmap pyramid and streams tiles
    { x: 0, y: 0, source: '/assets/dungeon.png' },
    // server pre-rendered tiles, {z}/{x}/{y} URL template
    {
      x: 0, y: 0,
      source: {
        type: 'tiled',
        url: '/maps/world/{z}/{x}/{y}.png',
        width: 8192, height: 6144,
        maxLevel: 5,
        tileSize: 256,
      },
    },
  ],
});
```

This registers the `map` document type (scene key `maps`), the Maps layer
(order 50 — the background of the scene), progress events, and a per-frame
viewport watcher that feeds culling/LOD updates to every visible map.

## How it works

- **LOD mipmaps** — `ImageTiledSource` decodes one image and builds a pyramid of
  downsampled levels (`createImageBitmap`); `UrlTiledSource` fetches only the
  tiles of the chosen level from a `{z}/{x}/{y}` template.
- **Viewport culling** — `TiledSprite` picks the LOD from the zoom scale,
  requests only tiles inside the viewport and prunes off-screen sprites.
  Coarse tiles are shown as a progressive fallback while sharper ones load.
- **LRU tile cache** — `TileCache` bounds GPU memory; evicted tiles destroy
  their textures and close their bitmaps.
- **Flyweight sources** — `MapSourceRegistry` shares one decoded pipeline and
  one cache between placeables pointing at the same source, refcounted and
  released when the last consumer is destroyed.

## API

### `mapsPlugin` / `MapsPlugin`

`mapsPlugin` is a ready-to-use singleton. Construct your own instance to share
a registry across canvases:

```ts
const registry = new MapSourceRegistry();
const plugin = new MapsPlugin(registry);
await canvas.use(plugin);
```

| Member | Signature | Description |
| --- | --- | --- |
| `registry` | `MapSourceRegistry \| null` | Active source registry (after install). |

### Map document

Schema: `MapDataSchema` (valibot). Types: `MapData`, `MapDataInput`.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` (uuid) | generated | UUID v7 when omitted. |
| `x`, `y` | `number` | required | Top-left corner in canvas pixels. |
| `width`, `height` | `number >= 1` | natural size | Falls back to the source's pixel size. |
| `alpha` | `number` (0–1) | `1` | Opacity. |
| `source` | `MapSourceInput` | required | See below. |

`MapSourceSchema` accepts a shorthand URL string, an image source or a tiled source:

```ts
type MapSourceInput =
  | string                                             // → { type: 'image', src }
  | { type: 'image'; src: string }
  | {
      type: 'tiled';
      url: string;          // template with {z}, {x}, {y}
      tileSize?: number;    // 64–1024, default 256
      minLevel?: number;    // default 0
      maxLevel: number;
      width: number;        // base (level 0) pixel size
      height: number;
    };
```

### `MapPlaceable`

`class MapPlaceable extends PlaceableObject<MapData>` — `objectType: 'map'`.

- `get src(): string` — URL of the underlying source.
- `get naturalSize(): { width: number; height: number } | null` — source pixel size once loaded.
- `updateTiledView(view, scale): void` — called by the plugin each frame with the visible viewport rect.

### Sources and cache

```ts
interface TiledSource {
  readonly tileSize: number;
  readonly maxLevel: number;
  readonly baseWidth: number;
  readonly baseHeight: number;
  readonly cache: TileCache;
  readonly error: Error | null;
  readonly ready: Promise<void>;
  tile(key: TileKey): Promise<Texture | null>;   // TileKey = { level, col, row }
  destroy(): void;
}
```

- `new ImageTiledSource({ src, tileSize?, maxCacheTiles?, onProgress? })` — client-side pyramid from one image (default `tileSize` 512).
- `new UrlTiledSource({ url, width, height, maxLevel, tileSize?, minLevel?, maxCacheTiles?, onProgress? })` — server tiles via `{z}/{x}/{y}` template (default `tileSize` 256).
- `new TileCache(capacity = 256)` — LRU cache of `TileCacheEntry` (`{ texture, dispose? }`); evictions destroy textures.
- `tileKey(key)` — formats a `TileKey` as `"level:col:row"`.

### LOD helpers

`levelSizeAt(level, baseWidth, baseHeight)`, `maxLevelFor(baseWidth, baseHeight, tileSize)`, `tilesAcross(pixels, tileSize)`, `chooseLevel(baseWidth, displayWidth, scale, maxLevel)`, `clampIndex(value, max)` — pure functions behind level selection (type `LevelSize`).

### `TiledSprite`

Pixi `Container` that renders a `TiledSource`: `new TiledSprite(source, worldWidth?, worldHeight?)`, `updateView(view: ViewportRect, scale)`, `renderLevel`, `renderedTiles`. Used internally by `MapPlaceable`.

### Events

| Event | Payload |
| --- | --- |
| `map:progress` | `{ id, src, loaded, total }` |
| `map:loaded` | `{ id, src, width, height, levels }` |
| `map:error` | `{ id, src, message }` |

## Related packages

- [@diegesis/canvas](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas) — core canvas and plugin contract.
- [@diegesis/canvas-plugin-tiles](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-tiles) — for small, individually placed image tiles on top of the map.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
