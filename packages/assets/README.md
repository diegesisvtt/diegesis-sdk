# @diegesis/assets

> Declarative asset packs for Diegesis: content-addressed caching, persistent storage adapters, preload with progress events.

Manifests describe named assets (textures, audio, HDR environments, models,
fonts, arbitrary blobs). The `AssetManager` loads them through a layered cache —
memory, then persistent storage adapters, then network — verifies SHA-256
content hashes, deduplicates in-flight requests by cache key, and preloads
packs with progress events delivered over an `@diegesis/events` bus.

- **Validation** — manifests and entries are Valibot schemas (`AssetManifestSchema`, `AssetEntrySchema`).
- **Content-addressed** — entries with a `hash` are cached by hash, so two packs referencing the same content share one cache entry and one network request.
- **Browser globals**: `fetch`, `crypto.subtle`, `caches` (optional), `URL.createObjectURL`.

## Installation

```bash
npm install @diegesis/assets
```

No peer dependencies.

## Quick start

```ts
import { AssetManager, defineManifest } from '@diegesis/assets';

const manifest = defineManifest({
  name: 'core',
  version: '1.0.0',
  baseUrl: '/assets/',
  assets: [
    { id: 'wood', url: 'textures/wood.png', type: 'texture', priority: 10 },
    { id: 'env-tavern', url: 'environments/tavern.hdr', type: 'hdr', lazy: true },
    { id: 'd20', url: 'models/d20.glb', type: 'model', hash: 'sha256:ab12...' },
  ],
});

const manager = new AssetManager();
manager.registerPack(manifest);

manager.bus.on('preload:progress', ({ id, loaded, total }) => {
  console.log(`${id}: ${loaded}/${total}`);
});

const summary = await manager.preload('core', { concurrency: 4 });
console.log(summary.failed); // 0

const blob = await manager.load('wood');
const textureUrl = manager.resolveUrl('wood'); // object URL once cached; feed to THREE.TextureLoader
```

## API

### Manifests

```ts
type AssetType = 'texture' | 'audio' | 'hdr' | 'cubemap' | 'model' | 'font' | 'binary' | 'json';

interface AssetEntry {
  id: string;          // unique within the manifest
  url: string;         // absolute, or relative to the manifest baseUrl
  hash?: string;       // 'sha256:<hex>'; verified after download
  type?: AssetType;    // consumer hint; not enforced by the loader
  lazy?: boolean;      // excluded from preload unless includeLazy
  priority?: number;   // higher preloads first
  size?: number;       // informational
  [key: string]: unknown; // loose object: extra fields preserved
}

interface AssetManifest {
  name: string;
  version?: string;
  baseUrl?: string;
  assets: AssetEntry[];
  [key: string]: unknown;
}
```

Helpers:

- `defineManifest(manifest: AssetManifest): AssetManifest` — validate and type an authored manifest.
- `parseManifest(input: unknown): AssetManifest` — parse unknown input; throws a Valibot error on invalid input.
- `assetCacheKey(entry): string` — the cache key: `hash ?? url ?? id`.
- Schemas: `AssetTypeSchema`, `AssetEntrySchema`, `AssetManifestSchema`.

### `AssetManager`

