# @diegesis/dice-foundry-notation

> Foundry VTT dice notation parser and serializer for the Diegesis dice IR — maps Foundry sigils (kh, r, rr, x, xo, cs, cf, df, d%, df-as-fate, dc, @path) to canonical modifier operations.

`@diegesis/dice-foundry-notation` parses Foundry-style dice notation into the canonical `@diegesis/dice-core` `RollExpr` IR and serializes IR back to Foundry sigils. The API shape mirrors `@diegesis/dice-notation`.

## Installation

```bash
npm install @diegesis/dice-foundry-notation
```

## Quick start

```ts
import { fromFormula, toFormula } from '@diegesis/dice-foundry-notation';
import { evaluateRoll, createRng } from '@diegesis/dice-core';

const expr = fromFormula('4d6kh3');
// { type: 'die', count: 4, faces: { kind: 'number', value: 6 },
//   modifiers: [{ op: 'keep-highest', count: 3 }] }

const result = evaluateRoll(expr, { rng: createRng('seed') });
result.terms[0].applied; // ['keep-highest']

toFormula(expr); // '4d6kh3'
```

## API

### `fromFormula(source)`

Parses Foundry dialect notation into a `RollExpr`. Throws `FoundryNotationError` (with `position` and `input`) on invalid syntax.

```ts
function fromFormula(source: string): RollExpr;
```

| Name | Type | Description |
|------|------|-------------|
| source | `string` | Foundry-style notation, e.g. `'2d6r1'`. |

### `toFormula(expr)`

Serializes a `RollExpr` back to Foundry sigils using `CANONICAL_TO_SIGIL`. Fate faces print as `f`, coin faces as `c`.

```ts
function toFormula(expr: RollExpr): string;

toFormula(fromFormula('4df')); // '4df'
```

### `tokenize(source)`

Low-level tokenizer with the same token model as the canonical dialect.

```ts
function tokenize(source: string): Token[];

type TokenType =
  | 'num' | 'word'
  | 'plus' | 'dash' | 'star' | 'slash' | 'percent'
  | 'lparen' | 'rparen' | 'lbrace' | 'rbrace'
  | 'comma' | 'colon' | 'question' | 'bang'
  | 'at' | 'dot'
  | 'eq' | 'gt' | 'ge' | 'lt' | 'le'
  | 'eof';

interface Token {
  type: TokenType;
  text: string;
  value?: number;
  start: number;
  end: number;
}
```

### Constants

```ts
const MODIFIER_PATTERNS: readonly ModPattern[];
const CANONICAL_TO_SIGIL: Readonly<Record<string, string>>;
const FUNCTIONS: readonly string[]; // ['floor', 'ceil', 'round', 'abs', 'min', 'max', 'clamp']
```

### Errors

```ts
interface FoundryNotationErrorOptions {
  position?: number;
  input?: string;
  cause?: unknown;
}

class FoundryNotationError extends Error {
  position?: number;
  input?: string;
  constructor(message: string, options?: FoundryNotationErrorOptions);
}
```

## Sigil table

### Parser (sigil to canonical op)

| Sigil | Canonical op |
|-------|--------------|
| `rr` | `reroll-recursive` |
| `r` | `reroll-once` (opposite of Roll20) |
| `xo` | `explode-once` |
| `x` | `explode` |
| `kh`, `k` | `keep-highest` |
| `kl` | `keep-lowest` |
| `dh` | `drop-highest` |
| `dl`, `d` | `drop-lowest` |
| `cs` | `count-success` |
| `cf` | `count-failure` |
| `df` | `deduct-failure` |
| `ms` | `margin-success` |
| `min` | `min` |
| `max` | `max` |

### Serializer

`CANONICAL_TO_SIGIL` maps canonical ops back to Foundry sigils (`keep-highest` -> `kh`, `reroll-once` -> `r`, `reroll-recursive` -> `rr`, `explode` -> `x`, `explode-once` -> `xo`, etc.).

## Dialect specifics

- Faces: number, `%` percentile, `f`/`F`/`fate`, `c`/`coin`, and parenthesized expressions.
- Position matters: `4df` rolls 4 fate dice (`df` in the faces position), while `4d6df` applies the `deduct-failure` modifier to 4d6.
- Bare numeric reroll: `2d6r1` means `reroll-once` on `= 1`.
- Variables: `@path.to.data` becomes `{ var: 'path.to.data' }`.
- Pools `{expr, expr}` are supported.
- Not supported: `explode-compound`, `explode-penetrating`, `sort-asc`, `sort-desc`, `count-even`, `count-odd`, `subtract-failure`.

## Examples

```ts
fromFormula('4df');   // 4 fate dice (faces position)
fromFormula('4d6df'); // 4d6 with deduct-failure modifier

fromFormula('1d6x>=5');
// modifiers: [{ op: 'explode', compare: { op: '>=', value: 5 } }]

fromFormula('2d6r1');
// modifiers: [{ op: 'reroll-once', compare: { op: '=', value: 1 } }]
```

## Related packages

The IR flow: this parser produces the `@diegesis/dice-core` `RollExpr` IR, `dice-core` evaluates it deterministically, and `toFormula` prints it back as Foundry sigils.

- [@diegesis/dice-core](https://www.npmjs.com/package/@diegesis/dice-core) — the IR and seeded evaluator.
- [@diegesis/dice-notation](https://www.npmjs.com/package/@diegesis/dice-notation) — canonical notation.
- [@diegesis/dice-roll20-notation](https://www.npmjs.com/package/@diegesis/dice-roll20-notation) — Roll20 dialect.
- [@diegesis/dice-notation-core](https://www.npmjs.com/package/@diegesis/dice-notation-core) — shared parser/serializer machinery.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
