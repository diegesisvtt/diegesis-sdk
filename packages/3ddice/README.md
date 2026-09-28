# @diegesis/dice

> Framework-agnostic 3D dice roller for Diegesis (three.js + cannon-es worker physics).

`@diegesis/dice` renders a dice tray with three.js, simulates rigid-body physics
with cannon-es inside a Web Worker (via `@diegesis/physics`), and animates the
throw so each die lands showing a result you chose. It does not generate random
numbers or parse dice notation — you pass the desired results in, the box makes
them happen on screen. Pair it with `@diegesis/dice-notation` (or your own
RNG) to decide the values.

The package is organized around a **contract + registries** architecture:

- a Valibot-validated **term contract** describes what to roll,
- **registries** hold themes, textures, materials, and external dice models,
- an **`@diegesis/events` bus** (namespace `dice`) carries all lifecycle events.

## Installation

```bash
npm install @diegesis/dice three cannon-es
```

`three` (^0.182) and `cannon-es` (^0.20) are peer dependencies.

> Note: the npm package is `@diegesis/dice` but it lives in `packages/3ddice`
> in the monorepo.

## Quick start

```ts
import { DiceBox } from '@diegesis/dice';

const box = new DiceBox(document.querySelector<HTMLDivElement>('#tray')!, {
  assetPath: '/assets/dice/', // base path for textures, environments, sounds
  theme: 'default',
  sounds: true,
});

box.on('roll:finish', (outcome) => {
  const total = outcome.dice.reduce((sum, die) => sum + die.value, 0);
  console.log(`Rolled ${total}`);
});
box.on('die:click', ({ id, value }) => console.log('clicked', id, value));
box.on('error', (err) => console.error(err));

// The constructor starts initialization; wait for it before rolling.
await box.ready;

// You decide the results; the box throws dice that land on those values.
const outcome = await box.roll([
  { faces: 20, results: [17] },                         // one d20 showing 17
  { faces: 6, results: [3, 5] },                        // two d6
  { faces: { kind: 'percentile' }, results: [40] },     // tens die showing 40
]);

// Throw more dice into the same tray, reroll, or remove individual dice.
await box.add([{ faces: 8, results: [6] }]);
await box.reroll([{ id: outcome.dice[0].id, value: 19 }]);
await box.remove([outcome.dice[1].id]);

box.destroy();
```

## API

### `DiceBox` and `createDiceBox`

```ts
class DiceBox {
  constructor(element: HTMLDivElement, options?: DiceBoxOptions);

  readonly bus: DiceBus;               // @diegesis/events bus (namespace 'dice')
  readonly ready: Promise<void>;       // resolves when initialization completes
  readonly themes: ThemeRegistryFacade;
  readonly textures: TextureRegistryFacade;
  readonly materials: MaterialRegistryFacade;
  readonly models: ModelRegistryFacade;

  get initialized(): boolean;
  get disposed(): boolean;
  get rolling(): boolean;
  get selectedIds(): Set<string>;

  roll(terms: DiceTerm[]): Promise<RollOutcome>;
  add(terms: DiceTerm[]): Promise<RollOutcome>;
  reroll(dice: RerollRequest[]): Promise<RolledDie[]>;
  remove(ids: string[]): Promise<RolledDie[]>;
  clear(): void;
  cancel(): void;

  select(dieIds: string[]): void;
  clearSelection(): void;

  loadTheme(): Promise<void>;
  loadSounds(): Promise<void>;
  configure(options?: DiceBoxOptions): Promise<void>;
  destroy(): void;

  on<K extends keyof DiceBoxEvents>(event: K, handler: (payload: DiceBoxEvents[K]) => void): () => void;
  once<K extends keyof DiceBoxEvents>(event: K, handler: (payload: DiceBoxEvents[K]) => void): () => void;
  off<K extends keyof DiceBoxEvents>(event: K, handler: (payload: DiceBoxEvents[K]) => void): void;
}

function createDiceBox(element: HTMLDivElement, options?: DiceBoxOptions): DiceBox;
```

