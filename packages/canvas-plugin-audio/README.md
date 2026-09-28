# @diegesis/canvas-plugin-audio

> Spatial audio plugin for @diegesis/canvas — ambient sound placeables, camera/token listener and sound:sources contributions.

Spatial audio for [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas), built on [`@diegesis/audio`](https://www.npmjs.com/package/@diegesis/audio) (Howler/Web Audio). Adds a `sound` document type: ambient sound placeables with radius-based spatialization (linear distance model, equalpower panning), channels, loop and global (non-spatial) playback. A `ListenerController` positions the audio listener at the camera center or following a token, and the plugin keeps the engine in sync on a ticker (default every 50 ms).

Other plugins can contribute their own sound sources through the `sound:sources` waterfall hook — the audio plugin is the only one that talks to the engine.

## Installation

```bash
npm install @diegesis/canvas-plugin-audio
```

## Quick start

```ts
import { Canvas, defineCanvasElements } from '@diegesis/canvas';
import { createAudioPlugin } from '@diegesis/canvas-plugin-audio';

defineCanvasElements();
const audio = createAudioPlugin({ listener: { mode: 'camera' } });
const canvas = new Canvas(container, { plugins: [audio] });
await canvas.initialize();

await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  documents: {
    sound: [
      { x: 400, y: 300, src: 'sounds/tavern.mp3', radius: 6, channel: 'ambient' },
      { x: 0, y: 0, src: 'sounds/rain.mp3', global: true, volume: 0.6 },
    ],
  },
});

// Follow a token instead of the camera
audio.followToken(tokenId);

// Attach a sound to a moving token
audio.attachToToken(soundDocumentId, tokenId);
```

Sounds are regular documents (`sound` type, scene key `sounds`, layer order 560): selection, history/undo and `sound:create|update|delete` bus events work out of the box. A `sound` tool (hotkey `A`) places new ambient sounds, and a context menu drives playback.

## API

### `createAudioPlugin(options?)` / `AudioPlugin`

Plugin class (`id: 'audio'`). Use `createAudioPlugin` to configure it; `audioControllerFor(ctx)` retrieves the instance from a plugin context.

`AudioPluginOptions`:

```ts
interface AudioPluginOptions {
  engine?: AudioEngine;          // @diegesis/audio engine (default: new instance)
  listener?: {
    mode?: ListenerMode;         // 'camera' (default) | 'token'
    tokenId?: string | null;
    mapper?: CoordinateMapper;   // canvas coords → audio coords; default gridMapper
  };
  updateIntervalMs?: number;     // engine sync cadence; default 50 (0 = every frame)
}
```

Instance members:

- `engine: AudioEngine` — the underlying `@diegesis/audio` engine (channels, groups, ducking, ...).
- `listener: ListenerController` — listener positioning.
- `layer: SoundsLayer` — typed `PlaceablesLayer` for sound documents.
- `setListenerMode(mode)`, `followToken(tokenId | null)`.
- `attachToToken(soundKey, tokenId)` / `detachFromToken(soundKey)` — pin a source to a moving token.
- `previewSound(soundKey, changes)` — apply transient changes and resync (for editor previews).
- `syncNow()` — force an immediate sync frame.

### `SoundData`

Valibot-validated document shape (`SoundDataSchema`):

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `id` | `string` (UUID v7) | — | optional; assigned on create |
| `x`, `y` | `number` | — | position (ignored when `global`) |
| `src` | `string \| string[]` | — | audio URL(s) |
| `radius` | `number >= 0` | `4` | audible range in grid units |
| `volume` | `number` 0–1 | `1` | |
| `channel` | `string` | `'ambient'` | engine channel |
| `loop` | `boolean` | `true` | |
| `playing` | `boolean` | `true` | |
| `global` | `boolean` | `false` | non-spatial (music/score) |

### Tool options

```ts
interface SoundToolOptions {
  src: string | string[];  // default 'sounds/ambient.mp3'
  radius: number;          // default 4
  volume: number;          // default 1
  channel: string;         // default 'ambient'
  loop: boolean;           // default true
}
```

### Listener

```ts
class ListenerController {
  mode: ListenerMode;                 // 'camera' | 'token'
  tokenId: string | null;
  mapper: CoordinateMapper;           // default gridMapper
  setMode(mode): void;
  followToken(tokenId | null): void;
  position(ctx): { x: number; y: number } | null;
  apply(ctx, engine): void;           // pushes the mapped position to the engine
}

type CoordinateMapper = (input: { x: number; y: number; gridSize: number; scale: number })
  => { x: number; y: number; z: number };

const gridMapper: CoordinateMapper;   // x/z = canvas coords / grid size, y = 0
```

Camera mode tracks the viewport center (pan/zoom aware); token mode follows a token document. Supply a custom `mapper` for isometric or non-grid coordinate systems.

### `sound:sources` hook

Waterfall hook (`SoundSourcesPayload = { sources: SoundSource[] }`). Other plugins append sources; the audio plugin syncs them to the engine every frame:

```ts
import { soundsBus } from '@diegesis/canvas-plugin-audio';

soundsBus(canvas.bus).tapSoundSources('my-plugin', (payload) => {
  payload.sources.push({ key: 'my-source', x: 100, y: 100, radius: 5, src: 'sounds/drone.mp3' });
  return payload;
});
```

`SoundSource` mirrors `SoundData` plus a `key` (stable source identifier). Also exported: `soundsBus`, `SoundsBusPort`, `SoundSourceSchema`, `SoundSource`, `SoundSourceInput`.

### Classes

- `AmbientSound` — `PlaceableObject<SoundData>` rendering the radius indicator.
- `SoundTool` — placement tool (`static id = 'sound'`, hotkey `a`).

## Related packages

- [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) — plugin-first canvas core (required).
- [`@diegesis/audio`](https://www.npmjs.com/package/@diegesis/audio) — audio engine (Howler/Web Audio) this plugin wraps.
- [`@diegesis/canvas-plugin-tokens`](https://www.npmjs.com/package/@diegesis/canvas-plugin-tokens) — token documents for listener-follow and sound attachment.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
