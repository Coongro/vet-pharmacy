/**
 * Comando: getDispensationPreview
 *
 * Dado un prescriptionId, retorna los items con sus lotes FIFO disponibles.
 * Usa products.batches.previewConsume (motor de lotes) — solo lectura, no modifica stock.
 */
import { actions } from '@coongro/plugin-sdk';
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';

import { PrescriptionItemRepository } from '../repositories/prescription-item.repository.js';
import type { ItemPreview, DispensationPreview, BatchPreview } from '../types/domain.js';

export function createGetDispensationPreview(db: ModuleDatabaseAPI) {
  const itemRepo = new PrescriptionItemRepository(db);

  return async (args: unknown): Promise<DispensationPreview> => {
    const { prescriptionId } = args as { prescriptionId: string };

    const items = await itemRepo.listByPrescription({ prescriptionId });
    const itemPreviews: ItemPreview[] = [];

    for (const item of items) {
      const needed = parseFloat(item.quantity) - parseFloat(item.dispensed_quantity);

      if (!item.product_id || needed <= 0) {
        itemPreviews.push({
          itemId: item.id,
          medicationName: item.medication_name,
          quantity: parseFloat(item.quantity),
          productId: item.product_id,
          batches: [],
          hasStock: false,
        });
        continue;
      }

      // Preview FIFO del motor unificado (products): solo lectura, no modifica stock.
      const batches =
        (await actions.execute<BatchPreview[]>('products.batches.previewConsume', {
          productId: item.product_id,
          quantity: needed,
        })) ?? [];
      const totalAvailable = batches.reduce((sum, b) => sum + b.toConsume, 0);

      itemPreviews.push({
        itemId: item.id,
        medicationName: item.medication_name,
        quantity: parseFloat(item.quantity),
        productId: item.product_id,
        batches,
        hasStock: totalAvailable >= needed,
      });
    }

    return { prescriptionId, items: itemPreviews };
  };
}
