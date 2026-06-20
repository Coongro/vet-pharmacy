---
"@coongro/vet-pharmacy": patch
---

Limpieza: se elimina el schema de lotes propio (`batch.ts` / tabla `module_vet_pharmacy_batches`), código muerto que quedó tras COONG-217. Desde esa migración los lotes viven en `products.batches` (motor genérico) y vet-pharmacy los consume vía acciones; la tabla propia quedó vacía y sin repositorio/uso. Migración 0004 DROP (tabla con 0 filas, verificado).
