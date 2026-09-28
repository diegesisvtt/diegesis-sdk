# @diegesis/dice-notation

> Canonical Diegesis dice notation — unambiguous parse/fromFormula and toFormula for the dice IR, the best of Foundry and Roll20 without their collisions.

`@diegesis/dice-notation` parses canonical notation text into the `@diegesis/dice-core` `RollExpr` IR and serializes IR back to canonical long-form notation. Shorthand aliases whose meaning differs between VTTs (`r`, `rr`, `ro`, `k`, `d`, `s`) are rejected with helpful errors, so saved rolls stay explicit and portable.

## Installation

```bash
npm install @diegesis/dice-notation
```

## Quick start

```ts
import { fromFormula, toFormula } from '@diegesis/dice-notation';
import { evaluateRoll } from '@diegesis/dice-core';

const expr = fromFormula('4d6kh3 + 2');
// { '+': [
//   { type: 'die', count: 4, faces: { kind: 'number', value: 6 },
//     modifiers: [{ op: 'keep-highest', count: 3 }] },
//   2,
// ] }

const result = evaluateRoll(expr, { seed: 'session-42' });
result.value;

toFormula(expr); // '4d6keep-highest3 + 2' — always canonical long names
```

## API

### `fromFormula(source)`

Parses canonical notation into a `RollExpr`. Throws `NotationError` (with `position` and `input`) on invalid syntax or ambiguous aliases.

```ts
function fromFormula(source: string): RollExpr;
```

| Name | Type | Description |
|------|------|-------------|
| source | `string` | Notation text, e.g. `'4d6keep-highest3'`. |

### `toFormula(expr)`

Serializes a `RollExpr` back to canonical long-form notation. The serializer never emits aliases.

```ts
function toFormula(expr: RollExpr): string;

toFormula(fromFormula('4d6kh3')); // '4d6keep-highest3'
```

### `tokenize(source)`

Low-level tokenizer, useful for tooling and syntax highlighting.

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
const FUNCTIONS: readonly string[];         // ['floor', 'ceil', 'round', 'abs', 'min', 'max', 'clamp']
const AMBIGUOUS_ALIASES: readonly string[]; // ['r', 'rr', 'ro', 'k', 'd', 's']
```

Ambiguous aliases throw a `NotationError` telling the user to use the full canonical name, because their meaning differs between dialects.

### Errors

```ts
interface NotationErrorOptions {
  position?: number;
  input?: string;
  cause?: unknown;
}

class NotationError extends Error {
  position?: number;
  input?: string;
  constructor(message: string, options?: NotationErrorOptions);
}
```

## Grammar

- Arithmetic with precedence: `* /` bind tighter than `+ -`; unary `-` supported.
- Dice terms `NdX` with implicit count (`d20` is `1d20`).
- Faces: number (`d20`), `%` percentile (`d%`), `F`/`fate` fate dice, `coin`/`c` coin flips, and parenthesized expression faces or counts (`(1+1)d(8)`).
- Pools: `{expr, expr}` followed by optional modifiers.
- Variables: `@path.to.data` becomes `{ var: 'path.to.data' }`.
- Functions: `floor`, `ceil`, `round`, `abs`, `min`, `max`, `clamp`.
- Comments: everything after `#` is ignored.
- Comparisons `= > >= < <=` accept numbers, `(expr)`, or `@path` values.

## Modifier aliases

Canonical long names are always accepted. These short aliases are unambiguous and also accepted:

| Alias | Canonical op |
|-------|--------------|
| `kh` | `keep-highest` |
| `kl` | `keep-lowest` |
| `dh` | `drop-highest` |
| `dl` | `drop-lowest` |
| `!` | `explode` |
| `!!` | `explode-compound` |
| `cs` | `count-success` |
| `cf` | `count-failure` |
| `df` | `deduct-failure` |
| `sf` | `subtract-failure` |
| `ms` | `margin-success` |
| `sa` | `sort-asc` |
| `sd` | `sort-desc` |

## Examples

```ts
fromFormula('2d6reroll-once<=2');
// modifiers: [{ op: 'reroll-once', compare: { op: '<=', value: 2 } }]

fromFormula('{2d6, 1d8}keep-highest2');
// { type: 'pool', entries: [2d6, 1d8], modifiers: [{ op: 'keep-highest', count: 2 }] }

fromFormula('floor((@str - 10) / 2)');
// { floor: [ { '/': [ { '-': [ { var: 'str' }, 10 ] }, 2 ] } ] }

import { fromFormula } from '@diegesis/dice-notation';
import { evaluateRoll } from '@diegesis/dice-core';

const expr = fromFormula('1d20 + @abilities.str.mod');
const result = evaluateRoll(expr, {
  rng: () => 0.95,
  scope: { abilities: { str: { mod: 3 } } },
});
result.value; // 23
```

## Related packages

The IR flow: this parser produces the `@diegesis/dice-core` `RollExpr` IR, `dice-core` evaluates it deterministically, and `toFormula` prints it back.

- [@diegesis/dice-core](https://www.npmjs.com/package/@diegesis/dice-core) — the IR and seeded evaluator.
- [@diegesis/dice-notation-core](https://www.npmjs.com/package/@diegesis/dice-notation-core) — shared parser/serializer machinery.
- [@diegesis/dice-foundry-notation](https://www.npmjs.com/package/@diegesis/dice-foundry-notation) — Foundry VTT dialect.
- [@diegesis/dice-roll20-notation](https://www.npmjs.com/package/@diegesis/dice-roll20-notation) — Roll20 dialect.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
