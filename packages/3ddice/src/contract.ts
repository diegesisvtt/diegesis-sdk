import * as v from 'valibot';
import type { FacesSpec } from '@diegesis/dice-core';

import { DiceError } from './errors';

export type FacesInput = number | FacesSpec;

export type DieResultInput = number | readonly number[];

export interface DiceTerm {
  faces: FacesInput;
  results: readonly DieResultInput[];
  colorset?: string;
}

export interface NormalizedDie {
  type: string;
  value: number;
  faces: FacesSpec;
  step: number;
  colorset?: string;
}

export interface NormalizedTerm {
  faces: FacesSpec;
  dice: NormalizedDie[];
}

export const FacesSpecSchema = v.union([
  v.object({ kind: v.literal('number'), value: v.pipe(v.number(), v.integer(), v.minValue(2)) }),
  v.object({ kind: v.literal('percentile') }),
  v.object({ kind: v.literal('fate') }),
  v.object({ kind: v.literal('coin') }),
  v.object({ kind: v.literal('expr'), value: v.any() }),
]);

const ResultValueSchema = v.pipe(v.number(), v.integer());

export const DiceTermSchema = v.object({
  faces: v.union([v.pipe(v.number(), v.integer(), v.minValue(2)), FacesSpecSchema]),
  results: v.pipe(
    v.array(v.union([ResultValueSchema, v.pipe(v.array(ResultValueSchema), v.minLength(1))])),
    v.minLength(1)
  ),
  colorset: v.optional(v.string()),
});

export const DiceTermsSchema = v.pipe(v.array(DiceTermSchema), v.minLength(1));

const NUMBER_DICE_TYPES = new Set(['d2', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);

function normalizeFaces(input: FacesInput): FacesSpec {
  return typeof input === 'number' ? { kind: 'number', value: input } : input;
}

function dieTypeFor(faces: FacesSpec): string {
  switch (faces.kind) {
    case 'number':
      return `d${faces.value}`;
    case 'percentile':
      return 'd100';
    case 'coin':
      return 'd2';
    case 'fate':
      throw new DiceError('Fate dice have no 3D representation', 'UNSUPPORTED_FACES');
    case 'expr':
      throw new DiceError('Expression faces must be resolved by the caller', 'UNSUPPORTED_FACES');
  }
}

export function isTensDie(faces: FacesSpec): boolean {
  return faces.kind === 'percentile' || (faces.kind === 'number' && faces.value === 100);
}

export function assertResultInRange(faces: FacesSpec, value: number): void {
  if (isTensDie(faces)) {
    if (value < 10 || value > 100 || value % 10 !== 0) {
      throw new DiceError(
        `Percentile result ${value} must be a multiple of 10 in 10..100 (tens die only; pair with a d10 term for units)`,
        'RESULT_OUT_OF_RANGE'
      );
    }
    return;
  }

  switch (faces.kind) {
    case 'number':
      if (value < 1 || value > faces.value) {
        throw new DiceError(`Result ${value} out of range 1..${faces.value}`, 'RESULT_OUT_OF_RANGE');
      }
      return;
    case 'coin':
      if (value !== 1 && value !== 2) {
        throw new DiceError(`Coin result ${value} must be 1 or 2`, 'RESULT_OUT_OF_RANGE');
      }
      return;
    default:
      return;
  }
}

export function normalizeTerms(input: unknown): NormalizedTerm[] {
  let terms: DiceTerm[];
  try {
    terms = v.parse(DiceTermsSchema, input) as DiceTerm[];
  } catch (error) {
    throw new DiceError(
      `Invalid dice terms: ${error instanceof Error ? error.message : String(error)}`,
      'INVALID_TERMS'
    );
  }

  return terms.map((term) => {
    const faces = normalizeFaces(term.faces);
    const type = dieTypeFor(faces);
    if (!NUMBER_DICE_TYPES.has(type)) {
      throw new DiceError(`No 3D preset for die type "${type}"`, 'UNSUPPORTED_DIE_TYPE');
    }
    const dice: NormalizedDie[] = [];
    for (const item of term.results) {
      const chain = typeof item === 'number' ? [item] : item;
      chain.forEach((value, step) => {
        assertResultInRange(faces, value);
        dice.push({ type, value, faces, step, colorset: term.colorset });
      });
    }
    return { faces, dice };
  });
}
