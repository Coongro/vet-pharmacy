/**
 * Servicio FIFO de stock — lógica compartida entre preview y dispensación.
 *
 * Centraliza el cálculo de qué lotes se consumirían (preview) y la ejecución real del
 * consumo (consume). Desde COONG-217 los lotes son GENÉRICOS: viven en `products.batches`
 * (no en una tabla propia de vet-pharmacy), así Salidas/Farmacia/dispensación comparten el
 * mismo stock. Por eso consume el contrato `products.batches.*` vía acción (cross-plugin).
 */
import { actions } from '@coongro/plugin-sdk';

import type { BatchPreview } from '../types/domain.js';

/** Forma del lote genérico (products.batches) que necesita el FIFO. */
interface ProductsBatchRow {
  id: string;
  batch_number: string;
  expiration_date: string | null;
  quantity: string;
  status: string;
}

export class FIFOStockService {
  /**
   * Calcula qué lotes se consumirían para cubrir `needed` unidades. NO modifica la BD.
   */
  async preview(productId: string, needed: number): Promise<BatchPreview[]> {
    const batches =
      (await actions.execute<ProductsBatchRow[]>('products.batches.listByProduct', {
        productId,
      })) ?? [];
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
        expirationDate: batch.expiration_date ?? '',
        available,
        toConsume,
      });
    }

    return result;
  }

  /**
   * Ejecuta el consumo FIFO real. Modifica lotes en la BD (products.batches).
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
      const left = entry.available - entry.toConsume;
      await actions.execute('products.batches.update', {
        id: entry.batchId,
        data: {
          quantity: String(left),
          status: left <= 0 ? 'depleted' : 'active',
        },
      });
      consumed += entry.toConsume;
      batchesModified++;
    }

    return { consumed, batchesModified };
  }
}
