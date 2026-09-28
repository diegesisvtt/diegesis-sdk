import { DICE } from '../constants/dice';
import { POSITION } from '../constants/position';
import type { DiceObject, ThrowVector } from '../services/dice-mesh';
import type { DisplayConfig, Vector2D } from './types';

export interface PlannedDie {
  type: string;
  colorset?: string;
}

export interface ThrowPlannerDeps {
  getDisplay: () => DisplayConfig;
  getPreset: (type: string) => DiceObject;
  rng?: () => number;
}

export class ThrowPlanner {
  #rng: () => number;

  constructor(private deps: ThrowPlannerDeps) {
    this.#rng = deps.rng ?? Math.random;
  }

  vectorRand({ x, y }: Vector2D): Vector2D {
    const angle = (this.#rng() * Math.PI) / 5 - Math.PI / 5 / 2;
    const vec = {
      x: x * Math.cos(angle) - y * Math.sin(angle),
      y: x * Math.sin(angle) + y * Math.cos(angle),
    };
    if (vec.x == 0) vec.x = 0.01;
    if (vec.y == 0) vec.y = 0.01;
    return vec;
  }

  plan(dice: PlannedDie[], vector: Vector2D, boost: number, dist: number): ThrowVector[] {
    const display = this.deps.getDisplay();
    const vectors: ThrowVector[] = [];

    for (const die of dice) {
      const diceobj = this.deps.getPreset(die.type);
      if (!diceobj) continue;

      const vec = this.vectorRand(vector);
      vec.x /= dist;
      vec.y /= dist;

      const pos = {
        x: display.containerWidth * (vec.x > 0 ? -1 : 1) * POSITION.WALL_SCALE,
        y: display.containerHeight * (vec.y > 0 ? -1 : 1) * POSITION.WALL_SCALE,
        z: this.#rng() * (DICE.RANDOM_Z_MAX - DICE.RANDOM_Z_MIN) + DICE.RANDOM_Z_MIN,
      };

      const projector = Math.abs(vec.x / vec.y);
      if (projector > 1.0) pos.y /= projector;
      else pos.x *= projector;

      const velvec = this.vectorRand(vector);
      velvec.x /= dist;
      velvec.y /= dist;
      let velocity, angle, axis;

      if (diceobj.shape != 'd2') {
        velocity = { x: velvec.x * boost, y: velvec.y * boost, z: -10 };
        angle = {
          x: -(this.#rng() * vec.y * 5 + diceobj.inertia * vec.y),
          y: this.#rng() * vec.x * 5 + diceobj.inertia * vec.x,
          z: 0,
        };
        axis = { x: this.#rng(), y: this.#rng(), z: this.#rng(), a: this.#rng() };
      } else {
        velocity = {
          x: (velvec.x * boost) / 10,
          y: (velvec.y * boost) / 10,
          z: DICE.COIN_VELOCITY_Z,
        };
        angle = {
          x: DICE.COIN_ANGLE_X * diceobj.inertia,
          y: DICE.COIN_ANGLE_Y * diceobj.inertia,
          z: 0,
        };
        axis = { x: 1, y: 1, z: this.#rng(), a: this.#rng() };
      }

      vectors.push({
        type: diceobj.type ?? die.type,
        colorset: die.colorset,
        pos,
        velocity,
        angle,
        axis,
      });
    }

    return vectors;
  }
}
