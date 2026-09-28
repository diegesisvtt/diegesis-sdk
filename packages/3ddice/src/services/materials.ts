import * as THREE from 'three';

import { MATERIALTYPES, type MaterialOptions } from '../constants/materialtypes';
import type { DiceShape } from '../constants/dice';
import {
  createDiceMesh,
  type DiceColorData,
  type DiceMaterial,
  type DiceMesh,
  type DiceObject,
} from './dice-mesh';
import type { DiceGeometryType } from './geometry';
import {
  TextureLRUCache,
  createNoiseTexture,
  normalTextureFromHeight,
  paintFaceTextures,
  type FaceTextureSource,
  type MaterialCacheEntry,
} from './face-textures';
import type { DiceAssetLoaders } from './loaders';
import type { DicePresetRegistry } from './preset-registry';
import { processDiceLabels, type DiceColorState } from './colorsets';

export const MATERIAL_OPTIONS = {
  color: 0xb5b5b5,
  flatShading: true,
};

export const PHONG_MATERIAL_OPTIONS = {
  ...MATERIAL_OPTIONS,
  specular: 0xffffff,
  shininess: 5,
};

export const ROUGHNESS_MAP_FILES: Record<string, string> = {
  roughnessMap_fingerprint: 'finger.webp',
  roughnessMap_metal: 'metal.webp',
  roughnessMap_wood: 'wood.webp',
  roughnessMap_stone: 'stone.webp',
};

export interface MaterialBuildOptions {
  baseScale: number;
  bumpMapping: boolean;
  normalMaps: boolean;
}

export interface DiceMaterialBuilderDeps {
  loaders: DiceAssetLoaders;
  presets: DicePresetRegistry;
}

export function resolveMaterialConfig(materialType: string): MaterialOptions | undefined {
  let config = MATERIALTYPES[materialType];
  if (!config && materialType !== 'none') {
    config = MATERIALTYPES['plastic'] || MATERIALTYPES['none'];
  }
  return config;
}

export function createBaseMaterial(
  materialType: string,
  bumpMapping: boolean,
  roughnessTexture: THREE.Texture | null
): DiceMaterial {
  let mat: DiceMaterial;

  if (materialType && materialType !== 'none') {
    const config = MATERIALTYPES[materialType];

    if (config && config.type === 'physical') {
      const physMat = new THREE.MeshPhysicalMaterial(MATERIAL_OPTIONS);
      if (config.clearcoat) physMat.clearcoat = config.clearcoat;
      if (config.clearcoatRoughness) physMat.clearcoatRoughness = config.clearcoatRoughness;
      if (config.iridescence) physMat.iridescence = config.iridescence;
      if (config.iridescenceIOR) physMat.iridescenceIOR = config.iridescenceIOR;
      if (config.iridescenceThicknessRange) physMat.iridescenceThicknessRange = config.iridescenceThicknessRange;
      if (config.transmission) physMat.transmission = config.transmission;
      if (config.thickness) physMat.thickness = config.thickness;
      if (config.roughness !== undefined) physMat.roughness = config.roughness;
      if (config.metalness !== undefined) physMat.metalness = config.metalness;
      mat = physMat;
    } else if (config && config.type === 'standard') {
      const stdMat = new THREE.MeshStandardMaterial(MATERIAL_OPTIONS);
      if (config.roughness !== undefined) stdMat.roughness = config.roughness;
      if (config.metalness !== undefined) stdMat.metalness = config.metalness;
      mat = stdMat;
    } else if (config) {
      mat = new THREE.MeshPhongMaterial(PHONG_MATERIAL_OPTIONS);
    } else {
      mat = new THREE.MeshStandardMaterial(MATERIAL_OPTIONS);
    }

    if (config && config.envMapIntensity !== undefined && 'envMapIntensity' in mat) mat.envMapIntensity = config.envMapIntensity;

    if (bumpMapping && roughnessTexture && config?.roughnessMap && mat instanceof THREE.MeshStandardMaterial) {
      mat.roughnessMap = roughnessTexture;
      mat.roughness = 1.0;
    }
  } else {
    mat = new THREE.MeshPhongMaterial(PHONG_MATERIAL_OPTIONS);
  }

  return mat;
}

export function applyMaterialOverrides(mat: DiceMaterial, overrides: DiceColorData['materialOptions']): void {
  if (!overrides) return;
  if (overrides.color !== undefined) {
    mat.color.set(overrides.color);
  }
  if (overrides.roughness !== undefined && 'roughness' in mat) {
    (mat as THREE.MeshStandardMaterial).roughness = overrides.roughness;
  }
  if (overrides.metalness !== undefined && 'metalness' in mat) {
    (mat as THREE.MeshStandardMaterial).metalness = overrides.metalness;
  }
  if (overrides.envMapIntensity !== undefined && 'envMapIntensity' in mat) {
    mat.envMapIntensity = overrides.envMapIntensity;
  }
}

