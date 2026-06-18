---
"@coongro/vet-pharmacy": minor
---

Lotes en medicamentos (COONG-213): en la sección de medicamentos del formulario de consulta, cada medicamento recetado puede elegir el lote (batch) del que sale —igual que las vacunas eligen su lote—, mostrando número de lote y vencimiento. Al guardar la consulta, el lote elegido se descuenta (batches.update), en paridad con el descuento de stock de las vacunas. Sin lotes con stock, el medicamento se receta como antes.
