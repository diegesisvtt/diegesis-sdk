import { parseInlineMath, type InlineMathCommand } from './parse.js';

export interface InlineMathResult {
  value: number;
  command: InlineMathCommand;
}

export function applyInlineMath(
  current: number,
  input: string,
): InlineMathResult | null {
  const command = parseInlineMath(input);
  if (command === null) return null;

  switch (command.kind) {
    case 'set':
      return { value: command.value, command };
    case 'add':
      return { value: current + command.operand, command };
    case 'subtract':
      return { value: current - command.operand, command };
    case 'multiply':
      return { value: current * command.operand, command };
    case 'divide':
      return { value: current / command.operand, command };
  }
}
