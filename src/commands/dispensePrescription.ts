/**
 * Comando: dispensePrescription
 *
 * Deducción FIFO server-side vía el motor de lotes de products
 * (products.batches.consume) + la máquina de estados para validar transiciones.
 * Soporta dispensación parcial: si no hay stock suficiente, dispensa lo disponible
 * y marca como 'partially_dispensed'.
 */
import { actions } from '@coongro/plugin-sdk';
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';

import { PrescriptionItemRepository } from '../repositories/prescription-item.repository.js';
import { PrescriptionRepository } from '../repositories/prescription.repository.js';
import { canTransition } from '../services/prescription-state-machine.js';
import type { DispenseResult, PrescriptionStatus } from '../types/domain.js';

/** Resultado del motor de lotes de products (products.batches.consume). */
interface ConsumeResult {
  consumed: number;
  batches: unknown[];
  shortfall: number;
}

export function createDispensePrescription(
  db: ModuleDatabaseAPI,
  logger: { info: (...args: unknown[]) => void }
) {
  const prescriptionRepo = new PrescriptionRepository(db);
  const itemRepo = new PrescriptionItemRepository(db);

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

        // Motor de lotes unificado (products): descuento FIFO por vencimiento +
        // movimiento con trazabilidad (lote → esta receta). Reemplaza al FIFO propio.
        const result = await actions.execute<ConsumeResult>('products.batches.consume', {
          productId: item.product_id,
          quantity: needed,
          referenceType: 'prescription',
          referenceId: prescriptionId,
        });
        const consumed = result?.consumed ?? 0;
        totalBatchesModified += result?.batches?.length ?? 0;

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
