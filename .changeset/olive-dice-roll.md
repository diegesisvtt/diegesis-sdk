---
"@diegesis/dice": patch
---

fix(3ddice): termsFromRoll returns null for numeric dice without a 3D preset (d3, d5, d7, …) instead of throwing `UNSUPPORTED_DIE_TYPE`, matching the fate-dice behavior — callers roll without animation. Adds exported `has3dPreset(faces)` predicate.
