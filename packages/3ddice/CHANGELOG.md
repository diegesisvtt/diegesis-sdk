# @diegesis/dice

## 0.2.1

### Patch Changes

- 9c0ccdc: fix(3ddice): termsFromRoll returns null for numeric dice without a 3D preset (d3, d5, d7, …) instead of throwing `UNSUPPORTED_DIE_TYPE`, matching the fate-dice behavior — callers roll without animation. Adds exported `has3dPreset(faces)` predicate.

## 0.2.0

### Minor Changes

- e1632da: Add `termsFromRoll(expr, roll)`: converts a dice-core `RollResult` plus its `RollExpr` into `DiceTerm[]` for DiceBox animation of pre-rolled outcomes. Handles percentile decomposition (tens d100 + units d10), plain `d100` (numeric 100 faces decompose the same way, since the contract treats number-100 dice as tens-only), and coin dice (1..2, mapping verbatim to the d2 preset). Returns null for non-animatable faces (fate, expression) so callers can roll without animation.

### Patch Changes

- Updated dependencies [e1632da]
  - @diegesis/dice-core@0.2.0
  - @diegesis/dice-notation@0.1.2

## 0.1.2

### Patch Changes

- cb568ac: Add a package README to every published package: npm-page documentation, verified quick starts and API references, LLM-friendly signatures.
- Updated dependencies [cb568ac]
  - @diegesis/assets@0.1.2
  - @diegesis/audio@0.2.1
  - @diegesis/dice-core@0.1.1
  - @diegesis/dice-notation@0.1.1
  - @diegesis/events@0.2.1
  - @diegesis/physics@0.1.1
  - @diegesis/render3d@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [5043230]
- Updated dependencies [b8d12ae]
- Updated dependencies [aa3ddd4]
  - @diegesis/audio@0.2.0
  - @diegesis/events@0.2.0
  - @diegesis/assets@0.1.1
