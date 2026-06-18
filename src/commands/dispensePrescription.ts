/**
 * Comando: dispensePrescription
 *
 * Deducción FIFO atómica server-side.
 * Usa FIFOStockService.consume() y la máquina de estados para validar transiciones.
 * Soporta dispensación parcial: si no hay stock suficiente, dispensa lo disponible
 * y marca como 'partially_dispensed'.
 */
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';

import { BatchRepository } from '../repositories/batch.repository.js';
import { PrescriptionItemRepository } from '../repositories/prescription-item.repository.js';
import { PrescriptionRepository } from '../repositories/prescription.repository.js';
import { FIFOStockService } from '../services/fifo-stock.service.js';
import { canTransition } from '../services/prescription-state-machine.js';
import type { DispenseResult, PrescriptionStatus } from '../types/domain.js';

export function createDispensePrescription(
  db: ModuleDatabaseAPI,
  logger: { info: (...args: unknown[]) => void }
) {
  const prescriptionRepo = new PrescriptionRepository(db);
  const itemRepo = new PrescriptionItemRepository(db);
  const fifo = new FIFOStockService(new BatchRepository(db));

  return async (args: unknown): Promise<DispenseResult> => {
    const { prescriptionId, autoDeductStock = true } = args as {
      prescriptionId: string;
      autoDeductStock?: boolean;
    };

    const rx = await prescriptionRepo.getById({ id: prescriptionId });
    if (!rx) throw new Error('Receta no encontrada');

    const currentStatus = rx.status as PrescriptionStatus;
    if (
      !canTransition(currentStatus, 'dispensed') &&
      !canTransition(currentStatus, 'partially_dispensed')
    ) {
      throw new Error(`No se puede dispensar una receta con estado "${currentStatus}"`);
    }

    const items = await itemRepo.listByPrescription({ prescriptionId });

    let totalBatchesModified = 0;
    let dispensedItems = 0;
    let fullyDispensedItems = 0;
    let totalItems = 0;

    if (autoDeductStock) {
      for (const item of items) {
        totalItems++;

        if (!item.product_id) continue;

        const needed = parseFloat(item.quantity) - parseFloat(item.dispensed_quantity);
        if (needed <= 0) {
          fullyDispensedItems++;
          continue;
        }

        const { consumed, batchesModified } = await fifo.consume(item.product_id, needed);
        totalBatchesModified += batchesModified;

        const newDispensed = parseFloat(item.dispensed_quantity) + consumed;
        await itemRepo.update({
          id: item.id,
          data: { dispensed_quantity: String(newDispensed) },
        });

        if (consumed >= needed) {
          fullyDispensedItems++;
        }
        if (consumed > 0) {
          dispensedItems++;
        }
      }
    }

    // Determinar el nuevo estado según lo dispensado
    const allDispensed = fullyDispensedItems >= totalItems;
    const newStatus: PrescriptionStatus = allDispensed ? 'dispensed' : 'partially_dispensed';

    await prescriptionRepo.update({
      id: prescriptionId,
      data: { status: newStatus },
    });

    logger.info(
      `Prescription ${prescriptionId} → ${newStatus}: ${dispensedItems} items processed, ${fullyDispensedItems}/${totalItems} fully dispensed, ${totalBatchesModified} batches modified`
    );

    return { success: true, dispensedItems, modifiedBatches: totalBatchesModified };
  };
}
