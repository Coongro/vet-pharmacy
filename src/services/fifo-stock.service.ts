/**
 * Servicio FIFO de stock — lógica compartida entre preview y dispensación.
 *
 * Centraliza el cálculo de qué lotes se consumirían (preview)
 * y la ejecución real del consumo (consume).
 */
import { BatchRepository } from '../repositories/batch.repository.js';
import type { BatchPreview } from '../types/domain.js';

export class FIFOStockService {
  constructor(private readonly batchRepo: BatchRepository) {}

  /**
   * Calcula qué lotes se consumirían para cubrir `needed` unidades.
   * NO modifica la BD — solo lectura.
   */
  async preview(productId: string, needed: number): Promise<BatchPreview[]> {
    const batches = await this.batchRepo.listByProduct({ productId });
    const active = batches.filter((b) => b.status === 'active' && parseFloat(b.quantity) > 0);

    const result: BatchPreview[] = [];
    let remaining = needed;

    for (const batch of active) {
      if (remaining <= 0) break;
      const available = parseFloat(batch.quantity);
      const toConsume = Math.min(available, remaining);
      remaining -= toConsume;
      result.push({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        expirationDate: batch.expiration_date,
        available,
        toConsume,
      });
    }

    return result;
  }

  /**
   * Ejecuta el consumo FIFO real. Modifica lotes en la BD.
   * Retorna la cantidad total efectivamente consumida.
   */
  async consume(
    productId: string,
    needed: number
  ): Promise<{ consumed: number; batchesModified: number }> {
    const previewed = await this.preview(productId, needed);
    let consumed = 0;
    let batchesModified = 0;

    for (const entry of previewed) {
      await this.batchRepo.update({
        id: entry.batchId,
        data: {
          quantity: String(entry.available - entry.toConsume),
          status: entry.available - entry.toConsume <= 0 ? 'depleted' : 'active',
        },
      });
      consumed += entry.toConsume;
      batchesModified++;
    }

    return { consumed, batchesModified };
  }
}
