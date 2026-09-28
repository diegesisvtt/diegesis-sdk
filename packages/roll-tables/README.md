# @diegesis/roll-tables

> Weighted random roll tables for Diegesis — Foundry-grade draws plus seeded RNG, conditional entries, deck policies, nested resolution with cycle detection, and probability analysis.

## Installation

```bash
npm install @diegesis/roll-tables
```

## Quick start

```ts
import { createTable } from '@diegesis/roll-tables';

const encounters = createTable({
  name: 'Forest Encounters',
  formula: '1d2', // how many entries each draw produces
  entries: [
    { type: 'text', text: 'A pack of [[1d4+1]] wolves', weight: 3 },
    { type: 'text', text: 'An abandoned campsite', weight: 2 },
    { type: 'formula', formula: '2d6 * 10', text: 'Scattered gold', weight: 1 },
  ],
});

const result = encounters.draw({ seed: 'session-1' }); // deterministic
for (const entry of result.draws) {
  console.log(entry.text, entry.inlineRolls?.map((r) => r.value));
}
```

All IDs (tables, entries, draws) are generated as UUID v7 when omitted. Table definitions are validated with Valibot schemas, and dice/formula evaluation is powered by `@diegesis/dice-core`, `@diegesis/dice-notation` and `@diegesis/formula`.

## API

### `createTable(def, options?)` / `class RandomTable`

```ts
function createTable(def: TableDef, options?: TableOptions): RandomTable;

interface TableDef {
  id?: string;                    // UUID; generated (v7) when omitted
  name: string;
  description?: string;
  img?: string;
  formula?: string;               // entries per draw, default '1'
  replacement?: boolean;          // default true (false = deck mode)
  reshuffle?: 'never' | 'auto' | 'manual'; // deck policy, default 'never'
  displayRoll?: boolean;          // default true
  entries: readonly TableEntryDef[];
}

interface TableEntryDef {
  id?: string;                    // UUID; generated (v7) when omitted
  type?: 'text' | 'formula' | 'table' | 'document'; // default 'text'
  weight?: number;                // default 1
  range?: [number, number];       // explicit die range; overrides weight
  text?: string;                  // supports inline rolls: "[[1d6]] gold"
  img?: string;
  formula?: string;               // for type 'formula'
  documentRef?: { collection: string; id: string }; // for type 'document'
  tableRef?: string;              // table id or name, for type 'table'
  condition?: (ctx: EntryConditionContext) => boolean;
}

interface TableOptions {
  bus?: RollTablesBus;
  resolver?: TableResolver;       // resolves tableRef for nested draws
  rng?: Rng;                      // custom RNG (@diegesis/dice-core)
  seed?: string;                  // seeded RNG when rng is absent
  maxDepth?: number;              // nesting limit, default 10
}
```

Instance members:

```ts
class RandomTable {
  readonly id: string;
  readonly name: string;
  readonly formula: string;
  readonly replacement: boolean;
  readonly reshuffle: ReshufflePolicy;
  readonly bus: RollTablesBus;

  get tableEntries(): readonly TableEntry[];
  get drawnCount(): number;       // deck mode: entries already drawn
  get remainingCount(): number;   // deck mode: entries still in the deck

  draw(options?: DrawOptions): DrawResult;
  lookup(rollValue: number): TableEntry | undefined; // manual roll → entry
  probability(scope?: Scope): EntryProbability[];    // current draw odds
  normalize(target?: number): void;                  // rescale weights (default 100)
  reset(): void;                                     // reshuffle the deck
}

interface DrawOptions {
  count?: number;   // overrides the table formula
  seed?: string;    // one-off seeded RNG for this draw
  rng?: Rng;
  scope?: Scope;    // formula variables (@diegesis/formula)
}
```

`DrawResult` has a UUID v7 `id`, the `tableId`/`tableName`, the `countRoll` (when the table formula rolled the count), and `draws: DrawnEntry[]`. Each `DrawnEntry` carries `entryId`, `type`, nesting `depth`, resolved `text`/`value`, the `roll` for formula entries, `inlineRolls` for `[[...]]` expressions in text, and a nested `DrawResult` for table entries.

### Seeded RNG

Pass `seed` at construction or per draw for fully reproducible sequences (same seed → same draws). Pass an `rng` (from `createRng` in `@diegesis/dice-core`) to share a stream across tables.

### Conditional entries

`condition` receives `{ depth, chain, previous, scope }` and gates an entry per pick — e.g. exclude an entry already drawn in this batch, or react to formula scope. A throwing condition excludes the entry and emits an `error` event (`condition-error`).

### Deck policies

With `replacement: false` the table behaves like a deck: drawn entries stay out until `reset()`. On exhaustion the table emits `deck:empty`; `reshuffle: 'auto'` reshuffles and continues, `'never'` throws `TableError` with code `deck-exhausted` on a fresh draw, `'manual'` waits for an explicit `reset()`.

### Nested tables and cycle detection

Entries of `type: 'table'` recurse into another table resolved by id or name:

```ts
import { createResolver, createTable } from '@diegesis/roll-tables';

const loot = createTable({ name: 'Loot', entries: [/* ... */] });
const quest = createTable(
  {
    name: 'Quest Hook',
    entries: [{ type: 'table', tableRef: 'Loot', text: 'They carry...', weight: 1 }],
  },
  { resolver: createResolver([loot]) },
);

const result = quest.draw();
result.draws[0].nested; // DrawResult from the Loot table
```

Cycles are detected via the draw chain and throw `cycle-detected`; nesting beyond `maxDepth` (default 10) throws `max-depth`.

### Probability analysis

```ts
const odds = encounters.probability();
// [{ entryId, weight, probability, range: [low, high] }, ...]
```

`tableProbability(entries, ctx?, drawn?)` is also exported standalone. In deck mode, already-drawn entries are excluded; entries failing their condition contribute zero.

### Events and hooks (`@diegesis/events`)

Each table owns a bus (`table.bus`, or supply one via `TableOptions.bus`). Contract: `rollTablesContract`; factory: `createRollTablesBus()`.

- **Events**: `draw`, `entry:selected`, `table:nested`, `deck:empty`, `deck:reshuffle`, `error`.
- **Hooks**: `beforeDraw` (syncWaterfall — transform `{ count, pool }` before picking), `beforeResolve` (syncWaterfall — transform each resolved entry), `afterDraw` (sync).

### Errors

`TableError` carries a typed `code` and optional `tableId`: `'empty-table'`, `'deck-exhausted'`, `'cycle-detected'`, `'max-depth'`, `'unknown-table-ref'`, `'invalid-formula'`, `'invalid-range'`, `'condition-error'`.

### Schemas

`rollTableSchema`, `tableEntrySchema`, `documentRefSchema`, `reshuffleSchema` (Valibot) with inferred types `RollTableData`, `RollTableInput`, `TableEntryData`, `TableEntryInput`, `DocumentRef`, `EntryType`, `ReshufflePolicy` — reuse them to validate persisted tables.

## Related packages

- [@diegesis/dice-core](https://www.npmjs.com/package/@diegesis/dice-core) — RNG and roll evaluation.
- [@diegesis/dice-notation](https://www.npmjs.com/package/@diegesis/dice-notation) — dice formula parsing.
- [@diegesis/formula](https://www.npmjs.com/package/@diegesis/formula) — formula scopes.
- [@diegesis/events](https://www.npmjs.com/package/@diegesis/events) — event/hook bus.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
