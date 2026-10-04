// Static bounds analysis over the dice IR: computes the [min, max] interval a
// RollExpr can produce without rolling. Returns null when the value is not
// statically determinable (variables @, unbounded modifiers like explosions,
// comparisons, dynamic pools).

import type { FacesSpec, Modifier, RollExpr } from './ir';

export interface ExprBounds {
  readonly min: number;
  readonly max: number;
}

/** modifiers that make the maximum unbounded (explosion, recursive reroll).
 *  explode-once is deliberately kept here: its bound is computable (one extra
 *  roll per die) but conservative null is safer than a wrong approximation. */
const UNBOUNDED_OPS = new Set([
  'explode',
  'explode-once',
  'explode-compound',
  'explode-penetrating',
  'reroll-recursive',
]);

/** modifiers whose result is a pure count (0..kept dice) */
const COUNT_OPS = new Set(['count-success', 'count-failure', 'count-even', 'count-odd']);

/** modifiers whose result is successes − failures (can go negative) */
const DEDUCT_OPS = new Set(['deduct-failure', 'subtract-failure']);

/** how many dice remain after keep/drop modifiers */
function keptCount(count: number, mods: readonly Modifier[]): number {
  let kept = count;
  for (const m of mods) {
    if (m.op === 'keep-highest' || m.op === 'keep-lowest') kept = Math.min(kept, m.count ?? 1);
    else if (m.op === 'drop-highest' || m.op === 'drop-lowest') kept = Math.max(0, kept - (m.count ?? 1));
  }
  return kept;
}

function faceBounds(faces: FacesSpec): ExprBounds | null {
  switch (faces.kind) {
    case 'number':
      return { min: 1, max: faces.value };
    case 'percentile':
      return { min: 1, max: 100 };
    case 'fate':
      return { min: -1, max: 1 };
    case 'coin':
      // coin dice roll 1..2 (see resolveFaces in modifiers.ts — d2 convention)
      return { min: 1, max: 2 };
    case 'expr':
      return exprBounds(faces.value);
  }
}

/** applies the effect of modifiers over the bounds of `count` dice with faces [lo..hi] */
function applyModifierBounds(
  bounds: ExprBounds,
  count: number,
  mods: readonly Modifier[],
): ExprBounds | null {
  if (mods.some((m) => UNBOUNDED_OPS.has(m.op))) return null;
  const kept = keptCount(count, mods);
  let { min: lo, max: hi } = bounds;
  // runtime applies min-clamps before max-clamps (STRUCTURAL_ORDER); a die
  // pinned above/below its faces becomes a constant (e.g. '1d6 min 8' → 8)
  let minV: number | undefined;
  let maxV: number | undefined;
  for (const m of mods) {
    if (m.op === 'min') minV = Math.max(minV ?? -Infinity, m.value ?? 0);
    else if (m.op === 'max') maxV = Math.min(maxV ?? Infinity, m.value ?? 0);
  }
  if (minV !== undefined) lo = Math.max(lo, minV);
  if (maxV !== undefined) hi = Math.min(hi, maxV);
  if (lo > hi) {
    const pinned = maxV !== undefined ? hi : lo;
    lo = pinned;
    hi = pinned;
  }
  for (const m of mods) {
    if (COUNT_OPS.has(m.op)) return { min: 0, max: kept };
    if (DEDUCT_OPS.has(m.op)) return { min: -kept, max: kept };
    if (m.op === 'margin-success') {
      const target = m.target ?? 0;
      return { min: lo * kept - target, max: hi * kept - target };
    }
  }
  return { min: lo * kept, max: hi * kept };
}

/** static bounds of a die term (null when unbounded or dynamic count) */
function dieBounds(term: Extract<RollExpr, { type: 'die' }>): ExprBounds | null {
  const cb = exprBounds(term.count);
  if (!cb || cb.min !== cb.max || !Number.isInteger(cb.min) || cb.min < 0) return null;
  const fb = faceBounds(term.faces);
  if (!fb) return null;
  return applyModifierBounds(fb, cb.min, term.modifiers ?? []);
}

