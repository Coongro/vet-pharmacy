---
'@coongro/vet-pharmacy': patch
---

fix(dispensación): respeta la política de lotes vencidos

La dispensación de recetas (FIFO) y el descuento de medicación en consulta ahora respetan `products.stock.expiredLots`: el FIFO no toca lotes vencidos con `block` (default) y los usa con `warn`; el lote elegido a mano en la consulta se permite (el vet lo eligió). En ambos casos **avisa** si se descontó de un lote vencido (COONG-248, flag `expired` del motor de products).
