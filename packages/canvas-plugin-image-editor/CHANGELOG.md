# @diegesis/canvas-plugin-image-editor

## 0.2.0

### Minor Changes

- 11a8164: Add `@diegesis/canvas-plugin-window`: a window manager for `@diegesis/canvas`.

  - Floating windows with close, drag (mouse + touch via Pointer Events),
    minimize (taskbar), maximize and resize (8 handles, min/max/aspect
    constraints).
  - Modal windows with backdrop and `Esc` dismissal (`persistent` opts out).
  - Docking to left/right/bottom edges with stack layout, per-window size via
    inner edge, drag-to-dock with live preview; docked minimize collapses to
    the titlebar. Docking can be restricted globally
    (`dockableEdges` manager option) and per window
    (`dockableEdges` on the window/definition, `false` never docks).
  - Dragging a docked titlebar detaches the window under the pointer and
    continues as a floating drag (re-dock by dragging to an allowed edge).
  - Edge snapping against the overlay and sibling windows (guides included);
    `Alt` disables snapping mid-gesture.
  - Resize feedback: gestures clamped by constraints or the overlay bounds
    flag the frame (`resize-blocked` styling) and emit
    `window:resize-blocked` (once per gesture); every committed resize emits
    `window:resize`; `resizeTo()` reports whether the size was applied
    exactly.
  - Popout (opt-in): with `popout: true` on the manager and `popoutable` on
    the window, the titlebar gains a popout button that moves the content to
    a separate browser window; closing it (or the taskbar entry) pops the
    content back in (`popout()`/`popin()`, `window:popout`/`window:popin`).
  - Declarative registration via `ctx.registerWindow({ id, title, factory })`
    with lazy content, plus imperative `manager.create()`.
  - `WindowManager.serialize()/restore()` persistence (registered windows
    round-trip by `definitionId`, optional `serializeContent/restoreContent`),
    `window:*` bus events (Valibot-validated) and `windowsBus()` typed port.
  - Headless mode: without a real DOM the manager tracks logical state and
    events, so tests/SSR keep working.

  Core (`@diegesis/canvas`): `WindowContribution` types and
  `PluginContext.registerWindow()` (auto-unregistered on plugin uninstall);
  `Canvas.host` getter; `PluginManager.get` generic widened. The image editor
  now requires the `windows` plugin and opens its built-in panel inside a
  managed window (double-click, context menu and `plugin.open()` all
  focus/reuse the same window); its window is maximizable by default and can
  be tuned via `new ImageEditorPlugin({ maximizable })`. The fog plugin
  registers its built-in panel as a dockable `fog` window when `windows` is
  installed (soft dependency — works standalone). The standard preset
  registers `windowsPlugin` before `fogPlugin` and `imageEditorPlugin`.

### Patch Changes

- Updated dependencies [dc84a50]
- Updated dependencies [b404e1e]
- Updated dependencies [a1b9da1]
- Updated dependencies [adb65b3]
- Updated dependencies [11a8164]
- Updated dependencies [d329e33]
- Updated dependencies [adb65b3]
- Updated dependencies [599ab54]
  - @diegesis/canvas@0.2.0
  - @diegesis/canvas-plugin-window@0.2.0