function poolBounds(pool: Extract<RollExpr, { type: 'pool' }>): ExprBounds | null {
  const mods = pool.modifiers ?? [];
  if (mods.some((m) => UNBOUNDED_OPS.has(m.op))) return null;
  const entries = pool.entries.map(exprBounds);
  if (entries.some((b) => !b)) return null;
  const sum = (entries as ExprBounds[]).reduce(
    (acc, b) => ({ min: acc.min + b.min, max: acc.max + b.max }),
    { min: 0, max: 0 },
  );
  if (mods.length === 0) return sum;
  // keep/drop on a pool: approximation — each entry counts as 1 "die" over the
  // combined [min..max] range
  const kept = keptCount(entries.length, mods);
  const lo = Math.min(...(entries as ExprBounds[]).map((b) => b.min));
  const hi = Math.max(...(entries as ExprBounds[]).map((b) => b.max));
  for (const m of mods) {
    if (COUNT_OPS.has(m.op)) return { min: 0, max: kept };
    if (DEDUCT_OPS.has(m.op)) return { min: -kept, max: kept };
  }
  return { min: lo * kept, max: hi * kept };
}

/**
 * Static [min, max] bounds of a roll expression. Returns null when the value
 * is not statically determinable (variables @, explosions, comparisons).
 * Used for range derivation (roll tables) and display ("1d20 covers 1–20").
 */
export function exprBounds(expr: RollExpr): ExprBounds | null {
  if (typeof expr === 'number') return { min: expr, max: expr };
  if (!expr || typeof expr !== 'object') return null;
  if ('type' in expr && expr.type === 'die') return dieBounds(expr);
  if ('type' in expr && expr.type === 'pool') return poolBounds(expr);
  if ('var' in expr) return null;

  const entry = Object.entries(expr)[0];
  if (!entry) return null;
  const [op, args] = entry as [string, readonly RollExpr[]];
  const bs = args.map(exprBounds);
  if (bs.some((b) => b === null)) return null;
  const nb = bs as ExprBounds[];

  switch (op) {
    case '+':
      return { min: nb[0].min + nb[1].min, max: nb[0].max + nb[1].max };
    case '-':
      return nb.length === 1
        ? { min: -nb[0].max, max: -nb[0].min }
        : { min: nb[0].min - nb[1].max, max: nb[0].max - nb[1].min };
    case '*': {
      const products = [nb[0].min * nb[1].min, nb[0].min * nb[1].max, nb[0].max * nb[1].min, nb[0].max * nb[1].max];
      return { min: Math.min(...products), max: Math.max(...products) };
    }
    case '/': {
      if (nb[1].min <= 0 && nb[1].max >= 0) return null; // divisor may be zero
      const quotients = [nb[0].min / nb[1].min, nb[0].min / nb[1].max, nb[0].max / nb[1].min, nb[0].max / nb[1].max];
      return { min: Math.min(...quotients), max: Math.max(...quotients) };
    }
    case 'floor':
      return { min: Math.floor(nb[0].min), max: Math.floor(nb[0].max) };
    case 'ceil':
      return { min: Math.ceil(nb[0].min), max: Math.ceil(nb[0].max) };
    case 'round':
      return { min: Math.round(nb[0].min), max: Math.round(nb[0].max) };
    case 'abs':
      return nb[0].min < 0 && nb[0].max > 0
        ? { min: 0, max: Math.max(-nb[0].min, nb[0].max) }
        : { min: Math.min(Math.abs(nb[0].min), Math.abs(nb[0].max)), max: Math.max(Math.abs(nb[0].min), Math.abs(nb[0].max)) };
    case 'min':
      return { min: Math.min(...nb.map((b) => b.min)), max: Math.min(...nb.map((b) => b.max)) };
    case 'max':
      return { min: Math.max(...nb.map((b) => b.min)), max: Math.max(...nb.map((b) => b.max)) };
    default:
      // comparisons, and/or/if/!, '%', dynamic clamp… — no useful static bound
      return null;
  }
}

export const exprMin = (expr: RollExpr): number | null => exprBounds(expr)?.min ?? null;
export const exprMax = (expr: RollExpr): number | null => exprBounds(expr)?.max ?? null;
