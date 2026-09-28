# @diegesis/canvas

> Framework-agnostic, PixiJS-powered game canvas for Diegesis — Foundry-inspired Canvas/Layer/PlaceableObject API.

The core is **plugin-first**: it provides only infrastructure (stage, viewport, input, tool state machine, layers, history, selection, event/hook bus). Every document type and every canvas capability is contributed by plugins — 20+ `@diegesis/canvas-plugin-*` packages build on the contract documented here.

**Architectural boundary:** PixiJS owns the scene tree; no Pixi object leaves the canvas. Everything that crosses the boundary travels through the `@diegesis/events` bus as plain JSON, validated by Valibot — consumable by any host (vanilla, React, worker, headless).

## Installation

```bash
npm install @diegesis/canvas
```

Peer dependencies: `pixi.js` ^8, `pixi-viewport` ^6, `pixi-filters` ^6.

## Quick start

The core alone renders an empty canvas — install plugins (or the standard preset) for document types:

```bash
npm install @diegesis/canvas @diegesis/canvas-preset-standard pixi.js pixi-viewport pixi-filters
```

```ts
import { defineCanvasElements } from '@diegesis/canvas';
import { createStandardCanvas } from '@diegesis/canvas-preset-standard';

defineCanvasElements(); // registers the <diegesis-layer-panel> / context-menu elements

const canvas = createStandardCanvas(document.getElementById('app')!);
await canvas.initialize();
await canvas.draw({
  width: 1600,
  height: 1000,
  grid: { type: 'square', size: 50 },
  documents: {
    token: [{ x: 200, y: 200, label: 'Hero', visionRadius: 6 }],
    wall: [{ segments: [{ x1: 0, y1: 300, x2: 600, y2: 300, door: true }] }],
    light: [{ x: 400, y: 150, dim: 9, bright: 3, color: '#ffb35c' }],
  },
});
```

Scenes accept legacy plugin keys (`tokens: [...]`, `walls: [...]`) or the `documents: { [type]: [...] }` map — each plugin declares its `sceneKey` and document schema.

### Selective composition

For a lean canvas, install only what you need:

```ts
import { Canvas } from '@diegesis/canvas';
import { tokensPlugin } from '@diegesis/canvas-plugin-tokens';
import { wallsPlugin } from '@diegesis/canvas-plugin-walls';

const canvas = new Canvas(container);
await canvas.use(wallsPlugin);
await canvas.use(tokensPlugin);
await canvas.initialize();
```

## API

### `Canvas`

```ts
class Canvas {
  constructor(container: HTMLElement, options?: CanvasOptions);
  use(plugin: CanvasPlugin): Promise<this>;
  initialize(): Promise<void>;      // builds tools, layers, history; installs queued plugins
  draw(scene: SceneDataInput): Promise<void>;
  destroy(): void;

  select(obj: PlaceableObject, additive: boolean): void;
  clearSelection(emit?: boolean): void;
  get selected(): PlaceableObject[];
  pick(point: Point, options?): PlaceableObject | undefined;
  pickRect(rect: Rectangle, options?): PlaceableObject[];

  movementSegments(from: Point, to: Point): { a: Point; b: Point }[];
  isMoveBlocked(from: Point, to: Point): boolean; // collision via the movement:segments hook

  pan(x: number, y: number, scale?: number): void;
  animatePan(options: { x?; y?; scale?; duration? }): Promise<void>;
  zoom(scale: number): void;
  centerOn(x: number, y: number): void;
  fit(): void;
  toScreen(x: number, y: number): Point;
  toWorld(x: number, y: number): Point;
  snapToGrid(x: number, y: number): Point;

  undo(): void;
  redo(): void;
  ping(x: number, y: number): void;
}
```

`CanvasOptions`: `{ background?, minScale?, maxScale?, resolution?, antialias?, tools?: ToolOptions, plugins?: CanvasPlugin[], contextMenu?: boolean, hotkeys?: HotkeyManager }`.

Subsystems exposed as properties:

