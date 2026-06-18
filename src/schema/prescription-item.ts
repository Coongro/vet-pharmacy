import { sql } from 'drizzle-orm';
import { integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const prescriptionItemTable = pgTable('module_vet_pharmacy_prescription_items', {
  id: uuid('id').primaryKey().notNull(),
  prescription_id: text('prescription_id').notNull(),
  product_id: text('product_id'),
  medication_name: text('medication_name').notNull(),
  dosage_amount: numeric('dosage_amount'),
  dosage_unit: text('dosage_unit'),
  route: text('route'),
  frequency_hours: integer('frequency_hours'),
  duration_amount: integer('duration_amount'),
  duration_unit: text('duration_unit'),
  quantity: numeric('quantity').notNull(),
  dispensed_quantity: numeric('dispensed_quantity').notNull(),
  batch_id: text('batch_id'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type PrescriptionItemRow = typeof prescriptionItemTable.$inferSelect;
export type NewPrescriptionItemRow = typeof prescriptionItemTable.$inferInsert;
