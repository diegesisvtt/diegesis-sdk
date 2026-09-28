import * as THREE from 'three';

import type { ShapeDescriptor } from '@diegesis/physics';

import type { DiceModelRegistration } from '../registries';
import { createDiceMeshFromModel, type DiceMesh, type DiceObject } from './dice-mesh';
import type { DiceGeometryType } from './geometry';
import type { DiceAssetLoaders } from './loaders';

export interface ModelBounds {
  radius: number;
  halfExtents: [number, number, number];
  effectiveScale: number;
}

export class DiceModelCache {
  #loaders: DiceAssetLoaders;
  #modelsCache = new Map<string, THREE.Group>();
  #modelBounds = new Map<string, ModelBounds>();

  constructor(loaders: DiceAssetLoaders) {
    this.#loaders = loaders;
  }

  boundsFor(type: string): ModelBounds | undefined {
    return this.#modelBounds.get(type);
  }

  async createMesh(
    type: string,
    diceobj: DiceObject,
    modelReg: DiceModelRegistration,
    geometryFor: (type: string) => DiceGeometryType | null,
    baseScale: number
  ): Promise<DiceMesh | null> {
    let model = this.#modelsCache.get(type);
    if (!model) {
      model = await this.#loaders.loadModel(modelReg.url);
      if (!model) return null;
      this.#modelsCache.set(type, model);

      const box = new THREE.Box3().setFromObject(model);
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      const size = new THREE.Vector3();
      box.getSize(size);
      this.#modelBounds.set(type, {
        radius: sphere.radius,
        halfExtents: [size.x / 2, size.y / 2, size.z / 2],
        effectiveScale: 1,
      });
    }

    const valueGeometry = geometryFor(type);

    const bounds = this.#modelBounds.get(type);
    if (!bounds) return null;
    if (valueGeometry && !valueGeometry.boundingSphere) valueGeometry.computeBoundingSphere();
    const targetRadius = valueGeometry?.boundingSphere?.radius ?? 0;
    const normalize = bounds.radius > 0 && targetRadius > 0 ? targetRadius / bounds.radius : baseScale / 100;
    bounds.effectiveScale = normalize * (modelReg.scale ?? 1);

    const mesh = model.clone();
    mesh.scale.set(bounds.effectiveScale, bounds.effectiveScale, bounds.effectiveScale);

    const dicemesh = createDiceMeshFromModel(mesh, diceobj, type);

    if (valueGeometry) {
      dicemesh.valueGeometry = valueGeometry;
    }

    return dicemesh;
  }
}

export function descriptorFromBounds(
  bounds: ModelBounds,
  physicsShape: DiceModelRegistration['physicsShape']
): ShapeDescriptor | null {
  if (physicsShape === 'sphere') {
    return { kind: 'sphere', radius: bounds.radius * bounds.effectiveScale };
  }
  if (physicsShape === 'box') {
    const s = bounds.effectiveScale;
    return {
      kind: 'box',
      halfExtents: [bounds.halfExtents[0] * s, bounds.halfExtents[1] * s, bounds.halfExtents[2] * s],
    };
  }
  return null;
}