| Property | Type | Purpose |
| --- | --- | --- |
| `bus` | `CanvasBus` | Events + hooks, via `@diegesis/events` |
| `documents` | `DocumentRegistry` | `create(type, data)` · `update` · `delete` · `get(type, id)` · `layer(type)` · `types()` · `createFromScene(scene)` |
| `layers` | `LayerManager` | Visibility, opacity, lock, z-order |
| `tools` | `ToolManager` | Tool state machine; per-tool options (available after `initialize()`) |
| `history` | `HistoryManager` | Batched undo/redo, wired to the registry |
| `hotkeys` | `HotkeyManager` | Rebindable bindings (`@diegesis/hotkeys`) |
| `grid` | `GridService` | `square` / `hex-vertical` / `hex-horizontal` / `isometric` / `none`, snapping |
| `viewport` | `CanvasViewport` | Pan/zoom/fit/centerOn/toLocal/toScreen |
| `plugins` | `PluginManager` | `use` / `unuse` / `has` / `list` |
| `contextMenu` | `ContextMenuManager` | Right-click / long-press menu contributions |

### The plugin contract

Every capability — document types, tools, overlays, windows, context-menu items — is a plugin. All contributions registered through the `PluginContext` are undone automatically on uninstall or canvas destroy.

```ts
interface CanvasPlugin {
  readonly id: string;
  readonly name?: string;
  readonly dependencies?: readonly string[]; // plugin ids that must install first
  install(ctx: PluginContext): void | Promise<void>;
  uninstall?(ctx: PluginContext): void | Promise<void>;
}

interface PluginContext {
  readonly canvas: Canvas;
  readonly bus: CanvasBus;
  registerDocumentType<D, I = D>(def: DocumentTypeDefinition<D, I>): PlaceablesLayer<D, PlaceableObject<D>, I>;
  registerLayer(contribution: LayerContribution): void;        // non-document layers (fog, lighting, overlays)
  registerTool(contribution: ToolContribution): void;          // { tool, hotkey?, defaults? }
  registerContextMenu(contribution: ContextMenuContribution): void;
  registerWindow(contribution: WindowContribution): void;      // requires @diegesis/canvas-plugin-window
  onDispose(fn: () => void): void;                             // cleanup on uninstall / destroy
}
```

`definePlugin(plugin)` is an identity helper for authoring with type inference.

#### Registering a document type

A document type is a Valibot schema + a `PlaceableObject` subclass + optional transform/behavior. You get for free: a `PlaceablesLayer` with an RBush spatial index (`pick`/`pickRect`), validated `<type>:create|update|delete` events on the bus, undo history, selection/handles, marquee, eraser, and scene loading via `sceneKey` or `documents.<type>`.

```ts
import * as v from 'valibot';
import { definePlugin, PlaceableObject } from '@diegesis/canvas';

const NoteSchema = v.object({
  id: v.optional(v.pipe(v.string(), v.uuid())),
  x: v.number(),
  y: v.number(),
  text: v.string(),
});

class Note extends PlaceableObject<{ x: number; y: number; text: string }> {
  readonly objectType = 'note';
  get bounds() {
    return { x: -8, y: -8, width: 16, height: 16 };
  }
  refresh(): void {
    /* draw the pin */
  }
}

export const notesPlugin = definePlugin({
  id: 'notes',
  install(ctx) {
    ctx.registerDocumentType({
      type: 'note',
      schema: NoteSchema,
      placeable: Note,
      layer: { label: 'Notes', order: 600 },
      sceneKey: 'notes',
    });
  },
});
```

`DocumentTypeDefinition` fields: `type`, `schema?`, `placeable`, `layer: { id?, label, order?, visible? }`, `sceneKey?`, `events?` (set `false` to emit only generic `document:*`), `transform?: TransformAdapter` (resize/rotate handles), `behavior?: DocumentBehavior` (`movable`, `snapToGrid`, `collides`, `rulerOnDrag`, `easedDrag`), `imageField?` (discovers editable art generically, e.g. for image-editor plugins).

### Capability hooks (plugins talk through the bus, never to each other)

