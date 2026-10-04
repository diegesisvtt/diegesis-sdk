import { describe, expect, test } from 'bun:test';
import { evaluateRoll } from '@diegesis/dice-core';
import { fromFormula } from '@diegesis/dice-notation';
import { termsFromRoll } from '../src/terms-from-roll';

describe('termsFromRoll', () => {
  test('simple dice map 1:1', () => {
    const expr = fromFormula('2d6 + 3');
    const roll = evaluateRoll(expr);
    const terms = termsFromRoll(expr, roll);
    expect(terms).not.toBeNull();
    expect(terms!.length).toBe(1);
    expect(terms![0].faces).toEqual({ kind: 'number', value: 6 });
    expect(terms![0].results.length).toBe(2);
    const sum = (terms![0].results as number[]).reduce((a, b) => a + b, 0);
    expect(sum + 3).toBe(Number(roll.value));
  });

  test('mixed dice keep document order', () => {
    const expr = fromFormula('1d4 + 1d20');
    const roll = evaluateRoll(expr);
    const terms = termsFromRoll(expr, roll)!;
    expect(terms.map((t) => t.faces)).toEqual([
      { kind: 'number', value: 4 },
      { kind: 'number', value: 20 },
    ]);
    const total = terms.flatMap((t) => t.results as number[]).reduce((a, b) => a + b, 0);
    expect(total).toBe(Number(roll.value));
  });

  test('percentile splits into tens + units', () => {
    const expr = fromFormula('d%');
    const roll = evaluateRoll(expr);
    const terms = termsFromRoll(expr, roll)!;
    expect(terms.length).toBe(2);
    expect(terms[0].faces).toEqual({ kind: 'percentile' });
    expect(terms[1].faces).toBe(10);
    const tens = terms[0].results[0] as number;
    const units = terms[1].results[0] as number;
    expect(tens % 10).toBe(0);
    expect(tens).toBeGreaterThanOrEqual(10);
    expect(tens).toBeLessThanOrEqual(100);
    const reconstructed = (tens === 100 ? 0 : tens) + (units === 10 ? 0 : units);
    expect(reconstructed === 0 ? 100 : reconstructed).toBe(Number(roll.value));
  });

  test('fate dice are not animatable', () => {
    const expr = fromFormula('4dF');
    const roll = evaluateRoll(expr);
    expect(termsFromRoll(expr, roll)).toBeNull();
  });

  test('coin dice map verbatim to d2 (1..2)', () => {
    const expr = fromFormula('1dc');
    const roll = evaluateRoll(expr);
    const terms = termsFromRoll(expr, roll)!;
    expect(terms.length).toBe(1);
    expect(terms[0].faces).toEqual({ kind: 'coin' });
    expect(terms[0].results.length).toBe(1);
    const coin = terms[0].results[0] as number;
    expect(coin === 1 || coin === 2).toBe(true);
  });

  test('plain d100 decomposes like a percentile', () => {
    const expr = fromFormula('1d100');
    const roll = evaluateRoll(expr);
    const terms = termsFromRoll(expr, roll)!;
    expect(terms.length).toBe(2);
    expect(terms[0].faces).toEqual({ kind: 'percentile' });
    expect(terms[1].faces).toBe(10);
    const tens = terms[0].results[0] as number;
    const units = terms[1].results[0] as number;
    const reconstructed = (tens === 100 ? 0 : tens) + (units === 10 ? 0 : units);
    expect(reconstructed === 0 ? 100 : reconstructed).toBe(Number(roll.value));
  });

  test('no dice → null', () => {
    const expr = fromFormula('5 + 3');
    const roll = evaluateRoll(expr);
    expect(termsFromRoll(expr, roll)).toBeNull();
  });
});
