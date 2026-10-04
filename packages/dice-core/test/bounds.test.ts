import { describe, expect, test } from 'bun:test';
import { fromFormula } from '@diegesis/dice-notation';
import { exprBounds } from '../src/bounds';

describe('exprBounds', () => {
  test('static numbers', () => {
    expect(exprBounds(5)).toEqual({ min: 5, max: 5 });
  });

  test('simple dice', () => {
    expect(exprBounds(fromFormula('1d20'))).toEqual({ min: 1, max: 20 });
    expect(exprBounds(fromFormula('2d6'))).toEqual({ min: 2, max: 12 });
    expect(exprBounds(fromFormula('d%'))).toEqual({ min: 1, max: 100 });
  });

  test('arithmetic', () => {
    expect(exprBounds(fromFormula('1d20 + 5'))).toEqual({ min: 6, max: 25 });
    expect(exprBounds(fromFormula('2d6 * 2'))).toEqual({ min: 4, max: 24 });
    expect(exprBounds(fromFormula('10 - 1d6'))).toEqual({ min: 4, max: 9 });
  });

  test('keep/drop', () => {
    expect(exprBounds(fromFormula('4d6kh3'))).toEqual({ min: 3, max: 18 });
    expect(exprBounds(fromFormula('2d20dh1'))).toEqual({ min: 1, max: 20 });
  });

  test('unbounded modifiers return null', () => {
    expect(exprBounds(fromFormula('1d6!'))).toBeNull();
  });

  test('variables return null', () => {
    expect(exprBounds(fromFormula('1d20 + @atq'))).toBeNull();
  });

  test('fate and coin dice', () => {
    expect(exprBounds(fromFormula('4dF'))).toEqual({ min: -4, max: 4 });
    // coin dice roll 1..2 (d2 convention, matches resolveFaces)
    expect(exprBounds(fromFormula('1dC'))).toEqual({ min: 1, max: 2 });
  });

  test('success-counting modifiers', () => {
    expect(exprBounds(fromFormula('5d10cs>=8'))).toEqual({ min: 0, max: 5 });
    // deduct/subtract-failure yield successes − failures (can go negative)
    expect(exprBounds(fromFormula('8d6df<=2'))).toEqual({ min: -8, max: 8 });
    expect(exprBounds(fromFormula('8d6sf<=2'))).toEqual({ min: -8, max: 8 });
  });

  test('min/max clamps', () => {
    expect(exprBounds(fromFormula('min(1d20, 15)'))).toEqual({ min: 1, max: 15 });
  });

  test('contradictory die clamps pin to a constant', () => {
    // every die is clamped up to 8 → constant 8 (no inversion)
    expect(exprBounds(fromFormula('1d6min8'))).toEqual({ min: 8, max: 8 });
    // min 5 then max 2 → every die pinned to 2
    expect(exprBounds(fromFormula('1d6min5max2'))).toEqual({ min: 2, max: 2 });
  });
});