| Hook | Strategy | Contract |
| --- | --- | --- |
| `beforeDraw` | syncWaterfall | `{ scene }` — transform/validate the scene before `draw()` |
| `scene:setup` / `scene:teardown` / `scene:refresh` | sync | Scene lifecycle and overlay recomposition |
| `movement:segments` | syncWaterfall | Taps append `{ a, b }` movement blockers; the core tests collision |
| `sight:segments` | syncWaterfall | Taps append segments that block vision |
| `vision:sources` | syncWaterfall | Taps append `{ x, y, radius }` emitters (e.g. tokens) |
| `light:sources` | syncWaterfall | Taps append `{ x, y, dim, bright?, color? }` emitters |
| `select:pointerdown` / `select:hovercursor` / `select:doubleclick` | syncBail | Intercept Select tool input (e.g. doors, wall splitting) |
| `handles:collect` | syncWaterfall | Contribute custom selection handles (e.g. wall endpoints) |
| `handle:drag` | syncBail | Custom handle drag gesture (`start` / `move` / `end`) |
| `contextmenu:before` / `contextmenu:items` | syncBail / syncWaterfall | Veto menu opening; contribute menu items |

Fog and lighting never import tokens or walls: they consume `vision:sources` / `light:sources` / `sight:segments`. Walls contributes blockers, tokens contributes sources — composition without coupling.

### Events

Core events (all validated by Valibot schemas): `ready`, `destroy`, `blur`, `unblur`, `pan`, `zoom`, `pointerdown`, `pointermove`, `pointerup`, `ping`, `tool:changed`, `tool:registered`, `history:change`, `layers:change`, `grid:change`, `selection:change`, `plugin:registered`, `document:type`, `document:create`, `document:update`, `document:delete`, `document:moved`, `contextmenu:open`, `contextmenu:close`.

Plugins register their own events dynamically with Valibot schemas via `ctx.bus.registerEvent` (e.g. `token:moved`, `measure`, `fog:change`). Use `dynamicBus(bus)` for an untyped port to those dynamic events.

### Building blocks

- **Layers**: `CanvasLayer`, `InteractionLayer`, `PlaceablesLayer` (schema-validated create, RBush picking, `<type>:*` + `document:*` events, mutation → history), `BackgroundLayer`, `PreviewLayer`, `HandlesLayer`.
- **Placeables**: `PlaceableObject` — `id`, `document`, `x`/`y`/`rotation`, `bounds`, `getAABB`, `refresh`.
- **Tools**: `Tool`, `RootState`, `SelectTool`, `HandTool`, `EraserTool`, `StateNode` state machine.
- **Grid**: `GridRenderer`, `GridService`, `GridPath` (ruler paths in grid units).
- **UI custom elements**: `defineCanvasElements()`, `DiegesisLayerPanel` (`LAYER_PANEL_TAG`), `DiegesisContextMenu` (`CONTEXT_MENU_TAG`).
- **Schemas**: `SceneDataSchema`, `GridSchema`, `GridTypeSchema`, `LockableSchemaEntries` (spread into plugin document schemas so `locked` survives parsing), `parseScene(data)`.
- **Infra**: `createCanvasBus()`, `dynamicBus(bus)`, `CanvasAnimation` + `Easing`, `CONFIG` / `configure()`.
- **Utils**: `newId()` (UUID v7), `toHex`, `clamp`, `lerp`, `distance`, `easeTowards`, `rectanglesIntersect`.

### Conventions

| Concern | Library |
| --- | --- |
| IDs | `uuid` v7 (`newId`) |
| Schemas | `valibot` (core and plugins) |
| Events/hooks | `@diegesis/events` (`createBus`, `registerEvent`/`registerHook`) |
| Camera | `pixi-viewport` 6 |
| Spatial index | `rbush` 4 |
| Selection FX | `pixi-filters` 6 (`GlowFilter`) |

## Related packages

- [@diegesis/canvas-preset-standard](https://www.npmjs.com/package/@diegesis/canvas-preset-standard) — bundles the standard plugins in one import.
- Plugin family: `@diegesis/canvas-plugin-grid`, `-grid-square`, `-grid-hex`, `-grid-isometric`, `-maps`, `-tiles`, `-drawings`, `-walls`, `-templates`, `-tokens`, `-rings`, `-lights`, `-measure`, `-ranges`, `-lighting`, `-fog`, `-window`, `-image-editor`, and more.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
