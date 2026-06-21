import { randomUUID } from 'node:crypto';

import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { medicationComponentTable } from '../schema/medication-component.js';
import type {
  MedicationComponentRow,
  NewMedicationComponentRow,
} from '../schema/medication-component.js';

export class MedicationComponentRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<MedicationComponentRow[]> {
    // Orden estable por `position`: el componente en 0 es el principal y define
    // active_ingredient/concentration/nombre del medicamento (ver schema).
    return this.db.ormQuery((tx) =>
      tx.select().from(medicationComponentTable).orderBy(medicationComponentTable.position)
    );
  }

  async getById({ id }: { id: string }): Promise<MedicationComponentRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(medicationComponentTable).where(eq(medicationComponentTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewMedicationComponentRow }): Promise<MedicationComponentRow[]> {
    // El id (uuid PK notNull) se genera acá si no viene: el insert no tiene
    // default en la columna, así que sin esto viola la not-null constraint.
    const row = { ...data, id: data.id ?? randomUUID() };
    return this.db.ormQuery((tx) => tx.insert(medicationComponentTable).values(row).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewMedicationComponentRow>;
  }): Promise<MedicationComponentRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .update(medicationComponentTable)
        .set(data)
        .where(eq(medicationComponentTable.id, id))
        .returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) =>
      tx.delete(medicationComponentTable).where(eq(medicationComponentTable.id, id))
    );
  }
}
