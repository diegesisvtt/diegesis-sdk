export type InlineMathCommand =
  | { kind: 'set'; value: number }
  | { kind: 'add'; operand: number }
  | { kind: 'subtract'; operand: number }
  | { kind: 'multiply'; operand: number }
  | { kind: 'divide'; operand: number };

const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const OPERAND_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/;

const OPERATORS = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  x: 'multiply',
  X: 'multiply',
  '/': 'divide',
} as const;

export function parseInlineMath(input: string): InlineMathCommand | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.startsWith('=')) {
    const raw = trimmed.slice(1).trim();
    if (!NUMBER_PATTERN.test(raw)) return null;
    return { kind: 'set', value: Number(raw) };
  }

  const operator = trimmed[0] as keyof typeof OPERATORS;
  const kind = OPERATORS[operator];
  if (kind === undefined) {
    if (!NUMBER_PATTERN.test(trimmed)) return null;
    return { kind: 'set', value: Number(trimmed) };
  }

  const operand = parseOperand(trimmed.slice(1));
  if (operand === null) return null;
  if (kind === 'divide' && operand === 0) return null;

  return { kind, operand };
}

function parseOperand(raw: string): number | null {
  const trimmed = raw.trim();
  if (!OPERAND_PATTERN.test(trimmed)) return null;
  return Number(trimmed);
}