```ts
interface AssetManagerOptions {
  adapters?: StorageAdapter[]; // default [memory, cache-api?] — checked in order
  bus?: AssetsBus;             // default: new bus from createAssetsBus()
  fetcher?: typeof fetch;      // default: global fetch
  verifyHashes?: boolean;      // default true
}

interface PreloadOptions {
  includeLazy?: boolean; // default false
  concurrency?: number;  // default 4, clamped to >= 1
}

interface PreloadSummary { pack: string; loaded: number; total: number; failed: number; }

class AssetManager {
  readonly bus: AssetsBus;
  constructor(options?: AssetManagerOptions);

  registerPack(manifest: AssetManifest): void;  // entry URLs joined with baseUrl at registration
  has(id: string): boolean;
  listPacks(): string[];
  getEntry(id: string): AssetEntry | undefined;
  urlFor(id: string): string | undefined;       // absolute URL (baseUrl joined)
  isCached(id: string): boolean;                // in the memory cache
  resolveUrl(idOrUrl: string): string;          // object URL if cached, absolute URL if registered, else passthrough
  load(id: string): Promise<Blob>;
  preload(packName: string, options?: PreloadOptions): Promise<PreloadSummary>;
  preloadAll(options?: PreloadOptions): Promise<PreloadSummary[]>;
  clearPersistent(): Promise<void>;
  destroy(): void; // revokes object URLs; destroys the bus if it owns it
}
```

`load(id)` walks the layers in order:

1. Memory cache.
2. Persistent adapters (in order).
3. Network via `fetcher`, then hash verification, then `adapter.set` on every adapter.

In-flight requests for the same cache key are deduplicated. Unknown ids and
non-OK HTTP responses throw. On hash mismatch, an `asset:error` event is
emitted and the blob is served **without** being cached — `load` does not throw.
Hash verification uses `crypto.subtle` SHA-256 and expects `sha256:<hex>`.

`preload(packName)` downloads entries in descending `priority` order using
`concurrency` workers, emitting `preload:start`, `preload:progress` (per
asset), and `preload:finish`. Individual failures are counted in
`PreloadSummary.failed`, not thrown.

### Storage adapters

```ts
interface StorageAdapter {
  readonly name: string;
  readonly persistent: boolean;
  get(key: string): Promise<Blob | undefined>;
  set(key: string, blob: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}
```

- `class MemoryStorageAdapter` — ephemeral in-memory store (`persistent: false`). Always available.
- `class CacheStorageAdapter` — persistent store backed by the Cache Storage
  API (`persistent: true`). Failures are swallowed and treated as cache misses.

```ts
class CacheStorageAdapter implements StorageAdapter {
  constructor(options?: { cacheName?: string; baseUrl?: string });
  static isSupported(): boolean; // typeof caches !== 'undefined'
}
// defaults: cacheName 'diegesis-assets', baseUrl 'https://assets.diegesis.local/'
```

`baseUrl` only synthesizes request-like cache keys (Cache Storage requires
them); it never hits the network.

### Bus

The manager emits through an `@diegesis/events` bus created from
`assetsContract` (namespace `assets`, validation mode `'warn'`) via
`createAssetsBus()`. Inject a shared bus with `options.bus`.

| Event | Payload |
|-------|---------|
| `preload:start` | `{ pack: string; total: number }` |
| `preload:progress` | `{ pack: string; id: string; loaded: number; total: number }` |
| `preload:finish` | `{ pack: string; loaded: number; total: number; failed: number }` |
| `asset:load` | `{ id: string; key: string; source: 'memory' \| 'adapter' \| 'network'; bytes: number }` |
| `asset:error` | `{ id: string; message: string }` |

### Custom adapters

```ts
import type { StorageAdapter } from '@diegesis/assets';

const idbAdapter: StorageAdapter = {
  name: 'indexeddb',
  persistent: true,
  async get(key) { /* ... */ },
  async set(key, blob) { /* ... */ },
  async delete(key) { /* ... */ },
  async has(key) { /* ... */ },
  async clear() { /* ... */ },
};

const manager = new AssetManager({ adapters: [new MemoryStorageAdapter(), idbAdapter] });
```

## Related packages

- [@diegesis/dice](https://www.npmjs.com/package/@diegesis/dice) — builds dice asset manifests via `buildDiceManifest`
- [@diegesis/render3d](https://www.npmjs.com/package/@diegesis/render3d) — pass `manager.resolveUrl` as the `resolve` hook of `loadEnvironment`
- [@diegesis/events](https://www.npmjs.com/package/@diegesis/events) — event/hook bus powering progress events

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
