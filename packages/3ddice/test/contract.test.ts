import { describe, expect, it } from 'bun:test';

import { normalizeTerms } from '../src/contract';
import { DiceError } from '../src/errors';

describe('normalizeTerms', () => {
  it('normaliza faces numéricas shorthand', () => {
    const [term] = normalizeTerms([{ faces: 20, results: [17] }]);
    expect(term.faces).toEqual({ kind: 'number', value: 20 });
    expect(term.dice).toHaveLength(1);
    expect(term.dice[0]).toMatchObject({ type: 'd20', value: 17 });
  });

  it('expande múltiplos resultados em um dado por valor', () => {
    const [term] = normalizeTerms([{ faces: 6, results: [1, 2, 3, 4] }]);
    expect(term.dice.map((d) => d.value)).toEqual([1, 2, 3, 4]);
    expect(term.dice.every((d) => d.type === 'd6')).toBe(true);
  });

  it('mapeia percentile para d100 e coin para d2', () => {
    const [percentile, coin] = normalizeTerms([
      { faces: { kind: 'percentile' }, results: [40] },
      { faces: { kind: 'coin' }, results: [1] },
    ]);
    expect(percentile.dice[0].type).toBe('d100');
    expect(coin.dice[0].type).toBe('d2');
  });

  it('propaga colorset do termo para os dados', () => {
    const [term] = normalizeTerms([{ faces: 8, results: [5], colorset: 'obsidian' }]);
    expect(term.dice[0].colorset).toBe('obsidian');
  });

  it('expande cadeias de explosão em dados com step crescente', () => {
    const [term] = normalizeTerms([{ faces: 6, results: [[6, 6, 4], 2] }]);
    expect(term.dice).toHaveLength(4);
    expect(term.dice.map((d) => [d.value, d.step])).toEqual([
      [6, 0],
      [6, 1],
      [4, 2],
      [2, 0],
    ]);
  });

  it('valida cada valor da cadeia contra o range', () => {
    expect(() => normalizeTerms([{ faces: 6, results: [[6, 7]] }])).toThrow(DiceError);
    expect(() => normalizeTerms([{ faces: 6, results: [[]] }])).toThrow(DiceError);
  });

  it('rejeita resultado fora do range', () => {
    expect(() => normalizeTerms([{ faces: 6, results: [7] }])).toThrow(DiceError);
    expect(() => normalizeTerms([{ faces: 6, results: [0] }])).toThrow(DiceError);
  });

  it('rejeita percentile fora das dezenas', () => {
    expect(() => normalizeTerms([{ faces: { kind: 'percentile' }, results: [47] }])).toThrow(DiceError);
    expect(() => normalizeTerms([{ faces: { kind: 'percentile' }, results: [0] }])).toThrow(DiceError);
  });

  it('trata d100 numérico como dado de dezenas', () => {
    const [term] = normalizeTerms([{ faces: 100, results: [40] }]);
    expect(term.dice[0].type).toBe('d100');
    expect(() => normalizeTerms([{ faces: 100, results: [37] }])).toThrow(DiceError);
    expect(() => normalizeTerms([{ faces: { kind: 'number', value: 100 }, results: [5] }])).toThrow(DiceError);
  });

  it('rejeita coin fora de 1..2', () => {
    expect(() => normalizeTerms([{ faces: { kind: 'coin' }, results: [3] }])).toThrow(DiceError);
  });

  it('rejeita faces fate e expr (não visualizáveis)', () => {
    expect(() => normalizeTerms([{ faces: { kind: 'fate' }, results: [0] }])).toThrow(DiceError);
    expect(() =>
      normalizeTerms([{ faces: { kind: 'expr', value: 6 }, results: [3] }])
    ).toThrow(DiceError);
  });

  it('rejeita tipo de dado sem preset 3D', () => {
    expect(() => normalizeTerms([{ faces: 7, results: [3] }])).toThrow(DiceError);
  });

  it('rejeita results vazio ou ausente', () => {
    expect(() => normalizeTerms([{ faces: 6, results: [] }])).toThrow(DiceError);
    expect(() => normalizeTerms([{ faces: 6 }])).toThrow(DiceError);
  });

  it('rejeita valores não inteiros', () => {
    expect(() => normalizeTerms([{ faces: 6, results: [2.5] }])).toThrow(DiceError);
  });
});
