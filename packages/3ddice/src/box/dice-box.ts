import * as THREE from 'three';

import type { AssetManager } from '@diegesis/assets';
import type { EnvironmentSpec } from '@diegesis/render3d';

import { createDiceRegistries, type DiceRegistries } from '../registries';
import { buildDiceManifest } from '../assets';
import { createDiceBus, type DiceBus } from '../bus';
import { normalizeTerms, type DiceTerm } from '../contract';
import { DiceError } from '../errors';
import type { RerollRequest, RolledDie, RollOutcome } from '../results';
import type { DiceTheme } from '../constants/themes';
import type { TextureEntry } from '../constants/texturelist';
import type { MaterialOptions } from '../constants/materialtypes';
import type { DiceModelRegistration } from '../registries';
import { DiceColors, type ColorSet } from '../services/colors';
import { DiceFactory } from '../services/factory';
import { swapDiceFace, type FaceSwapDeps } from '../services/face-swap';
import {
  configToOptions,
  normalizeOptions,
  type DiceBoxOptions,
  type NormalizedConfig,
} from './config';
import type { DiceBoxDeps } from './deps';
import { LayoutController } from './layout';
import { PhysicsController } from './physics-controller';
import { RollOrchestrator } from './roll-orchestrator';
import { RollQueue } from './roll-queue';
import { SceneRenderer } from './scene-renderer';
import { SelectionController } from './selection';
import { SoundManager } from './sounds';
import { DiceSpawner } from './spawner';
import { ThrowPlanner } from './throw-planner';

export interface DiceBoxEvents {
  ready: void;
  'roll:start': { id: string };
  'roll:finish': RollOutcome;
  'roll:cancel': { id?: string };
  'die:click': { id: string; value: number };
  'theme:change': { theme: string };
  error: Error;
}

export interface ThemeRegistryFacade {
  list: () => Record<string, DiceTheme>;
  get: (id: string) => DiceTheme | undefined;
  has: (id: string) => boolean;
  register: (id: string, theme: DiceTheme) => void;
}

export interface TextureRegistryFacade {
  list: () => Record<string, TextureEntry>;
  get: (id: string | string[]) => TextureEntry | undefined;
  register: (id: string, texture: TextureEntry) => void;
}

export interface MaterialRegistryFacade {
  list: () => Record<string, MaterialOptions>;
  get: (id: string) => MaterialOptions | undefined;
  register: (id: string, material: MaterialOptions) => void;
}

export interface ModelRegistryFacade {
  list: () => Record<string, DiceModelRegistration>;
  get: (type: string) => DiceModelRegistration | undefined;
  register: (registration: DiceModelRegistration) => void;
}

export class DiceBox {
  #initialized = false;
  #disposed = false;

  private container: HTMLDivElement;
  private config: NormalizedConfig;
  private surface = 'wood_tray';
  private colorData?: ColorSet;

  readonly bus: DiceBus;
  readonly ready: Promise<void>;
  readonly themes: ThemeRegistryFacade;
  readonly textures: TextureRegistryFacade;
  readonly materials: MaterialRegistryFacade;
  readonly models: ModelRegistryFacade;

  private queue: RollQueue;
  private sounds: SoundManager;
  private selection: SelectionController;
  private sceneRenderer: SceneRenderer;
  private layout: LayoutController;
  private physics: PhysicsController;
  private spawner: DiceSpawner;
  private planner: ThrowPlanner;
  private orchestrator: RollOrchestrator;

  private registries: DiceRegistries;
  private diceColors: DiceColors;
  private diceFactory: DiceFactory;
  private faceSwapDeps: FaceSwapDeps;

  private assetManager?: AssetManager;
  private assetResolver: (url: string) => string;
  private loadBlob: (url: string) => Promise<Blob>;

