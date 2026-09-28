import type { RollExpr } from '@diegesis/dice-core';
import { toFormula as printFormula } from '@diegesis/dice-notation-core';
import { dialect } from './dialect';

export function toFormula(expr: RollExpr): string {
  return printFormula(dialect, expr);
}
