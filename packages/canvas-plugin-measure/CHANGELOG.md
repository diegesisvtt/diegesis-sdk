# @diegesis/canvas-plugin-measure

## 0.2.0

### Minor Changes

- 3f3d116: Add multi-metric ruler labels to `@diegesis/canvas-plugin-measure`: the measure tool now converts grid-cell distances into any number of simultaneous units (e.g. `30 ft · 9 m`). Metrics are Valibot-validated (`perCell`, `suffix`, `precision`) with built-in presets (`cells`, `dnd5e`, `metric`, dual `dnd5e-metric`) and a public `MeasurePlugin` API (`setMetrics`, `setSeparator`, `setOptions`, `metrics`, `options`). The `measure` bus event gains a `metrics` array (raw values plus formatting metadata) and a ready-to-render `label` that matches the ruler exactly. Whole-cell values now trim the trailing `.0` (`12 u` instead of `12.0 u`), matching the ranges plugin label style. The playground defaults to the dual preset and demos live switching via a Units selector.

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
