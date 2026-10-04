// Bridges dice-core results into DiceBox terms: the DiceBox animates
// pre-rolled outcomes (Dice So Nice style), so a RollResult evaluated by
// dice-core is converted back into physical DiceTerm[] for the throw.
//
// Conventions handled here:
// - percentile dice (d%, 1..100 in dice-core) become a PAIR of physical dice:
//   a tens d100 (multiples of 10; 00 face = 100) plus a units d10 (0 face = 10);
// - plain d100 (numeric 100 faces, 1..100 in dice-core) decompose the same way,
//   because the 3D contract treats number-100 dice as tens-only;
// - coin dice (1..2 in dice-core) map verbatim to the d2 preset (1/2);
// - fate dice and expression faces have no 3D representation → null (caller
//   should roll without animation).

import type { DieTerm, RollExpr, RollResult, TermResult } from '@diegesis/dice-core';
import type { DiceTerm } from './contract';

/** collects die terms of the IR in document order (ops → args, pool → entries) */
function collectDieExprs(expr: RollExpr, out: DieTerm[]): void {
  if (typeof expr === 'number' || !expr || typeof expr !== 'object') return;
  if ('type' in expr && expr.type === 'die') {
    out.push(expr);
    return;
  }
  if ('type' in expr && expr.type === 'pool') {
    for (const e of expr.entries) collectDieExprs(e, out);
    return;
  }
  if ('var' in expr) return;
  for (const args of Object.values(expr)) {
    if (Array.isArray(args)) for (const a of args) collectDieExprs(a as RollExpr, out);
  }
}

/** collects die TermResults in evaluation order (pools → children) */
function collectDieResults(terms: readonly TermResult[], out: TermResult[]): void {
  for (const t of terms) {
    if (t.type === 'die') out.push(t);
    else if (t.type === 'pool' && t.children) collectDieResults(t.children, out);
  }
}

/** splits a dice-core percentile value (1..100) into physical tens + units */
function percentileTerms(value: number): DiceTerm[] {
  const tens = Math.floor(value / 10) * 10;
  const units = value % 10;
  return [
    { faces: { kind: 'percentile' }, results: [tens === 0 ? 100 : tens] },
    { faces: 10, results: [units === 0 ? 10 : units] },
  ];
}

/**
 * Converts (expression, evaluated roll) into DiceTerm[] for DiceBox.roll().
 * Returns null when nothing is animatable, when the expression and the result
 * don't align (defensive), or when the formula uses non-animatable dice
 * (fate, expression faces) — in that case the caller rolls without animation.
 */
export function termsFromRoll(expr: RollExpr, roll: RollResult): DiceTerm[] | null {
  const exprs: DieTerm[] = [];
  collectDieExprs(expr, exprs);
  const results: TermResult[] = [];
  collectDieResults(roll.terms, results);
  if (exprs.length === 0 || exprs.length !== results.length) return null;

  const terms: DiceTerm[] = [];
  for (let i = 0; i < exprs.length; i++) {
    const faces = exprs[i].faces;
    const values = results[i].dice.map((d) => d.value);
    switch (faces.kind) {
      case 'number':
        // a plain d100 rolls 1..100 but the 3D contract only accepts tens
        // (d100 preset = tens die) → decompose like a percentile
        if (faces.value === 100) {
          for (const v of values) terms.push(...percentileTerms(v));
        } else {
          terms.push({ faces, results: values });
        }
        break;
      case 'percentile':
        for (const v of values) terms.push(...percentileTerms(v));
        break;
      case 'coin':
        // dice-core coins already roll 1..2 — the d2 preset's exact range
        terms.push({ faces, results: values });
        break;
      default:
        // fate / expr faces: no 3D representation
        return null;
    }
  }
  return terms;
}