- `roll` clears the tray and throws the given terms; `add` throws into the
  existing tray. Exploding dice are expressed as result chains (see
  [DiceTerm](#diceterm--faces)) and cascade in waves separated by `cascadeDelay`.
- `roll()` promises reject with `RollCancelledError` when `clear()` or
  `cancel()` interrupts them.
- `configure()` applies incremental changes (theme, texture, material,
  environment, shadows, postprocessing, sounds) at runtime. Changing
  `antialias` requires a new `DiceBox` instance and logs a warning.
- All die, term, and roll ids are **UUID v7** (time-ordered), generated via
  `newId()` from `@diegesis/events`.

> Browser/worker note: `DiceBox` requires a DOM container and WebGL. Physics
> runs in a Web Worker by default (`worker: true`) through
> `@diegesis/physics`, with an automatic main-thread fallback. Provide your own
> worker with `workerFactory` or `workerUrl` when bundling.

### `DiceBoxEvents`

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | `void` | Initialization completed. |
| `roll:start` | `{ id: string }` | A roll began (id is UUID v7). |
| `roll:finish` | `RollOutcome` | A roll completed. |
| `roll:cancel` | `{ id?: string }` | A roll was cancelled. |
| `die:click` | `{ id: string; value: number }` | A die was clicked. |
| `theme:change` | `{ theme: string }` | The active theme changed. |
| `error` | `Error` | An error occurred. |

The same events are available on `box.bus` (`diceContract`), an
`@diegesis/events` bus created by `createDiceBus()` with validation mode
`'warn'`. Exported Valibot schemas: `RolledDieSchema`, `RolledTermSchema`,
`RollOutcomeSchema`.

### `DiceTerm` / faces

Roll input is a validated array of terms:

```ts
type FacesInput = number | FacesSpec;
// FacesSpec (from @diegesis/dice-core):
//   { kind: 'number'; value: number } | { kind: 'percentile' }
//   | { kind: 'fate' } | { kind: 'coin' } | { kind: 'expr'; value: RollExpr }

interface DiceTerm {
  faces: FacesInput;                        // 20 is shorthand for { kind: 'number', value: 20 }
  results: readonly (number | readonly number[])[]; // one entry per die; an array is an exploding chain
  colorset?: string;                        // per-term colorset override
}
```

Validation rules (enforced by `DiceTermsSchema` + range checks, throwing
`DiceError`):

- Supported 3D types: `d2`, `d4`, `d6`, `d8`, `d10`, `d12`, `d20`, `d100`.
- Numbered dice accept values in `1..faces`. Coins accept `1 | 2`.
- Percentile faces (`{ kind: 'percentile' }` or `100`) are **tens dice**:
  values must be multiples of 10 in `10..100`. Pair with a `d10` term for the
  units.
- `fate` and `expr` faces have no 3D representation and are rejected.

Exported helpers: `DiceTermSchema`, `DiceTermsSchema`, `FacesSpecSchema`,
`assertResultInRange(faces, value)`, `isTensDie(faces)`.

### Results

```ts
interface RolledDie { id: string; value: number; faces: FacesSpec; }
interface RolledTerm { id: string; dice: RolledDie[]; }
interface RollOutcome { id: string; terms: RolledTerm[]; dice: RolledDie[]; }
interface RerollRequest { id: string; value: number; }
```

`RollOutcome.dice` is the flattened list of every die in the outcome.

### `DiceBoxOptions`

All fields are optional; defaults come from `normalizeOptions()`.

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `assetPath` | `string` | `'./'` | Base path for textures, environments, sounds, models. |
| `worker` | `boolean` | `true` | Run physics in a Web Worker (falls back to main thread). |
| `workerFactory` | `() => Worker` | — | Custom worker constructor; takes precedence over `workerUrl`. |
| `workerUrl` | `string \| URL` | — | Custom physics worker script URL. |
| `antialias` | `'none' \| 'msaa' \| 'smaa'` | `'smaa'` | Antialiasing mode (fixed at construction). |
| `shadows` | `ShadowQuality \| boolean` | `'medium'` | Shadow quality; `true` → `'medium'`, `false` → `'none'`. |
| `environment` | `EnvironmentSpec` | `'none'` | IBL environment (from `@diegesis/render3d`). |
| `environmentIntensity` | `number` | `1` | Environment map intensity. |
| `postprocessing` | `PostFXOptions` | disabled | Bloom/outline/SMAA pipeline (from `@diegesis/render3d`). |
| `normalMaps` | `boolean` | `false` | Convert bump maps to normal maps. |
| `theme` | `string` | `'default'` | Theme id from the theme registry. |
| `surface` | `string` | — | Override the surface key (affects sound set). |
| `customColorset` | `object \| null` | `null` | Ad-hoc colorset (`foreground`, `background`, `outline`, `edge`, `font`, `fontOffsetY`, `emissive`). |
| `texture` | `string` | — | Texture override from the texture registry. |
| `material` | `string` | — | Material override from the material registry. |
| `sounds` | `boolean` | `false` | Enable collision/roll sounds (Howler via `@diegesis/audio`). |
| `volume` | `number` | `100` | Sound volume (0–100). |
| `strength` | `number` | `1` | Throw strength multiplier. |
| `gravityMultiplier` | `number` | `400` | Scene gravity multiplier. |
| `lightIntensity` | `number` | `0.7` | Spotlight intensity. |
| `baseScale` | `number` | `100` | Base dice scale. |
| `timestep` | `number` | `1/60` | Physics timestep in seconds. |
| `iterationLimit` | `number` | `1000` | Max physics iterations per simulation. |
| `cascadeDelay` | `number` | `900` | Delay (ms) between exploding-dice waves. |
| `maxPixelRatio` | `number` | `2` | Renderer pixel-ratio cap. |
| `queueMode` | `'serial' \| 'replace' \| 'parallel'` | `'serial'` | How concurrent `roll()` calls are scheduled. |
| `dracoPath` | `string` | — | Path to the Draco decoder for compressed models. |
| `colorSpotlight` | `number` | `0xefdfd5` | Spotlight color. |
| `sound_dieMaterial` | `string` | `'plastic'` | Material key used to pick impact sounds. |
| `assets` | `{ manager?: AssetManager; preload?: boolean; includeLazy?: boolean }` | — | Inject an `@diegesis/assets` manager and control preloading. |
| `deps` | `DiceBoxDeps` | — | Dependency-injection overrides for tests (bus, registries, rng, controllers, ...). |

Deprecated aliases still work and log a one-time warning: `framerate` →
`timestep`, `theme_colorset` → `theme`, `theme_customColorset` →
`customColorset`, `theme_surface` → `surface`, `theme_texture` → `texture`,
`theme_material` → `material`, `gravity_multiplier` → `gravityMultiplier`,
`light_intensity` → `lightIntensity`, `color_spotlight` → `colorSpotlight`.

Config helpers: `DiceBoxOptionsSchema` (Valibot), `validateOptions(options)`,
`normalizeOptions(rawOptions): NormalizedConfig`, `normalizeShadows(shadows): ShadowQuality`.

### Registries

Themes, textures, materials, and external dice models live in a
`DiceRegistries` instance. `DiceBox` exposes facades over it
(`box.themes`, `box.textures`, `box.materials`, `box.models`); pass a shared
instance via `options.deps.registries`.

```ts
const registries = createDiceRegistries(); // seeded with THEMES, TEXTURELIST, MATERIALTYPES

registries.registerTheme('obsidian', theme);        // themes.get('missing') falls back to 'default'
registries.registerTexture('nebula', textureEntry); // textures.get('missing') falls back to 'none'
registries.registerMaterial('crystal', materialOpts);
registries.registerDiceModel({
  type: 'd20',                // die type this model provides
  url: 'models/d20.glb',      // resolved against assetPath
  scale: 1,
  physicsShape: 'auto',       // 'auto' | 'sphere' | 'box' | custom descriptor
  draco: false,
});
```

Facade shapes:

```ts
interface ThemeRegistryFacade   { list(): Record<string, DiceTheme>; get(id): DiceTheme | undefined; has(id): boolean; register(id, theme): void; }
interface TextureRegistryFacade { list(): Record<string, TextureEntry>; get(id | id[]): TextureEntry | undefined; register(id, texture): void; }
interface MaterialRegistryFacade { list(): Record<string, MaterialOptions>; get(id): MaterialOptions | undefined; register(id, material): void; }
interface ModelRegistryFacade   { list(): Record<string, DiceModelRegistration>; get(type): DiceModelRegistration | undefined; register(reg): void; }
```

### Presets, colors, and assets

- `class DicePreset` — per-shape configuration (labels, mass, inertia, scale,
  geometry, bump maps). `new DicePreset(name)` throws for unknown shapes.
- `class DicePresetRegistry` / `createDefaultPresetRegistry()` — cache of
  presets per die type (`getOrCreate(type)`).
- `class DiceColors` — builds `ColorSet`s from themes, textures, and materials
  (`getColorSet(nameOrOptions)`, `makeColorSet(def)`; both async).
- `buildDiceManifest(config, surface, registries?): AssetManifest` — builds an
  `@diegesis/assets` manifest covering the theme textures, environment,
  sounds, and models a configuration needs. `DiceBox` registers and preloads
  this automatically when `options.assets.manager` is provided.

### Errors

```ts
class DiceError extends Error { code?: string; }
class RollCancelledError extends DiceError {}  // code 'ROLL_CANCELLED'
class AssetLoadError extends DiceError {}      // code 'ASSET_LOAD'
```

Other `code` values you may encounter: `'INVALID_OPTIONS'`, `'INVALID_TERMS'`,
`'UNSUPPORTED_DIE_TYPE'`, `'UNSUPPORTED_FACES'`, `'RESULT_OUT_OF_RANGE'`,
`'DISPOSED'`.

### Constants

- `THEMES: Record<string, DiceTheme>` — built-in themes (`'default'` only).
  Types: `DiceTheme`, `DiceStyle`. A theme's `cubeMap` (6 faces) overrides the
  global `environment` while that theme is active.
- `TEXTURELIST: Record<string, TextureEntry>` — 29 built-in textures
  (`none`, `astral`, `bronze01`–`bronze04`, `cheetah`, `cloudy`, `dragon`,
  `feather`, `fire`, `glitter`, `ice`, `leopard`, `lizard`, `marble`, `metal`,
  `paper`, `skulls`, `speckles`, `stainedglass`, `stars`, `stone`, `tiger`,
  `water`, `wood`, ...).
- `MATERIALTYPES: Record<string, MaterialOptions>` — 16 material presets
  (`none`, `metal`, `wood`, `glass`, `chrome`, `iridescent`, `stone`, `ice`,
  `marble`, `glitter`, `paper`, `silk`, `astral`, `gem`, ...). Type:
  `MaterialType = 'standard' | 'physical' | 'phong'`.

## Related packages

- [@diegesis/physics](https://www.npmjs.com/package/@diegesis/physics) — cannon-es physics host (worker + main-thread fallback)
- [@diegesis/render3d](https://www.npmjs.com/package/@diegesis/render3d) — post-processing and environment loading
- [@diegesis/assets](https://www.npmjs.com/package/@diegesis/assets) — asset packs and caching
- [@diegesis/audio](https://www.npmjs.com/package/@diegesis/audio) — Howler-based audio engine (dice sounds)
- [@diegesis/events](https://www.npmjs.com/package/@diegesis/events) — event/hook bus
- [@diegesis/dice-notation](https://www.npmjs.com/package/@diegesis/dice-notation) — notation parsing to produce roll terms

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
