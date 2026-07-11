
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq, inArray } from 'drizzle-orm';

import { consultationMedLinkTable } from '../schema/consultation-med-link.js';
import type {
  ConsultationMedLinkRow,
  NewConsultationMedLinkRow,
} from '../schema/consultation-med-link.js';

export class ConsultationMedLinkRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<ConsultationMedLinkRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(consultationMedLinkTable));
  }

  async create({ data }: { data: NewConsultationMedLinkRow }): Promise<ConsultationMedLinkRow[]> {
    const row = { ...data, id: data.id ?? crypto.randomUUID() };
    return this.db.ormQuery((tx) => tx.insert(consultationMedLinkTable).values(row).returning());
  }

  async createBatch({
    items,
  }: {
    items: NewConsultationMedLinkRow[];
  }): Promise<ConsultationMedLinkRow[]> {
    if (items.length === 0) return [];
    const rows = items.map((item) => ({ ...item, id: item.id ?? crypto.randomUUID() }));
    return this.db.ormQuery((tx) => tx.insert(consultationMedLinkTable).values(rows).returning());
  }

  async listByConsultationMedIds({ ids }: { ids: string[] }): Promise<ConsultationMedLinkRow[]> {
    if (ids.length === 0) return [];
    return this.db.ormQuery((tx) =>
      tx
        .select()
        .from(consultationMedLinkTable)
        .where(inArray(consultationMedLinkTable.consultation_medication_id, ids))
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) =>
      tx.delete(consultationMedLinkTable).where(eq(consultationMedLinkTable.id, id))
    );
  }
}
