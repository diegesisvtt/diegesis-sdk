import { AudioEngine } from '@diegesis/audio';
import { newId } from '@diegesis/events';
import type { CollideEvent } from '@diegesis/physics';
import { ANIMATION } from '../constants/animation';

export const SURFACE_COUNTS: Record<string, number> = {
  felt: 7,
  wood_table: 7,
  wood_tray: 7,
  metal: 9,
};

export const DIE_MATERIAL_COUNTS: Record<string, number> = {
  coin: 6,
  metal: 12,
  plastic: 15,
  wood: 12,
};

const CHANNEL = 'dice';
const LOAD_TIMEOUT_MS = 15000;

export class SoundManager {
  surface = 'wood_tray';
  dieMaterial = 'plastic';
  enabled = false;
  volume = 100;
  resolver: (url: string) => string = (url) => url;

  #assetPath: string;
  #engine: AudioEngine | null = null;
  #table = new Map<string, string[]>();
  #dice = new Map<string, string[]>();
  #lastSound = 0;
  #lastType = '';
  #lastStep = 0;

  constructor(assetPath: string) {
    this.#assetPath = assetPath;
  }

  setAssetPath(assetPath: string): void {
    this.#assetPath = assetPath;
  }

  resolveDieMaterial(textureMaterial?: string): string {
    const match = textureMaterial?.match(/wood|metal/g);
    return match ? textureMaterial! : 'plastic';
  }

  async load(): Promise<void> {
    if (!this.#table.has(this.surface)) {
      const count = SURFACE_COUNTS[this.surface] ?? 7;
      this.#table.set(
        this.surface,
        await Promise.all(
          Array.from({ length: count }, (_, i) =>
            this.loadAudio(`${this.#assetPath}sounds/surfaces/surface_${this.surface}${i + 1}.mp3`)
          )
        )
      );
    }

    const loadDieSet = async (material: string) => {
      if (this.#dice.has(material)) return;
      const count = DIE_MATERIAL_COUNTS[material] ?? 6;
      this.#dice.set(
        material,
        await Promise.all(
          Array.from({ length: count }, (_, i) =>
            this.loadAudio(`${this.#assetPath}sounds/dicehit/dicehit_${material}${i + 1}.mp3`)
          )
        )
      );
    };

    await Promise.all([loadDieSet('coin'), loadDieSet(this.dieMaterial)]);
  }

  async loadAudio(src: string): Promise<string> {
    const resolved = this.resolver(src);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    try {
      const response = await fetch(resolved, { signal: controller.signal, mode: 'cors' });
      if (!response.ok) throw new Error(`Audio load failed: ${src}`);
      await response.arrayBuffer();
    } finally {
      clearTimeout(timeout);
    }
    return this.#getEngine().register({ id: newId(), src: resolved, channel: CHANNEL });
  }

  playCollideEvents(events: CollideEvent[], muted: boolean): void {
    if (!this.enabled || this.volume <= 0 || muted) return;
    const engine = this.#engine;
    if (!engine) return;

    const now = Date.now();
    for (const event of events) {
      const currentType = event.isBody ? 'dice' : 'table';

      if ((this.#lastStep == event.step || this.#lastSound > now) && currentType != 'dice') continue;
      if (
        (this.#lastStep == event.step || this.#lastSound > now) &&
        currentType == 'dice' &&
        this.#lastType == 'dice'
      ) continue;

      if (event.speed < ANIMATION.MIN_SOUND_SPEED) continue;

      if (event.isBody) {
        const material = event.shapeTag === 'd2' ? 'coin' : this.dieMaterial;
        this.#playFrom(engine, this.#dice.get(material) ?? this.#dice.get('plastic'), event.speed);
        this.#lastType = 'dice';
      } else {
        this.#playFrom(engine, this.#table.get(this.surface), event.speed);
        this.#lastType = 'table';
      }

      this.#lastStep = event.step;
      this.#lastSound = now + ANIMATION.SOUND_DELAY;
    }
  }

  dispose(): void {
    this.#engine?.destroy();
    this.#engine = null;
    this.#table.clear();
    this.#dice.clear();
  }

  #getEngine(): AudioEngine {
    if (!this.#engine) this.#engine = new AudioEngine({ channels: [CHANNEL] });
    return this.#engine;
  }

  #playFrom(engine: AudioEngine, list: string[] | undefined, speed: number): void {
    if (!list?.length) return;
    const soundId = list[Math.floor(Math.random() * list.length)];
    if (!soundId) return;
    engine.setVolume(soundId, Math.min(speed / ANIMATION.SOUND_VOLUME_DIVIDER, this.volume / 100));
    engine.playOnce(soundId, { origin: CHANNEL });
  }
}
