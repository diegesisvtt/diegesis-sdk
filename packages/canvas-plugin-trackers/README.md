# @diegesis/canvas-plugin-trackers

> Extensible token trackers plugin for @diegesis/canvas — inline math, bars, badges, scene defaults, presets and resolution hooks.

Token trackers for [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas), inspired by [Owl Trackers](https://extensions.owlbear.rodeo/owl-trackers) (quick edit with inline math, scene defaults) and [Bar Brawl](https://gitlab.com/woodentavern/foundryvtt-bar-brawl) (value/max bars, interpolated colors, per-audience visibility, positioning). Renders bars and chips over tokens, contributes context menus (quick edit per token, per-tracker editor, scene defaults, presets) and publishes the `trackers:*` contract on the canvas bus.

Requires the tokens plugin (`dependencies: ['tokens']`).

## Installation

```bash
npm install @diegesis/canvas-plugin-trackers
```

## Quick start

```ts
import { Canvas } from '@diegesis/canvas';
import { tokensPlugin } from '@diegesis/canvas-plugin-tokens';
import { trackersPlugin } from '@diegesis/canvas-plugin-trackers';

const canvas = new Canvas(container, {
  plugins: [tokensPlugin, trackersPlugin],
});
```

For a configured instance, construct the class directly:

```ts
import { TrackersPlugin } from '@diegesis/canvas-plugin-trackers';

const trackers = new TrackersPlugin({ autoApplyDefaults: true });
const canvas = new Canvas(container, { plugins: [tokensPlugin, trackers] });
```

## API

### Main API

```ts
const trackers = canvas.plugins.get<TrackersPlugin>('trackers')!;

trackers.upsert(tokenId, { name: 'HP', kind: 'bar', value: 12, max: 12, label: 'fraction' });
trackers.applyMathInput(tokenId, trackerId, '-7');   // '+7' adds, '-7' subtracts, '=-7' sets, '7' sets
trackers.setValue(tokenId, trackerId, 20);
trackers.setDefaults([{ name: 'AC', kind: 'counter', value: 15 }]);
trackers.applyDefaultsTo([tokenIdA, tokenIdB]);
trackers.registerPreset(defineTrackerPreset({ id: 'my-system', name: 'My System', trackers: [...] }));
trackers.serialize(); trackers.hydrate(snapshot);
trackers.prune(liveTokenIds);
```

`TrackersPluginOptions`:

```ts
interface TrackersPluginOptions {
  viewer?: ViewerContext | (() => ViewerContext);  // who is viewing (role/ownership)
  autoApplyDefaults?: boolean;                     // apply scene defaults to new tokens; default false
  defaults?: readonly TrackerInput[];              // initial scene defaults
}
```

### Tracker

| Field | Default | Description |
| --- | --- | --- |
| `name` | — | required; used to merge defaults |
| `kind` | `'counter'` | `counter` (chip) or `bar` (value/max) |
| `value`/`max`/`min` | `0`/–/`0` | tracker range; `max` is required in practice for `bar` |
| `math` | `true` | accepts `+n`/`-n` when editing; `false` only allows direct set |
| `clamp` | `true` | clamps `value` to `[min, max]`; `false` allows extreme values |
| `color` | per kind | single `'#hex'` or `{ min, max }` interpolated in HSV |
| `side`/`inset` | `bottom`/`inner` | `top/bottom/left/right` × `inner/outer` |
| `opacity` | `0.85` | 0–1 |
| `invert` | `false` | inverted bar ("negative" resources, e.g. wounds) |
| `segments` | `0` | approximate as N pips (label follows, e.g. `3/3`) |
| `label` | `'value'` | `none/value/max/fraction/percent` (plus `prefix`, `units`) |
| `hideEmpty`/`hideFull` | `false` | hide when empty/full |
| `audience` | gm/owner `always`, others `hover` | per-role visibility: `always/hover/selected/never` |
| `source` | `'inline'` | id of a registered resolver (e.g. sheet, formula) |

### Extensibility

**Bus hooks** (waterfall — returning `undefined` preserves the value):

```ts
import { tapTrackersHooks, onTrackersEvents } from '@diegesis/canvas-plugin-trackers';

tapTrackersHooks(canvas.bus, 'my-plugin', {
  resolve: (p) => (p.tracker.name === 'HP' ? { ...p, value: 20 } : undefined),
  label: (p) => ({ ...p, label: `HP ${p.label}` }),
  visibility: (p) => (p.tracker.name === 'AC' ? { ...p, visible: false } : undefined),
});

onTrackersEvents(canvas.bus, {
  value: ({ tokenId, name, before, after }) => console.log(tokenId, name, before, '→', after),
});
```

**Value resolvers** (external sources; failures fall back to the inline value):

```ts
trackers.registerResolver('sheet', ({ tracker }) => sheet.get(tracker.name));
trackers.upsert(tokenId, { name: 'HP', source: 'sheet', kind: 'bar', max: 20 });
```

Example with `@diegesis/sheet` — the tracker resolves straight from the computed character sheet (returning `null` preserves the inline value):

```ts
import { getPath } from '@diegesis/sheet';

const engines = new Map<string, SheetEngine>(); // tokenId → sheet engine

trackers.registerResolver('sheet', ({ tokenId, tracker }) => {
  const sheet = engines.get(tokenId)?.compute();
  if (!sheet) return null;
  const hp = getPath(sheet.values, `attributes.${tracker.name.toLowerCase()}`);
  return typeof hp === 'number' ? hp : null;
});
```

**Viewer** (role/ownership for audience visibility):

```ts
new TrackersPlugin({ viewer: () => ({ role: 'gm', owns: (id) => ownedIds.has(id) }) });
```

### Persistence

State lives in the plugin (not in the token document), survives uninstall and is serializable:

```ts
localStorage.setItem('trackers', JSON.stringify(trackers.serialize()));
trackers.hydrate(saved ? JSON.parse(saved) : { version: 1, defaults: [], tokens: {} });
```

State of deleted tokens is retained (undoing a delete recreates the document without loss). On scene save, evict dead ids:

```ts
trackers.prune(canvas.documents.layer('token')!.placeables.map((t) => t.id));
```

### Exports

Plugin: `TrackersPlugin`, `trackersPlugin`, `TrackersPluginOptions`.

Schemas and helpers: `TrackerSchema`, `TrackerKindSchema`, `TrackerColorSchema`, `TrackerAudienceSchema`, `TrackerLabelStyleSchema`, `TrackerSideSchema`, `TrackerInsetSchema`, `VisibilityModeSchema`, `TrackersSnapshotSchema`, event/hook schemas (`TrackersChangedEventSchema`, `TrackersValueEventSchema`, `TrackersAppliedEventSchema`, `TrackersResolveHookSchema`, `TrackersLabelHookSchema`, `TrackersVisibilityHookSchema`), `newTrackerId`, `normalizeTracker`, `parseTracker`.

Math: `parseMathInput`, `applyMath`, `formatMath`. Colors: `interpolateColor`, `normalizeTrackerColor`, `colorToNumber`, `parseHexColor`, `rgbToHex`, `rgbToHsv`, `hsvToRgb`, `isHexColor`.

Resolution: `resolveTracker`, `computeVisibility`, `computeRatio`, `computeLabel`, `formatTrackerNumber`, `audienceModeFor`, `EVERYTHING_VIEWER`.

State/render: `TrackerStore`, `TokenTrackersView`, `TrackerOverlay`.

Presets: `defineTrackerPreset`, `BUILTIN_PRESETS`, `GENERIC_HP`, `DND5E_COMBAT`, `PF2E_BASIC`.

Bus: `tapTrackersHooks`, `onTrackersEvents`, `trackerBusPort`.

## Related packages

- [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) — plugin-first canvas core (required).
- [`@diegesis/canvas-plugin-tokens`](https://www.npmjs.com/package/@diegesis/canvas-plugin-tokens) — token documents the trackers attach to (required).
- [`@diegesis/sheet`](https://www.npmjs.com/package/@diegesis/sheet) — character sheet engine; pair with a value resolver to drive trackers from computed attributes.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