export function finalizeMaterial(mat: DiceMaterial): void {
  mat.opacity = 1;
  mat.transparent = false;
  mat.depthTest = true;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = 1;
  mat.polygonOffsetUnits = 1;
  mat.needsUpdate = true;
}

export function bumpScaleForSize(size: number): number {
  let scale = 0.75;
  if (size > 35) scale = 1;
  if (size > 40) scale = 2.5;
  if (size > 45) scale = 4;
  return scale;
}

export function fixDiceMaterials(mesh: DiceMesh, uniqueSides: number): DiceMesh {
  if (Array.isArray(mesh.material) && uniqueSides <= 3) {
    const materials = [...mesh.material];
    const baseIndex = materials.length - uniqueSides;
    for (let i = 0; i < baseIndex; i++) {
      materials[i] = materials[baseIndex];
    }
    mesh.material = materials;
  }
  return mesh;
}

export function assembleProceduralMesh(
  geom: DiceGeometryType,
  materials: DiceMaterial[],
  diceobj: DiceObject,
  type: string
): DiceMesh {
  const mesh = new THREE.Mesh(geom, materials);
  const dicemesh = createDiceMesh(mesh, diceobj, type);

  if (diceobj.color && Array.isArray(dicemesh.material)) {
    const material = dicemesh.material[0] as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
    material.color = new THREE.Color(diceobj.color);
    material.emissive = new THREE.Color(diceobj.color);
    material.emissiveIntensity = 1;
    material.needsUpdate = true;
  }

  return fixDiceMaterials(dicemesh, diceobj.values.length);
}

export class DiceMaterialBuilder {
  #loaders: DiceAssetLoaders;
  #presets: DicePresetRegistry;

  #materialsCache = new TextureLRUCache();
  #normalsTextures = new Map<string, THREE.Texture>();
  #roughnessMapsCache = new Map<string, THREE.Texture>();

  constructor(deps: DiceMaterialBuilderDeps) {
    this.#loaders = deps.loaders;
    this.#presets = deps.presets;
  }

  clearCache(): void {
    this.#materialsCache.clear(true);
  }

  dispose(): void {
    this.#materialsCache.clear(true);

    this.#roughnessMapsCache.forEach((texture) => texture.dispose());
    this.#roughnessMapsCache.clear();

    this.#normalsTextures.forEach((texture) => texture.dispose());
    this.#normalsTextures.clear();
  }

  async #resolveRoughnessTexture(mapName: string): Promise<THREE.Texture | null> {
    if (this.#roughnessMapsCache.has(mapName)) {
      return this.#roughnessMapsCache.get(mapName)!;
    }

    let texture: THREE.Texture | null = null;
    const fileName = ROUGHNESS_MAP_FILES[mapName] ?? '';

    if (fileName) {
      texture = await this.#loaders.loadTexture(`roughness-map/${fileName}`);
      if (texture) {
        this.#roughnessMapsCache.set(mapName, texture);
      }
    }

    if (!texture) {
      texture = createNoiseTexture(512, 0.7);
      this.#roughnessMapsCache.set(mapName, texture);
    }

