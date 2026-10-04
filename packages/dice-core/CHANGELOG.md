# @diegesis/dice-core

## 0.2.0

### Minor Changes

- e1632da: Add `exprBounds` / `exprMin` / `exprMax`: static [min, max] analysis over the dice IR without rolling. Used for roll-table range derivation and display ("1d20 covers 1–20"). Handles keep/drop, min/max clamps (contradictory clamps pin to a constant), success-counting modifiers (deduct/subtract-failure can go negative), pools and arithmetic; returns null for unbounded (explosions, recursive rerolls) or dynamic (variables, comparisons) expressions.

## 0.1.1

### Patch Changes

- cb568ac: Add a package README to every published package: npm-page documentation, verified quick starts and API references, LLM-friendly signatures.
- Updated dependencies [cb568ac]
  - @diegesis/formula@0.1.1
