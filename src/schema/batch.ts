import { sql } from 'drizzle-orm';
import { jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const batchTable = pgTable('module_vet_pharmacy_batches', {
  id: uuid('id').primaryKey().notNull(),
  product_id: text('product_id').notNull(),
  batch_number: text('batch_number').notNull(),
  expiration_date: timestamp('expiration_date', { mode: 'string' }).notNull(),
  quantity: numeric('quantity').notNull(),
  purchase_date: timestamp('purchase_date', { mode: 'string' }),
  purchase_price: numeric('purchase_price'),
  supplier: text('supplier'),
  notes: text('notes'),
  status: text('status').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type BatchRow = typeof batchTable.$inferSelect;
export type NewBatchRow = typeof batchTable.$inferInsert;
