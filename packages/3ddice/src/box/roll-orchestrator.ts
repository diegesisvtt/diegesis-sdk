import { newId } from '@diegesis/events';
import type { StepResult } from '@diegesis/physics';

import type { DiceBus } from '../bus';
import { assertResultInRange, type NormalizedDie, type NormalizedTerm } from '../contract';
import { RollCancelledError } from '../errors';
import type { RerollRequest, RolledDie, RollOutcome } from '../results';
import { BODY_SLEEP_STATE, type DiceMesh } from '../services/dice-mesh';
import type { DiceFactory } from '../services/factory';
import type { PhysicsController } from './physics-controller';
import type { DiceSpawner } from './spawner';
import type { SoundManager } from './sounds';
import type { RollQueue } from './roll-queue';
import type { ThrowPlanner } from './throw-planner';
import type { CameraHeights, DisplayConfig } from './types';

export type AnimState = 'idle' | 'throw' | 'afterthrow' | 'simulate';

export interface RollTimingConfig {
  timestep: number;
  iterationLimit: number;
  strength: number;
  cascadeDelay: number;
}

export interface RollOrchestratorDeps {
  bus: DiceBus;
  queue: RollQueue;
  physics: PhysicsController;
  planner: ThrowPlanner;
  spawner: DiceSpawner;
  sounds: SoundManager;
  shapes: Pick<DiceFactory, 'getShapeDescriptor'>;
  swapFace: (mesh: DiceMesh, result: number) => Promise<void>;
  getConfig: () => RollTimingConfig;
  getDisplay: () => DisplayConfig;
  renderFrame: () => void;
  clearSelection: () => void;
  isDisposed: () => boolean;
  rng: () => number;
}

export class RollOrchestrator {
  #animState: AnimState = 'idle';
  #threadId = 0;
  #iteration = 0;
  #rollToken = 0;
  #currentRollId = '';
  #rolling = false;

  constructor(private deps: RollOrchestratorDeps) {}

  get rolling(): boolean {
    return this.#rolling;
  }

  get running(): boolean {
    return this.#animState !== 'idle';
  }

  get idle(): boolean {
    return this.#animState === 'idle';
  }

  get animState(): AnimState {
    return this.#animState;
  }

  resolveCameraZ(heights: CameraHeights): number {
    return heights.far;
  }

  clearDice(): void {
    this.#threadId++;
    this.#animState = 'idle';
    this.deps.spawner.removeAll();
    this.deps.clearSelection();
    this.deps.physics.clear();
    this.deps.renderFrame();
  }

  clear(): void {
    this.#rollToken++;
    this.#rolling = false;
    this.clearDice();
  }

