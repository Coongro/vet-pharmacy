/**
 * Comando: getDispensationPreview
 *
 * Dado un prescriptionId, retorna los items con sus lotes FIFO disponibles.
 * Usa FIFOStockService.preview() — solo lectura, no modifica stock.
 */
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';

import { PrescriptionItemRepository } from '../repositories/prescription-item.repository.js';
import { FIFOStockService } from '../services/fifo-stock.service.js';
import type { ItemPreview, DispensationPreview } from '../types/domain.js';

export function createGetDispensationPreview(db: ModuleDatabaseAPI) {
  const itemRepo = new PrescriptionItemRepository(db);
  const fifo = new FIFOStockService();

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

      const batches = await fifo.preview(item.product_id, needed);
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
