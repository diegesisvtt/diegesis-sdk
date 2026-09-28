# @diegesis/canvas-plugin-fog

> Fog of war plugin for @diegesis/canvas — token-vision reveal, manual paint/reveal tools and control panel.

## Installation

```bash
npm install @diegesis/canvas-plugin-fog
```

Requires `@diegesis/canvas` and `pixi.js` (^8) as peers.

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { fogPlugin, type FogOfWarLayer } from '@diegesis/canvas-plugin-fog';

const canvas = new Canvas(container, { plugins: [fogPlugin] });
await canvas.initialize();
await canvas.draw({ width: 1600, height: 1000, grid: { type: 'square', size: 50 } });

const fog = canvas.layers.getLayer<FogOfWarLayer>('fog');
fog?.setEnabled(true);
```

Enable the panel web component when you want built-in UI:

```ts
import { defineFogElements, FOG_PANEL_TAG, type DiegesisFogPanel } from '@diegesis/canvas-plugin-fog';

defineFogElements();
const panel = document.createElement(FOG_PANEL_TAG) as DiegesisFogPanel;
panel.canvas = canvas;
document.body.append(panel);
```

When [@diegesis/canvas-plugin-window](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-window) is installed,
the plugin also registers a dockable "Fog of War" window hosting the same panel.

## How it works

Foundry/Simple-Fog-style fog composed deterministically in an offscreen Canvas2D:

- **Vision reveal** — every source from the `vision:sources` hook (e.g. tokens
  with `visionRadius`) casts a visibility polygon raycast against the
  `sight:segments` hook (e.g. walls). Currently visible areas are fully clear.
- **Explored memory** — seen areas accumulate in a `RenderTexture` and stay in
  penumbra after the token moves away.
- **Manual control** — the GM paints fog back (`paintFog`) or reveals areas
  (`revealFog`) with brush tools; manual paint is composited on top.
- **GM vs player view** — GM view renders the fog translucent (alpha 0.5);
  player view renders it fully opaque.

The plugin **does not know** about tokens or walls — it only consumes the
`vision:sources` and `sight:segments` hooks, so any plugin can contribute
sources or blockers. It is registered as the `fog` layer (order 800), hidden
until enabled.

## API

### `fogPlugin`

Plugin singleton (`id: 'fog'`), created with `definePlugin`. Registers the fog
layer, the Reveal (`F`) and Paint (`G`) tools, the `fog:change` event, a fog
context menu (enable, player view, darkness slider, reveal here, reset) and the
optional window.

### `FogOfWarLayer`

```ts
const fog = canvas.layers.getLayer<FogOfWarLayer>('fog');
```

| Member | Signature | Description |
| --- | --- | --- |
| `enabled` / `darkness` / `playerView` | getters | Current state (darkness default `0.92`, clamped 0–1). |
| `setEnabled` | `(enabled: boolean) => void` | Toggle fog; syncs layer visibility; emits `fog:change`. |
| `setDarkness` | `(darkness: number) => void` | Set fog opacity; emits `fog:change`. |
| `setPlayerView` | `(playerView: boolean) => void` | Opaque fog (player) vs translucent (GM); emits `fog:change`. |
| `setup` | `(width: number, height: number) => void` | (Re)allocate textures for a scene size and reset exploration. Called by the plugin on `scene:setup`. |
| `refresh` | `() => void` | Recompute current vision: accumulate into explored and recompose. |
| `compose` | `() => void` | Recompose the final fog texture (cheap; uses the explored cache). |
| `paintFog` | `(x, y, radius: number) => void` | Paint fog manually. |
| `revealFog` | `(x, y, radius: number) => void` | Erase fog and mark the area as explored. |
| `reset` | `() => void` | Clear exploration and manual paint; current vision is revealed again. |
| `tearDown` | `() => Promise<void>` | Release textures. |

### Fog tools

Created by `createFogTools(layer)` and registered by the plugin as `fogReveal`
(hotkey `F`) and `fogPaint` (hotkey `G`). Both share the brush options via
`canvas.tools.options.fogReveal` / `.fogPaint`:

```ts
interface FogToolOptions {
  brushSize: number;   // brush diameter in pixels, default 100
}
```

Click or drag to apply; a circular ghost previews the brush under the cursor.

### `DiegesisFogPanel` web component

Framework-agnostic control panel (`<diegesis-fog-panel>`, tag exported as
`FOG_PANEL_TAG`). Call `defineFogElements()` once, then assign the `Canvas`
instance to the `canvas` property. Controls: enable toggle, player view,
darkness, brush size, vision radius applied to selected/all tokens, tool
buttons and reset.

### Visibility math

Pure raycasting helpers, reusable for custom overlays:

```ts
interface VisionSegment { x1: number; y1: number; x2: number; y2: number }

raySegmentT(origin: Point, dir: Point, seg: VisionSegment): number | null
computeVisibilityPolygon(origin: Point, radius: number, segments: VisionSegment[], uniformRays = 180): Point[]
```

`computeVisibilityPolygon` combines uniform rays (smooth circular edge) with
rays aimed at each segment vertex ±ε (exact shadows behind walls) and returns
the polygon sorted by angle.

### Events

| Event | Payload |
| --- | --- |
| `fog:change` | `{ enabled: boolean; darkness: number; playerView: boolean }` |

## Related packages

- [@diegesis/canvas](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas) — core canvas and plugin contract.
- [@diegesis/canvas-plugin-tokens](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-tokens) — token `visionRadius` feeds `vision:sources`.
- [@diegesis/canvas-plugin-walls](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-walls) — sight-blocking segments shape the revealed area.
- [@diegesis/canvas-plugin-lighting](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lighting) — darkness overlay driven by light sources; complements fog.
- [@diegesis/canvas-plugin-window](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-window) — optional host for the dockable fog panel.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