  constructor(element: HTMLDivElement, options: DiceBoxOptions = {}) {
    this.container = element;
    this.config = normalizeOptions(options);
    const deps = options.deps ?? {};

    this.assetManager = this.config.assets?.manager;
    this.assetResolver = (url) => this.assetManager?.resolveUrl(url) ?? url;
    this.loadBlob = async (url) => {
      if (this.assetManager?.has(url)) return this.assetManager.load(url);
      const response = await fetch(this.assetResolver(url));
      return response.blob();
    };

    this.registries = deps.registries ?? createDiceRegistries();
    this.bus = deps.bus ?? createDiceBus();

    this.themes = {
      list: () => this.registries.listThemes(),
      get: (id) => this.registries.getTheme(id),
      has: (id) => this.registries.hasTheme(id),
      register: (id, theme) => this.registries.registerTheme(id, theme),
    };
    this.textures = {
      list: () => this.registries.listTextures(),
      get: (id) => this.registries.getTexture(id),
      register: (id, texture) => this.registries.registerTexture(id, texture),
    };
    this.materials = {
      list: () => this.registries.listMaterials(),
      get: (id) => this.registries.getMaterial(id),
      register: (id, material) => this.registries.registerMaterial(id, material),
    };
    this.models = {
      list: () => this.registries.listDiceModels(),
      get: (type) => this.registries.getDiceModel(type),
      register: (registration) => this.registries.registerDiceModel(registration),
    };

    this.queue = deps.queue ?? new RollQueue(
      () => this.config.queueMode,
      () => this.orchestrator.cancel()
    );
    this.sounds = deps.sounds ?? new SoundManager(this.config.assetPath);
    this.sounds.resolver = this.assetResolver;

    this.diceColors = deps.colors ?? new DiceColors({
      assetPath: this.config.assetPath,
      resolver: this.assetResolver,
      loadBlob: this.loadBlob,
      registries: this.registries,
    });
    this.diceFactory = deps.factory ?? new DiceFactory(
      {
        baseScale: this.config.baseScale,
        assetPath: this.config.assetPath,
        normalMaps: this.config.normalMaps,
        dracoPath: this.config.dracoPath,
        resolver: this.assetResolver,
        loadBlob: this.loadBlob,
      },
      { registries: this.registries, presets: deps.presets }
    );
    this.diceFactory.setBumpMapping(true);

    this.faceSwapDeps = {
      getPreset: (type) => this.diceFactory.ensure(type),
      createMaterials: (diceobj, size, margin, allowcache, d4specialindex) =>
        this.diceFactory.createMaterials(diceobj, size, margin, allowcache, d4specialindex),
    };

    const themeId = this.config.surface ?? this.config.theme;
    this.surface =
      this.registries.getTheme(themeId)?.surface ??
      this.registries.getTheme('default')?.surface ??
      'wood_tray';

    this.sceneRenderer = deps.sceneRenderer ?? new SceneRenderer();
    this.physics = deps.physics ?? new PhysicsController();
    this.layout = deps.layout ?? new LayoutController({
      container: this.container,
      onLayout: () => this.#handleLayout(),
    });
    this.planner = deps.planner ?? new ThrowPlanner({
      getDisplay: () => this.layout.display,
      getPreset: (type) => this.diceFactory.ensure(type),
      rng: deps.rng,
    });
    this.spawner = deps.spawner ?? new DiceSpawner({
      scene: this.sceneRenderer.scene,
      factory: this.diceFactory,
      colors: this.diceColors,
      getConfig: () => ({ theme: this.config.theme, shadows: this.config.shadows }),
    });
    this.selection = deps.selection ?? new SelectionController({
      getDice: () => this.spawner.dice,
      getCamera: () => this.sceneRenderer.camera,
      getOutlinePass: () => this.sceneRenderer.postFX?.outlinePass,
      requestRender: () => {
        if (this.orchestrator.idle) this.renderFrame();
      },
      onDieClick: (id, value) => this.bus.emit('die:click', { id, value }),
    });
    this.orchestrator = deps.orchestrator ?? new RollOrchestrator({
      bus: this.bus,
      queue: this.queue,
      physics: this.physics,
      planner: this.planner,
      spawner: this.spawner,
      sounds: this.sounds,
      shapes: this.diceFactory,
      swapFace: (mesh, result) => swapDiceFace(mesh, result, this.faceSwapDeps),
      getConfig: () => ({
        timestep: this.config.timestep,
        iterationLimit: this.config.iterationLimit,
        strength: this.config.strength,
        cascadeDelay: this.config.cascadeDelay,
      }),
      getDisplay: () => this.layout.display,
      renderFrame: () => this.renderFrame(),
      clearSelection: () => this.selection.clear(),
      isDisposed: () => this.#disposed,
      rng: deps.rng ?? Math.random,
    });

    const ready = this.#initialize();
    ready.catch(() => {});
    this.ready = ready;
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  get rolling(): boolean {
    return this.orchestrator.rolling;
  }

  get selectedIds(): Set<string> {
    return this.selection.selectedIds;
  }

  on<K extends keyof DiceBoxEvents & string>(event: K, handler: (payload: DiceBoxEvents[K]) => void): () => void {
    return this.bus.on(event as never, (payload: unknown) => handler(payload as DiceBoxEvents[K]));
  }

  off<K extends keyof DiceBoxEvents & string>(event: K, handler: (payload: DiceBoxEvents[K]) => void): void {
    this.bus.off(event as never, handler as never);
  }

  once<K extends keyof DiceBoxEvents & string>(event: K, handler: (payload: DiceBoxEvents[K]) => void): () => void {
    return this.bus.once(event as never, (payload: unknown) => handler(payload as DiceBoxEvents[K]));
  }

  async #initialize(): Promise<void> {
    if (this.#initialized) return;
    if (this.#disposed) throw new DiceError('DiceBox is destroyed', 'DISPOSED');

    this.sceneRenderer.initialize(this.container, {
      antialias: this.config.antialias,
      maxPixelRatio: this.config.maxPixelRatio,
      shadows: this.config.shadows,
    });

    this.setDimensions(this.layout.dimensions);
    this.sceneRenderer.recreatePostFX(this.config.postprocessing, this.config.antialias, this.layout.display);
    this.layout.startResizeWatcher();

    const canvas = this.sceneRenderer.renderer?.domElement;
    if (canvas) {
      this.selection.attach(canvas);
    }

    await this.physics.initialize(
      {
        worker: this.config.worker,
        workerFactory: this.config.workerFactory,
        workerUrl: this.config.workerUrl,
        timestep: this.config.timestep,
        gravityMultiplier: this.config.gravityMultiplier,
      },
      this.layout.display.containerWidth || this.container.clientWidth,
      this.layout.display.containerHeight || this.container.clientHeight
    );

    await this.#prepareAssets();
    await this.#applyEnvironment();

    try {
      await this.loadTheme();

      if (this.config.sounds) {
        await this.loadSounds();
      }

      this.#initialized = true;
      this.renderFrame();
      this.bus.emit('ready');
    } catch (error) {
      console.error('Initialization failed:', error);
      this.bus.emit('error', error as Error);
      throw error;
    }
  }

  #handleLayout(): void {
    this.physics.updateBarriers(
      this.layout.display.containerWidth,
      this.layout.display.containerHeight
    );
    this.sceneRenderer.applyLayout(
      this.layout.display,
      this.layout.cameraHeight,
      this.orchestrator.resolveCameraZ(this.layout.cameraHeight),
      this.config.shadows
    );
    if (this.orchestrator.idle) {
      this.renderFrame();
    }
  }

  async #prepareAssets(): Promise<void> {
    if (!this.assetManager) return;
    const manifest = buildDiceManifest(this.config, this.surface, this.registries);
    this.assetManager.registerPack(manifest);
    if (this.config.assets?.preload === false) return;
    await this.assetManager.preload(manifest.name, {
      includeLazy: this.config.assets?.includeLazy ?? false,
    });
  }

