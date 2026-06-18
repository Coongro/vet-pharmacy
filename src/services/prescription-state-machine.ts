/**
 * Máquina de estados para recetas veterinarias.
 *
 * Centraliza las reglas de transición, validaciones y acciones.
 * Reutilizable: el patrón se puede adaptar para cualquier entidad
 * con estados en el plugin (lotes, medicamentos, etc.).
 */
import type { PrescriptionStatus } from '../types/domain.js';

// ─── Transiciones válidas ───────────────────────────────────────────────────

const TRANSITIONS: Record<PrescriptionStatus, PrescriptionStatus[]> = {
  active: ['partially_dispensed', 'dispensed', 'cancelled', 'expired'],
  partially_dispensed: ['dispensed', 'cancelled'],
  dispensed: [],
  expired: [],
  cancelled: ['active'],
};

// ─── Transiciones que requieren motivo ───────────────────────────────────────

const REQUIRES_REASON: Array<{ from: PrescriptionStatus; to: PrescriptionStatus }> = [
  { from: 'active', to: 'cancelled' },
  { from: 'partially_dispensed', to: 'cancelled' },
  { from: 'cancelled', to: 'active' },
];

// ─── Transiciones que requieren confirmación (modal) ────────────────────────

const REQUIRES_CONFIRMATION: Array<{ from: PrescriptionStatus; to: PrescriptionStatus }> = [
  { from: 'active', to: 'cancelled' },
  { from: 'partially_dispensed', to: 'cancelled' },
];

// ─── Labels de acción por transición ────────────────────────────────────────

const TRANSITION_LABELS: Record<string, string> = {
  'active→partially_dispensed': 'Dispensar parcialmente',
  'active→dispensed': 'Dispensar',
  'active→cancelled': 'Anular receta',
  'active→expired': 'Marcar como vencida',
  'partially_dispensed→dispensed': 'Completar dispensación',
  'partially_dispensed→cancelled': 'Anular receta',
  'cancelled→active': 'Reactivar receta',
};

// ─── API pública ────────────────────────────────────────────────────────────

/** Verifica si una transición es válida */
export function canTransition(from: PrescriptionStatus, to: PrescriptionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Obtiene las transiciones posibles desde un estado */
export function getAvailableTransitions(from: PrescriptionStatus): PrescriptionStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Verifica si una transición requiere motivo */
export function requiresReason(from: PrescriptionStatus, to: PrescriptionStatus): boolean {
  return REQUIRES_REASON.some((r) => r.from === from && r.to === to);
}

/** Verifica si una transición requiere confirmación con modal */
export function requiresConfirmation(from: PrescriptionStatus, to: PrescriptionStatus): boolean {
  return REQUIRES_CONFIRMATION.some((r) => r.from === from && r.to === to);
}

/** Obtiene el label de acción para una transición */
export function getTransitionLabel(from: PrescriptionStatus, to: PrescriptionStatus): string {
  return TRANSITION_LABELS[`${from}→${to}`] ?? `${from} → ${to}`;
}

/** Valida una transición y retorna error si no es válida */
export function validateTransition(
  from: PrescriptionStatus,
  to: PrescriptionStatus,
  reason?: string
): { valid: true } | { valid: false; error: string } {
  if (!canTransition(from, to)) {
    return {
      valid: false,
      error: `No se puede cambiar de "${from}" a "${to}"`,
    };
  }

  if (requiresReason(from, to) && (!reason || !reason.trim())) {
    return {
      valid: false,
      error: `Se requiere un motivo para ${getTransitionLabel(from, to).toLowerCase()}`,
    };
  }

  return { valid: true };
}
