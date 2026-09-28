import * as THREE from 'three';
import type { FacesSpec } from '@diegesis/dice-core';

import type { ShadowQuality } from './config';
import type { DiceFactory } from '../services/factory';
import type { DiceColors } from '../services/colors';
import {
  createDieBodyState,
  type DiceMesh,
  type ThrowVector,
} from '../services/dice-mesh';

export interface DiceSpawnerConfig {
  theme: string;
  shadows: ShadowQuality;
}

export interface DiceSpawnerDeps {
  scene: THREE.Scene;
  factory: DiceFactory;
  colors: DiceColors;
  getConfig: () => DiceSpawnerConfig;
}

export interface SpawnMeta {
  dieId: string;
  faces: FacesSpec;
  forcedValue: number;
}

export class DiceSpawner {
  readonly dice: DiceMesh[] = [];

  constructor(private deps: DiceSpawnerDeps) {}

  async spawn(vectordata: ThrowVector, meta: SpawnMeta): Promise<DiceMesh | null> {
    const config = this.deps.getConfig();

    let dicemesh: DiceMesh | null;
    if (vectordata.colorset) {
      const colorData = await this.deps.colors.getColorSet({ colorset: vectordata.colorset });
      dicemesh = await this.deps.factory.createWithColorSet(vectordata.type, colorData);
    } else {
      dicemesh = await this.deps.factory.create(vectordata.type);
    }
    if (!dicemesh) return null;

    dicemesh.throw = vectordata;
    dicemesh.dieId = meta.dieId;
    dicemesh.faces = meta.faces;
    dicemesh.forcedValue = meta.forcedValue;
    dicemesh.castShadow = config.shadows !== 'none';
    dicemesh.body = createDieBodyState();

    this.deps.scene.add(dicemesh);
    this.dice.push(dicemesh);
    return dicemesh;
  }

  findById(id: string): DiceMesh | undefined {
    return this.dice.find((die) => die.dieId === id);
  }

  indexOfId(id: string): number {
    return this.dice.findIndex((die) => die.dieId === id);
  }

  detach(mesh: DiceMesh): void {
    this.deps.scene.remove(mesh);
    const index = this.dice.indexOf(mesh);
    if (index >= 0) this.dice.splice(index, 1);
  }

  removeAll(): void {
    let dice: DiceMesh | undefined;
    while ((dice = this.dice.pop())) {
      this.deps.scene.remove(dice);
      this.disposeMesh(dice);
    }
  }

  disposeMesh(dice: DiceMesh): void {
    if (dice.userData?.fromModel) return;
    if (dice.geometry?.userData?.owned) {
      dice.geometry.dispose();
    }
    const materials = Array.isArray(dice.material) ? dice.material : dice.material ? [dice.material] : [];
    materials.forEach((mat: THREE.Material) => mat.dispose());
  }
}
