# @diegesis/dice-notation-core

> Dialect-parametrized lexer, parser and serializer core for Diegesis dice notations — shared machinery behind @diegesis/dice-notation, @diegesis/dice-foundry-notation and @diegesis/dice-roll20-notation.

`@diegesis/dice-notation-core` implements the full lexer, recursive-descent parser, and serializer for dice notation, parametrized by a `DialectConfig`. Each published dialect package is a thin wrapper that supplies its own config (sigils, attribute syntax, face letters, implicit behaviors). Use this package directly when you want to build a new dialect; use one of the dialect packages for ready-made parsing.

## Installation

```bash
npm install @diegesis/dice-notation-core
```

## Quick start

Build a minimal dialect and use the shared pipeline: parse text to the `@diegesis/dice-core` IR, evaluate it, serialize it back.

```ts
import {
  fromFormula,
  toFormula,
  buildModifierPatterns,
  NotationErrorBase,
  type DialectConfig,
  type NotationErrorOptions,
} from '@diegesis/dice-notation-core';
import { evaluateRoll } from '@diegesis/dice-core';

class MyNotationError extends NotationErrorBase {
  constructor(message: string, options: NotationErrorOptions = {}) {
    super('MyNotationError', message, options);
  }
}

const dialect: DialectConfig = {
  name: 'mine',
  createError: (message, options) => new MyNotationError(message, options),
  modifierPatterns: buildModifierPatterns({ kh: 'keep-highest' }),
  ambiguousAliases: [],
  implicitCountSuccess: false,
  rerollBareNumber: false,
  explodeCap: false,
  noArgOps: [],
  coinFaces: false,
  facesHint: '6',
  bracedAttributes: false,
  sigils: { 'keep-highest': 'kh' },
  fateFace: 'F',
  coinFace: 'coin',
  rerollOmitEquals: false,
  countSuccessBare: false,
};

const expr = fromFormula(dialect, '4d6kh3'); // text -> IR
const result = evaluateRoll(expr, { seed: 'demo' });
result.value;                                 // deterministic value

toFormula(dialect, expr);                     // IR -> text: '4d6kh3'
```

## API

### Lexer

```ts
function tokenize(source: string): Token[];

type TokenType =
  | 'num' | 'word'
  | 'plus' | 'dash' | 'star' | 'slash' | 'percent'
  | 'lparen' | 'rparen' | 'lbrace' | 'rbrace'
  | 'comma' | 'colon' | 'question' | 'bang'
  | 'at' | 'dot' | 'pipe'
  | 'eq' | 'gt' | 'ge' | 'lt' | 'le'
  | 'eof';

interface Token {
  readonly type: TokenType;
  readonly text: string;
  readonly value?: number; // set for 'num' tokens
  readonly start: number;
  readonly end: number;
}
```

The lexer skips whitespace, treats everything after `#` as a comment, recognizes decimal numbers, and throws `SyntaxError` on unexpected characters.

### Parser and serializer

Both functions take a dialect config as the first argument.

```ts
function fromFormula(dialect: DialectConfig, source: string): RollExpr;
function toFormula(dialect: DialectConfig, expr: RollExpr): string;
```

The parser handles arithmetic with precedence (`* /` bind tighter than `+ -`, unary `-`), dice terms `NdX` with implicit count, faces (number, `%` percentile, fate, optional coin, parenthesized expressions), pools `{expr, expr}`, variable references (`@path.to.data` or `@{attr}` depending on `bracedAttributes`), function calls (`floor`, `ceil`, `round`, `abs`, `min`, `max`, `clamp`), and modifier lists with optional comparisons. Errors are created through `dialect.createError` and carry `position` and `input`.

The serializer is precedence-aware (inserts parentheses only where needed) and prints variables, faces, and modifier sigils according to the dialect config.

### `DialectConfig`

```ts
interface DialectConfig {
  readonly name: string;
  readonly createError: NotationErrorFactory;
  readonly modifierPatterns: readonly ModPattern[];
  readonly ambiguousAliases: readonly string[];
  readonly implicitCountSuccess: boolean;   // bare comparison after a die -> count-success
  readonly rerollBareNumber: boolean;       // `r1` means reroll on `= 1`
  readonly explodeCap: boolean;             // `!3>5` parses a numeric cap
  readonly noArgOps: readonly ModifierOp[];
  readonly coinFaces: boolean;              // accept `coin`/`c` faces
  readonly facesHint: string;               // used in error messages
  readonly bracedAttributes: boolean;       // `@{attr}` vs `@path`
  readonly sigils: Readonly<Record<string, string>>; // canonical op -> printed sigil
  readonly fateFace: string;                // printed fate face, e.g. 'F' or 'f'
  readonly coinFace: string;                // printed coin face
  readonly rerollOmitEquals: boolean;       // serialize `r=1` as `r1`
  readonly countSuccessBare: boolean;       // serialize count-success as a bare comparison
}
```

### Keyword helpers

```ts
interface ModPattern {
  readonly tokens: readonly string[];
  readonly op: ModifierOp;
}

const FUNCTIONS: readonly string[]; // ['floor', 'ceil', 'round', 'abs', 'min', 'max', 'clamp']

function isFunctionName(name: string): boolean;
function canonicalToTokens(name: string): readonly string[];   // 'keep-highest' -> ['keep', '-', 'highest']
function aliasToTokens(alias: string): readonly string[];      // '!p' -> ['!', 'p']
function buildModifierPatterns(
  sigils: Readonly<Record<string, ModifierOp>>,
): readonly ModPattern[]; // sorted longest-first for greedy matching
```

`buildModifierPatterns` turns a sigil table into match patterns, already sorted so longer patterns win.

### Errors

```ts
interface NotationErrorOptions {
  readonly position?: number;
  readonly input?: string;
  readonly cause?: unknown;
}

type NotationErrorFactory = (message: string, options: NotationErrorOptions) => Error;

class NotationErrorBase extends Error {
  readonly position?: number;
  readonly input?: string;
  constructor(name: string, message: string, options?: NotationErrorOptions);
}
```

Extend `NotationErrorBase` to give your dialect a branded error type, as the dialect packages do (`NotationError`, `FoundryNotationError`, `Roll20NotationError`).

## Related packages

The IR flow: notation parsers produce the `@diegesis/dice-core` `RollExpr` IR, `dice-core` evaluates it deterministically, serializers print it back.

- [@diegesis/dice-core](https://www.npmjs.com/package/@diegesis/dice-core) — the IR types and seeded evaluator consumed here.
- [@diegesis/dice-notation](https://www.npmjs.com/package/@diegesis/dice-notation) — canonical dialect built on this core.
- [@diegesis/dice-foundry-notation](https://www.npmjs.com/package/@diegesis/dice-foundry-notation) — Foundry VTT dialect.
- [@diegesis/dice-roll20-notation](https://www.npmjs.com/package/@diegesis/dice-roll20-notation) — Roll20 dialect.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
