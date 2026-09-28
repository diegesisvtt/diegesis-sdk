# @diegesis/sheet

> Effect-oriented character sheet engine for Diegesis — the document is minimal, the effect pipeline is the heart: collect, filter, sort by UUID v7, apply, derive, emit.

A `CharacterDocument` stores only **base values** and **effect instances**; everything else — final attributes, derived values, flags, roll bonuses — is recomputed by a deterministic, auditable pipeline whenever anything changes. Lifecycle events flow through an `@diegesis/events` bus.

## Installation

```bash
npm install @diegesis/sheet
```

## Quick start

```ts
import { createDocument, SheetEngine, defineSystemPack } from '@diegesis/sheet';

const pack = defineSystemPack({
  id: 'mini-dnd',
  version: '1.0.0',
  derived: { 'hp.max': '10 + con * 2' },
  definitions: [
    {
      id: 'blessed',
      label: 'Blessed',
      changes: [{ kind: 'value', path: 'str', op: 'add', value: '2' }],
    },
  ],
});

const doc = createDocument(pack, { base: { str: 3, con: 2 } });
const engine = new SheetEngine(doc, { pack });

engine.applyEffect('blessed');
const sheet = engine.compute();

sheet.values.str;       // 5
sheet.values['hp.max']; // 14
sheet.audit;            // one entry per applied change
```

`compute()` is memoized (same reference until the next mutation) and returns a deeply frozen `ComputedSheet` — do not mutate it (strict mode throws `TypeError`).

## API

### `SheetEngine`

```ts
class SheetEngine {
  constructor(document: CharacterDocument, options: SheetEngineOptions);

  compute(): ComputedSheet;
  applyEffect(refOrDef: string | EffectDefinition, options?: ApplyEffectOptions): EffectInstance;
  removeEffect(id: string): EffectInstance | undefined;
  removeBySource(source: EffectSource): EffectInstance[];
  setEnabled(id: string, enabled: boolean): boolean;
  buildRoll(templateId: string): RollExpr; // roll template with active transforms applied

  attach(): () => void;                    // react to bus events (triggers, durations)
  notifyEvent(name: string, payload?: unknown): void; // feed events without a bus
  tickSeconds(seconds: number): void;      // decay second-based durations manually
  updateBase(mutator: (base) => base): void;
  refresh(): void;                         // force recompute + emit

  get document(): CharacterDocument;       // structuredClone of the live document
  loadDocument(json: unknown): CharacterDocument; // validate + hydrate
  destroy(): void;
}
```

`SheetEngineOptions` includes `pack` (SystemPack), `bus`, `id` (custom ID generator — must produce UUIDs if documents are serialized), `validate` (set `false` to skip pack validation), and `durationEvents` / `clockEvent` overrides.

`createDocument(pack, { identity?, base?, effects? })` builds an empty document bound to the pack's `id`/`version`.

### `SystemPack`

Describes the game system's rules: ordinal ladders (`ordinals`), derived values (`derived`, path → formula), roll templates (`rollTemplates`), and effect definitions (`definitions`).

```ts
interface SystemPack {
  readonly id: string;
  readonly version: string;
  readonly ordinals?: Record<string, readonly string[]>; // e.g. dice: ['d4','d6','d8',...]
  readonly derived?: Record<string, string>;             // path → formula
  readonly rollTemplates?: Record<string, RollTemplate>;
  readonly definitions?: readonly EffectDefinition[];
}
```

`defineSystemPack(pack)` is an identity authoring helper (typed pass-through, no validation). Explicit validation is `validatePack(pack)`, which throws `PackValidationError`; the engine runs it automatically in the constructor unless `validate: false`.

### Effect changes

An effect declares `changes` applied to the sheet while active:

| Change | Shape | Effect |
| --- | --- | --- |
| `value` | `{ kind: 'value', path, op, value }` | `set`/`add`/`multiply` with formulas; `upgrade`/`downgrade` along an ordinal ladder (`steps`); `append`/`remove` on arrays |
| `roll` | `{ kind: 'roll', target, transform }` | Transforms roll templates matched by id, tag or glob (`addDice`, `addModifiers`, `extraDice`, `bonus`) |
| `flag` | `{ kind: 'flag', path, value }` | Writes into the `flags.*` namespace, visible to formulas and conditions |

