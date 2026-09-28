import * as THREE from 'three';

import type { ShapeDescriptor } from '@diegesis/physics';

import type { DiceShape } from '../constants/dice';
import { createDiceRegistries, type DiceRegistries, type DiceModelRegistration } from '../registries';
import {
  type DiceColorData,
  type DiceMaterial,
  type DiceMesh,
  type DiceObject,
} from './dice-mesh';
import {
  createBasicDiceGeometry,
  createChamferedGeometry,
  createD10Geometry,
  createGeometryForShape,
  createProceduralGeometry,
  type ChamferResult,
  type DiceGeometryType,
  type GeometryCreationFunction,
} from './geometry';
import {
  attachPhysicsShape,
  createConvexShape,
  physicsShapeForGeometry,
  shapeToDescriptor,
} from './shapes';
import { DiceAssetLoaders } from './loaders';
import {
  calculateTextureSize,
  createNoiseTexture,
  type FaceTextureSource,
  type MaterialCacheEntry,
} from './face-textures';
import { DicePresetRegistry, createDefaultPresetRegistry } from './preset-registry';
import { DiceColorState } from './colorsets';
import { assembleProceduralMesh, DiceMaterialBuilder, type MaterialBuildOptions } from './materials';
import { descriptorFromBounds, DiceModelCache } from './models';

export interface DiceFactoryConfig {
  baseScale: number;
  bumpMapping: boolean;
  scale?: number;
  assetPath?: string;
  normalMaps?: boolean;
  dracoPath?: string;
  resolver?: (url: string) => string;
  loadBlob?: (url: string) => Promise<Blob>;
}

export interface DiceFactoryDeps {
  presets?: DicePresetRegistry;
  registries?: DiceRegistries;
  loaders?: DiceAssetLoaders;
}

const DEFAULT_CONFIG: DiceFactoryConfig = {
  baseScale: 100,
  bumpMapping: true,
};

export class DiceFactory {
  #presets: DicePresetRegistry;
  #registries: DiceRegistries;
  #loaders: DiceAssetLoaders;
  #materials: DiceMaterialBuilder;
  #colorState = new DiceColorState();
  #models: DiceModelCache;

  #geometries = new Map<string, THREE.BufferGeometry>();

  private baseScale: number;
  private bumpMapping: boolean;
  private normalMaps: boolean;
  private assetPath: string;
  private resolver: (url: string) => string;

  constructor(options: Partial<DiceFactoryConfig> = {}, deps: DiceFactoryDeps = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };
    this.baseScale = config.baseScale;
    this.bumpMapping = config.bumpMapping;
    this.normalMaps = config.normalMaps ?? false;
    this.assetPath = config.assetPath ?? './';
    this.resolver = config.resolver ?? ((url) => url);

