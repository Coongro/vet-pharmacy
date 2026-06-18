/**
 * Comando: transitionPrescription
 *
 * Cambia el estado de una receta validando con la máquina de estados.
 * Registra el motivo en metadata cuando es requerido.
 * Reutilizable para cualquier transición: anular, reactivar, expirar.
 */
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';

import { PrescriptionRepository } from '../repositories/prescription.repository.js';
import { validateTransition, getTransitionLabel } from '../services/prescription-state-machine.js';
import type { PrescriptionStatus } from '../types/domain.js';

export interface TransitionResult {
  success: boolean;
  from: PrescriptionStatus;
  to: PrescriptionStatus;
}

export function createTransitionPrescription(
  db: ModuleDatabaseAPI,
  logger: { info: (...args: unknown[]) => void }
) {
  const prescriptionRepo = new PrescriptionRepository(db);

  return async (args: unknown): Promise<TransitionResult> => {
    const { prescriptionId, to, reason } = args as {
      prescriptionId: string;
      to: PrescriptionStatus;
      reason?: string;
    };

    const rx = await prescriptionRepo.getById({ id: prescriptionId });
    if (!rx) throw new Error('Receta no encontrada');

    const from = rx.status as PrescriptionStatus;
    const validation = validateTransition(from, to, reason);

    if (!validation.valid) {
      throw new Error((validation as { valid: false; error: string }).error);
    }

    // Construir metadata con historial de transiciones
    const existingMeta = (rx.metadata as Record<string, unknown>) ?? {};
    const history = (existingMeta.statusHistory as Array<Record<string, unknown>>) ?? [];

    history.push({
      from,
      to,
      reason: reason?.trim() || null,
      timestamp: new Date().toISOString(),
    });

    await prescriptionRepo.update({
      id: prescriptionId,
      data: {
        status: to,
        metadata: { ...existingMeta, statusHistory: history } as unknown,
      } as Record<string, unknown>,
    });

    const label = getTransitionLabel(from, to);
    const reasonSuffix = reason ? ` — ${reason}` : '';
    logger.info(`Prescription ${prescriptionId}: ${label} (${from} → ${to})${reasonSuffix}`);

    return { success: true, from, to };
  };
}