    return texture;
  }

  async createMaterials(
    diceobj: DiceObject,
    state: DiceColorState,
    options: MaterialBuildOptions,
    size: number,
    margin: number,
    allowcache = true,
    d4specialindex = 0
  ): Promise<DiceMaterial[]> {
    const materials: DiceMaterial[] = [];
    let labels = diceobj.labels;

    if (diceobj.shape == 'd4') {
      labels = diceobj.labels[d4specialindex];
      size = options.baseScale / 2;
      margin = options.baseScale * 2;
    }

    if (state.diceLabels[diceobj.type as string]) {
      labels = this.#getProcessedLabels(diceobj.type as string, state.diceLabels[diceobj.type as string]);
      if (diceobj.shape == 'd4') {
        labels = labels[d4specialindex];
      }
    }

    let roughnessTexture: THREE.Texture | null = null;
    const materialConfig = resolveMaterialConfig(state.diceMaterialRand);

    if (options.bumpMapping && materialConfig?.roughnessMap) {
      roughnessTexture = await this.#resolveRoughnessTexture(materialConfig.roughnessMap);
    }

    for (let i = 0; i < labels.length; ++i) {
      const mat = createBaseMaterial(state.diceMaterialRand, options.bumpMapping, roughnessTexture);
      applyMaterialOverrides(mat, state.materialOverrides);

      let canvasTextures: MaterialCacheEntry | null;
      if (i == 0) {
        let texture = { name: 'none' } as FaceTextureSource;
        if (state.diceTextureRand?.composite != 'source-over') {
          texture = state.diceTextureRand;
        }

        canvasTextures = await this.createTextMaterial(
          diceobj,
          state,
          options,
          labels,
          i,
          size,
          margin,
          texture,
          state.labelColorRand,
          state.labelOutlineRand,
          state.edgeColorRand,
          allowcache
        );
        if (canvasTextures?.composite) {
          mat.map = canvasTextures.composite;
        }
      } else {
        canvasTextures = await this.createTextMaterial(
          diceobj,
          state,
          options,
          labels,
          i,
          size,
          margin,
          state.diceTextureRand,
          state.labelColorRand,
          state.labelOutlineRand,
          state.diceColorRand,
          allowcache
        );
        if (canvasTextures?.composite) {
          mat.map = canvasTextures.composite;
        }

        if (options.bumpMapping) {
          const scale = bumpScaleForSize(size);

          const normalsImage = diceobj.shape != 'd4' ? diceobj.normals?.[i] : null;
          if (normalsImage) {
            const normalsKey = `${diceobj.type}:${i}`;
            let normalsTexture = this.#normalsTextures.get(normalsKey);
            if (!normalsTexture) {
              normalsTexture = new THREE.Texture(normalsImage as TexImageSource);
              normalsTexture.needsUpdate = true;
              this.#normalsTextures.set(normalsKey, normalsTexture);
            }
            mat.bumpMap = normalsTexture;
            mat.bumpScale = 4;
          } else if (options.normalMaps && canvasTextures?.bump) {
            if (!canvasTextures.normal) {
              canvasTextures.normal = normalTextureFromHeight(canvasTextures.bump.image as HTMLCanvasElement, 2);
            }
            mat.normalMap = canvasTextures.normal;
            mat.normalScale = new THREE.Vector2(scale, scale);
          } else if (canvasTextures?.bump) {
            mat.bumpMap = canvasTextures.bump;
            mat.bumpScale = scale;
          }
        }
        if (canvasTextures?.emissive) {
          mat.emissiveMap = canvasTextures.emissive;
          mat.emissive = new THREE.Color(0xffffff);
          mat.emissiveIntensity = 1;
        }
      }
      finalizeMaterial(mat);
      materials.push(mat);
    }

    return materials;
  }

  async createTextMaterial(
    diceobj: DiceObject,
    state: DiceColorState,
    options: MaterialBuildOptions,
    labels: any[],
    index: number,
    size: number,
    margin: number,
    texture: FaceTextureSource,
    forecolor: string,
    outlinecolor: string,
    backcolor: string,
    allowcache: boolean
  ): Promise<MaterialCacheEntry | null> {
    if (labels[index] === undefined) return null;

    texture = texture || state.diceTextureRand;
    forecolor = forecolor || state.labelColorRand;
    outlinecolor = outlinecolor || state.labelOutlineRand;
    backcolor = backcolor || state.diceColorRand;
    allowcache = allowcache == undefined ? true : allowcache;

    const text = labels[index];
    let textCache = '';
    if (text instanceof HTMLImageElement) {
      textCache = text.src;
    } else if (text instanceof Array) {
      textCache = text.map((el) => (el instanceof HTMLImageElement ? el.src : String(el))).join('|');
    } else {
      textCache = String(text);
    }

    const emissiveEnabled = state.diceEmissive;
    const materialOptionsKey = state.materialOverrides
      ? JSON.stringify(state.materialOverrides)
      : '';

    let cachestring = [
      diceobj.type,
      textCache,
      index,
      texture.name,
      forecolor,
      outlinecolor,
      backcolor,
      state.diceFont,
      state.diceFontOffsetY,
      state.diceMaterialRand,
      materialOptionsKey,
      emissiveEnabled ? 'e' : '',
      options.normalMaps ? 'n' : '',
    ].join(';');
    if (diceobj.shape == 'd4') {
      cachestring = [
        diceobj.type,
        textCache,
        texture.name,
        forecolor,
        outlinecolor,
        backcolor,
        state.diceFont,
        state.diceFontOffsetY,
        state.diceMaterialRand,
        materialOptionsKey,
        emissiveEnabled ? 'e' : '',
        options.normalMaps ? 'n' : '',
      ].join(';');
    }
    if (allowcache) {
      const cached = this.#materialsCache.get(cachestring);
      if (cached != null) return cached;
    }

    const entry = paintFaceTextures({
      shape: diceobj.shape as DiceShape,
      labels,
      index,
      size,
      margin,
      texture,
      forecolor,
      outlinecolor,
      backcolor,
      font: state.diceFont || diceobj.font || 'Arial',
      fontOffsetY: state.diceFontOffsetY || 0,
      emissive: emissiveEnabled,
    });

    if (!entry) return null;

    if (allowcache) {
      this.#materialsCache.set(cachestring, entry);
    }

    return entry;
  }

  #getProcessedLabels(type: string, faces: any[]): any[] {
    const diceobj = this.#presets.get(type);
    if (!diceobj) return faces;
    return processDiceLabels(diceobj.shape, faces);
  }
}
