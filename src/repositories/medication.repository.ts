
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq, ilike, or, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { medicationTable } from '../schema/medication.js';
import type { MedicationRow, NewMedicationRow } from '../schema/medication.js';

export class MedicationRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<MedicationRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(medicationTable));
  }

  async getById({ id }: { id: string }): Promise<MedicationRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(medicationTable).where(eq(medicationTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewMedicationRow }): Promise<MedicationRow[]> {
    const row = { ...data, id: data.id ?? crypto.randomUUID() };
    return this.db.ormQuery((tx) => tx.insert(medicationTable).values(row).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewMedicationRow>;
  }): Promise<MedicationRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(medicationTable).set(data).where(eq(medicationTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(medicationTable).where(eq(medicationTable.id, id)));
  }

  // ─── Métodos custom ─────────────────────────────────────────────────────────

  /** Obtener datos farmacéuticos por product_id */
  async getByProductId({ productId }: { productId: string }): Promise<MedicationRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(medicationTable).where(eq(medicationTable.product_id, productId)).limit(1)
    );
    return rows[0];
  }

  /** Buscar por principio activo, laboratorio o registro SENASA */
  async search({
    query,
    filters,
  }: {
    query?: string;
    filters?: {
      laboratory?: string;
      requires_prescription?: boolean;
      controlled?: boolean;
    };
  }): Promise<MedicationRow[]> {
    const conditions: (SQL | undefined)[] = [];

    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          ilike(medicationTable.active_ingredient, pattern),
          ilike(medicationTable.concentration, pattern),
          ilike(medicationTable.laboratory, pattern),
          ilike(medicationTable.senasa_registration, pattern)
        )
      );
    }

    if (filters?.laboratory) {
      conditions.push(ilike(medicationTable.laboratory, `%${filters.laboratory}%`));
    }
    if (filters?.requires_prescription !== undefined) {
      conditions.push(eq(medicationTable.requires_prescription, filters.requires_prescription));
    }
    if (filters?.controlled !== undefined) {
      conditions.push(eq(medicationTable.controlled, filters.controlled));
    }

    if (conditions.length === 0) {
      return this.list();
    }

    return this.db.ormQuery((tx) =>
      tx
        .select()
        .from(medicationTable)
        .where(and(...conditions))
    );
  }
}
