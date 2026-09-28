# @diegesis/canvas-plugin-measure

> Measuring plugin for @diegesis/canvas — ruler tool with waypoints and the measure event.

Registers the Measure tool (hotkey `M`): drag for a quick ruler, or click to place waypoints for multi-segment paths. Distances are converted from pixels to cells using `canvas.grid.size`, then rendered through configurable metric presets (e.g. D&D 5e feet, metric meters). Every finished measurement emits a validated `measure` event on the canvas bus.

## Installation

```bash
npm install @diegesis/canvas-plugin-measure
```

## Quick start

```ts
import { Canvas, dynamicBus } from '@diegesis/canvas';
import { measurePlugin, type MeasurePlugin } from '@diegesis/canvas-plugin-measure';

const canvas = new Canvas(container);
await canvas.use(measurePlugin);
await canvas.initialize();

// Listen to finished measurements (validated by MeasureEventSchema):
dynamicBus(canvas.bus).on('measure', (m) => {
  console.log(m.label);      // e.g. "30 ft"
  console.log(m.units);      // distance in grid cells
  console.log(m.segments);   // number of legs in the path
});

// Configure units — preset id or custom metrics:
const measure = canvas.plugins.get<MeasurePlugin>('measure')!;
measure.setMetrics('dnd5e'); // 'cells' | 'dnd5e' | 'metric' | 'dnd5e-metric'
measure.setMetrics([
  { perCell: 5, suffix: ' ft' },
  { perCell: 1.5, suffix: ' m' },
]);
```

Tool gestures: press `M`, then **drag** for a direct measurement, or **click** to drop waypoints (live label shows total plus the last leg); `Enter`/double-click finishes, `Esc` cancels.

## API

### `measurePlugin: CanvasPlugin` / `class MeasurePlugin`

`measurePlugin` is a singleton wrapping a `MeasurePlugin` instance (`id: 'measure'`). On install it registers the `MeasureTool` (hotkey `m`) and the `measure` event.

| Method | Description |
| --- | --- |
| `options(): MeasureToolOptions` | Current merged options. |
| `metrics(): readonly MeasureMetric[]` | Current metrics. |
| `setOptions(partial: Partial<MeasureToolOptions>)` | Merge and validate options. |
| `setMetrics(source: MeasureMetricsSource): this` | Set metrics from a preset id (`'dnd5e'`), or a list of metric inputs (validated). Throws on unknown preset id. |
| `setSeparator(separator: string): this` | Join string between formatted metrics (default `' · '`). |

```ts
type MeasureMetricsSource = string | readonly (MeasureMetricInput | MeasureMetric)[];
```

### Options and schemas

```ts
interface MeasureMetric {
  perCell: number;     // world value per grid cell (min 0.01)
  suffix: string;      // default ' u'
  precision: number;   // decimals 0–6, default 1
}

interface MeasureToolOptions {
  metrics: readonly MeasureMetric[]; // at least one
  separator: string;                 // default ' · '
}
```

| Export | Description |
| --- | --- |
| `MeasureMetricSchema` / `MeasureMetricsListSchema` / `MeasureToolOptionsSchema` / `MeasureMetricResultSchema` | Valibot schemas for the types above. |
| `MeasureEventSchema` | Valibot schema of the `measure` event payload. |
| `defineMeasureMetrics(list)` | Validates a metric list and returns a frozen array. |
| `MEASURE_TOOL_DEFAULTS` | Default options: one metric `{ perCell: 1 }`, separator `' · '`. |

### The `measure` event

```ts
interface MeasureEventData {
  pixels: number;    // path length in world units
  units: number;     // path length in grid cells (pixels / grid.size)
  x1: number; y1: number;
  x2: number; y2: number;
  segments?: number;               // legs in the path
  metrics?: MeasureMetricResult[]; // { perCell, suffix, precision, value }
  label?: string;                  // formatted, e.g. "30 ft · 9 m"
}
```

### Metric presets

| Export | Id | Metrics |
| --- | --- | --- |
| `CELLS_PRESET` | `'cells'` | `{ perCell: 1, suffix: ' u' }` |
| `DND5E_PRESET` | `'dnd5e'` | `{ perCell: 5, suffix: ' ft' }` |
| `METRIC_PRESET` | `'metric'` | `{ perCell: 1.5, suffix: ' m' }` |
| `DND5E_METRIC_PRESET` | `'dnd5e-metric'` | feet + meters |

All presets are indexed in `MEASURE_METRIC_PRESETS: Readonly<Record<string, MeasureMetricPreset>>` (`{ id, label, metrics }`).

### Helpers

| Export | Description |
| --- | --- |
| `pathLength(points): number` | Polyline length in world units. |
| `formatMetricValue(metric, cells): string` | Format one metric (trims trailing zeros). |
| `formatMetrics(options, cells): string` | All metrics joined by the separator. |
| `metricValues(options, cells): MeasureMetricResult[]` | Numeric values for each metric. |
| `buildMeasurePayload(options, points, gridSize): MeasureEventData` | Build the full event payload for a path. |
| `resolveMeasureOptions(raw): MeasureToolOptions` | Parse unknown input, falling back to defaults. |
| `MeasureTool` | The tool class (`static id = 'measure'`), a state machine of `idle / pointing / measuring / waypoints`. |

## Related packages

- [@diegesis/canvas](https://www.npmjs.com/package/@diegesis/canvas) — canvas core (tool manager, grid service, bus).
- [@diegesis/canvas-plugin-ranges](https://www.npmjs.com/package/@diegesis/canvas-plugin-ranges) — sticky range rings for distance checks at a glance.
- [@diegesis/canvas-plugin-rings](https://www.npmjs.com/package/@diegesis/canvas-plugin-rings) — token condition rings and markers.
- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — bundles this plugin.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
