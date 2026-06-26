---
'@coongro/vet-pharmacy': minor
---

feat: usar el motor de lotes unificado de products (COONG-220)

Farmacia deja de tener su propia lógica de stock por lotes y consume el motor
genérico de `@coongro/products`:

- Dispensación de recetas y descuento de medicamentos en consulta usan
  `products.batches.consume` (descuento FIFO/manual + trazabilidad lote→uso); el
  preview de dispensación usa `products.batches.previewConsume`. Se elimina el
  `FIFOStockService` propio (lógica duplicada).
- El selector de lote en la consulta usa el `BatchPicker` reusable de products
  (pre-selección FIFO), mismo componente que vacunación.
