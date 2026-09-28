# @diegesis/dice-core

> Canonical dice IR + seeded evaluator for Diegesis — Valibot-validated, dialect-neutral, side-effect-free except for an injectable RNG.

`@diegesis/dice-core` is the center of the Diegesis dice stack. Notation parsers (`@diegesis/dice-notation`, `@diegesis/dice-foundry-notation`, `@diegesis/dice-roll20-notation`) turn text into the IR defined here; `evaluateRoll` executes that IR deterministically from a seed; serializers print the IR back to text.

- **Deterministic** — same seed, same roll, every time (RNG built on `seedrandom`).
- **Auditable** — every result carries per-die history (`kept`, `exploded`, `rerolled`, `history`).
- **Validated** — `rollSchema` is a Valibot schema for the full IR.
- **IDs** — result and term IDs are UUID v7 (time-ordered, sortable).

## Installation

```bash
npm install @diegesis/dice-core
```

## Quick start

```ts
import { fromFormula, toFormula } from '@diegesis/dice-notation';
import { evaluateRoll } from '@diegesis/dice-core';

const expr = fromFormula('4d6kh3 + 2');        // text -> IR
const result = evaluateRoll(expr, { seed: 'session-42' });

result.value;          // final numeric value
result.terms[0].dice;  // per-die outcomes with kept/exploded flags
result.id;             // UUID v7

toFormula(expr);       // IR -> text: '4d6keep-highest3 + 2'
```

You can also build the IR directly, without a notation package:

```ts
import { evaluateRoll, type RollExpr } from '@diegesis/dice-core';

const expr: RollExpr = {
  type: 'die',
  count: 4,
  faces: { kind: 'number', value: 6 },
  modifiers: [{ op: 'keep-highest', count: 3 }],
};

evaluateRoll(expr, { seed: 'demo' });
```

## API

### IR types

Dice terms are leaves inside `@diegesis/formula` expression trees, so rolls compose with arithmetic, comparisons, functions, and variables.

```ts
type ComparisonOp = '=' | '>' | '>=' | '<' | '<=';

interface Comparison {
  op: ComparisonOp;
  value: RollExpr;
}

type ModifierOp =
  | 'keep-highest' | 'keep-lowest'
  | 'drop-highest' | 'drop-lowest'
  | 'reroll-once' | 'reroll-recursive'
  | 'explode' | 'explode-once' | 'explode-compound' | 'explode-penetrating'
  | 'min' | 'max'
  | 'count-success' | 'count-failure'
  | 'deduct-failure' | 'subtract-failure'
  | 'count-even' | 'count-odd'
  | 'margin-success'
  | 'sort-asc' | 'sort-desc';

const MODIFIER_OPS: readonly ModifierOp[]; // all 21 ops

interface Modifier {
  op: ModifierOp;
  count?: number;    // default 1
  value?: number;    // default 0
  target?: number;   // default 0
  cap?: number;      // default 100
  compare?: Comparison;
}

type FacesSpec =
  | { kind: 'number'; value: RollExpr }
  | { kind: 'percentile' }
  | { kind: 'fate' }
  | { kind: 'coin' }
  | { kind: 'expr'; value: RollExpr };

interface DieTerm {
  type: 'die';
  count: RollExpr;
  faces: FacesSpec;
  modifiers?: Modifier[];
}

interface Pool {
  type: 'pool';
  entries: RollExpr[];
  modifiers?: Modifier[];
}

type DiceExpr = DieTerm | Pool;
type RollExpr = FormulaExpr<DiceExpr>;

function isDiceExpr(expr: unknown): expr is DiceExpr;
```

### Results

