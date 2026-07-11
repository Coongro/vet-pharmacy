# @coongro/vet-pharmacy

## 1.1.0

### Minor Changes

- 88ccd4e: Autofill de alta de medicamentos vía vademécum SENASA (COONG-218): el alta/edición de medicamentos en Farmacia integra el buscador del vademécum (@coongro/vademecum + provider SENASA) y autocompleta la ficha clínica desde el padrón, con carga manual de fallback y gating por país. La composición pasa a ser una lista de principios activos (con orden estable) en vez de texto único. Incluye el fix del diálogo de confirmación de borrado, que ahora va anidado dentro del FormDialog (evita que el DismissableLayer del modal padre lo trate como click-afuera y cierre ambos modales).
- 9d4b955: feat(medicamentos): add purchase cost + margin columns, remove the Stock column, and colorize the chips (species/route/prescription) (COONG-223)
- 61af533: feat: usar el maestro de laboratorios compartido (COONG-219)

  Farmacia deja el laboratorio como texto libre y pasa a referenciar el maestro
  compartido de `@coongro/vademecum`:

  - Nueva columna `medication.laboratory_id` (referencia canónica); `laboratory`
    (texto) queda como cache denormalizado del nombre para las vistas que aún lo
    leen.
  - El alta (CreateMedicationButton) y la edición (MedicationFields) usan el
    `LaboratorySelect` compartido. El autofill de SENASA hace auto-upsert del
    laboratorio en el maestro (`ensureByName`) y referencia su id.
  - Backfill en activación: migra el texto libre existente a `laboratory_id`
    (idempotente).

- b8bab6a: Lotes en medicamentos (COONG-213): en la sección de medicamentos del formulario de consulta, cada medicamento recetado puede elegir el lote (batch) del que sale —igual que las vacunas eligen su lote—, mostrando número de lote y vencimiento. Al guardar la consulta, el lote elegido se descuenta (batches.update), en paridad con el descuento de stock de las vacunas. Sin lotes con stock, el medicamento se receta como antes.
- c533440: feat: usar el motor de lotes unificado de products (COONG-220)

  Farmacia deja de tener su propia lógica de stock por lotes y consume el motor
  genérico de `@coongro/products`:

  - Dispensación de recetas y descuento de medicamentos en consulta usan
    `products.batches.consume` (descuento FIFO/manual + trazabilidad lote→uso); el
    preview de dispensación usa `products.batches.previewConsume`. Se elimina el
    `FIFOStockService` propio (lógica duplicada).
  - El selector de lote en la consulta usa el `BatchPicker` reusable de products
    (pre-selección FIFO), mismo componente que vacunación.

### Patch Changes

- 639126a: vet-pharmacy deja de tener su propio sistema de lotes y consume el batch genérico de `products.batches` (COONG-217): Farmacia, el selector de lote de la consulta, y el FIFO de dispensación de recetas leen/escriben/descuentan los mismos lotes que Salidas. Se elimina el BatchRepository propio (la tabla queda vacía, sin migración de datos — había 0 lotes). Sin duplicación de stock entre plugins.
- 1e4a1b7: Refactor (COONG-224): el alta de medicamentos consume el buscador compartido `CatalogSearch` de `@coongro/vademecum` en vez de su copia inline. Se elimina el buscador duplicado (~300 líneas) y su CSS muerto, sin cambios de comportamiento.
- fea8cba: refactor(COONG-225 #9): consume la taxonomía de especies de `@coongro/patients`

  Elimina `src/species.ts` (que duplicaba la taxonomía de Pacientes y el
  normalizador SENASA) y consume `SPECIES` / `SPECIES_LABELS` / `SPECIES_ICON` /
  `SPECIES_ENABLED_DEFAULT` / `speciesCodeFromText` desde `@coongro/patients`
  (fuente única). Agrega `@coongro/patients` como dependencia. Sin cambio de
  comportamiento (verificado en vivo: la columna ESPECIES de Medicamentos sigue
  mostrando los chips correctos). Requiere `@coongro/patients` con los exports nuevos.

- 7faaa70: Limpieza: se elimina el schema de lotes propio (`batch.ts` / tabla `module_vet_pharmacy_batches`), código muerto que quedó tras COONG-217. Desde esa migración los lotes viven en `products.batches` (motor genérico) y vet-pharmacy los consume vía acciones; la tabla propia quedó vacía y sin repositorio/uso. Migración 0004 DROP (tabla con 0 filas, verificado).

## 1.0.0

### Patch Changes

- @coongro/plugin-sdk@0.51.0
- @coongro/consultations@1.0.0
- @coongro/products@2.0.0

## 3.0.0

### Patch Changes

- Updated dependencies [3a28d12]
- Updated dependencies [62ee11e]
- Updated dependencies [792063d]
  - @coongro/plugin-sdk@0.15.0
  - @coongro/consultations@1.0.0
  - @coongro/products@2.0.0

## 2.0.0

### Patch Changes

- Updated dependencies [3a28d12]
- Updated dependencies [62ee11e]
- Updated dependencies [792063d]
  - @coongro/plugin-sdk@0.14.0
  - @coongro/consultations@1.0.0
  - @coongro/products@1.0.0

## 1.0.0

### Patch Changes

- Updated dependencies [3a28d12]
- Updated dependencies [792063d]
  - @coongro/plugin-sdk@0.13.0
  - @coongro/consultations@1.0.0
  - @coongro/products@1.0.0
