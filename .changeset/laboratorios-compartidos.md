---
"@coongro/vet-pharmacy": minor
---

feat: usar el maestro de laboratorios compartido (COONG-219)

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
