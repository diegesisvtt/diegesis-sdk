import { THEMES } from './constants/themes';
import type { DiceTheme } from './constants/themes';
import { TEXTURELIST } from './constants/texturelist';
import type { TextureEntry } from './constants/texturelist';
import { MATERIALTYPES } from './constants/materialtypes';
import type { MaterialOptions } from './constants/materialtypes';

export interface DiceModelRegistration {
  type: string;
  url: string;
  scale?: number;
  physicsShape?: 'auto' | 'sphere' | 'box' | { kind: string; [key: string]: any };
  draco?: boolean;
}

export interface DiceRegistriesSeeds {
  themes?: Record<string, DiceTheme>;
  textures?: Record<string, TextureEntry>;
  materials?: Record<string, MaterialOptions>;
}

export class DiceRegistries {
  #themes: Map<string, DiceTheme>;
  #textures: Map<string, TextureEntry>;
  #materials: Map<string, MaterialOptions>;
  #models = new Map<string, DiceModelRegistration>();

  constructor(seeds: DiceRegistriesSeeds = {}) {
    this.#themes = new Map(Object.entries(seeds.themes ?? THEMES));
    this.#textures = new Map(Object.entries(seeds.textures ?? TEXTURELIST));
    this.#materials = new Map(Object.entries(seeds.materials ?? MATERIALTYPES));
  }

  registerTheme(id: string, theme: DiceTheme): void {
    this.#themes.set(id, theme);
  }

  getTheme(id: string): DiceTheme | undefined {
    return this.#themes.get(id) ?? this.#themes.get('default');
  }

  hasTheme(id: string): boolean {
    return this.#themes.has(id);
  }

  listThemes(): Record<string, DiceTheme> {
    return Object.fromEntries(this.#themes);
  }

  registerTexture(id: string, texture: TextureEntry): void {
    this.#textures.set(id, texture);
  }

  getTexture(id: string | string[]): TextureEntry | undefined {
    const key = Array.isArray(id) ? id[0] : id;
    return this.#textures.get(key) ?? this.#textures.get('none');
  }

  listTextures(): Record<string, TextureEntry> {
    return Object.fromEntries(this.#textures);
  }

  registerMaterial(id: string, material: MaterialOptions): void {
    this.#materials.set(id, material);
  }

  getMaterial(id: string): MaterialOptions | undefined {
    return this.#materials.get(id);
  }

  listMaterials(): Record<string, MaterialOptions> {
    return Object.fromEntries(this.#materials);
  }

  registerDiceModel(registration: DiceModelRegistration): void {
    this.#models.set(registration.type, registration);
  }

  getDiceModel(type: string): DiceModelRegistration | undefined {
    return this.#models.get(type);
  }

  listDiceModels(): Record<string, DiceModelRegistration> {
    return Object.fromEntries(this.#models);
  }
}

export function createDiceRegistries(seeds?: DiceRegistriesSeeds): DiceRegistries {
  return new DiceRegistries(seeds);
}
