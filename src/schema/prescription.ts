import { sql } from 'drizzle-orm';
import { jsonb, pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const prescriptionTable = pgTable('module_vet_pharmacy_prescriptions', {
  id: uuid('id').primaryKey().notNull(),
  number: serial('number').notNull(),
  pet_id: text('pet_id'),
  pet_name: text('pet_name').notNull(),
  owner_name: text('owner_name').notNull(),
  vet_name: text('vet_name').notNull(),
  vet_license: text('vet_license'),
  diagnosis: text('diagnosis'),
  issued_at: timestamp('issued_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  valid_until: timestamp('valid_until', { mode: 'string' }),
  status: text('status').notNull(),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type PrescriptionRow = typeof prescriptionTable.$inferSelect;
export type NewPrescriptionRow = typeof prescriptionTable.$inferInsert;
