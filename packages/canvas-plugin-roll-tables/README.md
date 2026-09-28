# @diegesis/canvas-plugin-roll-tables

> Placeable roll-table anchors for @diegesis/canvas — drop weighted random tables on the map, draw from the context menu, and persist the last result on the document.

Bridges [`@diegesis/roll-tables`](https://www.npmjs.com/package/@diegesis/roll-tables) and [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas): register weighted random tables (inline `[[formula]]` support, nested table refs, deck mode without replacement), drop `roll-table` anchor placeables on the map with a tool (hotkey `U`), and draw from the anchor's context menu — the last result is persisted on the document itself.

## Installation

```bash
npm install @diegesis/canvas-plugin-roll-tables
```

## Quick start

```ts
import { Canvas, defineCanvasElements } from '@diegesis/canvas';
import { createRollTablesPlugin, flattenDraw } from '@diegesis/canvas-plugin-roll-tables';

defineCanvasElements();

const rollTables = createRollTablesPlugin({
  tables: [
    {
      name: 'Treasure',
      formula: '1d2',
      entries: [
        { type: 'text', text: 'Nothing but dust', weight: 5 },
        { type: 'text', text: '[[2d6]] gold pieces', weight: 3 },
        { type: 'formula', text: 'Gems', formula: '1d4', weight: 2 },
      ],
    },
  ],
});

const canvas = new Canvas(container, { plugins: [rollTables] });
await canvas.initialize();

// Draw programmatically (registry is attached to the plugin)
const result = rollTables.registry.draw('Treasure');
console.log(flattenDraw(result));
```

Anchors are regular documents (`roll-table` type, scene key `rollTables`, layer order 560): selection, history/undo and `roll-table:create|update|delete` bus events work out of the box. Right-click an anchor to draw, reset the deck or clear the result. To manage tables in a window, pair with `@diegesis/canvas-plugin-window` and build the UI from `rollTables.registry`.

A pre-built `rollTablesPlugin` (empty registry) is also exported for cases where tables are registered later via `rollTablesPlugin.registry.register(table)`.

## API

### `createRollTablesPlugin(options?)`

Factory returning the plugin (`id: 'roll-tables'`) with an attached `registry: RollTablesRegistry`.

```ts
interface RollTablesPluginOptions {
  tables?: readonly (TableDef | RandomTable)[];  // registered on install
  toolDefaults?: Partial<RollTableToolOptions>;
}

interface RollTableToolOptions {
  tableId: string;         // table used by the placement tool
  color: number | string;  // default 0x8e6ff7
}
```

### `RollTablesRegistry`

Owns the tables, the `@diegesis/roll-tables` bus and the resolver used for nested `tableRef` entries.

| Method | Signature | Description |
| --- | --- | --- |
| `register` | `(input: TableDef \| RandomTable): RandomTable` | Add a table (defs are compiled with the shared bus/resolver). |
| `unregister` | `(ref: string): boolean` | Remove by id or name. |
| `get` | `(ref: string): RandomTable \| undefined` | Look up by id or name. |
| `list` | `(): readonly RandomTable[]` | All registered tables. |
| `draw` | `(ref: string, options?: DrawOptions): DrawResult` | Draw; throws `TableError('unknown-table-ref')` for unknown refs. |
| `bus` | `RollTablesBus` | Table lifecycle/draw events. |
| `resolver` | `TableResolver` | Resolver wired to this registry. |

`flattenDraw(result: DrawResult): string[]` — flatten a draw (including nested table draws) into plain strings.

### `RollTableAnchorData`

Valibot-validated document shape (`RollTableAnchorSchema`):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` (UUID v7) | optional; assigned on create |
| `x`, `y` | `number` | anchor position |
| `tableId` | `string` (min length 1) | table id or name |
| `label` | `string` | optional display label |
| `color` | `number \| string` | optional pin color |
| `lastResult` | `string` | last drawn result, persisted on the document |

### Classes and functions

- `RollTableAnchor` — `PlaceableObject<RollTableAnchorData>` rendering the map pin.
- `RollTableTool` — placement tool (`static id = 'roll-table'`, hotkey `u`); pick the table via tool options.
- `registerRollTablesContextMenu(ctx, registry)` — the context menu contribution (draw, reset deck, clear result); registered automatically by the plugin.

## Related packages

- [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) — plugin-first canvas core (required).
- [`@diegesis/roll-tables`](https://www.npmjs.com/package/@diegesis/roll-tables) — weighted random tables engine (`RandomTable`, `TableDef`, `DrawResult`).
- [`@diegesis/canvas-plugin-window`](https://www.npmjs.com/package/@diegesis/canvas-plugin-window) — host a table manager window backed by `registry`.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
