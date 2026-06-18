import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Asociación entre medicamentos de consulta (texto libre de consultations)
 * y productos/medicamentos reales de vet-pharmacy.
 *
 * Tabla propiedad de vet-pharmacy — consultations no la conoce.
 */
export const consultationMedLinkTable = pgTable('module_vet_pharmacy_consultation_med_links', {
  id: uuid('id').primaryKey().notNull(),
  /** ID del registro en consultation_medications (del plugin consultations) */
  consultation_medication_id: text('consultation_medication_id').notNull(),
  /** ID del medicamento en vet-pharmacy */
  medication_id: text('medication_id'),
  /** ID del producto vinculado */
  product_id: text('product_id'),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type ConsultationMedLinkRow = typeof consultationMedLinkTable.$inferSelect;
export type NewConsultationMedLinkRow = typeof consultationMedLinkTable.$inferInsert;
