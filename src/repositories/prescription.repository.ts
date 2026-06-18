import { randomUUID } from 'node:crypto';

import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq, ilike, or, and, gte, lte, desc, count } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { prescriptionTable } from '../schema/prescription.js';
import type { PrescriptionRow, NewPrescriptionRow } from '../schema/prescription.js';

export class PrescriptionRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<PrescriptionRow[]> {
    return this.db.ormQuery((tx) =>
      tx.select().from(prescriptionTable).orderBy(desc(prescriptionTable.created_at))
    );
  }

  async getById({ id }: { id: string }): Promise<PrescriptionRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(prescriptionTable).where(eq(prescriptionTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewPrescriptionRow }): Promise<PrescriptionRow[]> {
    const row = { ...data, id: data.id ?? randomUUID() };
    return this.db.ormQuery((tx) => tx.insert(prescriptionTable).values(row).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewPrescriptionRow>;
  }): Promise<PrescriptionRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(prescriptionTable).set(data).where(eq(prescriptionTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) =>
      tx.delete(prescriptionTable).where(eq(prescriptionTable.id, id))
    );
  }

  // ─── Métodos custom ─────────────────────────────────────────────────────────

  /** Recetas activas */
  async getActive(): Promise<PrescriptionRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .select()
        .from(prescriptionTable)
        .where(eq(prescriptionTable.status, 'active'))
        .orderBy(desc(prescriptionTable.issued_at))
    );
  }

  /** Buscar por nombre de mascota, dueño o veterinario — con paginación */
  async search({
    query,
    filters,
    limit = 20,
    offset = 0,
  }: {
    query?: string;
    filters?: {
      status?: string;
      from?: string;
      to?: string;
    };
    limit?: number;
    offset?: number;
  }): Promise<{ data: PrescriptionRow[]; total: number }> {
    const conditions: (SQL | undefined)[] = [];

    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          ilike(prescriptionTable.pet_name, pattern),
          ilike(prescriptionTable.owner_name, pattern),
          ilike(prescriptionTable.vet_name, pattern),
          ilike(prescriptionTable.diagnosis, pattern)
        )
      );
    }

    if (filters?.status) {
      conditions.push(eq(prescriptionTable.status, filters.status));
    }
    if (filters?.from) {
      conditions.push(gte(prescriptionTable.issued_at, filters.from));
    }
    if (filters?.to) {
      conditions.push(lte(prescriptionTable.issued_at, filters.to));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      this.db.ormQuery((tx) => {
        let q = tx
          .select()
          .from(prescriptionTable)
          .orderBy(desc(prescriptionTable.created_at))
          .limit(limit)
          .offset(offset);
        if (whereClause) q = q.where(whereClause) as typeof q;
        return q;
      }),
      this.db.ormQuery((tx) => {
        let q = tx.select({ total: count() }).from(prescriptionTable);
        if (whereClause) q = q.where(whereClause) as typeof q;
        return q;
      }),
    ]);

    return { data, total: Number(countResult[0]?.total ?? 0) };
  }
}
