import { getHostReact, actions, usePlugin, settings } from '@coongro/plugin-sdk';

import { chargeDispensedPrescription } from '../data/billing.js';
import type {
  Prescription,
  PrescriptionStatus,
  CreatePrescriptionData,
  CreatePrescriptionItemData,
} from '../types/domain.js';

const React = getHostReact();
const { useState, useCallback } = React;

interface TransitionResult {
  success: boolean;
  from: PrescriptionStatus;
  to: PrescriptionStatus;
}

/** Crear, dispensar, anular y reactivar recetas */
export function usePrescriptionMutations() {
  const { toast } = usePlugin();
  const [creating, setCreating] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const create = useCallback(
    async (
      data: CreatePrescriptionData,
      items: Omit<CreatePrescriptionItemData, 'prescription_id'>[]
    ): Promise<Prescription | null> => {
      setCreating(true);
      try {
        let validUntil = data.valid_until;
        if (!validUntil) {
          const validityDays =
            (await settings.get<number>('vet-pharmacy.prescription.validityDays')) ?? 10;
          const d = new Date(data.issued_at ?? new Date().toISOString());
          d.setDate(d.getDate() + validityDays);
          validUntil = d.toISOString();
        }

        const result = await actions.execute<Prescription[]>('vet-pharmacy.prescriptions.create', {
          data: {
            ...data,
            status: data.status ?? 'active',
            valid_until: validUntil,
          },
        });
        const rx = result?.[0] ?? null;
        if (!rx) {
          toast.error('Error', 'No se pudo crear la receta');
          return null;
        }

        for (const item of items) {
          await actions.execute('vet-pharmacy.prescription-items.create', {
            data: {
              ...item,
              prescription_id: rx.id,
              dispensed_quantity: item.dispensed_quantity ?? '0',
            },
          });
        }

        toast.success('Receta creada', `Receta #${rx.number} creada exitosamente`);
        return rx;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'Error creando receta');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [toast]
  );

  /** Dispensar receta — deducción FIFO atómica, soporta dispensación parcial */
  const dispense = useCallback(
    async (prescriptionId: string): Promise<boolean> => {
      setDispensing(true);
      try {
        const autoDeduct = (await settings.get<boolean>('products.stock.autoDeduct')) ?? true;

        const result = await actions.execute<{ success: boolean }>(
          'vet-pharmacy.dispensePrescription',
          { prescriptionId, autoDeductStock: autoDeduct }
        );

        if (result?.success) {
          toast.success('Dispensado', 'Receta procesada exitosamente');
          // Cobro: empuja las líneas de la receta dispensada a billing (fire-and-forget,
          // dependencia blanda). Sin esto, vender un medicamento no llegaba a la caja.
          void chargeDispensedPrescription(prescriptionId);
          return true;
        }

        toast.error('Error', 'No se pudo dispensar la receta');
        return false;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'Error al dispensar');
        return false;
      } finally {
        setDispensing(false);
      }
    },
    [toast]
  );

  /**
   * Transición de estado genérica — usa la máquina de estados del backend.
   * Valida que la transición sea permitida y registra el motivo en metadata.
   */
  const transition = useCallback(
    async (prescriptionId: string, to: PrescriptionStatus, reason?: string): Promise<boolean> => {
      setTransitioning(true);
      try {
        const result = await actions.execute<TransitionResult>(
          'vet-pharmacy.transitionPrescription',
          { prescriptionId, to, reason }
        );

        if (result?.success) {
          const messages: Record<string, [string, string]> = {
            cancelled: ['Anulada', 'Receta anulada correctamente'],
            active: ['Reactivada', 'Receta reactivada correctamente'],
            expired: ['Vencida', 'Receta marcada como vencida'],
          };
          const [title, msg] = messages[to] ?? ['Actualizada', 'Estado actualizado'];
          toast.success(title, msg);
          return true;
        }

        toast.error('Error', 'No se pudo cambiar el estado');
        return false;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'Error al cambiar estado');
        return false;
      } finally {
        setTransitioning(false);
      }
    },
    [toast]
  );

  /** Anular receta (requiere motivo) */
  const cancel = useCallback(
    async (prescriptionId: string, reason: string): Promise<boolean> => {
      return transition(prescriptionId, 'cancelled', reason);
    },
    [transition]
  );

  /** Reactivar receta anulada (requiere motivo) */
  const reactivate = useCallback(
    async (prescriptionId: string, reason: string): Promise<boolean> => {
      return transition(prescriptionId, 'active', reason);
    },
    [transition]
  );

  return {
    create,
    dispense,
    cancel,
    reactivate,
    transition,
    creating,
    dispensing,
    transitioning,
  };
}
