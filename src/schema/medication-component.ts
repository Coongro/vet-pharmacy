import { index, integer, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';

/**
 * Composición de un medicamento: lista de principios activos (soporta
 * combinados). Reemplaza el `active_ingredient` de texto único de `medications`.
 *
 * `amount`/`unit` son la concentración parseada best-effort; `raw_strength`
 * conserva el texto crudo de la fuente. `source` registra de dónde vino la
 * composición (ej. "senasa") o null si la cargó el vet a mano.
 *
 * `position` fija el orden de los componentes (0-based). Es necesario porque el
 * principal (índice 0) define active_ingredient/concentration/nombre del
 * medicamento: sin orden estable, al reabrir/editar un combinado el principal
 * rotaría según el orden arbitrario que devuelva Postgres.
 */
export const medicationComponentTable = pgTable(
  'module_vet_pharmacy_medication_components',
  {
    id: uuid('id').primaryKey().notNull(),
    medication_id: uuid('medication_id').notNull(),
    substance: text('substance').notNull(),
    amount: numeric('amount'),
    unit: text('unit'),
    raw_strength: text('raw_strength'),
    source: text('source'),
    // NOT NULL + DEFAULT: si el plugin se desactiva, inserts de otros plugins no
    // fallan; y los componentes preexistentes quedan en 0 (orden de inserción).
    position: integer('position').notNull().default(0),
  },
  (t) => [index('idx_vet_pharmacy_med_components_med').on(t.medication_id)]
);

export type MedicationComponentRow = typeof medicationComponentTable.$inferSelect;
export type NewMedicationComponentRow = typeof medicationComponentTable.$inferInsert;
