/**
 * Mapeo centralizado de estados de receta a labels y variantes de Badge.
 *
 * Reutilizable en: PrescriptionListItem, PrescriptionDetailPanel,
 * PrescriptionCard, RecetasView, y cualquier contexto que muestre estado.
 */
import type { PrescriptionStatus } from '../types/domain.js';

interface StatusConfig {
  label: string;
  /** Variante para UI.Badge */
  badgeVariant: string;
  /** Color CSS para bordes/dots */
  color: string;
  /** Color hex para dot badge del design system */
  dotColor: string | null;
}

const STATUS_MAP: Record<PrescriptionStatus, StatusConfig> = {
  active: {
    label: 'Activa',
    badgeVariant: 'brand',
    color: 'var(--cg-accent)',
    dotColor: '#3D9A5C',
  },
  partially_dispensed: {
    label: 'Parcial',
    badgeVariant: 'warning',
    color: 'var(--cg-warning)',
    dotColor: '#8A6800',
  },
  dispensed: {
    label: 'Dispensada',
    badgeVariant: 'success',
    color: 'var(--cg-success)',
    dotColor: '#4E8C78',
  },
  expired: {
    label: 'Vencida',
    badgeVariant: 'destructive',
    color: 'var(--cg-danger)',
    dotColor: '#C8423A',
  },
  cancelled: {
    label: 'Anulada',
    badgeVariant: 'secondary',
    color: 'var(--cg-border)',
    dotColor: null,
  },
};

export function getStatusConfig(status: PrescriptionStatus): StatusConfig {
  return STATUS_MAP[status] ?? STATUS_MAP.active;
}

export function getStatusLabel(status: PrescriptionStatus): string {
  return getStatusConfig(status).label;
}

export function getStatusBadgeVariant(status: PrescriptionStatus): string {
  return getStatusConfig(status).badgeVariant;
}
