# @diegesis/canvas-plugin-window

> Window manager for @diegesis/canvas — floating, modal, dockable, snappable windows with taskbar and state persistence.

Desktop-style window management over the [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) host element: floating and modal windows with close/move/minimize (taskbar)/maximize/resize, edge docking (left/right/bottom) with drag zones, snapping with guides, popout to a native browser window, z-order bands (floating < backdrop < modal) and full layout persistence via `serialize()`/`restore()`.

Other plugins declare windows with `ctx.registerWindow({ id, title, factory, ... })`; the host drives them through `windows.manager` (create/open/serialize/restore/...). In headless environments (SSR, tests) the manager operates logically: state, events and persistence work without DOM frames.

## Installation

```bash
npm install @diegesis/canvas-plugin-window
```

## Quick start

```ts
import { Canvas, defineCanvasElements } from '@diegesis/canvas';
import { windowsPlugin, type WindowsPlugin } from '@diegesis/canvas-plugin-window';

defineCanvasElements();
const canvas = new Canvas(container, { plugins: [windowsPlugin] });
await canvas.initialize();

const windows = canvas.plugins.get<WindowsPlugin>('windows')!.manager;

windows.register({
  id: 'help',
  title: 'Quick help',
  width: 300,
  height: 420,
  dock: 'right',
  factory: () => {
    const el = document.createElement('div');
    el.textContent = 'Hello, windows!';
    return el;
  },
});

windows.open('help');

// Persist the layout
localStorage.setItem('windows', JSON.stringify(windows.serialize()));
windows.restore(JSON.parse(localStorage.getItem('windows') ?? '[]'));
```

Plugins (not hosts) should declare windows through the plugin context — the definition is removed automatically on uninstall:

```ts
import { definePlugin } from '@diegesis/canvas';

export const myPlugin = definePlugin({
  id: 'mine',
  dependencies: ['windows'],
  install(ctx) {
    ctx.registerWindow({
      id: 'mine-panel',
      title: 'My panel',
      width: 320,
      factory: () => document.createElement('my-panel'),
    });
  },
});
```

## API

### `WindowsPlugin` / `windowsPlugin`

Plugin instance (`id: 'windows'`). Exposes `manager: WindowManager` and implements the `WindowRegistrar` capability consumed by `ctx.registerWindow`. Registers the `window:*` events on the canvas bus.

### `WindowManager`

| Method | Description |
| --- | --- |
| `register(def, owner?)` | Register a window definition (lazy content, opened with `open`). |
| `unregister(definitionId)` | Remove a definition and close its open windows. |
| `open(definitionId, overrides?)` | Open by definition id. `single` (default) reuses/focuses the instance; `multi` creates one per call. |
| `create(def)` | Create a window imperatively (`WindowCreateOptions`). Returns a `WindowHandle`. |
| `get(id)` / `list()` | Look up handles (also resolves single-instance definition ids). |
| `close(id)` / `closeAll()` | Close one or all windows. |
| `focus(id)` / `minimize(id)` / `restoreWindow(id)` / `maximize(id)` | Window state operations. |
| `minimizeAll()` | Minimize all floating, normal-state windows. |
| `moveTo(id, x, y)` / `resizeTo(id, w, h)` | Geometry (floating windows only; returns `false` otherwise). |
| `setConstraints(id, constraints)` | Update `WindowConstraints` (min/max size, aspect ratio). |
| `dockTo(id, edge)` / `undock(id)` | Dock to `'left' \| 'right' \| 'bottom'` or return to floating. |
| `popout(id)` / `popin(id)` | Move content to/from a native popup window (requires `popout: true` manager option). |
| `serialize()` / `restore(states)` | Persist/restore geometry, state, dock, z-order and content payloads. |
| `setOptions(options)` | Update `WindowManagerOptions` at runtime. |
| `destroy()` | Tear everything down. |

`WindowManagerOptions`: `taskbar` (default `true`), `snap` (default `true`), `snapThreshold` (default `12`), `dockMargin` (default `24`), `popout` (default `false`), `dockableEdges` (default all; `false` disables docking).

### `WindowCreateOptions`

```ts
interface WindowCreateOptions {
  id?: string;
  definitionId?: string;
  title: string;
  instances?: 'single' | 'multi';   // default 'single'
  content?: HTMLElement;
  factory?: (owner: PluginContext) => HTMLElement | Promise<HTMLElement>;
  owner?: PluginContext;
  width?: number;                   // default 360
  height?: number;                  // default 320
  x?: number; y?: number;           // default: centered
  modal?: boolean;                  // backdrop blocks the canvas
  persistent?: boolean;             // modal: Esc/backdrop click do not close
  closable?: boolean;               // default true
  minimizable?: boolean;            // default true
  maximizable?: boolean;            // default true
  resizable?: boolean;              // default true
  popoutable?: boolean;             // requires manager popout: true
  dock?: WindowDockTarget;          // 'float' | 'left' | 'right' | 'bottom'
  dockableEdges?: WindowDockEdge[] | false;
  constraints?: WindowConstraints;  // minWidth/minHeight/maxWidth/maxHeight/aspectRatio
  serializeContent?: (content: HTMLElement) => unknown;
  restoreContent?: (content: HTMLElement, data: unknown) => void;
}
```

### `WindowHandle`

Public reference to an open window; all operations delegate to the manager.

```ts
handle.id; handle.definitionId; handle.title;
handle.state;        // 'normal' | 'minimized' | 'maximized'
handle.dock;         // 'float' | 'left' | 'right' | 'bottom'
handle.poppedOut;
handle.element;      // <diegesis-window-frame> (null headless)
handle.content;      // element produced by the factory (null headless)
handle.constraints;
handle.setConstraints(c); handle.close(); handle.focus();
handle.minimize(); handle.restore(); handle.maximize();
handle.moveTo(x, y); handle.resizeTo(w, h);
handle.dockTo(edge); handle.undock();
handle.popout(); handle.popin();
const off = handle.on('close' | 'focus' | 'blur' | 'state' | 'dock' | 'resize' | 'popout' | 'popin', () => { ... });
```

### Bus events

Registered on the canvas bus (payloads validated by `WINDOW_EVENT_SCHEMAS`): `window:created`, `window:closed`, `window:state`, `window:dock`, `window:focus`, `window:blur`, `window:resize`, `window:resize-blocked`, `window:popout`, `window:popin`.

### Frame element and utilities

- `WindowFrameElement`, `WINDOW_FRAME_TAG` (`<diegesis-window-frame>`), `defineWindowElements()` — the built-in window chrome.
- `windowsBus(bus)` — typed bus port (`WindowsBusPort`).
- `computeSnap(rect, targets, threshold)`, `detectDockZone(x, y, bounds, margin, edges)`, `clampToBounds(rect, bounds)` — pure geometry helpers (`Rect`, `Bounds`, `SnapResult`).
- `WINDOW_STATE_ENTRY_SCHEMA`, `WindowStateEntry` and the `Window*Event` payload types.

## Related packages

- [`@diegesis/canvas`](https://www.npmjs.com/package/@diegesis/canvas) — plugin-first canvas core (required); declares the `WindowContribution`/`WindowRegistrar` contract.
- [`@diegesis/canvas-plugin-image-editor`](https://www.npmjs.com/package/@diegesis/canvas-plugin-image-editor) — example consumer: opens its editor UI in a managed window.

---

Part of [diegesis-sdk](https://github.com/diegesisvtt/diegesis-sdk). MIT.
