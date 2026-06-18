import { sql } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const medicationTable = pgTable('module_vet_pharmacy_medications', {
  id: uuid('id').primaryKey().notNull(),
  product_id: text('product_id').notNull(),
  active_ingredient: text('active_ingredient').notNull(),
  concentration: text('concentration'),
  presentation: text('presentation'),
  laboratory: text('laboratory'),
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
