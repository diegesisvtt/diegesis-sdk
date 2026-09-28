# @diegesis/inline-math

> Zero-dependency inline math commands for numeric inputs — apply +5, -5, *2, /2 or =10 against a current value.

A tiny parser/evaluator for calculator-style edits in numeric fields (HP, attributes, currencies…). Users type a command like `+5` or `/2` and the package tells you the new value. Pure functions, no dependencies, SSR-safe.

## Installation

```bash
npm install @diegesis/inline-math
```

## Quick start

```ts
import { applyInlineMath } from '@diegesis/inline-math';

applyInlineMath(10, '+5')?.value;   // 15
applyInlineMath(10, '-5')?.value;   // 5
applyInlineMath(10, '*2')?.value;   // 20
applyInlineMath(10, '/2')?.value;   // 5
applyInlineMath(10, '=-7')?.value;  // -7
applyInlineMath(10, 'abc');         // null (invalid input)
```

## API

### `parseInlineMath(input): InlineMathCommand | null`

```ts
type InlineMathCommand =
  | { kind: 'set'; value: number }
  | { kind: 'add'; operand: number }
  | { kind: 'subtract'; operand: number }
  | { kind: 'multiply'; operand: number }
  | { kind: 'divide'; operand: number };

function parseInlineMath(input: string): InlineMathCommand | null;
```

Parses a command string. Returns `null` for empty or invalid input.

```ts
import { parseInlineMath } from '@diegesis/inline-math';

parseInlineMath('10');  // { kind: 'set', value: 10 }
parseInlineMath('=+3'); // { kind: 'set', value: 3 }
parseInlineMath('+5');  // { kind: 'add', operand: 5 }
parseInlineMath('-5');  // { kind: 'subtract', operand: 5 }
parseInlineMath('x2');  // { kind: 'multiply', operand: 2 }
parseInlineMath('/0');  // null (division by zero rejected)
```

### `applyInlineMath(current, input): InlineMathResult | null`

```ts
interface InlineMathResult {
  value: number;
  command: InlineMathCommand;
}

function applyInlineMath(current: number, input: string): InlineMathResult | null;
```

Parses `input` and applies it against `current`. Returns the new `value` together with the parsed `command`, or `null` for invalid input.

## Command syntax

| Input | Meaning | Notes |
| --- | --- | --- |
| `10`, `2.5`, `.5`, `-7` | Set to the number | A bare number is a set. |
| `=10`, `=-7`, `=+3` | Explicit set | Accepts signed numbers. |
| `+5`, `+2.5` | Add to current | |
| `-5` | Subtract from current | |
| `*2`, `x2`, `X2` | Multiply current | `x`/`X` are aliases for `*`. |
| `/2`, `/0.5` | Divide current | `/0` is rejected (`null`). |

- Surrounding whitespace is ignored (`'  +5  '` works); space after the operator is allowed (`'= -7'`).
- Operands must be unsigned decimals — relative commands with negative operands (`+-5`), expressions (`5+5`), and non-numeric input are rejected.
- Results use plain IEEE-754 arithmetic (e.g. `0.1 + 0.2` is not exactly `0.3`); round at the UI layer if needed.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
