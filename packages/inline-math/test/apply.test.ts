import { describe, expect, test } from 'bun:test';
import { applyInlineMath } from '../src/apply.js';

describe('applyInlineMath', () => {
  test('plain number sets the value', () => {
    expect(applyInlineMath(10, '5')?.value).toBe(5);
  });

  test('+ adds to the current value', () => {
    expect(applyInlineMath(10, '+5')?.value).toBe(15);
    expect(applyInlineMath(-3, '+5')?.value).toBe(2);
  });

  test('- subtracts from the current value', () => {
    expect(applyInlineMath(10, '-5')?.value).toBe(5);
    expect(applyInlineMath(10, '-15')?.value).toBe(-5);
  });

  test('* multiplies the current value', () => {
    expect(applyInlineMath(10, '*2')?.value).toBe(20);
  });

  test('/ divides the current value', () => {
    expect(applyInlineMath(10, '/2')?.value).toBe(5);
  });

  test('= sets explicitly, including negatives', () => {
    expect(applyInlineMath(10, '=-7')?.value).toBe(-7);
    expect(applyInlineMath(10, '=0')?.value).toBe(0);
  });

  test('returns the command alongside the value', () => {
    const result = applyInlineMath(10, '+5');
    expect(result?.command).toEqual({ kind: 'add', operand: 5 });
  });

  test('returns null for invalid input', () => {
    expect(applyInlineMath(10, 'abc')).toBeNull();
    expect(applyInlineMath(10, '/0')).toBeNull();
    expect(applyInlineMath(10, '')).toBeNull();
  });

  test('handles decimal arithmetic', () => {
    expect(applyInlineMath(0.1, '+0.2')?.value).toBeCloseTo(0.3);
    expect(applyInlineMath(1, '/3')?.value).toBeCloseTo(1 / 3);
  });
});
