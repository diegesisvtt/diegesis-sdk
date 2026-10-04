---
'@diegesis/dice-core': minor
---

Add `exprBounds` / `exprMin` / `exprMax`: static [min, max] analysis over the dice IR without rolling. Used for roll-table range derivation and display ("1d20 covers 1–20"). Handles keep/drop, min/max clamps (contradictory clamps pin to a constant), success-counting modifiers (deduct/subtract-failure can go negative), pools and arithmetic; returns null for unbounded (explosions, recursive rerolls) or dynamic (variables, comparisons) expressions.