```ts
type DieOutcome = 'success' | 'failure' | 'neutral';

interface DieRoll {
  value: number;
  kept: boolean;
  exploded: boolean;
  rerolled: boolean;
  penetrated: boolean;
  outcome: DieOutcome;
  history: number[];
}

interface TermResult {
  id: string;              // UUID v7
  type: 'die' | 'pool';
  value: number;
  dice: DieRoll[];
  applied: string[];       // applied modifier names
  children?: TermResult[];
}

interface RollResult {
  id: string;              // UUID v7
  value: number | boolean;
  terms: TermResult[];
  rolls: DieRoll[];        // flattened across all terms
}

function makeDieRoll(value: number, extra?: Partial<DieRoll>): DieRoll;
function toDieRoll(die: WorkingDie): DieRoll;
function freeze(result: RollResult): RollResult;
type WorkingDie = DieRoll;
```

### RNG

```ts
type Rng = () => number; // returns values in [0, 1)

function createRng(seed?: string): Rng;
function rollInt(rng: Rng, sides: number): number;
```

`createRng` wraps `seedrandom`; the same seed reproduces a roll exactly. `rollInt` returns `0` when `sides <= 0`, otherwise `floor(rng() * sides) + 1`.

### `evaluateRoll(expr, options?)`

```ts
function evaluateRoll(
  expr: RollExpr,
  options?: {
    scope?: Scope;   // variable bindings for { var } nodes
    rng?: Rng;       // takes precedence over seed
    seed?: string;
  },
): RollResult;
```

```ts
import { evaluateRoll, createRng } from '@diegesis/dice-core';

const result = evaluateRoll(expr, {
  rng: createRng('seed'),
  scope: { dc: 15 },
});
```

### Modifier internals (advanced)

```ts
interface ResolvedFaces {
  sides: number;
  max: number;
  roll(): number;
}

interface ModifierContext {
  scope: Scope;
  rng: Rng;
  evalExpr(expr: RollExpr): number | boolean;
}

function resolveFaces(faces: FacesSpec, ctx: ModifierContext): ResolvedFaces;
function resolveModifier(mod: Modifier): ResolvedModifier;
function applyModifiers(dice: WorkingDie[], mods: Modifier[], ctx: ModifierContext): WorkingDie[];
function computeValue(dice: WorkingDie[], mods: Modifier[], ctx: ModifierContext): number;
function appliedModifierNames(mods: Modifier[]): string[];
```

`applyModifiers` runs in a fixed order regardless of declaration order:

```
reroll-once -> reroll-recursive -> explode -> explode-once -> explode-compound
-> explode-penetrating -> min -> max -> keep-highest -> keep-lowest
-> drop-highest -> drop-lowest -> sort-asc -> sort-desc
```

Default comparisons: reroll `<= 1`, explode `= max`, `count-success` `> 0`, `count-failure` `<= 0`. `reroll-recursive` has a safety limit of 1000 iterations.

### Valibot schema

```ts
function buildRollSchema(): v.GenericSchema;
const rollSchema: v.GenericSchema;
```

```ts
import * as v from 'valibot';
import { rollSchema } from '@diegesis/dice-core';

const expr = v.parse(rollSchema, JSON.parse(savedRoll));
```

### Errors

```ts
interface DiceErrorOptions {
  cause?: unknown;
  position?: number;
  input?: string;
}

class DiceError extends Error {
  position?: number;
  input?: string;
  constructor(message: string, options?: DiceErrorOptions);
}
```

## Related packages

The IR flow: notation parsers produce the `RollExpr` IR, `dice-core` evaluates it, serializers print it back.

- [@diegesis/dice-notation](https://www.npmjs.com/package/@diegesis/dice-notation) — canonical notation parser/serializer.
- [@diegesis/dice-foundry-notation](https://www.npmjs.com/package/@diegesis/dice-foundry-notation) — Foundry VTT dialect.
- [@diegesis/dice-roll20-notation](https://www.npmjs.com/package/@diegesis/dice-roll20-notation) — Roll20 dialect.
- [@diegesis/dice-notation-core](https://www.npmjs.com/package/@diegesis/dice-notation-core) — shared machinery behind the parsers.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
