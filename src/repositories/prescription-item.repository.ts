
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { prescriptionItemTable } from '../schema/prescription-item.js';
import type { PrescriptionItemRow, NewPrescriptionItemRow } from '../schema/prescription-item.js';

export class PrescriptionItemRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<PrescriptionItemRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(prescriptionItemTable));
  }

  async getById({ id }: { id: string }): Promise<PrescriptionItemRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(prescriptionItemTable).where(eq(prescriptionItemTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewPrescriptionItemRow }): Promise<PrescriptionItemRow[]> {
    const row = { ...data, id: data.id ?? crypto.randomUUID() };
    return this.db.ormQuery((tx) => tx.insert(prescriptionItemTable).values(row).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewPrescriptionItemRow>;
  }): Promise<PrescriptionItemRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(prescriptionItemTable).set(data).where(eq(prescriptionItemTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) =>
      tx.delete(prescriptionItemTable).where(eq(prescriptionItemTable.id, id))
    );
  }

  // ─── Métodos custom ─────────────────────────────────────────────────────────

  /** Items de una receta específica */
  async listByPrescription({
    prescriptionId,
  }: {
    prescriptionId: string;
  }): Promise<PrescriptionItemRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .select()
        .from(prescriptionItemTable)
        .where(eq(prescriptionItemTable.prescription_id, prescriptionId))
    );
  }
}
