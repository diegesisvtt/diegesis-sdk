# @diegesis/dice-roll20-notation

> Roll20 dice notation parser and serializer for the Diegesis dice IR — maps Roll20 sigils (kh, r, ro, !, !!, !p, d%, dF, @{attr}) to canonical modifier operations.

`@diegesis/dice-roll20-notation` parses Roll20-style dice notation (including `@{attribute}` references) into the canonical `@diegesis/dice-core` `RollExpr` IR and serializes IR back to Roll20 sigils. The API shape mirrors `@diegesis/dice-notation`, plus an `isFunctionName` helper and an additional `pipe` token type.

## Installation

```bash
npm install @diegesis/dice-roll20-notation
```

## Quick start

```ts
import { fromFormula, toFormula } from '@diegesis/dice-roll20-notation';
import { evaluateRoll } from '@diegesis/dice-core';

const expr = fromFormula('5d10>6');
// bare comparison after a die -> implicit count-success:
// modifiers: [{ op: 'count-success', compare: { op: '>', value: 6 } }]

const result = evaluateRoll(expr, { seed: 'session-42' });
result.value; // number of dice above 6

toFormula(fromFormula('4d10cs>=8')); // '4d10>=8'
```

## API

### `fromFormula(source)`

Parses Roll20 dialect notation into a `RollExpr`. Throws `Roll20NotationError` (with `position` and `input`) on invalid syntax.

```ts
function fromFormula(source: string): RollExpr;
```

| Name | Type | Description |
|------|------|-------------|
| source | `string` | Roll20-style notation, e.g. `'5d10>6'`. |

```ts
fromFormula('2d6r<=2');  // reroll-recursive on <= 2
fromFormula('2d6ro<=2'); // reroll-once on <= 2
```

### `toFormula(expr)`

Serializes a `RollExpr` back to Roll20 sigils.

```ts
function toFormula(expr: RollExpr): string;
```

Serialization rules: `reroll-once` -> `ro`, `reroll-recursive` -> `r`, `explode` -> `!`, `explode-compound` -> `!!`, `explode-penetrating` -> `!p`, `count-failure` -> `f`, `sort-asc` -> `sa`, `sort-desc` -> `sd`. `count-success` serializes as a bare comparison when it has exactly one, otherwise as `cs`.

### `tokenize(source)` / `isFunctionName(name)`

```ts
function tokenize(source: string): Token[];
function isFunctionName(name: string): boolean;

type TokenType =
  | 'num' | 'word'
  | 'plus' | 'dash' | 'star' | 'slash' | 'percent'
  | 'lparen' | 'rparen' | 'lbrace' | 'rbrace'
  | 'comma' | 'colon' | 'question' | 'bang'
  | 'at' | 'dot' | 'pipe'
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

The `pipe` token type supports Roll20's `@{character|level}` attribute syntax.

### Constants

```ts
const MODIFIER_PATTERNS: readonly ModPattern[];
const CANONICAL_TO_SIGIL: Readonly<Record<string, string>>;
const FUNCTIONS: readonly string[]; // ['floor', 'ceil', 'round', 'abs', 'min', 'max', 'clamp']
```

### Errors

```ts
interface Roll20NotationErrorOptions {
  position?: number;
  input?: string;
  cause?: unknown;
}

class Roll20NotationError extends Error {
  position?: number;
  input?: string;
  constructor(message: string, options?: Roll20NotationErrorOptions);
}
```

## Sigil table

### Parser (sigil to canonical op)

| Sigil | Canonical op |
|-------|--------------|
| `!!` | `explode-compound` |
| `!p` | `explode-penetrating` |
| `!` | `explode` |
| `kh`, `k` | `keep-highest` |
| `kl` | `keep-lowest` |
| `dh` | `drop-highest` |
| `dl`, `d` | `drop-lowest` |
| `ro` | `reroll-once` |
| `r` | `reroll-recursive` (opposite of Foundry) |
| `cs` | `count-success` |
| `cf`, `f` | `count-failure` |
| `s`, `sa` | `sort-asc` |
| `sd` | `sort-desc` |

## Dialect specifics

- Faces: number, `%` percentile, `F`/`fate` (no coin).
- Dynamic count and faces via expressions.
- Bare comparison after a die implicitly inserts `count-success`: `5d10>6` counts dice `> 6`.
- Implicit comparisons combine with modifiers: `5d10>7f<1` counts successes `> 7` and failures `< 1`.
- Explode accepts an optional numeric cap before the comparison: `2d6!3>5` explodes at most 3 times on `> 5`.
- Attributes: `@{strength}` becomes `{ var: 'strength' }`; `@{character|level}` becomes `{ var: 'character.level' }` (pipe becomes a dot). The serializer prints `@{path.with.dots}`.
- Comments: everything after `#` is ignored.
- Not supported: `min`/`max`/`clamp` modifiers, `margin-success`, `count-even`, `count-odd`, `deduct-failure`, `subtract-failure`, `explode-once`.

## Examples

```ts
fromFormula('@{character|level}');
// { var: 'character.level' }

fromFormula('5d10>7f<1');
// count-success on > 7 plus count-failure on < 1

import { fromFormula } from '@diegesis/dice-roll20-notation';
import { evaluateRoll } from '@diegesis/dice-core';

const expr = fromFormula('1d20 + @{strength}');
const result = evaluateRoll(expr, {
  rng: () => 0.95,
  scope: { strength: 4 },
});
result.value; // 24
```

## Related packages

The IR flow: this parser produces the `@diegesis/dice-core` `RollExpr` IR, `dice-core` evaluates it deterministically, and `toFormula` prints it back as Roll20 sigils.

- [@diegesis/dice-core](https://www.npmjs.com/package/@diegesis/dice-core) — the IR and seeded evaluator.
- [@diegesis/dice-notation](https://www.npmjs.com/package/@diegesis/dice-notation) — canonical notation.
- [@diegesis/dice-foundry-notation](https://www.npmjs.com/package/@diegesis/dice-foundry-notation) — Foundry VTT dialect.
- [@diegesis/dice-notation-core](https://www.npmjs.com/package/@diegesis/dice-notation-core) — shared parser/serializer machinery.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