Additional fields: `condition` (formula that toggles the effect), `grants` (child effects applied/removed in cascade), `priority`, `icon`.

### Deterministic ordering

Effects apply in passes (`flag` → `set` → `add` → `multiply` → `ordinal` → `derived`), sorted within the pipeline by `priority` and then by instance id. Instance ids are UUID v7 (time-ordered, sortable), so ties resolve in application order and recomputation is fully deterministic.

### Triggers

Triggers react to bus events: `{ on, condition?, changes?, effect?, roll?, rollInto? }`. `roll` is a formula string or `RollExpr`; `rollInto: { path, op?: 'add' | 'subtract' | 'set' }` writes the result into a base path (default `subtract`). Each firing emits `trigger:fired` (and `trigger:roll` when a roll happens).

### Durations

`duration: { unit, value?, event? }` with validated invariants: `value` required for `seconds`/`rounds`/`turns`, `event` required for `until-event`. Rounds/turns decay on the events configured via `durationEvents` (default `round:end`/`turn:end`); seconds decay on `clockEvent` (default `clock:tick`, payload a number or `{ elapsed }`) or via `engine.tickSeconds(n)`. Expiration emits `effect:expired` and cascades to grants.

### Stacking

`stacking: { group?, mode? }` — `stack` (default: everything applies), `newest` (only the most recent instance of the group) or `highest-priority`. Suppressed effects appear in `computed.suppressed` with the reason (`disabled` / `stacking` / `condition`).

### Events and bus

`createSheetBus()` builds a bus pre-configured with the `sheet` contract (`effect:applied`, `effect:removed`, `effect:expired`, `effect:enabled`, `effect:disabled`, `computed`, `trigger:fired`, `trigger:roll`). Gameplay events (`round:end`, `turn:start`, `clock:tick`, ...) are declared via the `events` option, which merges them into the contract with full typing — compatible with `unknownEvents: 'reject'`:

```ts
import * as v from 'valibot';
import { createSheetBus } from '@diegesis/sheet';

const bus = createSheetBus({
  events: {
    'round:end': v.object({}),
    'turn:end': v.object({}),
    'clock:tick': v.object({ elapsed: v.number() }),
  },
});

const engine = new SheetEngine(doc, { pack, bus });
engine.attach(); // the engine reacts to any bus event

bus.on('computed', ({ patches }) => ui.applyPatches(patches));
bus.emit('round:end', {}); // fires triggers and decays durations
```

With `attach()`, the engine processes triggers and durations on every event and re-emits `computed` only when something actually changed (patches `{ path, previous, next }`).

### Serialization

`CharacterDocument` is plain JSON (`{ systemId, systemVersion, identity, base, effects }`). To hydrate, use `engine.loadDocument(json)` — validated against `characterDocumentSchema`, which **requires a UUID in `effect.id`**. The engine's default ID generator is UUID v7; custom generators via `SheetEngineOptions.id` must produce UUIDs if the document will be serialized and rehydrated. `engine.document` returns a `structuredClone` of the current state (there is no `snapshot()` method).

```ts
const json = JSON.stringify(engine.document);
engine.loadDocument(JSON.parse(json));
```

### Errors

`SheetError`, `EffectCycleError`, `UnknownEffectError`, `UnknownOrdinalError`, `UnknownTemplateError`, `PackValidationError` — all carry a typed code (`SheetErrorCode`).

## Documentation

- [API reference](https://github.com/diegesisvtt/diegesis-sdk/blob/main/docs/api/sheet.md)
- [Character sheets guide](https://github.com/diegesisvtt/diegesis-sdk/blob/main/docs/guides/character-sheets.md)

## Related packages

- [@diegesis/events](https://www.npmjs.com/package/@diegesis/events) — event/hook bus contract.
- [@diegesis/formula](https://www.npmjs.com/package/@diegesis/formula) — formula parsing/evaluation for derived values, conditions and changes.
- [@diegesis/dice-core](https://www.npmjs.com/package/@diegesis/dice-core) and [@diegesis/dice-notation](https://www.npmjs.com/package/@diegesis/dice-notation) — roll templates and trigger rolls.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