  cancel(): void {
    if (!this.#rolling && this.#animState === 'idle') return;
    this.#rollToken++;
    this.#rolling = false;
    this.clearDice();
    this.deps.bus.emit('roll:cancel', { id: this.#currentRollId || undefined });
  }

  async roll(terms: NormalizedTerm[]): Promise<RollOutcome> {
    return this.deps.queue.enqueue(async () => {
      const token = ++this.#rollToken;
      this.#assertActive(token);
      this.clearDice();
      return this.#rollTerms(terms, token);
    });
  }

  async add(terms: NormalizedTerm[]): Promise<RollOutcome> {
    return this.deps.queue.enqueue(async () => {
      const token = ++this.#rollToken;
      this.#assertActive(token);
      if (this.deps.spawner.dice.length === 0) {
        return this.#rollTerms(terms, token);
      }
      return this.#addTerms(terms, token);
    });
  }

  async #rollTerms(terms: NormalizedTerm[], token: number): Promise<RollOutcome> {
    this.#currentRollId = newId();
    this.deps.bus.emit('roll:start', { id: this.#currentRollId });

    const planned = terms.flatMap((term) => term.dice);
    const maxStep = planned.reduce((max, die) => Math.max(max, die.step), 0);
    const pairs: { planned: NormalizedDie; mesh: DiceMesh | null }[] = [];

    await this.#spawnWave(planned.filter((die) => die.step === 0), token, pairs);
    await this.#throwAll(token);

    for (let step = 1; step <= maxStep; step++) {
      const waveDice = planned.filter((die) => die.step === step);
      if (waveDice.length === 0) continue;
      await this.#delay(this.deps.getConfig().cascadeDelay, token);
      const existing = this.deps.spawner.dice.length;
      await this.#spawnWave(waveDice, token, pairs);
      await this.#throwNew(existing, token);
    }

    const outcome = this.#buildOutcome(terms, pairs);
    this.deps.bus.emit('roll:finish', outcome);
    return outcome;
  }

  async #addTerms(terms: NormalizedTerm[], token: number): Promise<RollOutcome> {
    this.#currentRollId = newId();
    this.deps.bus.emit('roll:start', { id: this.#currentRollId });

    const existing = this.deps.spawner.dice.length;
    const planned = terms.flatMap((term) => term.dice);
    const pairs: { planned: NormalizedDie; mesh: DiceMesh | null }[] = [];

    await this.#spawnWave(planned, token, pairs);
    await this.#throwNew(existing, token);

    const outcome = this.#buildOutcome(terms, pairs);
    this.deps.bus.emit('roll:finish', outcome);
    return outcome;
  }

  async #throwNew(existing: number, token: number): Promise<void> {
    const all = this.deps.spawner.dice;
    const payloads = this.deps.physics
      .buildSpawnPayloads(all, this.deps.shapes)
      .filter((p) => p.index >= existing);
    await this.deps.physics.spawnBatch(payloads);
    await this.#simulateThrow(token);

    const spawned = all.slice(existing);
    await this.#applyForcedValues(spawned);
    await this.deps.physics.spawnBatch(payloads);
    this.deps.physics.resetMeshesToInitial(payloads, all);

    const threadid = ++this.#threadId;
    this.#rolling = true;
    await this.#animateThrow(threadid, token);
  }

  async #delay(ms: number, token: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
    this.#assertActive(token);
  }

  async #spawnWave(
    planned: NormalizedDie[],
    token: number,
    pairs: { planned: NormalizedDie; mesh: DiceMesh | null }[]
  ): Promise<void> {
    const display = this.deps.getDisplay();
    const rng = this.deps.rng;
    const vector = {
      x: (rng() * 2 - 0.5) * display.currentWidth,
      y: -(rng() * 2 - 0.5) * display.currentHeight,
    };
    const dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y) + 100;
    const boost = (rng() + 3) * dist * this.deps.getConfig().strength;

    const vectors = this.deps.planner.plan(planned, vector, boost, dist);

    for (let i = 0; i < planned.length; i++) {
      this.#assertActive(token);
      const mesh = await this.deps.spawner.spawn(vectors[i], {
        dieId: newId(),
        faces: planned[i].faces,
        forcedValue: planned[i].value,
      });
      pairs.push({ planned: planned[i], mesh });
    }
    this.#assertActive(token);
  }

  async #throwAll(token: number): Promise<void> {
    this.#assertActive(token);
    const dice = this.deps.spawner.dice;
    const payloads = this.deps.physics.buildSpawnPayloads(dice, this.deps.shapes);
    await this.deps.physics.spawnBatch(payloads);
    await this.#simulateThrow(token);

    await this.#applyForcedValues(dice);
    await this.deps.physics.spawnBatch(payloads);
    this.deps.physics.resetMeshesToInitial(payloads, dice);

    this.#rolling = true;
    const threadid = ++this.#threadId;
    this.#iteration = 0;
    await this.#animateThrow(threadid, token);
  }

