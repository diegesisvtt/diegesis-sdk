---
'@diegesis/roll-tables': patch
---

Relax entry/table id validation from strict UUID to any non-empty string. Host applications use their own id schemes (base36, ULID, etc.) for table rows; ids are only used as lookup keys internally, so the UUID restriction was needlessly strict. Generated ids remain UUID v7.
