import seedrandom from 'seedrandom';
import { v7 } from 'uuid';

export type Rng = () => number;

export function createRng(seed?: string): Rng {
  return seedrandom(seed ?? v7());
}

export function rollInt(rng: Rng, sides: number): number {
  if (sides <= 0) return 0;
  return Math.floor(rng() * sides) + 1;
}
