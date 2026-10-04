import { describe, expect, test } from 'bun:test';
import { parseInlineMath } from '../src/parse.js';

describe('parseInlineMath', () => {
  test('parses a plain number as set', () => {
    expect(parseInlineMath('10')).toEqual({ kind: 'set', value: 10 });
    expect(parseInlineMath('2.5')).toEqual({ kind: 'set', value: 2.5 });
    expect(parseInlineMath('.5')).toEqual({ kind: 'set', value: 0.5 });
  });

  test('parses = as explicit set, including negatives', () => {
    expect(parseInlineMath('=-7')).toEqual({ kind: 'set', value: -7 });
    expect(parseInlineMath('=10')).toEqual({ kind: 'set', value: 10 });
    expect(parseInlineMath('=+3')).toEqual({ kind: 'set', value: 3 });
  });

  test('parses + and - as deltas', () => {
    expect(parseInlineMath('+5')).toEqual({ kind: 'add', operand: 5 });
    expect(parseInlineMath('-5')).toEqual({ kind: 'subtract', operand: 5 });
  });

  test('parses * and / as deltas', () => {
    expect(parseInlineMath('*2')).toEqual({ kind: 'multiply', operand: 2 });
    expect(parseInlineMath('x2')).toEqual({ kind: 'multiply', operand: 2 });
    expect(parseInlineMath('/4')).toEqual({ kind: 'divide', operand: 4 });
  });

  test('trims whitespace', () => {
    expect(parseInlineMath('  +5  ')).toEqual({ kind: 'add', operand: 5 });
    expect(parseInlineMath(' = -7 ')).toEqual({ kind: 'set', value: -7 });
  });

  test('accepts decimal operands', () => {
    expect(parseInlineMath('+2.5')).toEqual({ kind: 'add', operand: 2.5 });
    expect(parseInlineMath('/0.5')).toEqual({ kind: 'divide', operand: 0.5 });
  });

  test('rejects division by zero', () => {
    expect(parseInlineMath('/0')).toBeNull();
  });

  test('parses comma decimal separator', () => {
    expect(parseInlineMath('2,5')).toEqual({ kind: 'set', value: 2.5 });
    expect(parseInlineMath(',5')).toEqual({ kind: 'set', value: 0.5 });
    expect(parseInlineMath('+1,5')).toEqual({ kind: 'add', operand: 1.5 });
    expect(parseInlineMath('=3,75')).toEqual({ kind: 'set', value: 3.75 });
    expect(parseInlineMath('/2,5')).toEqual({ kind: 'divide', operand: 2.5 });
  });

  test('treats separator + exactly 3 trailing digits as thousands', () => {
    expect(parseInlineMath('1,000')).toEqual({ kind: 'set', value: 1000 });
    expect(parseInlineMath('1.000')).toEqual({ kind: 'set', value: 1000 });
    expect(parseInlineMath('12,500')).toEqual({ kind: 'set', value: 12500 });
    expect(parseInlineMath('=2,000')).toEqual({ kind: 'set', value: 2000 });
    expect(parseInlineMath('+1,500')).toEqual({ kind: 'add', operand: 1500 });
    // longer/shorter fractions stay decimal
    expect(parseInlineMath('1,25')).toEqual({ kind: 'set', value: 1.25 });
    expect(parseInlineMath('1,2345')).toEqual({ kind: 'set', value: 1.2345 });
  });

  test('rejects invalid input', () => {
    expect(parseInlineMath('')).toBeNull();
    expect(parseInlineMath('   ')).toBeNull();
    expect(parseInlineMath('abc')).toBeNull();
    expect(parseInlineMath('+')).toBeNull();
    expect(parseInlineMath('=')).toBeNull();
    expect(parseInlineMath('=abc')).toBeNull();
    expect(parseInlineMath('++5')).toBeNull();
    expect(parseInlineMath('5+5')).toBeNull();
  });
});
