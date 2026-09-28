import type { RollExpr } from '@diegesis/dice-core';
import { fromFormula as parseFormula } from '@diegesis/dice-notation-core';
import { dialect } from './dialect';

export function fromFormula(source: string): RollExpr {
  return parseFormula(dialect, source);
}