  async #applyForcedValues(dice: DiceMesh[]): Promise<void> {
    for (const mesh of dice) {
      if (mesh.getFaceValue().value === mesh.forcedValue) continue;
      await this.deps.swapFace(mesh, mesh.forcedValue);
    }
  }

  async reroll(requests: RerollRequest[]): Promise<RolledDie[]> {
    return this.deps.queue.enqueue(async () => {
      const token = ++this.#rollToken;
      this.#assertActive(token);

      const targets: { index: number; mesh: DiceMesh; value: number }[] = [];
      for (const request of requests) {
        const index = this.deps.spawner.indexOfId(request.id);
        if (index < 0) continue;
        const mesh = this.deps.spawner.dice[index];
        assertResultInRange(mesh.faces, request.value);
        targets.push({ index, mesh, value: request.value });
      }
      if (targets.length === 0) return [];

      this.#rolling = true;
      const threadid = ++this.#threadId;
      this.#iteration = 0;

      await this.deps.physics.tossReroll(targets.map((t) => t.index));
      this.#assertActive(token);
      await this.#animateThrow(threadid, token);

      for (const target of targets) {
        target.mesh.forcedValue = target.value;
        if (target.mesh.getFaceValue().value !== target.value) {
          await this.deps.swapFace(target.mesh, target.value);
        }
      }
      this.deps.renderFrame();

      return targets.map((t) => ({
        id: t.mesh.dieId,
        value: t.value,
        faces: t.mesh.faces,
      }));
    });
  }

  async remove(ids: string[]): Promise<RolledDie[]> {
    return this.deps.queue.enqueue(async () => {
      const token = ++this.#rollToken;
      this.#assertActive(token);

      const targets = ids
        .map((id) => ({ id, index: this.deps.spawner.indexOfId(id) }))
        .filter((t) => t.index >= 0)
        .sort((a, b) => a.index - b.index);
      if (targets.length === 0) return [];

      const removed: RolledDie[] = [];
      for (const target of targets) {
        const mesh = this.deps.spawner.dice[this.deps.spawner.indexOfId(target.id)];
        if (!mesh) continue;
        removed.push({ id: mesh.dieId, value: mesh.forcedValue, faces: mesh.faces });
        this.deps.spawner.detach(mesh);
        this.deps.spawner.disposeMesh(mesh);
      }

      this.deps.physics.clear();
      const survivors = this.deps.spawner.dice;
      if (survivors.length > 0) {
        await this.deps.physics.spawnBatch(
          this.deps.physics.buildSettledPayloads(survivors, this.deps.shapes)
        );
      }
      this.deps.renderFrame();
      return removed;
    });
  }

  #buildOutcome(
    terms: NormalizedTerm[],
    pairs: { planned: NormalizedDie; mesh: DiceMesh | null }[]
  ): RollOutcome {
    const byPlanned = new Map<NormalizedDie, DiceMesh | null>();
    for (const pair of pairs) byPlanned.set(pair.planned, pair.mesh);

    const rolledTerms = [];
    const flat: RolledDie[] = [];

    for (const term of terms) {
      const dice: RolledDie[] = [];
      for (const planned of term.dice) {
        const mesh = byPlanned.get(planned);
        const die: RolledDie = {
          id: mesh?.dieId ?? newId(),
          value: mesh?.forcedValue ?? planned.value,
          faces: planned.faces,
        };
        dice.push(die);
        flat.push(die);
      }
      rolledTerms.push({ id: newId(), dice });
    }

    return { id: this.#currentRollId, terms: rolledTerms, dice: flat };
  }

  #allSettled(forcedFinish: boolean): boolean {
    const dice = this.deps.spawner.dice;
    for (const dicemesh of dice) {
      if (!dicemesh?.body) continue;
      if (dicemesh.body.sleepState < BODY_SLEEP_STATE && !forcedFinish) {
        return false;
      }
    }
    return true;
  }

  #assertActive(token: number): void {
    if (this.deps.isDisposed() || token !== this.#rollToken) {
      throw new RollCancelledError();
    }
  }

  async #simulateThrow(token: number): Promise<void> {
    this.#animState = 'simulate';
    this.#iteration = 0;
    this.#rolling = true;

    for (;;) {
      this.#assertActive(token);
      const result = await this.deps.physics.simulate(this.deps.getConfig().iterationLimit);
      this.deps.physics.applyStates(result.states, this.deps.spawner.dice);
      if (this.#allSettled(true)) break;
    }
    this.#animState = 'throw';
  }

  async #animateThrow(threadid: number, token: number): Promise<void> {
    this.#animState = 'throw';
    const thread = threadid;
    let lastTime: number | null = null;

    return new Promise<void>((resolve, reject) => {
      const frame = async () => {
        try {
          if (this.deps.isDisposed() || thread !== this.#threadId || token !== this.#rollToken) {
            reject(new RollCancelledError());
            return;
          }

          const config = this.deps.getConfig();
          const now = performance.now();
          if (lastTime === null) lastTime = now - config.timestep * 1000;
          const timeDiff = (now - lastTime) / 1000;
          this.#iteration++;
          const neededSteps = Math.min(Math.floor(timeDiff / config.timestep), 5);

          let stepResult: StepResult | null = null;
          if (neededSteps > 0) {
            stepResult = await this.deps.physics.step(neededSteps);
            lastTime = lastTime + neededSteps * config.timestep * 1000;
            this.#assertActive(token);
            this.deps.physics.applyStates(stepResult.states, this.deps.spawner.dice);
            this.deps.sounds.playCollideEvents(stepResult.collideEvents, false);
          }

          this.deps.renderFrame();

          const forcedFinish = this.#iteration > config.iterationLimit;
          const allAsleep = stepResult?.allAsleep ?? false;

          if (allAsleep || forcedFinish) {
            if (!this.#allSettled(forcedFinish)) {
              requestAnimationFrame(frame);
              return;
            }

            this.deps.physics.markAllKinematic(this.deps.spawner.dice);
            this.#rolling = false;
            this.#animState = 'afterthrow';
            resolve();
            return;
          }

          requestAnimationFrame(frame);
        } catch (error) {
          reject(error);
        }
      };
      requestAnimationFrame(frame);
    });
  }

  interrupt(): void {
    this.#rollToken++;
    this.#threadId++;
    this.#rolling = false;
    this.#animState = 'idle';
  }
}
