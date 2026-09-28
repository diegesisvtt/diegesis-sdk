# @diegesis/render3d

> Three.js rendering toolkit for Diegesis: post-processing composer, HDR/cubemap environments, normal map generation.

`@diegesis/render3d` bundles the rendering pieces shared across the SDK:

- `PostFX` — a configurable post-processing pipeline (outline, bloom, SMAA/MSAA
  antialiasing) built on three.js `EffectComposer`.
- `loadEnvironment` — image-based-lighting environments from named HDR presets,
  explicit HDR URLs, or 6-face cubemaps, PMREM-processed and shared through a
  reference-counted cache.
- `heightCanvasToNormalCanvas` — Sobel-based height-map to normal-map conversion.
- `resolveAssetPath` — asset-path joining helper.

The package imports from `three` and `three/addons`.

## Installation

```bash
npm install @diegesis/render3d three
```

`three` (^0.182) is a peer dependency.

## Quick start

```ts
import { PostFX, loadEnvironment } from '@diegesis/render3d';

const postfx = new PostFX(renderer, scene, camera, {
  enabled: true,
  antialias: 'smaa',
  bloom: { strength: 0.5, radius: 0.5, threshold: 0.8 },
  outline: { edgeStrength: 5, visibleEdgeColor: '#ffb347' },
}, width, height);

const env = await loadEnvironment(renderer, 'tavern', '/assets/');
scene.environment = env.texture; // PMREM-ready; release later with env.dispose()

function animate() {
  postfx.render();
  requestAnimationFrame(animate);
}
```

## API

### Post-processing

```ts
type AntialiasMode = 'none' | 'msaa' | 'smaa';

interface BloomOptions {
  strength?: number;  // default 0.4
  radius?: number;    // default 0.6
  threshold?: number; // default 0.85
}

interface OutlineOptions {
  edgeStrength?: number;      // default 4
  pulsePeriod?: number;       // seconds; default 1.5, 0 disables pulsing
  visibleEdgeColor?: string;
  hiddenEdgeColor?: string;
}

interface PostFXOptions {
  enabled?: boolean;              // default false — render falls back to renderer.render
  bloom?: false | BloomOptions;
  outline?: false | OutlineOptions;
  antialias?: AntialiasMode;
}
```

```ts
class PostFX {
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: PostFXOptions,
    width: number,
    height: number,
  );

  outlinePass?: OutlinePass;  // public; set selectedObjects to highlight meshes
  get enabled(): boolean;
  setCamera(camera: THREE.Camera): void;
  setSize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}
```

Pass order: Render → Outline → Bloom → SMAA → Output. `msaa` renders into a
`HalfFloatType` render target with 4 samples; `smaa` appends an `SMAAPass`.

```ts
postfx.outlinePass!.selectedObjects = [selectedMesh];
```

### Environments

```ts
type EnvironmentName = 'neutral' | 'tavern' | 'neon' | 'none';

type EnvironmentSpec =
  | EnvironmentName
  | { source: string }     // HDR URL (absolute or relative to assetPath)
  | { cubeMap: string[] }; // 6 face URLs

interface EnvironmentHandle {
  texture: THREE.Texture; // PMREM-processed, ready for scene.environment
  owned: boolean;         // true for the procedural fallback; false for shared cached textures
  dispose: () => void;    // idempotent; releases the refcount or disposes owned textures
}

function loadEnvironment(
  renderer: THREE.WebGLRenderer,
  spec: EnvironmentSpec | undefined, // undefined resolves to 'none'
  assetPath: string,
  resolve?: (url: string) => string, // defaults to identity
): Promise<EnvironmentHandle>;

function disposeEnvironmentCache(): void; // force-dispose everything (full teardown only)
```

Behavior:

- Named specs resolve to `<assetPath>/environments/<name>.hdr`, loaded with
  `HDRLoader` as `HalfFloatType` and PMREM-processed.
- A failed HDR load logs a warning and falls back to a procedural 512px
  gradient environment (marked `owned`).
- Results are cached module-wide by resolved URL and shared via reference
  counting — each call returns a handle you must release with `dispose()`.
  The shared texture is destroyed when the last handle is released.

```ts
import { loadEnvironment, disposeEnvironmentCache } from '@diegesis/render3d';

const custom = await loadEnvironment(renderer, { source: '/envs/custom.hdr' }, '/');
const cubed = await loadEnvironment(renderer, { cubeMap: [px, nx, py, ny, pz, nz] }, '/');
```

### Normal maps

```ts
function heightCanvasToNormalCanvas(source: HTMLCanvasElement, strength?: number): HTMLCanvasElement;
```

Converts a grayscale height map into a tangent-space normal map using the Sobel
operator (default `strength` 2). Edges wrap; output alpha is 255. Requires a
DOM canvas — browser only.

```ts
import { heightCanvasToNormalCanvas } from '@diegesis/render3d';

const normalMap = new THREE.CanvasTexture(heightCanvasToNormalCanvas(bumpCanvas, 2));
material.normalMap = normalMap;
```

### Asset paths

```ts
function resolveAssetPath(assetPath: string | undefined, source: string): string;
```

Joins a base path with a source URL. Absolute URLs and `data:`/`blob:` URLs
pass through unchanged; otherwise `assetPath` (default `'./'`) is joined after
stripping a leading `./` or `/` from the source.

```ts
resolveAssetPath('/assets/', 'textures/wood.png');       // '/assets/textures/wood.png'
resolveAssetPath('/assets/', 'https://cdn.example.com/x.png'); // passthrough
```

## Related packages

- [@diegesis/dice](https://www.npmjs.com/package/@diegesis/dice) — 3D dice roller using this toolkit
- [@diegesis/assets](https://www.npmjs.com/package/@diegesis/assets) — asset packs and caching (pair with `loadEnvironment`'s `resolve` hook)
- [@diegesis/physics](https://www.npmjs.com/package/@diegesis/physics) — cannon-es physics host

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
