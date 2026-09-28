# @diegesis/canvas-plugin-image-editor

> Image editor plugin for @diegesis/canvas — crop (pan/zoom/rotate/flip), advanced masks and ring overlay for token art; built-in customizable UI plus a headless API for custom interfaces.

Image/art editor for [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) placeables. Crop by pan/zoom/rotate/flip, clip with built-in or custom masks (circle, square, rounded, hex pointy/flat), overlay a flat or gradient ring, and export to `image/webp` or `image/png` — applied back to the document with history support.

Fully decoupled from document plugins: editable targets are discovered through the `imageField` metadata of the `DocumentTypeDefinition` — any plugin that declares an art field becomes editable without this package knowing the type. The built-in UI (`<diegesis-image-editor>`) opens in a window managed by `@diegesis/canvas-plugin-window` (hard dependency, `dependencies: ['windows']`); close, move, minimize, maximize and resize come from the window frame. A headless controller (`ImageEditor`) drives custom interfaces.

## Installation

```bash
npm install @diegesis/canvas-plugin-image-editor @diegesis/canvas-plugin-window
```

## Quick start

```ts
import { Canvas, defineCanvasElements } from '@diegesis/canvas';
import { windowsPlugin } from '@diegesis/canvas-plugin-window';
import { imageEditorPlugin } from '@diegesis/canvas-plugin-image-editor';

defineCanvasElements();
const canvas = new Canvas(container, { plugins: [windowsPlugin, imageEditorPlugin] });
await canvas.initialize();
```

With the default options, double-clicking any document whose type declares `imageField` (e.g. tokens) opens the editor window, and an "Edit art..." action appears in the context menu. Applying writes the composed data URL to the document's art field and emits `imageEditor:applied` on the canvas bus.

Headless usage (custom UI):

```ts
import type { ImageEditorPlugin } from '@diegesis/canvas-plugin-image-editor';

const plugin = canvas.plugins.get<ImageEditorPlugin>('imageEditor')!;
const editor = plugin.createEditor();

await editor.loadFromDocument('token', tokenId);
editor.zoomBy(1.2);
editor.rotateBy(Math.PI / 2);
editor.setSettings({ mask: 'hex-vertical', ring: { color: '#b8935f', width: 6, style: 'gradient' } });
editor.applyToDocument('token', tokenId); // updates the doc + history
```

## API

### `ImageEditorPlugin` / `imageEditorPlugin`

Plugin instance (`id: 'imageEditor'`, `dependencies: ['windows']`).

`ImageEditorPluginOptions`:

```ts
interface ImageEditorPluginOptions {
  openOnDoubleClick?: boolean;                  // default true
  defaultSettings?: Partial<ImageEditorSettings>;
  maximizable?: boolean;                        // editor window maximizable; default true
}
```

Methods:

- `createEditor(): ImageEditor` — new headless editor bound to the host canvas.
- `open(type: string, id: string): void` — open (or focus) the editor window and load the document's current art; emits `imageEditor:opened`.
- `notifyApplied(type: string, id: string): void` — emit `imageEditor:applied` (used by the built-in UI; custom UIs may call it).

Bus events: `imageEditor:opened`, `imageEditor:applied` — both `{ type: string; id: string }`.

### `ImageEditor`

Headless controller: source, transform (crop), settings, preview and export/apply. Framework-agnostic — the built-in Web Component and custom UIs drive this object.

```ts
new ImageEditor(deps?: ImageEditorDeps);
// deps: { composer?, loadImage?, canvas?, defaultSettings? }

editor.state; editor.settings; editor.transform;
const unsub = editor.subscribe(() => render());

await editor.loadFromUrl(url);
await editor.loadFromFile(file);
await editor.loadFromDocument(type, id, field?); // art field from imageField metadata (fallback 'texture')
editor.clearSource();

editor.setTransform({ x, y, zoom, rotation, flipX });
editor.panBy(dxPx, dyPx, viewSize);
editor.zoomBy(factor);
editor.rotateBy(deltaRad);
editor.toggleFlip();
editor.resetTransform();
editor.setSettings(partial);

editor.preview(targetCanvas, size?);
editor.exportDataURL();            // string | null
await editor.exportBlob();         // Blob | null
editor.applyToDocument(type, id, field?);
editor.composeSource(source, overrides?); // raw compose for advanced custom UIs
```

`ImageTransform`: `{ x, y, zoom, rotation, flipX }` — pan as a fraction of the token size, multiplicative zoom (1 = cover fit), rotation in radians.

`ImageEditorSettings` (defaults in `DEFAULT_SETTINGS`):

```ts
interface ImageEditorSettings {
  size: number;                       // output resolution (square px); default 400
  mask: string | MaskShape;           // registry id or shape instance; default 'circle'
  background: string | null;          // behind the image; null = transparent
  ring: {
    color: string;
    color2?: string;                  // secondary color when style = 'gradient'
    width: number;                    // % of token size (0 = no ring); default 4
    style: 'flat' | 'gradient';
  };
  format: 'image/png' | 'image/webp'; // default 'image/webp'
  quality: number;                    // default 0.92
}
```

### Masks

- `imageMasks` — shared `MaskRegistry` with the built-ins: `circle`, `square`, `rounded`, `hex-vertical`, `hex-horizontal`.
- `MaskRegistry` — `register(shape)`, `get(id)`, `resolve(id | shape)`, `list()`.
- `polygonMask(id, label, points)` — custom mask from normalized (0..1) vertices.
- `pathMask(id, label, factory)` — custom mask from a `Path2D` factory.
- `hexVerticalVertices()`, `hexHorizontalVertices()` — normalized hexagon vertices.
- `MaskShape` — `{ id, label, polygon?, path? }`.

### Composer (pure pipeline)

`ImageComposer` — stateless composition: background → mask clip → transformed image (crop) → ring. Injectable 2D factory for non-DOM environments:

- `new ImageComposer(factory = domCanvasFactory, masks = imageMasks)`.
- `compose(source, settings, overrides?)`, plus `toDataURL`/`toBlob` helpers.
- `ComposeImageSource` (minimal image interface), `HtmlImageSource`, `Canvas2DFactory`, `domCanvasFactory`.

### Built-in UI

`DiegesisImageEditor` (`IMAGE_EDITOR_TAG` = `<diegesis-image-editor>`), registered via `defineImageEditorElements()`. Set `panel.canvas = canvas` and call `panel.edit(type, id)`; it dispatches an `image-edited` `CustomEvent` when art is applied.

## Related packages

- [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) — plugin-first canvas core (required); declares the `imageField` document metadata.
- [`@diegesis/canvas-plugin-window`](https://www.npmjs.com/package/@diegesis/canvas-plugin-window) — window manager hosting the built-in editor UI (required).
- [`@diegesis/canvas-plugin-tokens`](https://www.npmjs.com/package/@diegesis/canvas-plugin-tokens) — token documents with editable art.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
