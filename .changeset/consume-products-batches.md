---
"@coongro/vet-pharmacy": patch
---

vet-pharmacy deja de tener su propio sistema de lotes y consume el batch genérico de `products.batches` (COONG-217): Farmacia, el selector de lote de la consulta, y el FIFO de dispensación de recetas leen/escriben/descuentan los mismos lotes que Salidas. Se elimina el BatchRepository propio (la tabla queda vacía, sin migración de datos — había 0 lotes). Sin duplicación de stock entre plugins.
