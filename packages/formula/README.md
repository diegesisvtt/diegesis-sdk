# @diegesis/formula

> Tiny, jsep-powered formula IR for Diegesis — json-logic-shaped AST that travels over the event bus, persists to documents, and runs with no eval.

Formulas are parsed into a plain-data, json-logic-shaped intermediate representation (IR). The IR is serializable (it survives `JSON.stringify` and Valibot validation, so it can ride an `@diegesis/events` contract or persist to a document) and stays inert data until you explicitly evaluate or compile it. No `eval` is ever used by the standard evaluator.

## Installation

```bash
npm install @diegesis/formula
```

## Quick start

```ts
import { parseFormula, evaluateFormula, toFormula } from '@diegesis/formula';

const expr = parseFormula('floor((str - 10) / 2)');
// { floor: [ { '/': [ { '-': [ { var: 'str' }, 10 ] }, 2 ] } ] }

evaluateFormula(expr, { scope: { str: 16 } }); // 3
toFormula(expr);                               // 'floor((str - 10) / 2)'
```

## API

### Types

```ts
type BinaryOp = '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '<=' | '>' | '>=';
type UnaryOp = '!';
type FuncOp = 'floor' | 'ceil' | 'round' | 'abs' | 'min' | 'max' | 'clamp';
type NodeKey = BinaryOp | UnaryOp | 'and' | 'or' | 'if' | 'var' | FuncOp;

type FormulaExpr<E = never> =
  | number
  | boolean
  | { '+': [FormulaExpr<E>, FormulaExpr<E>] }
  | { '-': [FormulaExpr<E>] | [FormulaExpr<E>, FormulaExpr<E>] }
  // ... one key per BinaryOp, plus:
  | { and: FormulaExpr<E>[] }
  | { or: FormulaExpr<E>[] }
  | { '!': [FormulaExpr<E>] }
  | { if: [FormulaExpr<E>, FormulaExpr<E>, FormulaExpr<E>] }
  | { var: string }
  | { floor: [FormulaExpr<E>] }
  | { ceil: [FormulaExpr<E>] }
  | { round: [FormulaExpr<E>] }
  | { abs: [FormulaExpr<E>] }
  | { min: FormulaExpr<E>[] }
  | { max: FormulaExpr<E>[] }
  | { clamp: [FormulaExpr<E>, FormulaExpr<E>, FormulaExpr<E>] }
  | E;

type PureFormula = FormulaExpr<never>;
type FormulaLeaf<E> = Exclude<E, FormulaExpr>;
```

The `E` type parameter is an extension slot for embedding custom leaf nodes (for example, dice terms) inside arithmetic expressions. `PureFormula` (the default) forbids leaves, giving a closed, fully evaluable tree.

Constants: `BINARY_OPS`, `UNARY_OPS`, `FUNC_OPS`, `ALL_NODE_KEYS` (readonly arrays of the corresponding operator keys).

### `parseFormula<E>(source): FormulaExpr<E>`

Parses a formula string into IR. Grammar: numbers, booleans, `+ - * / %`, comparisons, `&& || !` plus word aliases `and`/`or`/`not`, ternary `?:`, dotted paths (`a.b.c` becomes `{ var: 'a.b.c' }`), and function calls limited to `FUNC_OPS`. The parser rejects strings, `null`, regexes, computed member access, bitwise operators, `===`, and unknown functions. It throws `FormulaError` with the offending `position`.

### `toFormula<E>(expr): string`

Serializes an expression back to a string with minimal parentheses.

```ts
toFormula(parseFormula('(a + b) * c')); // '(a + b) * c'
toFormula(parseFormula('a + b * c'));   // 'a + b * c'
```

### `evaluateFormula<E>(expr, options?): number | boolean`

```ts
function evaluateFormula<E = never>(
  expr: FormulaExpr<E>,
  options?: {
    scope?: Scope;                            // Record<string, unknown> | undefined
    onLeaf?: (leaf: E, scope: Scope) => number | boolean;
  },
): number | boolean;
```

`and`/`or` short-circuit. Division or modulo by zero throws `FormulaError`. Extension leaf nodes delegate to `onLeaf`; without a handler they throw.

```ts
import { evaluateFormula, type FormulaExpr } from '@diegesis/formula';

type Leaf = { roll: { sides: number } };
const expr = { '+': [1, { roll: { sides: 6 } }] } as FormulaExpr<Leaf>;

evaluateFormula<Leaf>(expr, {
  onLeaf: (leaf) => Math.ceil(Math.random() * leaf.roll.sides),
});
```

### `compileFormula(expr): CompiledFormula`

```ts
type CompiledFormula = (scope?: Scope) => number | boolean;
function compileFormula(expr: PureFormula): CompiledFormula;
```

JIT-compiles a pure formula to a native function via `new Function`. Throws for extension leaf nodes — only `PureFormula` trees can be compiled.

```ts
import { parseFormula, compileFormula } from '@diegesis/formula';

const fast = compileFormula(parseFormula('floor((str - 10) / 2)'));
fast({ str: 16 }); // 3
```

### `createMemoizedEvaluator<E>(options?)`

```ts
function createMemoizedEvaluator<E = never>(options?: {
  onLeaf?: LeafHandler<E>;
}): (expr: FormulaExpr<E>, scope?: Scope) => number | boolean;
```

Caches results per AST identity (`WeakMap`) keyed on the JSON values of the extracted variables.

```ts
import { parseFormula, createMemoizedEvaluator } from '@diegesis/formula';

const evaluate = createMemoizedEvaluator();
const expr = parseFormula('str * 2 + con');
evaluate(expr, { str: 16, con: 12 }); // computed
evaluate(expr, { str: 16, con: 12 }); // cache hit
```

### Introspection

```ts
function extractVariables<E>(expr: FormulaExpr<E>): readonly string[];
function extractLeaves<E>(expr: FormulaExpr<E>): readonly E[];
function isLiteral(value: unknown): value is number | boolean;
function nodeKey<E>(node: FormulaExpr<E>): NodeKey | 'leaf' | 'literal';
```

```ts
extractVariables(parseFormula('str + max(con, 10)')); // ['str', 'con']
```

### Scope helpers

```ts
type Scope = Record<string, unknown> | undefined;

function resolvePath(scope: Scope, path: string): unknown;
function toNumber(value: unknown): number;
function isTruthy(value: unknown): boolean;
```

- `resolvePath` checks for an exact key first, then walks the path dot by dot.
- `toNumber`: booleans become `0`/`1`, `null`/`undefined` become `0`, `NaN` becomes `0`.
- `isTruthy`: `0`, `NaN`, `''`, `null`, and `undefined` are falsy; everything else is truthy.

### Validation (Valibot)

```ts
function createFormulaSchema(extra?: v.GenericSchema): v.GenericSchema;
const formulaSchema: v.GenericSchema;
```

A recursive Valibot schema (via `v.lazy`) that validates formula IR. Pass an `extra` schema to also accept extension leaves. Because it is a standard Valibot schema, it can be dropped directly into an `@diegesis/events` contract or used to validate persisted documents.

```ts
import * as v from 'valibot';
import { formulaSchema } from '@diegesis/formula';

const expr = v.parse(formulaSchema, JSON.parse(jsonFromDisk));
```

### Errors

```ts
class FormulaError extends Error {
  position?: number;
  input?: string;
  constructor(message: string, options?: { position?: number; input?: string; cause?: unknown });
  toString(): string; // appends position info when available
}
```

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
