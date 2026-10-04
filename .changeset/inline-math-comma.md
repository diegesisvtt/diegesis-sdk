---
'@diegesis/inline-math': patch
---

Accept comma as decimal separator ("2,5" → 2.5, "+1,5" → +1.5) for pt-BR style input. A separator followed by exactly 3 trailing digits after a non-empty integer part is treated as a thousands separator ("1,000" / "1.000" → 1000) — the overwhelmingly common intent for stat numbers.
