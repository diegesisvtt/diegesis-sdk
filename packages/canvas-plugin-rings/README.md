# @diegesis/canvas-plugin-rings

> Colored ring markers for tokens on @diegesis/canvas — presets, custom styles, dash/glow/pulse, event-driven and hook-extensible.

Colored-Rings-style token markers: concentric rings rendered under tokens, driven by a preset registry and custom Valibot-validated styles (color, width, alpha, shape `circle|square`, dash, pulse, glow). Rings are real canvas documents of type `ring` (scene key `rings`), so undo/redo is free and they round-trip through scenes. Every mutation emits semantic events, and a `syncWaterfall` style-resolution hook lets other plugins restyle rings (for example, making the active combatant's ring pulse).

## Installation

```bash
npm install @diegesis/canvas-plugin-rings
```

## Quick start

The plugin depends on the tokens plugin and must be installed after it (installing without it throws):

```ts
import { Canvas } from '@diegesis/canvas';
import { tokensPlugin } from '@diegesis/canvas-plugin-tokens';
import { ringsPlugin, type RingsPlugin } from '@diegesis/canvas-plugin-rings';

const canvas = new Canvas(container);
await canvas.use(tokensPlugin);
await canvas.use(ringsPlugin);
await canvas.initialize();

const rings = canvas.plugins.get<RingsPlugin>('rings')!;
await rings.addRing(tokenId, 'bloodied');                          // by preset id
await rings.addRing(tokenId, { color: '#ffd433', dash: [4, 4] }, { label: 'Marked' }); // inline style
await rings.toggleRing(tokenId, 'blue');                           // add or remove
```

Rings also ingest from scenes:

```ts
await canvas.draw({
  width: 2000, height: 1500,
  grid: { type: 'square', size: 50 },
  tokens: [{ id: heroId, x: 250, y: 250, size: 1, label: 'Hero' }],
  rings: [{ tokenId: heroId, preset: 'blessed' }],
});
```

Right-click a selected token for the context menu: a swatch grid (one per preset, click toggles on all selected tokens), a custom color picker for anonymous rings, and **Clear rings**. Multi-select applies to every selected token, batched as one history unit.

## API

### `ringsPlugin: CanvasPlugin` / `class RingsPlugin`

`ringsPlugin` is a shared singleton; `new RingsPlugin(options)` creates an independent instance with its own preset registry and layout (the two share no state). Plugin `id` is `'rings'`; `dependencies` is `['tokens']`.

```ts
interface RingsPluginOptions {
  presets?: readonly RingPresetInput[]; // extra presets on top of COLOR_PRESETS
  layout?: Partial<RingLayoutOptions>;
}
```

| Property | Description |
| --- | --- |
| `layer` | Document layer hosting the rings (after install). |
| `presets` | `RingPresetRegistry` with `COLOR_PRESETS` and `CONDITION_PRESETS` registered. |
| `layout` | Merged `RingLayoutOptions`. |

#### Ring methods

| Method | Description |
| --- | --- |
| `addRing(tokenId, source, options?): Promise<Ring \| null>` | `source` is a preset id or an inline `RingStyleInput`. Returns the existing ring on a match (same preset, or same color for inline styles), `null` for unknown preset ids. `options` accepts `label` and `order`. |
| `toggleRing(tokenId, source, options?): Promise<boolean>` | Adds or removes; resolves `true` when added. |
| `removeRing(ringId): boolean` | Remove by ring id. |
| `clearRings(tokenId): number` | Remove all rings of a token as one batched history unit; emits `rings:cleared`. |
| `ringsOf(tokenId): Ring[]` | All rings of a token, in layer order. |
| `hasRing(tokenId, source): boolean` | Whether a matching ring exists. |
| `registerPreset(preset): this` | Register a preset at runtime; chainable. |
| `refreshStyles(): void` | Re-run the `rings:resolve-style` hook and redraw every ring. |
| `pruneOrphans(): number` | Delete rings whose token no longer exists, batched. |

Calling any method that touches the layer before installation throws `[rings] plugin not installed`.

### Data model

```ts
interface RingData {
  id?: string;       // uuid v7, assigned on create
  tokenId: string;   // owning token id
  preset?: string;   // preset id; absent for custom/anonymous rings
  label?: string;
  order?: number;    // layout sort key, ties break by id
  style?: RingStyle;
}

interface RingStyle {
  color: string;   // '#rgb' | '#rrggbb', default '#1a6aff'
  width: number;   // stroke width, min 0.5, default 3
  alpha: number;   // 0–1, default 1
  shape: 'circle' | 'square'; // default 'circle'; square ignores dash
  dash: number[];  // on/off lengths in world units, default []
  pulse: boolean;  // oscillating alpha, default false
  glow: boolean;   // pixi-filters GlowFilter, default false
}
```

Exports: `RingDataSchema`, `RingStyleSchema`, `HexColorSchema`, `parseRing(data)` (validates unknown input), `DEFAULT_RING_STYLE`, and the types `RingData`, `RingDataInput`, `RingStyle`, `RingStyleInput`.

### Presets

```ts
interface RingPreset { readonly id: string; readonly label: string; readonly style: RingStyle }
```

`RingPresetRegistry` methods: `register(preset)`, `unregister(id)`, `get(id)`, `has(id)`, `list()` (registration order drives the swatch grid).

- **`COLOR_PRESETS`** — twelve colors: `blue`, `orange`, `red`, `yellow`, `brown`, `purple`, `green`, `forest`, `pink`, `cyan`, `black`, `white`.
- **`CONDITION_PRESETS`** — eleven statuses: `poisoned`, `bloodied`, `burning`, `blessed`, `frozen`, `shocked`, `cursed`, `invisible`, `hasted`, `charmed`, `blinded` (each with label and style such as dash, pulse or glow).

Scene payloads only need the preset id — the plugin expands `preset` entries into style and label before creating documents; inline `style` fields still win.

### Layout

Multiple rings on one token are laid out as concentric strokes ordered by `order` (ties break by id).

```ts
interface RingLayoutOptions {
  spread: 'outward' | 'inward'; // default 'outward'
  gap: number;                  // units between rings, default 6
  startInset: number;           // first-ring offset from the token edge, default 2
}
```

Geometry helpers: `ringSlots(count, options?)`, `ringRadius(tokenRadius, inset)`, `sortRingsForLayout(rings)`, `dashedArcs(radius, dash, twoPi?)` (projects world-unit dash patterns onto the circumference, scaling to fit exactly once), plus `DEFAULT_RING_LAYOUT` and the types `RingSlot` (`{ index, inset }`) and `Arc` (`{ start, end }`).

### Events and hooks

Use the `ringsBus` port for typed access to the canvas bus:

```ts
import { ringsBus } from '@diegesis/canvas-plugin-rings';

const port = ringsBus(canvas.bus);
port.onRingAdded(({ ring, tokenId }) => { /* ... */ });
port.tapResolveStyle('initiative', (ctx) => {
  if (ctx.ring.tokenId !== activeCombatantId) return ctx;
  return { ...ctx, style: { ...ctx.style, pulse: true } };
});
rings.refreshStyles(); // re-resolve already-rendered rings
```

| `RingsBusPort` method | Underlying event/hook | Payload |
| --- | --- | --- |
| `onRingAdded(handler)` | `ring:added` | `{ ring: RingData, tokenId }` |
| `onRingRemoved(handler)` | `ring:removed` | `{ ringId, tokenId }` |
| `onRingsCleared(handler)` | `rings:cleared` | `{ tokenId, count }` |
| `tapResolveStyle(name, fn)` / `callResolveStyle(ctx)` | `rings:resolve-style` (`syncWaterfall`) | `RingStyleContext` |

`rings:resolve-style` receives `{ ring, style }` on every render path (add, update, relayout, `refreshStyles`); return the context unchanged when a tap does not apply. Document-layer events `ring:create` / `ring:update` / `ring:delete` are also emitted for persistence round-trips.

### `class Ring`

The ring placeable (`PlaceableObject<RingData>`, `objectType: 'ring'`). Non-interactive, driven by the plugin's frame sync. Notable members: `document`, `resolvedStyle`, `slot`, `bounds`, `alphaMultiplier`, `applyGeometry(geom)` (`RingTokenGeometry`: `{ x, y, radius, rotation, hidden }`), `setAlphaMultiplier(m)`, `refresh()`.

### Behavior notes

- Rings follow their token every frame: position, radius (`token size x grid / 2` + slot inset), rotation and visibility (hidden tokens hide their rings).
- `pulse` animates alpha with a sine wave, phase-shifted per slot so stacked rings do not blink in unison.
- Deleting a token cascade-deletes its rings in one batched history unit; `addRing` / `removeRing` record single units, so `canvas.undo()` / `canvas.redo()` work as with any document.
- Rings whose `tokenId` matches no token are hidden rather than dropped; call `pruneOrphans()` to delete them.

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — canvas core (document registry, layers, history, bus).
- [@diegesis/canvas-plugin-tokens](https://www.npmjs.com/package/@diegesis/canvas-plugin-tokens) — required; rings attach to tokens.
- [@diegesis/canvas-plugin-measure](https://www.npmjs.com/package/@diegesis/canvas-plugin-measure) — ruler tool.
- [@diegesis/canvas-plugin-ranges](https://www.npmjs.com/package/@diegesis/canvas-plugin-ranges) — range rings for distance checks.
- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — ships `ringsPlugin` right after `tokensPlugin`.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
