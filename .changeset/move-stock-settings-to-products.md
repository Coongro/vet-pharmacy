---
'@coongro/vet-pharmacy': patch
---

fix(settings): mueve alertDays/autoDeduct a products y elimina autoNumber (COONG-248)

- `expiration.alertDays` y `stock.autoDeduct` eran conceptos genéricos de stock que quedaron en farmacia tras mudarse los lotes a vet-inventory (COONG-241). Ahora los consumidores (`ExpirationBadge`, dispensación) leen `products.stock.alertDays` / `products.stock.autoDeduct`, y las settings duplicadas se eliminan del manifest.
- Elimina `prescription.autoNumber`: opción trampa sin ningún consumidor (el número de receta es un correlativo automático de DB; apagarlo solo genera fricción y duplicados).
- Migra la capa de settings al Builder (`settings.gen.ts`). Página renombrada a "Recetas" (el stock se fue).
