---
'@diegesis/dice': minor
---

Add `termsFromRoll(expr, roll)`: converts a dice-core `RollResult` plus its `RollExpr` into `DiceTerm[]` for DiceBox animation of pre-rolled outcomes. Handles percentile decomposition (tens d100 + units d10), plain `d100` (numeric 100 faces decompose the same way, since the contract treats number-100 dice as tens-only), and coin dice (1..2, mapping verbatim to the d2 preset). Returns null for non-animatable faces (fate, expression) so callers can roll without animation.
