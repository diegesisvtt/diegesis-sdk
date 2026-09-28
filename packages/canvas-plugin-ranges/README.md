# @diegesis/canvas-plugin-ranges

> Range rings plugin for @diegesis/canvas — extensible presets, color-blind themes and sticky range overlays for distance checks at a glance.

Registers the Ranges tool (hotkey `R`): click or drag from any point (or from a token) to pin concentric range rings on a non-interactive overlay. Placed ranges stay on the canvas while you keep working, can follow their token as it moves, and are cleared with `Esc`. Ring distances come from extensible presets (D&D 5e, metric, or your own) and colors from themes, including color-blind-safe palettes.

## Installation

```bash
npm install @diegesis/canvas-plugin-ranges
```

## Quick start

```ts
import { Canvas, dynamicBus } from '@diegesis/canvas';
import { rangesPlugin, type RangesPlugin } from '@diegesis/canvas-plugin-ranges';

const canvas = new Canvas(container);
await canvas.use(rangesPlugin);
await canvas.initialize();

// Press R, then click/drag on the canvas — or place ranges programmatically:
const ranges = canvas.plugins.get<RangesPlugin>('ranges')!;
ranges.place({ x: 400, y: 300 });                       // current preset, free origin
ranges.place({ x: 400, y: 300, preset: 'dnd5e', tokenId: someTokenId }); // follows the token when `follow` is on

dynamicBus(canvas.bus).on('ranges:placed', (e) => console.log(e.preset, e.rings));
dynamicBus(canvas.bus).on('ranges:cleared', (e) => console.log('cleared', e.count));

// Extend with your own preset and theme:
ranges.addPreset({ id: 'pf2e', label: 'PF2e', unit: { perCell: 5, suffix: ' ft' }, rings: [5, 10, 15, 30] });
ranges.addTheme({ id: 'mono', colors: ['#0ea5e9', '#f59e0b'] });
ranges.setOptions({ preset: 'pf2e', theme: 'mono', shape: 'square' });
```

Tool gestures: press `R`, then **click or drag** from a point or a token (dragging shows a live distance guide with the containing ring highlighted); `Esc` clears placed ranges and returns to Select. Right-clicking the canvas opens a menu to switch preset, theme, shape and options.

## API

### `rangesPlugin: CanvasPlugin` / `class RangesPlugin`

`rangesPlugin` is a singleton wrapping a `RangesPlugin` instance (`id: 'ranges'`). On install it registers the `ranges` overlay layer (order 460), the `RangeTool` (hotkey `r`), a context menu, and the `ranges:placed` / `ranges:cleared` events. The plugin starts with the builtin presets and themes registered in its `presets` / `themes` maps.

| Method | Description |
| --- | --- |
| `place(input: PlaceRangeInput): ActiveRange \| null` | Pin a range at `{ x, y }`; optional `preset` override and `tokenId` binding. Enforces `maxRanges` (oldest dropped). |
| `clear(): void` | Remove all placed ranges; emits `ranges:cleared`. |
| `active(): readonly ActiveRange[]` | Currently placed ranges. |
| `options(): RangeToolOptions` / `setOptions(partial)` | Read / merge tool options. |
| `addPreset(preset): this` / `removePreset(id): boolean` | Register or remove a preset (validated, frozen). Removing the active preset falls back to the first remaining one. |
| `addTheme(theme): this` / `removeTheme(id): boolean` | Register or remove a color theme. |

```ts
interface PlaceRangeInput { x: number; y: number; preset?: string; tokenId?: string }
interface ActiveRange { readonly id: string; readonly x: number; readonly y: number; readonly presetId: string; readonly tokenId?: string }
```

### Options

```ts
interface RangeToolOptions {
  preset: string;        // default 'dnd5e'
  theme: string;         // default 'spectrum'
  shape: 'circle' | 'square'; // default 'circle'
  labels: boolean;       // ring distance labels, default true
  maxRanges: number;     // simultaneous placed ranges, default 1
  follow: boolean;       // ranges bound to a token move with it, default false
  clearOnSwitch: boolean;// clear when leaving the tool, default true
  fillAlpha: number;     // ring fill opacity, default 0.09
}
```

Defaults are exported as `RANGE_TOOL_DEFAULTS`.

### Presets and rings

```ts
interface RangePreset {
  id: string;
  label?: string;
  unit: { perCell: number; suffix: string }; // defaults { perCell: 1, suffix: ' u' }
  rings: readonly RangeRingSpec[];           // at least one
}

// A ring is either a plain distance (in preset units) or a full spec:
type RangeRingSpec = number | { distance: number; label?: string; color?: string; emphasis?: boolean };
```

| Export | Id | Unit | Rings |
| --- | --- | --- | --- |
| `BASIC_PRESET` | `'basic'` | 1 u/cell | 1, 2, 3, 5 |
| `DND5E_PRESET` | `'dnd5e'` | 5 ft/cell | 5, 30, 60, 90, 120 |
| `METRIC_PRESET` | `'metric'` | 1.5 m/cell | 1.5, 9, 18, 36 |

`BUILTIN_PRESETS` groups the three. Distances are divided by `unit.perCell` to get cell radii against `canvas.grid.size`.

### Themes

Each theme is `{ id, label?, colors: string[] }`; ring colors cycle through `theme.colors` (a ring spec's own `color` wins). Builtins: `SPECTRUM_THEME` (`'spectrum'`), `DEUTERANOPIA_THEME`, `PROTANOPIA_THEME`, `TRITANOPIA_THEME` — grouped in `BUILTIN_THEMES`.

### Schemas and events

| Export | Description |
| --- | --- |
| `RangePresetSchema` / `RangeThemeSchema` / `RangeRingSchema` / `RangeShapeSchema` | Valibot schemas. |
| `defineRangePreset(def)` / `defineRangeTheme(def)` | Validate and freeze a preset/theme. |
| `parseRangePreset(data)` / `parseRangeTheme(data)` | Parse unknown input (throws on invalid). |
| `RangePlacedEventSchema` | `{ id, x, y, preset, shape, rings, tokenId? }` — emitted as `ranges:placed`. |
| `RangeClearedEventSchema` | `{ count }` — emitted as `ranges:cleared`. |

### Controller and layer

| Export | Description |
| --- | --- |
| `rangesControllerFor(canvas)` | The `RangesController` bound to a canvas (also drives drag preview: `beginDrag` / `updateDrag` / `endDrag` / `cancelDrag`, and `compose()`). |
| `RangeTool` | The tool class (`static id = 'ranges'`). |
| `RangeOverlayLayer` | Non-interactive `CanvasLayer` rendering `DrawnRange`s, optional `RangeGuide` and labels; redraws on zoom. |

### Resolve helpers

| Export | Description |
| --- | --- |
| `resolveRings(preset, theme): ResolvedRing[]` | De-duplicated rings sorted by cells: `{ cells, label, color, emphasis }`. |
| `ringCells(preset, ring): number` / `ringDistance(ring): number` | Ring conversions. |
| `containingRing(rings, cells)` | Smallest ring covering a cell distance (used to highlight the drag guide). |
| `formatDistance(preset, cells): string` / `trimNumber(value): string` | Label formatting. |

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — canvas core (tool manager, grid service, bus).
- [@diegesis/canvas-plugin-measure](https://www.npmjs.com/package/@diegesis/canvas-plugin-measure) — ruler tool for precise measurements.
- [@diegesis/canvas-plugin-rings](https://www.npmjs.com/package/@diegesis/canvas-plugin-rings) — token condition rings and markers.
- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — bundles this plugin.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
