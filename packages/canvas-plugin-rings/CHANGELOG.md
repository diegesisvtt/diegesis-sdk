# @diegesis/canvas-plugin-rings

## 0.2.1

### Patch Changes

- cb568ac: Add a package README to every published package: npm-page documentation, verified quick starts and API references, LLM-friendly signatures.
- Updated dependencies [cb568ac]
  - @diegesis/canvas@0.2.1

## 0.2.0

### Minor Changes

- 8f1bde7: Add `@diegesis/canvas-plugin-rings`: concentric colored ring markers for
  tokens on `@diegesis/canvas` — an extensible take on Owlbear Rodeo's
  Colored Rings.

  - `ring` document type (undo/redo + scene round-trip via `scene.rings`),
    rendered beneath tokens and synced per-frame to token drag/resize/hide.
  - Valibot-validated styles: color, width, alpha, shape (circle/square),
    dash pattern, pulse animation, glow.
  - Preset registry: 12 `COLOR_PRESETS`, semantic `CONDITION_PRESETS`
    (poisoned, bloodied, burning, blessed, frozen, ...), custom presets via
    constructor or `registerPreset`.
  - Context menu: swatch grid with toggle state, custom color picker,
    batched clear — multi-select aware.
  - `ringsBus()` typed port with `ring:added`/`ring:removed`/`rings:cleared`
    events and a `rings:resolve-style` syncWaterfall hook so other plugins
    (initiative trackers, condition managers) can restyle rings dynamically.
  - Configurable layout (`spread` outward/inward, `gap`, `startInset`) with
    pure, tested geometry helpers (`ringSlots`, `dashedArcs`).

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
