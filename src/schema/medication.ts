import { sql } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const medicationTable = pgTable('module_vet_pharmacy_medications', {
  id: uuid('id').primaryKey().notNull(),
  product_id: text('product_id').notNull(),
  /**
   * @deprecated La composición ahora vive en `medication_components` (lista de
   * principios activos, soporta combinados). Se mantiene nullable por
   * compatibilidad con datos previos; el alta nueva escribe los componentes.
   */
  active_ingredient: text('active_ingredient'),
  concentration: text('concentration'),
  presentation: text('presentation'),
  /**
   * @deprecated Cache denormalizado del NOMBRE del laboratorio. La referencia
   * canónica es `laboratory_id` (maestro compartido en @coongro/vademecum,
   * COONG-219). Se mantiene en sync al guardar para que las vistas que todavía
   * leen el texto (lista, recetas, consultas) no necesiten resolver contra el
   * maestro; migrarlas a resolver por id permitirá quitar esta columna.
   */
  laboratory: text('laboratory'),
  /** Referencia al maestro de laboratorios compartido (vademecum, COONG-219). */
  laboratory_id: uuid('laboratory_id'),
  species: jsonb('species'),
  administration_route: text('administration_route'),
  requires_prescription: boolean('requires_prescription').notNull(),
  controlled: boolean('controlled').notNull(),
  senasa_registration: text('senasa_registration'),
  storage_conditions: text('storage_conditions'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type MedicationRow = typeof medicationTable.$inferSelect;
export type NewMedicationRow = typeof medicationTable.$inferInsert;