    this.#presets = deps.presets ?? createDefaultPresetRegistry();
    this.#registries = deps.registries ?? createDiceRegistries();
    this.#loaders = deps.loaders ?? new DiceAssetLoaders({
      assetPath: this.assetPath,
      resolver: this.resolver,
      dracoPath: config.dracoPath,
      loadBlob: config.loadBlob,
    });
    this.#materials = new DiceMaterialBuilder({
      loaders: this.#loaders,
      presets: this.#presets,
    });
    this.#models = new DiceModelCache(this.#loaders);
  }

  get(type: string): DiceObject | undefined {
    return this.#presets.get(type);
  }

  ensure(type: string): DiceObject {
    return this.#presets.getOrCreate(type);
  }

  getGeometry(type: string): THREE.BufferGeometry | undefined {
    return this.#geometries.get(type);
  }

  async loadModel(diceobj: DiceObject): Promise<THREE.Group | null> {
    if (!diceobj.modelFile) return null;
    return this.#loaders.loadModel(diceobj.modelFile);
  }

  createNoiseTexture(size = 512, intensity = 0.5): THREE.CanvasTexture {
    return createNoiseTexture(size, intensity);
  }

  calculateTextureSize(approx: number): number {
    return calculateTextureSize(approx);
  }

  disposeCachedMaterials(): void {
    this.#materials.dispose();

    this.#geometries.forEach((geom) => geom.dispose());
    this.#geometries.clear();

    this.#loaders.dispose();
  }

  disposeMaterialCaches(): void {
    this.#materials.clearCache();
  }

  updateConfig(options: Partial<DiceFactoryConfig> = {}): void {
    if (options.baseScale !== undefined) this.baseScale = options.baseScale;
    if (options.bumpMapping !== undefined) this.bumpMapping = options.bumpMapping;
    if (options.normalMaps !== undefined) this.normalMaps = options.normalMaps;
    if (options.assetPath !== undefined) this.assetPath = options.assetPath;
    if (options.resolver !== undefined) this.resolver = options.resolver;
  }

  setBumpMapping(bumpMapping: boolean): void {
    this.bumpMapping = bumpMapping;
    this.disposeMaterialCaches();
  }

  async create(type: string): Promise<DiceMesh | null> {
    const diceobj = this.ensure(type);

    const modelReg = this.#registries.getDiceModel(type);
    if (modelReg) {
      const dicemesh = await this.#createFromModel(type, diceobj, modelReg);
      if (dicemesh) return dicemesh;
    }

    return this.#createProcedural(type, diceobj);
  }

  #materialOptions(): MaterialBuildOptions {
    return {
      baseScale: this.baseScale,
      bumpMapping: this.bumpMapping,
      normalMaps: this.normalMaps,
    };
  }

  #geometryFor(type: string, diceobj: DiceObject): DiceGeometryType | null {
    const shape = (diceobj.shape as DiceShape) || (type as DiceShape);
    const cached = this.#geometries.get(shape) as DiceGeometryType | undefined;
    if (cached) return cached;
    const created = this.createGeometry(shape, diceobj.scale * this.baseScale);
    if (created instanceof THREE.BufferGeometry) {
      this.#geometries.set(shape, created);
      return created;
    }
    return null;
  }

  async #createFromModel(type: string, diceobj: DiceObject, modelReg: DiceModelRegistration): Promise<DiceMesh | null> {
    return this.#models.createMesh(type, diceobj, modelReg, (t) => this.#geometryFor(t, diceobj), this.baseScale);
  }

  async #createProcedural(type: string, diceobj: DiceObject): Promise<DiceMesh | null> {
    const geom = this.#geometryFor(type, diceobj);
    if (!geom) return null;

    this.setMaterialInfo();

    const materials = await this.createMaterials(diceobj, this.baseScale / 2, 1.0);
    if (!materials || materials.length === 0) return null;

    return assembleProceduralMesh(geom, materials, diceobj, type);
  }

  getShapeDescriptor(type: string): ShapeDescriptor | null {
    const diceobj = this.#presets.get(type);
    if (!diceobj) return null;

    const modelReg = this.#registries.getDiceModel(type);
    const bounds = this.#models.boundsFor(type);
    if (bounds) {
      const descriptor = descriptorFromBounds(bounds, modelReg?.physicsShape ?? 'auto');
      if (descriptor) return descriptor;
    }

    const geom = this.#geometryFor(type, diceobj);
    const shape = geom?.cannon_shape;
    if (!shape) return null;

    return shapeToDescriptor(shape);
  }

  async createWithColorSet(type: string, colordata: DiceColorData): Promise<DiceMesh | null> {
    const diceobj = this.ensure(type);

    const geom = this.#geometryFor(type, diceobj);
    if (!geom) return null;

    const snapshot = this.#colorState.snapshot();

    this.#colorState.assignColorData(colordata);
    this.setMaterialInfo();

    const materials = await this.createMaterials(diceobj, this.baseScale / 2, 1.0);

    this.#colorState.restore(snapshot);
    this.setMaterialInfo();

    if (!materials || materials.length === 0) return null;

    return assembleProceduralMesh(geom, materials, diceobj, type);
  }

  createGeometry(
    type: DiceShape,
    radius: number,
    geometryFunction: GeometryCreationFunction = this.createDiceGeometry.bind(this)
  ): DiceGeometryType | null {
    const geom = createGeometryForShape(type, radius, geometryFunction);
    if (geom && !geom.cannon_shape) {
      const shape = physicsShapeForGeometry(type, radius);
      if (shape) attachPhysicsShape(geom, shape);
    }
    return geom;
  }

  createDiceGeometry(
    vertices: number[][],
    faces: number[][],
    radius: number,
    tab: number,
    af: number,
    chamfer: number
  ): DiceGeometryType {
    const geom = createProceduralGeometry(vertices, faces, radius, tab, af, chamfer);
    attachPhysicsShape(geom, createConvexShape(vertices, faces, radius));
    return geom;
  }

  createPhysicsShape(vertices: number[][], faces: number[][], radius: number) {
    return createConvexShape(vertices, faces, radius);
  }

  createBasicDiceGeometry(
    vectors: THREE.Vector3[],
    faces: number[][],
    radius: number,
    tab: number,
    af: number
  ): THREE.BufferGeometry {
    return createBasicDiceGeometry(vectors, faces, radius, tab, af);
  }

  createD10Geometry(
    vectors: THREE.Vector3[],
    faces: number[][],
    radius: number,
    tab: number,
    af: number
  ): THREE.BufferGeometry {
    return createD10Geometry(vectors, faces, radius, tab, af);
  }

  createChamferedGeometry(vectors: THREE.Vector3[], faces: number[][], chamfer: number): ChamferResult {
    return createChamferedGeometry(vectors, faces, chamfer);
  }

  async createMaterials(
    diceobj: DiceObject,
    size: number,
    margin: number,
    allowcache = true,
    d4specialindex = 0
  ): Promise<DiceMaterial[]> {
    return this.#materials.createMaterials(
      diceobj,
      this.#colorState,
      this.#materialOptions(),
      size,
      margin,
      allowcache,
      d4specialindex
    );
  }

  async createTextMaterial(
    diceobj: DiceObject,
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
    return this.#materials.createTextMaterial(
      diceobj,
      this.#colorState,
      this.#materialOptions(),
      labels,
      index,
      size,
      margin,
      texture,
      forecolor,
      outlinecolor,
      backcolor,
      allowcache
    );
  }

  applyColorSet(colordata: DiceColorData): void {
    this.disposeMaterialCaches();
    this.#colorState.applyColorSet(colordata);
  }

  setRandomColors(): void {
    this.#colorState.setRandomColors();
  }

  setMaterialInfo(): void {
    const prevcolordata = this.#colorState.colordata;

    this.#colorState.resetRandom();
    this.#colorState.setRandomColors();

    if (prevcolordata?.id && this.#colorState.colordata?.id && this.#colorState.colordata.id !== prevcolordata.id) {
      this.applyColorSet(prevcolordata);
    }
  }
}
