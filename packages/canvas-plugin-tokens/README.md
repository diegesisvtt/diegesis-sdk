# @diegesis/canvas-plugin-tokens

> Token document plugin for @diegesis/canvas — Token placeable, token tool, vision and light sources.

## Installation

```bash
npm install @diegesis/canvas-plugin-tokens
```

Requires `@diegesis/canvas` and `pixi.js` (^8) as peers.

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { tokensPlugin } from '@diegesis/canvas-plugin-tokens';

const canvas = new Canvas(container, { plugins: [tokensPlugin] });
await canvas.initialize();
await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  tokens: [
    { x: 200, y: 200, size: 1, label: 'Hero', visionRadius: 6 },
    { x: 400, y: 320, size: 2, label: 'Ogre', lightBright: 2, lightDim: 8 },
  ],
});
```

This registers the `token` document type (scene key `tokens`), the Tokens layer
(order 500), the Token tool (hotkey `T`), token context menus, and taps the
`vision:sources` / `light:sources` capability hooks so
[@diegesis/canvas-plugin-fog](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-fog) and
[@diegesis/canvas-plugin-lighting](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lighting) see token vision
and emitted light without any direct coupling.

## API

### `tokensPlugin` / `TokensPlugin`

`tokensPlugin` is a ready-to-use singleton. Retrieve the installed instance to
use its programmatic API:

```ts
const tokens = canvas.plugins.get<TokensPlugin>('tokens');
```

| Member | Signature | Description |
| --- | --- | --- |
| `layer` | `TokensLayer` | The typed `PlaceablesLayer<TokenData, Token, TokenDataInput>`. |
| `get` | `(tokenId: string) => Token \| undefined` | Fetch a token placeable by id. |
| `moveToken` | `(tokenId, x, y, options?: TokenMoveOptions & { commit?: boolean }) => Token \| undefined` | Animated programmatic move; commits to the document + history on completion unless `commit: false`. |
| `configureEase` | `(options: EasedDragOptions) => void` | Tune drag easing (e.g. `{ duration: 150 }` ms) applied to the next pointer move. |
| `easeDuration` | `number` | Current eased-drag duration in ms (default 150). |

### Token document

Schema: `TokenDataSchema` (valibot). Types: `TokenData` (output), `TokenDataInput` (input). Helper: `parseToken(data: unknown): TokenData`.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` (uuid) | generated | UUID v7 when omitted. |
| `x`, `y` | `number` | required | Center position in canvas pixels. |
| `size` | `number >= 0.1` | `1` | Diameter in grid cells. |
| `rotation` | `number` | `0` | Radians. |
| `texture` | `string?` | — | Image URL/data URL; falls back to a colored circle. |
| `label` | `string?` | — | Text rendered under the token. |
| `tint` | `number \| string?` | — | Tint applied to the sprite. |
| `elevation` | `number` | `0` | Reserved for elevation-aware systems. |
| `hidden` | `boolean` | `false` | Hidden tokens are not rendered. |
| `visionRadius` | `number >= 0` | `0` | Vision radius in grid cells; contributes to `vision:sources` (fog of war). |
| `lightBright` | `number >= 0` | `0` | Bright light radius in cells; contributes to `light:sources`. |
| `lightDim` | `number >= 0` | `0` | Dim light radius in cells; contributes to `light:sources`. |
| `bar1`, `bar2` | `{ value: number; max: number }?` | — | Resource bars (e.g. HP). |

Plus the shared lockable entries from `@diegesis/canvas` (`LockableSchemaEntries`).

CRUD goes through the core registry: `canvas.documents.create('token', data)`,
`.update('token', id, changes)`, `.delete('token', id)`.

### `Token` placeable

`class Token extends PlaceableObject<TokenData>` — `objectType: 'token'`.

- `get size(): number` — rendered diameter in pixels (`document.size * grid.size`).
- `moveTo(x, y, options?: TokenMoveOptions): void` — animated move (duration proportional to distance, `Easing.inOutQuad` by default); `animated: false` teleports.
- `moveToImmediate(x, y): void` — cancel any animation and snap to position.
- `cancelMove(): void` — cancel an in-flight animation (called automatically on drag start).

```ts
interface TokenMoveOptions {
  animated?: boolean;
  duration?: number;
  ease?: (t: number) => number;
  onComplete?: () => void;
}
```

Every completed move emits `token:moved` (`{ id, x, y }`) on the canvas bus.

### Token tool

`TokenTool` — id `token`, hotkey `T`. Click to place a token (snaps to grid).
Tool options via `canvas.tools.options.token`:

```ts
interface TokenToolOptions {
  size: number;            // grid cells, default 1
  texture?: string;
  label?: string;
  tint?: number | string;
}
```

### Drag behavior and editing

Tokens are registered with `snapToGrid: true`, `collides: true` (movement is
tested against `movement:segments` blockers — see
[@diegesis/canvas-plugin-walls](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-walls)), `rulerOnDrag: true`
and eased dragging. Selection resize handles map back to `size`; the context
menu exposes rotation, rename, size presets, hidden toggle, vision/light
sliders, center-on and ping.

### Events

| Event | Payload |
| --- | --- |
| `token:moved` | `{ id: string; x: number; y: number }` |
| `token:selected` | `{ ids: string[] }` |

Plus the core `document:create | update | delete | moved` events with `type: 'token'`.

## Related packages

- [@diegesis/canvas](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas) — core canvas and plugin contract.
- [@diegesis/canvas-plugin-fog](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-fog) — consumes token `visionRadius` via `vision:sources`.
- [@diegesis/canvas-plugin-lighting](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-lighting) — consumes token light via `light:sources`.
- [@diegesis/canvas-plugin-walls](https://github.com/diegesisvtt/diegesis-sdk/tree/main/packages/canvas-plugin-walls) — blocks token movement and sight.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