  async #applyEnvironment(): Promise<void> {
    const theme = this.registries.getTheme(this.config.theme);
    const spec: EnvironmentSpec = theme?.cubeMap?.length === 6
      ? { cubeMap: theme.cubeMap }
      : this.config.environment;

    await this.sceneRenderer.applyEnvironment({
      spec,
      fallback: this.config.environment,
      assetPath: this.config.assetPath,
      resolver: this.assetResolver,
      intensity: this.config.environmentIntensity,
    });
  }

  select(dieIds: string[]): void {
    this.selection.select(dieIds);
  }

  clearSelection(): void {
    this.selection.clear();
  }

  async loadTheme(): Promise<void> {
    let colorData: ColorSet;
    if (this.config.customColorset) {
      colorData = await this.diceColors.makeColorSet(this.config.customColorset);
    } else {
      colorData = await this.diceColors.getColorSet({
        colorset: this.config.theme,
        texture: this.config.texture,
        material: this.config.material,
      });
    }
    this.diceFactory.applyColorSet(colorData);
    this.colorData = colorData;
  }

  async loadSounds(): Promise<void> {
    this.sounds.enabled = this.config.sounds;
    this.sounds.volume = this.config.volume;
    this.sounds.surface = this.surface;
    this.sounds.dieMaterial = this.sounds.resolveDieMaterial(this.colorData?.texture?.material);
    await this.sounds.load();
  }

  async configure(options: DiceBoxOptions = {}): Promise<void> {
    const prev = this.config;
    const next = normalizeOptions({ ...configToOptions(this.config), ...options });
    this.config = next;

    const themeChanged =
      options.theme !== undefined ||
      options.theme_colorset !== undefined ||
      options.customColorset !== undefined ||
      options.theme_customColorset !== undefined ||
      options.texture !== undefined ||
      options.theme_texture !== undefined ||
      options.material !== undefined ||
      options.theme_material !== undefined;

    if (themeChanged) {
      this.surface =
        this.registries.getTheme(next.surface ?? next.theme)?.surface ??
        this.registries.getTheme('default')?.surface ??
        this.surface;
      await this.loadTheme();
      await this.#prepareAssets();
      if (this.config.sounds) {
        this.sounds.surface = this.surface;
        this.sounds.dieMaterial = this.sounds.resolveDieMaterial(this.colorData?.texture?.material);
      }
      this.bus.emit('theme:change', { theme: next.theme });
    }

    const envChanged =
      options.environment !== undefined ||
      (themeChanged && this.registries.getTheme(next.theme)?.cubeMap?.length === 6) ||
      options.environmentIntensity !== undefined;

    if (envChanged && this.sceneRenderer.renderer) {
      await this.#applyEnvironment();
    }

    if (options.shadows !== undefined && this.sceneRenderer.renderer) {
      this.sceneRenderer.setShadowQuality(next.shadows, this.spawner.dice);
    }

    if (options.postprocessing !== undefined && this.sceneRenderer.renderer) {
      this.sceneRenderer.recreatePostFX(next.postprocessing, next.antialias, this.layout.display);
      this.sceneRenderer.syncPostFXCamera();
    }

    if (options.antialias !== undefined && options.antialias !== prev.antialias) {
      console.warn('[dice] "antialias" changes require a new DiceBox instance to take effect');
    }

    if (next.surface !== prev.surface && !themeChanged) {
      this.surface = this.registries.getTheme(next.surface ?? next.theme)?.surface ?? this.surface;
    }

    if (options.sounds !== undefined || options.volume !== undefined) {
      this.sounds.enabled = next.sounds;
      this.sounds.volume = next.volume;
      if (next.sounds && options.sounds === true) {
        await this.loadSounds();
      }
    }

    if (this.orchestrator.idle && this.sceneRenderer.renderer && this.sceneRenderer.camera) {
      this.renderFrame();
    }
  }

  private setDimensions(dimensions: THREE.Vector2): void {
    this.layout.setDimensions(dimensions);
  }

  private renderFrame(): void {
    this.sceneRenderer.renderFrame();
  }

  clear(): void {
    this.orchestrator.clear();
  }

  cancel(): void {
    this.orchestrator.cancel();
  }

  async roll(terms: DiceTerm[]): Promise<RollOutcome> {
    return this.orchestrator.roll(normalizeTerms(terms));
  }

  async add(terms: DiceTerm[]): Promise<RollOutcome> {
    return this.orchestrator.add(normalizeTerms(terms));
  }

  async reroll(dice: RerollRequest[]): Promise<RolledDie[]> {
    return this.orchestrator.reroll(dice);
  }

  async remove(ids: string[]): Promise<RolledDie[]> {
    return this.orchestrator.remove(ids);
  }

  destroy(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.orchestrator.interrupt();

    this.layout.stopResizeWatcher();
    this.selection.detach();
    this.spawner.removeAll();
    this.physics.destroy();
    this.sceneRenderer.dispose();
    this.diceFactory.disposeCachedMaterials();
    this.sounds.dispose();
    this.bus.destroy();
    this.#initialized = false;
  }
}

export function createDiceBox(element: HTMLDivElement, options: DiceBoxOptions = {}): DiceBox {
  return new DiceBox(element, options);
}
